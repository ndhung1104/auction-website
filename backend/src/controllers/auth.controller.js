import Joi from 'joi';
import { authenticateUser, createPasswordResetRequest, registerUser, resetPassword } from '../services/auth.service.js';
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

    const payload = await authenticateUser(value);
    return sendSuccess(res, payload, 'Authentication successful');
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
