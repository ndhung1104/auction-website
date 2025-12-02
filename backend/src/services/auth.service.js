import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import https from 'node:https';
import jwt from 'jsonwebtoken';
import { URLSearchParams } from 'node:url';
import { ApiError } from '../utils/response.js';
import { createUser, findUserByEmail, updateUser, findUserById } from '../repositories/user.repository.js';
import {
  consumeActiveResetOtps,
  createUserOtp,
  findActiveResetToken,
  consumeTokenById,
  consumeActiveOtpsByPurpose,
  findActiveOtpByPurpose
} from '../repositories/userOtp.repository.js';
import {
  sendPasswordResetEmail,
  sendRegistrationEmail,
  sendRegistrationConfirmedEmail
} from './mail.service.js';
import {
  findRefreshTokenByHash,
  insertRefreshToken,
  revokeRefreshToken,
  revokeTokenChain
} from '../repositories/refreshToken.repository.js';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const RECAPTCHA_ENDPOINT = {
  hostname: 'www.google.com',
  path: '/recaptcha/api/siteverify'
};
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 15);
const REGISTRATION_OTP_TTL_MINUTES = Number(process.env.REGISTRATION_OTP_TTL_MINUTES || 30);
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);

const buildSafeUserPayload = (userRow) => ({
  id: userRow.id,
  email: userRow.email,
  fullName: userRow.full_name,
  role: userRow.role,
  status: userRow.status
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateRefreshToken = async ({ userId, userAgent, ip }) => {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const [created] = await insertRefreshToken({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    user_agent: userAgent || null,
    ip_address: ip || null,
    rotated_from: null
  });
  return { rawToken, record: created };
};

const rotateRefreshToken = async ({ currentTokenHash, userAgent, ip }) => {
  const existing = await findRefreshTokenByHash(currentTokenHash);
  if (!existing || existing.revoked_at) {
    throw new ApiError(401, 'AUTH.INVALID_REFRESH', 'Refresh token is invalid or revoked');
  }
  if (new Date(existing.expires_at) <= new Date()) {
    throw new ApiError(401, 'AUTH.EXPIRED_REFRESH', 'Refresh token expired');
  }
  await revokeRefreshToken(existing.id);
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const [created] = await insertRefreshToken({
    user_id: existing.user_id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    user_agent: userAgent || existing.user_agent,
    ip_address: ip || existing.ip_address,
    rotated_from: existing.id
  });
  return { rawToken, record: created, userId: existing.user_id };
};

const buildTokens = async (userRow, meta = {}) => {
  const accessToken = generateJwt(userRow, { jti: crypto.randomBytes(8).toString('hex') });
  const refresh = await generateRefreshToken({
    userId: userRow.id,
    userAgent: meta.userAgent,
    ip: meta.ip
  });
  return {
    accessToken,
    refreshToken: refresh.rawToken,
    user: buildSafeUserPayload(userRow)
  };
};

const generateJwt = (userRow, options = {}) => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(
      500,
      'AUTH.MISSING_JWT_SECRET',
      'JWT secret is not configured on the server'
    );
  }

  return jwt.sign(
    {
      sub: userRow.id,
      role: userRow.role,
      ...(options.jti ? { jti: options.jti } : {})
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const DEFAULT_BYPASS_TOKEN = 'local-dev';

const shouldBypassRecaptcha = (token) => {
  if (!token) return false;
  const configuredBypass = process.env.RECAPTCHA_BYPASS_TOKEN || DEFAULT_BYPASS_TOKEN;
  const isBypassMatch = token === configuredBypass;
  if (isBypassMatch) {
    console.debug('[recaptcha] bypass token accepted');
  }
  return isBypassMatch;
};

const callRecaptcha = (params) => {
  const body = params.toString();

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: 'POST',
        hostname: RECAPTCHA_ENDPOINT.hostname,
        path: RECAPTCHA_ENDPOINT.path,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    request.on('error', reject);
    request.write(body);
    request.end();
  });
};

const verifyRecaptcha = async (captchaToken, remoteIp) => {
  if (shouldBypassRecaptcha(captchaToken)) {
    return;
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[recaptcha] secret missing, skipping verification');
      return;
    }
    throw new ApiError(
      500,
      'AUTH.MISSING_RECAPTCHA_SECRET',
      'ReCAPTCHA secret is not configured on the server'
    );
  }

  const params = new URLSearchParams({
    secret,
    response: captchaToken
  });

  if (remoteIp) params.append('remoteip', remoteIp);

  let verification;
  try {
    verification = await callRecaptcha(params);
  } catch (err) {
    throw new ApiError(
      502,
      'AUTH.RECAPTCHA_UNAVAILABLE',
      'Unable to reach Google reCAPTCHA service',
      { error: err.message }
    );
  }

  if (!verification?.success) {
    throw new ApiError(
      422,
      'AUTH.INVALID_CAPTCHA',
      'Captcha verification failed',
      { errors: verification?.['error-codes'] }
    );
  }
};

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const issueRegistrationOtp = async (userRow) => {
  const expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MINUTES * 60 * 1000);
  await consumeActiveOtpsByPurpose(userRow.id, 'REGISTER');
  const code = generateOtpCode();
  await createUserOtp({
    user_id: userRow.id,
    code,
    purpose: 'REGISTER',
    expires_at: expiresAt,
    consumed_at: null
  });
  await sendRegistrationEmail({
    email: userRow.email,
    fullName: userRow.full_name,
    code,
    expiresAt
  });
  return { code, expiresAt };
};

