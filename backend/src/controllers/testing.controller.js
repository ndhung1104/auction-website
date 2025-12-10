import { seedBaseline, getSeedStatus } from '../services/testing.service.js';
import { sendSuccess } from '../utils/response.js';

export const seedData = async (req, res, next) => {
  try {
    const result = await seedBaseline(req.body || {});
    return sendSuccess(res, result, 'Test data seeded');
  } catch (err) {
    next(err);
  }
};

export const seedStatus = async (_req, res, next) => {
  try {
    const status = await getSeedStatus();
    return sendSuccess(res, status, 'Seed status');
  } catch (err) {
    next(err);
  }
};
