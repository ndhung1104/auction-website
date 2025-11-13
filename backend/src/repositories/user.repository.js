import db from '../db/knex.js';

export const findUserById = async (id) =>
  db('users').where({ id }).first();

export const findUserByEmail = async (email) =>
  db('users').where({ email }).first();

export const createUser = async (userData, trx = db) =>
  trx('users')
    .insert(userData)
    .returning(['id', 'email', 'full_name', 'role', 'status']);

export const updateUser = async (id, updateData, trx = db) =>
  trx('users')
    .where({ id })
    .update(updateData, ['id', 'email', 'full_name', 'role', 'status']);
