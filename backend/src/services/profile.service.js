import db from '../db/knex.js';
import { findUserByEmail, findUserById, updateUser } from '../repositories/user.repository.js';
import { ApiError } from '../utils/response.js';
import { aggregateRating } from '../utils/rating.js';
import { getLatestSellerRequest } from './seller.service.js';
import { findWatchlistByUser } from '../repositories/watchlist.repository.js';
import { findRatingsReceivedByUser } from '../repositories/rating.repository.js';

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
  dateOfBirth: row.date_of_birth,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const canRequestSeller = (userRow, latestRequest) => {
  if (userRow.role !== 'BIDDER') return false;
  if (!latestRequest) return true;
  if (latestRequest.status !== 'PENDING') return true;
  return latestRequest.expireAt && new Date(latestRequest.expireAt) < new Date();
};

const mapProductSummary = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  currentPrice: Number(row.current_price),
  endAt: row.end_at,
  status: row.status
});

const mapActiveBid = (row, userId) => ({
  ...mapProductSummary(row),
  isLeading: String(row.current_bidder_id) === String(userId)
});

export const getProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'PROFILE.NOT_FOUND', 'User profile not found');
  }

  const activeBidProductIds = await db('bids')
    .distinct('product_id')
    .where({ user_id: userId })
    .then((rows) => rows.map((row) => row.product_id));

  const [rating, sellerRequest, watchlistRows, activeRows, wonRows, sellerActiveRows, sellerEndedRows, ratingRows] = await Promise.all([
    aggregateRating(userId),
    getLatestSellerRequest(userId),
    findWatchlistByUser(userId),
    activeBidProductIds.length
      ? db('products')
          .select('id', 'name', 'slug', 'current_price', 'end_at', 'status', 'current_bidder_id')
          .whereIn('id', activeBidProductIds)
          .andWhere('status', 'ACTIVE')
          .orderBy('end_at', 'asc')
          .limit(10)
      : Promise.resolve([]),
    db('products')
      .where({ current_bidder_id: userId, status: 'ENDED' })
      .orderBy('end_at', 'desc')
      .limit(10),
    user.role === 'SELLER'
      ? db('products')
          .where({ seller_id: userId, status: 'ACTIVE' })
          .orderBy('end_at', 'asc')
          .limit(10)
      : Promise.resolve([]),
    user.role === 'SELLER'
      ? db('products')
          .where({ seller_id: userId, status: 'ENDED' })
          .orderBy('end_at', 'desc')
          .limit(10)
      : Promise.resolve([]),
    findRatingsReceivedByUser(userId, 20)
  ]);

  return {
    user: mapUserProfile(user),
    rating,
    sellerRequest,
    canRequestSeller: canRequestSeller(user, sellerRequest),
    watchlist: watchlistRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      currentPrice: Number(row.current_price),
      endAt: row.end_at,
      status: row.status,
      addedAt: row.added_at
    })),
    activeBids: activeRows.map((row) => mapActiveBid(row, userId)),
    wonAuctions: wonRows.map(mapProductSummary),
    sellerListings: {
      active: sellerActiveRows.map(mapProductSummary),
      ended: sellerEndedRows.map(mapProductSummary)
    },
    ratingHistory: ratingRows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      score: row.score,
      comment: row.comment,
      createdAt: row.created_at,
      rater: {
        name: row.rater_name,
        email: row.rater_email
      }
    }))
  };
};

export const updateProfile = async (userId, payload) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'PROFILE.NOT_FOUND', 'User profile not found');
  }

  if (payload.email && payload.email !== user.email) {
    const existing = await findUserByEmail(payload.email);
    if (existing && String(existing.id) !== String(userId)) {
      throw new ApiError(409, 'PROFILE.EMAIL_IN_USE', 'Email is already associated with another account');
    }
  }

  const updateData = {
    full_name: payload.fullName ?? user.full_name,
    phone_number: payload.phoneNumber ?? user.phone_number,
    address: payload.address ?? user.address,
    date_of_birth: payload.dateOfBirth ?? user.date_of_birth,
    email: payload.email ?? user.email
  };

  const [updated] = await updateUser(userId, updateData);
  return mapUserProfile(updated);
};
