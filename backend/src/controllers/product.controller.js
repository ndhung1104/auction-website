import Joi from 'joi';
import {
  createProductListing,
  getProductBidHistory,
  getProductDetail,
  listProducts,
  placeManualBid,
  registerAutoBid,
  buyNowProduct,
  appendProductDescription as appendDescriptionService,
  rejectBidder as rejectBidderService
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

const manualBidSchema = Joi.object({
  amount: Joi.number().integer().min(1).required()
});

const autoBidSchema = Joi.object({
  maxBidAmount: Joi.number().integer().min(1).required()
});

const appendDescriptionSchema = Joi.object({
  content: Joi.string().min(5).max(4000).required()
});

const rejectBidderSchema = Joi.object({
  bidderId: Joi.number().integer().min(1).required(),
  reason: Joi.string().max(2000).allow('', null)
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
  allowUnratedBidders: booleanField.default(false),
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

    const detail = await getProductDetail(value.id, req.user?.id ?? null);
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

export const submitProductBid = async (req, res, next) => {
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

    const { value: body, error: bodyError } = manualBidSchema.validate(req.body, {
      abortEarly: false,
      convert: true
    });

    if (bodyError) {
      throw new ApiError(
        422,
        'BIDS.INVALID_PAYLOAD',
        'Invalid bid payload',
        bodyError.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const result = await placeManualBid({
      productId: params.id,
      userId: req.user.id,
      amount: body.amount
    });

    return sendCreated(res, result, 'Bid placed successfully');
  } catch (err) {
    next(err);
  }
};

export const submitAutoBid = async (req, res, next) => {
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

    const { value: body, error: bodyError } = autoBidSchema.validate(req.body, {
      abortEarly: false,
      convert: true
    });

    if (bodyError) {
      throw new ApiError(
        422,
        'AUTO_BID.INVALID_PAYLOAD',
        'Invalid auto-bid payload',
        bodyError.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const result = await registerAutoBid({
      productId: params.id,
      userId: req.user.id,
      maxBidAmount: body.maxBidAmount
    });

    return sendCreated(res, result, 'Auto-bid saved successfully');
  } catch (err) {
    next(err);
  }
};

export const buyNow = async (req, res, next) => {
  try {
    const { value: params, error } = idParamSchema.validate(req.params, {
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

    const result = await buyNowProduct({
      productId: params.id,
      userId: req.user.id
    });

    return sendSuccess(res, result, 'Purchase successful');
  } catch (err) {
    next(err);
  }
};

export const appendProductDescription = async (req, res, next) => {
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

    const { value, error } = appendDescriptionSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_APPEND',
        'Invalid description payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const payload = await appendDescriptionService({
      productId: params.id,
      sellerId: req.user.id,
      content: value.content
    });

    return sendSuccess(res, payload, 'Description updated');
  } catch (err) {
    next(err);
  }
};

export const rejectBidder = async (req, res, next) => {
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

    const { value, error } = rejectBidderSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        422,
        'PRODUCTS.INVALID_REJECTION',
        'Invalid rejection payload',
        error.details.map(({ message, path }) => ({ message, path }))
      );
    }

    const payload = await rejectBidderService({
      productId: params.id,
      sellerId: req.user.id,
      bidderId: value.bidderId,
      reason: value.reason || null
    });

    return sendSuccess(res, payload, 'Bidder rejected');
  } catch (err) {
    next(err);
  }
};
