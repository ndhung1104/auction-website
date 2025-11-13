import Joi from 'joi';
import { registerUser } from '../services/auth.service.js';
import { ApiError, sendCreated } from '../utils/response.js';

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
