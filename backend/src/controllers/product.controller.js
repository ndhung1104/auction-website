import Joi from 'joi';
import {
  createProductListing,
  getProductBidHistory,
  getProductDetail,
  listProducts
} from '../services/product.service.js';
import { cleanupUploadedFiles, buildPublicUrl } from '../middlewares/upload.js';
import { ApiError, sendCreated, sendSuccess } from '../utils/response.js';

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

const booleanField = Joi.boolean()
  .truthy('true')
  .truthy('1')
  .truthy(1)
  .falsy('false')
  .falsy('0')
  .falsy(0);

const createProductSchema = Joi.object({
  name: Joi.string().min(4).max(255).required(),
  description: Joi.string().max(4000).allow('', null),
  categoryId: Joi.number().integer().min(1).required(),
  startPrice: Joi.number().integer().min(0).required(),
  priceStep: Joi.number().integer().min(1).required(),
  buyNowPrice: Joi.alternatives()
    .try(Joi.number().integer().min(Joi.ref('startPrice')), Joi.valid(null))
    .optional(),
  autoExtend: booleanField.default(true),
  enableAutoBid: booleanField.default(true),
  startAt: Joi.date().iso().optional(),
  endAt: Joi.date().iso().required()
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

export const createProduct = async (req, res, next) => {
  const uploadedFiles = req.files || [];
  try {
    const rawPayload = { ...req.body };
    if (rawPayload.buyNowPrice === '' || typeof rawPayload.buyNowPrice === 'undefined') {
      rawPayload.buyNowPrice = null;
    }

    const { value, error } = createProductSchema.validate(rawPayload, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });

    if (error) {
      cleanupUploadedFiles(uploadedFiles);
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_PAYLOAD',
        'Invalid product payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    if (!uploadedFiles.length || uploadedFiles.length < 3) {
      cleanupUploadedFiles(uploadedFiles);
      throw new ApiError(
        422,
        'PRODUCTS.MIN_IMAGES',
        'At least three product images are required'
      );
    }

    const startAt = value.startAt || new Date().toISOString();
    if (new Date(value.endAt) <= new Date(startAt)) {
      cleanupUploadedFiles(uploadedFiles);
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_DATES',
        'End time must be later than start time'
      );
    }

    const imagePayload = uploadedFiles.map((file) => ({
      url: buildPublicUrl(file.path)
    }));

    const result = await createProductListing({
      sellerId: req.user.id,
      ...value,
      startAt,
      images: imagePayload
    });

    return sendCreated(res, result, 'Product created successfully');
  } catch (err) {
    if (err) {
      cleanupUploadedFiles(uploadedFiles);
    }
    next(err);
  }
};
