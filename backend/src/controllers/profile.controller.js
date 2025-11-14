import Joi from 'joi';
import { getProfile as getProfileService, updateProfile as updateProfileService } from '../services/profile.service.js';
import { sendSuccess, ApiError } from '../utils/response.js';

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(120).optional(),
  phoneNumber: Joi.string().max(30).allow('', null),
  address: Joi.string().max(255).allow('', null)
}).min(1);

export const getProfile = async (req, res, next) => {
  try {
    const profile = await getProfileService(req.user.id);
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { value, error } = updateProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'PROFILE.INVALID_PAYLOAD',
        'Invalid profile payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const sanitized = {
      ...value,
      phoneNumber: value.phoneNumber === '' ? null : value.phoneNumber,
      address: value.address === '' ? null : value.address
    };

    const updatedUser = await updateProfileService(req.user.id, sanitized);
    return sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};
