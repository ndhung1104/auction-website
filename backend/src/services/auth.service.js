import bcrypt from 'bcrypt';
import https from 'node:https';
import { URLSearchParams } from 'node:url';
import { ApiError } from '../utils/response.js';
import { createUser, findUserByEmail } from '../repositories/user.repository.js';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const RECAPTCHA_ENDPOINT = {
  hostname: 'www.google.com',
  path: '/recaptcha/api/siteverify'
};

const buildSafeUserPayload = (userRow) => ({
  id: userRow.id,
  email: userRow.email,
  fullName: userRow.full_name,
  role: userRow.role,
  status: userRow.status
});

const shouldBypassRecaptcha = (token) => {
  const bypassToken = process.env.RECAPTCHA_BYPASS_TOKEN;
  return Boolean(bypassToken && token === bypassToken);
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
  if (shouldBypassRecaptcha(captchaToken)) return;

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
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

export const registerUser = async ({
  email,
  password,
  fullName,
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
    phone_number: phoneNumber || null,
    role: 'BIDDER',
    status: 'CONFIRMED'
  });

  return buildSafeUserPayload(createdUser);
};
