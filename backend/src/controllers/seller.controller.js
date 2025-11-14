import { requestSellerUpgrade } from '../services/seller.service.js';
import { sendCreated } from '../utils/response.js';

export const createSellerRequest = async (req, res, next) => {
  try {
    const request = await requestSellerUpgrade(req.user.id);
    return sendCreated(res, { request }, 'Seller upgrade request submitted');
  } catch (err) {
    next(err);
  }
};
