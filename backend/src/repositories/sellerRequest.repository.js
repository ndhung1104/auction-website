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

export const listSellerRequests = (limit = 50, offset = 0) =>
  db('seller_requests as sr')
    .leftJoin('users as u', 'u.id', 'sr.user_id')
    .select(
      'sr.id',
      'sr.user_id',
      'sr.status',
      'sr.requested_at',
      'sr.expire_at',
      'sr.processed_at',
      'u.email',
      'u.full_name'
    )
    .orderBy('sr.requested_at', 'desc')
    .limit(limit)
    .offset(offset);

export const updateSellerRequestStatus = (id, status, trx = db) =>
  trx('seller_requests')
    .where({ id })
    .update(
      {
        status,
        processed_at: trx.fn.now()
      },
      ['id', 'user_id', 'status', 'processed_at']
    );
