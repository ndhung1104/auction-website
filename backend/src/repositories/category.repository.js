import db from '../db/knex.js';

export const getAllCategories = () =>
  db('categories')
    .select('id', 'name', 'parent_id')
    .orderBy([{ column: 'parent_id', order: 'asc' }, { column: 'name', order: 'asc' }]);

export const findCategoryById = (id) =>
  db('categories').select('id', 'name', 'parent_id').where({ id }).first();

export const createCategory = (payload, trx = db) =>
  trx('categories')
    .insert(payload)
    .returning(['id', 'name', 'parent_id', 'created_at']);

export const updateCategory = (id, payload, trx = db) =>
  trx('categories')
    .where({ id })
    .update(payload, ['id', 'name', 'parent_id', 'updated_at']);

export const deleteCategory = (id, trx = db) =>
  trx('categories').where({ id }).del();
