import db from '../db/knex.js';

export const findSettingByKey = (key) =>
  db('settings').where({ key }).first();

export const findSettingsByKeys = (keys = []) => {
  if (!Array.isArray(keys) || !keys.length) return [];
  return db('settings').whereIn('key', keys);
};
