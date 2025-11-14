import Joi from 'joi';
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '../services/watchlist.service.js';
import { ApiError, sendSuccess } from '../utils/response.js';

const idParamSchema = Joi.object({
  productId: Joi.number().integer().min(1).required()
});

export const listWatchlist = async (req, res, next) => {
  try {
    const items = await getWatchlist(req.user.id);
    return sendSuccess(res, { items });
  } catch (err) {
    next(err);
  }
};

export const addWatchlist = async (req, res, next) => {
  try {
    const { value, error } = idParamSchema.validate(req.params, {
      abortEarly: false,
      convert: true
    });

    if (error) {
      throw new ApiError(
        422,
        'WATCHLIST.INVALID_ID',
        'Invalid product identifier',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const payload = await addToWatchlist(req.user.id, value.productId);
    return sendSuccess(res, payload, 'Added to watchlist');
  } catch (err) {
    next(err);
  }
};

export const removeWatchlist = async (req, res, next) => {
  try {
    const { value, error } = idParamSchema.validate(req.params, {
      abortEarly: false,
      convert: true
    });

    if (error) {
      throw new ApiError(
        422,
        'WATCHLIST.INVALID_ID',
        'Invalid product identifier',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const payload = await removeFromWatchlist(req.user.id, value.productId);
    return sendSuccess(res, payload, 'Removed from watchlist');
  } catch (err) {
    next(err);
  }
};
