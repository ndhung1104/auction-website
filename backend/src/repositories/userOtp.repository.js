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
