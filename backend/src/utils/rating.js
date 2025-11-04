import db from '../db/knex.js';

export const aggregateRating = async (userId) => {
  const result = await db('ratings')
    .where('rated_user_id', userId)
    .select(
      db.raw("SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as positive"),
      db.raw("SUM(CASE WHEN score = -1 THEN 1 ELSE 0 END) as negative")
    )
    .first();

  return {
    positive: Number(result?.positive || 0),
    negative: Number(result?.negative || 0),
    score: Number(result?.positive || 0) - Number(result?.negative || 0)
  };
};