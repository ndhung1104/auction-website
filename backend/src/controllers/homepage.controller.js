import { buildHomepagePayload } from '../services/homepage.service.js';
import { sendSuccess } from '../utils/response.js';

export const getHomepageContent = async (_req, res, next) => {
  try {
    const sections = await buildHomepagePayload();
    return sendSuccess(res, sections);
  } catch (err) {
    next(err);
  }
};
