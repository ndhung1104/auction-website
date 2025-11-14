import db from '../db/knex.js';

export const getAllCategories = () =>
  db('categories')
    .select('id', 'name', 'parent_id')
    .orderBy([{ column: 'parent_id', order: 'asc' }, { column: 'name', order: 'asc' }]);

export const findCategoryById = (id) =>
  db('categories').select('id', 'name', 'parent_id').where({ id }).first();
