import db from '../db/knex.js';

export const findWatchlistItem = (userId, productId) =>
  db('watchlist').where({ user_id: userId, product_id: productId }).first();

export const addWatchlistItem = (userId, productId, trx = db) =>
  trx('watchlist')
    .insert({ user_id: userId, product_id: productId })
    .onConflict(['user_id', 'product_id'])
    .ignore()
    .returning(['id']);

export const removeWatchlistItem = (userId, productId, trx = db) =>
  trx('watchlist').where({ user_id: userId, product_id: productId }).del();

export const findWatchlistByUser = (userId) =>
  db('watchlist as w')
    .leftJoin('products as p', 'p.id', 'w.product_id')
    .select(
      'p.id',
      'p.name',
      'p.slug',
      'p.current_price',
      'p.end_at',
      'p.status',
      'p.enable_auto_bid',
      'w.created_at as added_at'
    )
    .where('w.user_id', userId)
    .orderBy('w.created_at', 'desc');
