import { fetchCategoryTree } from '../services/category.service.js';
import { sendSuccess } from '../utils/response.js';

export const listCategories = async (_req, res, next) => {
  try {
    const categories = await fetchCategoryTree();
    return sendSuccess(res, { categories });
  } catch (err) {
    next(err);
  }
};
