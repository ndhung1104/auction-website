import db from '../db/knex.js';

export const insertBid = (bidData, trx = db) =>
  trx('bids')
    .insert(bidData)
    .returning(['id', 'product_id', 'user_id', 'bid_amount', 'is_auto_bid', 'created_at']);

export const deleteBidsByProductId = (productId, trx = db) =>
  trx('bids').where({ product_id: productId }).del();

export const deleteBidsByUser = (productId, userId, trx = db) =>
  trx('bids').where({ product_id: productId, user_id: userId }).del();

export const findTopBids = (productId, limit = 2, trx = db) =>
  trx('bids as b')
    .leftJoin('users as u', 'u.id', 'b.user_id')
    .select(
      'b.id',
      'b.product_id',
      'b.user_id',
      'b.bid_amount',
      'b.is_auto_bid',
      'b.created_at',
      'u.full_name as bidder_name'
    )
    .where('b.product_id', productId)
    .orderBy('b.bid_amount', 'desc')
    .orderBy('b.created_at', 'desc')
    .limit(limit);

export const countBidsByProduct = (productId, trx = db) =>
  trx('bids').where({ product_id: productId }).count({ count: '*' }).first();
