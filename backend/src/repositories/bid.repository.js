import db from '../db/knex.js';

export const insertBid = (bidData, trx = db) =>
  trx('bids')
    .insert(bidData)
    .returning(['id', 'product_id', 'user_id', 'bid_amount', 'is_auto_bid', 'created_at']);

export const deleteBidsByProductId = (productId, trx = db) =>
  trx('bids').where({ product_id: productId }).del();
