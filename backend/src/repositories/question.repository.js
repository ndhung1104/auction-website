import db from '../db/knex.js';

export const createQuestion = (payload, trx = db) =>
  trx('questions')
    .insert(payload)
    .returning(['id', 'product_id', 'user_id', 'question_text', 'created_at']);

export const findQuestionById = (id) =>
  db('questions').where({ id }).first();

export const findQuestionsByProduct = (productId, limit = 10) =>
  db('questions as q')
    .leftJoin('users as u', 'u.id', 'q.user_id')
    .select(
      'q.id',
      'q.product_id',
      'q.user_id',
      'q.question_text',
      'q.created_at',
      'u.full_name as asker_name'
    )
    .where('q.product_id', productId)
    .orderBy('q.created_at', 'desc')
    .limit(limit);
