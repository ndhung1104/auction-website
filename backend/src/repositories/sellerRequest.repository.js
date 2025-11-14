import db from '../db/knex.js';

export const findPendingSellerRequest = (userId) =>
  db('seller_requests')
    .where({ user_id: userId, status: 'PENDING' })
    .andWhere('expire_at', '>', db.fn.now())
    .orderBy('requested_at', 'desc')
    .first();

export const findLatestSellerRequest = (userId) =>
  db('seller_requests')
    .where({ user_id: userId })
    .orderBy('requested_at', 'desc')
    .first();

export const createSellerRequest = (payload, trx = db) =>
  trx('seller_requests')
    .insert(payload)
    .returning(['id', 'status', 'requested_at', 'expire_at', 'processed_at']);
