import db from '../db/knex.js';

export const addToBidBlacklist = (productId, userId, reason = null, trx = db) =>
  trx('bid_blacklist')
    .insert({
      product_id: productId,
      user_id: userId,
      reason
    })
    .onConflict(['product_id', 'user_id'])
    .merge({ reason, created_at: trx.fn.now() });

export const isBlacklisted = (productId, userId) =>
  db('bid_blacklist').where({ product_id: productId, user_id: userId }).first();
