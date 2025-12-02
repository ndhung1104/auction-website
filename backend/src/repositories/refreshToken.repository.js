import db from '../db/knex.js';

export const insertRefreshToken = (payload, trx = db) =>
  (trx || db)('refresh_tokens')
    .insert(payload)
    .returning(['id', 'user_id', 'token_hash', 'expires_at', 'revoked_at', 'rotated_from', 'created_at', 'updated_at']);

export const findRefreshTokenByHash = (tokenHash) =>
  db('refresh_tokens')
    .where({ token_hash: tokenHash })
    .first();

export const revokeRefreshToken = (id, trx = db) =>
  (trx || db)('refresh_tokens')
    .where({ id })
    .update({ revoked_at: (trx || db).fn.now() }, ['id', 'revoked_at']);

export const revokeTokenChain = async (id, trx = db) => {
  const knex = trx || db;
  const token = await knex('refresh_tokens').where({ id }).first();
  if (!token) return;
  await knex('refresh_tokens')
    .where(function () {
      this.where({ id }).orWhere({ rotated_from: id });
    })
    .update({ revoked_at: knex.fn.now() });
};
