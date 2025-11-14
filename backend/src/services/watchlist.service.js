import { ApiError } from '../utils/response.js';
import { findProductStatusById } from '../repositories/product.repository.js';
import {
  addWatchlistItem,
  findWatchlistByUser,
  findWatchlistItem,
  removeWatchlistItem
} from '../repositories/watchlist.repository.js';

export const addToWatchlist = async (userId, productId) => {
  const product = await findProductStatusById(productId);
  if (!product) {
    throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found');
  }
  await addWatchlistItem(userId, productId);
  return { productId };
};

export const removeFromWatchlist = async (userId, productId) => {
  await removeWatchlistItem(userId, productId);
  return { productId };
};

export const getWatchlist = async (userId) => {
  const items = await findWatchlistByUser(userId);
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    currentPrice: Number(item.current_price),
    endAt: item.end_at,
    status: item.status,
    enableAutoBid: item.enable_auto_bid,
    addedAt: item.added_at
  }));
};

export const isProductWatchlisted = (userId, productId) => {
  if (!userId) return Promise.resolve(false);
  return findWatchlistItem(userId, productId).then(Boolean);
};
