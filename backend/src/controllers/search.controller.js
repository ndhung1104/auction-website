import Joi from 'joi';
import { searchActiveProducts, searchCategoriesByName } from '../services/search.service.js';
import { sendSuccess } from '../utils/response.js';

const searchSchema = Joi.object({
  q: Joi.string().trim().min(2).max(120).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(60).default(12)
});

export const search = async (req, res, next) => {
  try {
    const { value, error } = searchSchema.validate(req.query, {
      abortEarly: false,
      convert: true
    });
    if (error) {
      return sendSuccess(res, { items: [], meta: { total: 0, page: 1, limit: 12, hasMore: false } }, 'Search term required');
    }

    const page = value.page;
    const limit = value.limit;
    const offset = (page - 1) * limit;

    const [productResult, categoryResult] = await Promise.all([
      searchActiveProducts({
        term: value.q,
        limit,
        offset
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
