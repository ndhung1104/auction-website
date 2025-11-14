import { findUserById, updateUser } from '../repositories/user.repository.js';
import { ApiError } from '../utils/response.js';
import { aggregateRating } from '../utils/rating.js';
import { getLatestSellerRequest } from './seller.service.js';

const mapUserProfile = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  phoneNumber: row.phone_number,
  address: row.address,
  role: row.role,
  status: row.status,
  positiveScore: Number(row.positive_score || 0),
  negativeScore: Number(row.negative_score || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const canRequestSeller = (userRow, latestRequest) => {
  if (userRow.role !== 'BIDDER') return false;
  if (!latestRequest) return true;
  if (latestRequest.status !== 'PENDING') return true;
  return latestRequest.expireAt && new Date(latestRequest.expireAt) < new Date();
};

export const getProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'PROFILE.NOT_FOUND', 'User profile not found');
  }

  const [rating, sellerRequest] = await Promise.all([
    aggregateRating(userId),
    getLatestSellerRequest(userId)
  ]);

  return {
    user: mapUserProfile(user),
    rating,
    sellerRequest,
    canRequestSeller: canRequestSeller(user, sellerRequest)
  };
};

export const updateProfile = async (userId, payload) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'PROFILE.NOT_FOUND', 'User profile not found');
  }

  const updateData = {
    full_name: payload.fullName ?? user.full_name,
    phone_number: payload.phoneNumber ?? user.phone_number,
    address: payload.address ?? user.address
  };

  const [updated] = await updateUser(userId, updateData);
  return mapUserProfile(updated);
};
