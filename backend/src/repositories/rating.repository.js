import db from '../db/knex.js';

export const findRatingsReceivedByUser = (userId, limit = 20) =>
  db('ratings as r')
    .leftJoin('users as rater', 'rater.id', 'r.rater_id')
    .select(
      'r.id',
      'r.order_id',
      'r.score',
      'r.comment',
      'r.created_at',
      'rater.full_name as rater_name',
      'rater.email as rater_email'
    )
    .where('r.rated_user_id', userId)
    .orderBy('r.created_at', 'desc')
    .limit(limit);
