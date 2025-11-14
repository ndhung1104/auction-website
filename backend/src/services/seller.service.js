import { ApiError } from '../utils/response.js';
import { findUserById } from '../repositories/user.repository.js';
import {
  createSellerRequest,
  findLatestSellerRequest,
  findPendingSellerRequest
} from '../repositories/sellerRequest.repository.js';

const SELLER_REQUEST_TTL_DAYS = Number(process.env.SELLER_REQUEST_TTL_DAYS || 7);

export const mapSellerRequest = (row) => ({
  id: row.id,
  status: row.status,
  requestedAt: row.requested_at,
  expireAt: row.expire_at,
  processedAt: row.processed_at
});

export const requestSellerUpgrade = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'PROFILE.NOT_FOUND', 'User profile not found');
  }

  if (user.role === 'SELLER' || user.role === 'ADMIN') {
    throw new ApiError(409, 'SELLER_REQUEST.ALREADY_SELLER', 'You are already a seller');
  }

  const pending = await findPendingSellerRequest(userId);
  if (pending) {
    throw new ApiError(
      409,
      'SELLER_REQUEST.PENDING',
      'You already have a pending seller upgrade request'
    );
  }

  const now = new Date();
  const expireAt = new Date(now.getTime() + SELLER_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [created] = await createSellerRequest({
    user_id: userId,
    status: 'PENDING',
    requested_at: now,
    expire_at: expireAt,
    processed_at: null
  });

  return mapSellerRequest(created);
};

export const getLatestSellerRequest = async (userId) => {
  const row = await findLatestSellerRequest(userId);
  return row ? mapSellerRequest(row) : null;
};