export const registerUser = async ({
  email,
  password,
  fullName,
  address,
  phoneNumber,
  captchaToken,
  remoteIp
}) => {
  if (!captchaToken) {
    throw new ApiError(400, 'AUTH.MISSING_CAPTCHA', 'Captcha token is required');
  }

  await verifyRecaptcha(captchaToken, remoteIp);

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'AUTH.EMAIL_EXISTS', 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [createdUser] = await createUser({
    email,
    password_hash: passwordHash,
    full_name: fullName,
    address: address || null,
    phone_number: phoneNumber || null,
    role: 'BIDDER',
    status: 'CREATED'
  });

  await issueRegistrationOtp(createdUser);

  return {
    ...buildSafeUserPayload(createdUser),
    requiresVerification: true
  };
};

export const verifyRegistrationOtp = async ({ email, code }) => {
  if (!email || !code) {
    throw new ApiError(400, 'AUTH.MISSING_VERIFICATION', 'Email and verification code are required');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(404, 'AUTH.USER_NOT_FOUND', 'Account not found for verification');
  }

  let targetUser = user;
  let alreadyConfirmed = false;

  if (user.status !== 'CONFIRMED') {
    const otp = await findActiveOtpByPurpose(code, 'REGISTER');
    if (!otp || String(otp.user_id) !== String(user.id)) {
      throw new ApiError(400, 'AUTH.INVALID_VERIFICATION', 'Verification code is invalid or expired');
    }

    await consumeTokenById(otp.id);
    const [updatedUser] = await updateUser(user.id, { status: 'CONFIRMED' });

    try {
      await sendRegistrationConfirmedEmail({
        email: updatedUser.email,
        fullName: updatedUser.full_name
      });
    } catch (err) {
      console.warn('[mail] registration confirmation email skipped', err.message);
    }

    targetUser = updatedUser;
  } else {
    alreadyConfirmed = true;
  }

  const auth = {
    token: generateJwt(targetUser, { jti: crypto.randomBytes(8).toString('hex') }),
    user: buildSafeUserPayload(targetUser)
  };
  return { ...auth, alreadyConfirmed };
};

export const authenticateUser = async ({ email, password, userAgent, ip }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, 'AUTH.INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (user.status !== 'CONFIRMED') {
    throw new ApiError(403, 'AUTH.UNCONFIRMED', 'Account is not confirmed');
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    throw new ApiError(401, 'AUTH.INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const tokens = await buildTokens(user, { userAgent, ip });
  return {
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: tokens.user
  };
};

export const createPasswordResetRequest = async ({ email }) => {
  if (!email) {
    throw new ApiError(400, 'AUTH.MISSING_EMAIL', 'Email is required');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { resetDispatched: false };
  }

  await consumeActiveResetOtps(user.id);

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await createUserOtp({
    user_id: user.id,
    code: resetToken,
    purpose: 'RESET_PASSWORD',
    expires_at: expiresAt,
    consumed_at: null
  });

  await sendPasswordResetEmail({
    email: user.email,
    token: resetToken
  });

  const isProduction = process.env.NODE_ENV === 'production';

  return {
    resetDispatched: true,
    ...(isProduction ? {} : { resetToken, expiresAt })
  };
};

export const resetPassword = async ({ token, newPassword }) => {
  if (!token) {
    throw new ApiError(400, 'AUTH.MISSING_TOKEN', 'Reset token is required');
  }
  if (!newPassword) {
    throw new ApiError(400, 'AUTH.MISSING_PASSWORD', 'New password is required');
  }

  const otp = await findActiveResetToken(token);
  if (!otp) {
    throw new ApiError(400, 'AUTH.INVALID_TOKEN', 'Reset token is invalid or expired');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const [updated] = await updateUser(otp.user_id, { password_hash: passwordHash });
  if (!updated) {
    throw new ApiError(404, 'AUTH.USER_NOT_FOUND', 'User not found for this token');
  }

  await consumeTokenById(otp.id);
  return { reset: true };
};

export const refreshSession = async ({ refreshToken, userAgent, ip }) => {
  if (!refreshToken) {
    throw new ApiError(401, 'AUTH.MISSING_REFRESH', 'Refresh token is required');
  }
  const hashed = hashToken(refreshToken);
  const rotated = await rotateRefreshToken({ currentTokenHash: hashed, userAgent, ip });
  const user = await findUserById(rotated.userId);
  if (!user) {
    throw new ApiError(404, 'AUTH.USER_NOT_FOUND', 'User not found');
  }
  const accessToken = generateJwt(user, { jti: crypto.randomBytes(8).toString('hex') });
  return {
    token: accessToken,
    refreshToken: rotated.rawToken,
    user: buildSafeUserPayload(user)
  };
};

export const revokeRefreshSession = async (refreshToken) => {
  if (!refreshToken) return;
  const hashed = hashToken(refreshToken);
  const tokenRow = await findRefreshTokenByHash(hashed);
  if (!tokenRow) return;
  await revokeTokenChain(tokenRow.id);
};

export const changePassword = async ({ userId, currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'AUTH.MISSING_PASSWORD', 'Current and new passwords are required');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'AUTH.USER_NOT_FOUND', 'User not found');
  }

  const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordValid) {
    throw new ApiError(401, 'AUTH.INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(422, 'AUTH.PASSWORD_UNCHANGED', 'New password must be different');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await updateUser(userId, { password_hash: passwordHash });

  return { updated: true };
};
