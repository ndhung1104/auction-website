import Joi from 'joi';
import { searchActiveProducts, searchCategoriesByName } from '../services/search.service.js';
import { sendSuccess } from '../utils/response.js';

const searchSchema = Joi.object({
  q: Joi.string().trim().min(2).max(120).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(60).default(12),
  categoryId: Joi.number().integer().min(1).optional(),
  sort: Joi.string()
    .valid('end_at,asc', 'end_at,desc', 'price,asc', 'price,desc', 'bid_count,desc', 'created_at,desc')
    .optional(),
  priceMin: Joi.number().integer().min(0).optional(),
  priceMax: Joi.number().integer().min(0).optional(),
  priceLogic: Joi.string().lowercase().valid('and', 'or').optional(),
  bidMin: Joi.number().integer().min(0).optional(),
  bidMax: Joi.number().integer().min(0).optional(),
  bidLogic: Joi.string().lowercase().valid('and', 'or').optional(),
  allowUnrated: Joi.boolean().optional(),
  allowUnratedLogic: Joi.string().lowercase().valid('and', 'or').optional(),
  startAtFrom: Joi.date().iso().optional(),
  startAtTo: Joi.date().iso().optional(),
  startAtLogic: Joi.string().lowercase().valid('and', 'or').optional(),
  endAtFrom: Joi.date().iso().optional(),
  endAtTo: Joi.date().iso().optional(),
  endAtLogic: Joi.string().lowercase().valid('and', 'or').optional()
});

export const search = async (req, res, next) => {
  try {
    const { value, error } = searchSchema.validate(req.query, {
      abortEarly: false,
      convert: true
    });
    if (error) {
      return sendSuccess(res, { items: [], meta: { total: 0, page: 1, limit: 12, hasMore: false } }, 'Invalid search filters');
    }

    if (value.priceMin && value.priceMax && value.priceMin > value.priceMax) {
      return sendSuccess(res, { items: [], meta: { total: 0, page: 1, limit: 12, hasMore: false } }, 'Invalid price range');
    }
    if (value.bidMin && value.bidMax && value.bidMin > value.bidMax) {
      return sendSuccess(res, { items: [], meta: { total: 0, page: 1, limit: 12, hasMore: false } }, 'Invalid bid count range');
    }
    if (value.startAtFrom && value.startAtTo && value.startAtFrom > value.startAtTo) {
      return sendSuccess(res, { items: [], meta: { total: 0, page: 1, limit: 12, hasMore: false } }, 'Invalid start date range');
    }
    if (value.endAtFrom && value.endAtTo && value.endAtFrom > value.endAtTo) {
      return sendSuccess(res, { items: [], meta: { total: 0, page: 1, limit: 12, hasMore: false } }, 'Invalid end date range');
    }

    const page = value.page;
    const limit = value.limit;
    const offset = (page - 1) * limit;

    const [productResult, categoryResult] = await Promise.all([
      searchActiveProducts({
        term: value.q,
        limit,
        offset,
        categoryId: value.categoryId,
        sort: value.sort,
        priceMin: value.priceMin,
        priceMax: value.priceMax,
        priceLogic: value.priceLogic,
        bidMin: value.bidMin,
        bidMax: value.bidMax,
        bidLogic: value.bidLogic,
        allowUnrated: value.allowUnrated,
        allowUnratedLogic: value.allowUnratedLogic,
        startAtFrom: value.startAtFrom,
        startAtTo: value.startAtTo,
        startAtLogic: value.startAtLogic,
        endAtFrom: value.endAtFrom,
        endAtTo: value.endAtTo,
        endAtLogic: value.endAtLogic
      }),
      searchCategoriesByName({ term: value.q, limit: 10 })
    ]);

    const { items, total } = productResult;

    const meta = {
      total,
      page,
      limit,
      hasMore: offset + items.length < total
    };

    return sendSuccess(res, { items, categories: categoryResult, meta });
  } catch (err) {
    next(err);
  }
};
