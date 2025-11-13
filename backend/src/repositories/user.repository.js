import db from '../db/knex.js';

export const findUserById = async (id) => {
    return db('users').where({ id }).first();
}

export const findUserByEmail = async (email) => {
    return db('users').where({ email }).first();
}

export const createUser = async (userData) => {
    db('users').insert(userData).returning(['id', 'email', 'full_name', 'role', 'status']);
}

export const updateUser = async (id, updateData) => {
    db('users').where({ id }).update(updateData, ['id', 'email', 'full_name', 'role', 'status']);
}