import db from '../db/knex.js';

export const createAnswer = (payload, trx = db) =>
  trx('answers')
    .insert(payload)
    .returning(['id', 'question_id', 'user_id', 'answer_text', 'created_at']);

export const findAnswerByQuestionId = (questionId) =>
  db('answers')
    .where({ question_id: questionId })
    .first();
