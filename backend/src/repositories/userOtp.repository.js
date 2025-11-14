import db from '../db/knex.js';

const TABLE = 'user_otps';

export const createUserOtp = (payload, trx = db) =>
  (trx || db)(TABLE)
    .insert(payload)
    .returning(['id', 'user_id', 'code', 'purpose', 'expires_at', 'consumed_at']);

export const consumeActiveResetOtps = (userId, trx = db) =>
  (trx || db)(TABLE)
    .where({ user_id: userId, purpose: 'RESET_PASSWORD' })
    .whereNull('consumed_at')
    .update({ consumed_at: db.fn.now() });

export const findActiveResetToken = (token) =>
  db(TABLE)
    .where({ code: token, purpose: 'RESET_PASSWORD' })
    .where('expires_at', '>', db.fn.now())
    .whereNull('consumed_at')
    .first();

export const consumeTokenById = (id, trx = db) =>
  (trx || db)(TABLE)
    .where({ id })
    .update({ consumed_at: db.fn.now() });
