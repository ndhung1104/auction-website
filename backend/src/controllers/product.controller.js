import Joi from 'joi';
import { listProducts } from '../services/product.service.js';
import { ApiError, sendSuccess } from '../utils/response.js';

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string().pattern(/^[a-z_]+,(asc|desc)$/i).optional(),
  categoryId: Joi.number().integer().min(1).optional()
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
