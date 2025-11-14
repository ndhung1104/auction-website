import db from '../db/knex.js';

export const findAutoBidsByProduct = (productId, trx = db) =>
  trx('auto_bids')
    .where({ product_id: productId })
    .orderBy([
      { column: 'max_bid_amount', order: 'desc' },
      { column: 'created_at', order: 'asc' }
    ]);

export const upsertAutoBid = ({ productId, userId, maxBidAmount }, trx = db) =>
  trx('auto_bids')
    .insert({
      product_id: productId,
      user_id: userId,
      max_bid_amount: maxBidAmount
    })
    .onConflict(['product_id', 'user_id'])
    .merge({
      max_bid_amount: maxBidAmount,
      updated_at: trx.fn.now()
    })
    .returning(['id', 'product_id', 'user_id', 'max_bid_amount', 'created_at', 'updated_at']);

export const deleteAutoBidsByProductId = (productId, trx = db) =>
  trx('auto_bids').where({ product_id: productId }).del();
