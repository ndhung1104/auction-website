import Joi from 'joi';
import {
  authenticateUser,
  changePassword,
  createPasswordResetRequest,
  registerUser,
  resetPassword,
  refreshSession,
  revokeRefreshSession,
  verifyRegistrationOtp
} from '../services/auth.service.js';
import { ApiError, sendCreated, sendSuccess } from '../utils/response.js';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  fullName: Joi.string().min(2).max(120).required(),
  phoneNumber: Joi.string().max(30).allow('', null),
  captchaToken: Joi.string().required()
});

export const register = async (req, res, next) => {
  try {
    const { value, error } = registerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'AUTH.INVALID_REGISTER_PAYLOAD',
        'Invalid registration payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const user = await registerUser({
      ...value,
      remoteIp: req.ip
    });

    return sendCreated(res, { user }, 'Account registered successfully');
  } catch (err) {
    next(err);
  }
};

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().optional()
});

const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'lax' : 'lax',
    secure: isProd,
    path: '/api/auth/refresh',
    maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7) * 24 * 60 * 60 * 1000
  };
};

const setRefreshCookie = (res, token) => {
  res.cookie('refresh_token', token, cookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
};

export const login = async (req, res, next) => {
  try {
    const { value, error } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'AUTH.INVALID_LOGIN_PAYLOAD',
        'Invalid login payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const payload = await authenticateUser({
      ...value,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
    if (payload.refreshToken) {
      setRefreshCookie(res, payload.refreshToken);
    }
    return sendSuccess(res, { token: payload.token, user: payload.user }, 'Authentication successful');
  } catch (err) {
    next(err);
  }
};

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
});

const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().trim().min(4).max(10).required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required()
});

export const forgotPassword = async (req, res, next) => {
  try {
    const { value, error } = forgotPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'AUTH.INVALID_FORGOT_PASSWORD_PAYLOAD',
        'Invalid forgot password payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const data = await createPasswordResetRequest(value);
    return sendSuccess(
      res,
      data,
      'If the account exists, password reset instructions have been recorded'
    );
  } catch (err) {
    next(err);
  }
};

export const resetPasswordController = async (req, res, next) => {
  try {
    const { value, error } = resetPasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'AUTH.INVALID_RESET_PAYLOAD',
        'Invalid reset password payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    await resetPassword(value);
    return sendSuccess(res, { reset: true }, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { value, error } = verifyEmailSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    if (error) {
      throw new ApiError(
        422,
        'AUTH.INVALID_VERIFICATION_PAYLOAD',
        'Invalid verification payload',
        error.details
      );
    }
    const payload = await verifyRegistrationOtp(value);
    return sendSuccess(res, payload, 'Account verified successfully');
  } catch (err) {
    next(err);
  }
};

export const refreshTokenController = async (req, res, next) => {
  try {
    const { value } = refreshSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true });
    const rawToken = value.refreshToken || req.cookies?.refresh_token;
    const payload = await refreshSession({
      refreshToken: rawToken,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
    if (payload.refreshToken) {
      setRefreshCookie(res, payload.refreshToken);
    }
    return sendSuccess(res, { token: payload.token, user: payload.user }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

export const logoutController = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token || req.body?.refreshToken || null;
    await revokeRefreshSession(token);
    clearRefreshCookie(res);
    return sendSuccess(res, { loggedOut: true }, 'Logged out');
  } catch (err) {
    next(err);
  }
};

export const changePasswordController = async (req, res, next) => {
  try {
    const { value, error } = changePasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    if (error) {
      throw new ApiError(
        422,
        'AUTH.INVALID_CHANGE_PASSWORD',
        'Invalid change password payload',
        error.details
      );
    }
    await changePassword({
      userId: req.user.id,
      currentPassword: value.currentPassword,
      newPassword: value.newPassword
    });
    return sendSuccess(res, { updated: true }, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
};
