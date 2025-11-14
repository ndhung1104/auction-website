import Joi from 'joi';
import { getProductBidHistory, getProductDetail, listProducts } from '../services/product.service.js';
import { ApiError, sendSuccess } from '../utils/response.js';

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string().pattern(/^[a-z_]+,(asc|desc)$/i).optional(),
  categoryId: Joi.number().integer().min(1).optional()
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().min(1).required()
});

const bidQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional()
});

export const getProducts = async (req, res, next) => {
  try {
    const { value, error } = querySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_QUERY',
        'Invalid product list filters',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const { items, meta } = await listProducts(value);
    return sendSuccess(res, { items }, null, meta);
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { value, error } = idParamSchema.validate(req.params, {
      abortEarly: false,
      convert: true
    });

    if (error) {
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_ID',
        'Invalid product identifier',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const detail = await getProductDetail(value.id);
    return sendSuccess(res, detail);
  } catch (err) {
    next(err);
  }
};

export const getProductBids = async (req, res, next) => {
  try {
    const { value: params, error: paramsError } = idParamSchema.validate(req.params, {
      abortEarly: false,
      convert: true
    });

    if (paramsError) {
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_ID',
        'Invalid product identifier',
        paramsError.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const { value: query, error: queryError } = bidQuerySchema.validate(req.query, {
      abortEarly: false,
      convert: true
    });

    if (queryError) {
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_QUERY',
        'Invalid bid history filters',
        queryError.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const bids = await getProductBidHistory(params.id, query.limit);
    return sendSuccess(res, { bids });
  } catch (err) {
    next(err);
  }
};
