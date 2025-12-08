import db from '../db/knex.js';

export const findSettingByKey = (key) =>
  db('settings').where({ key }).first();

export const findSettingsByKeys = (keys = []) => {
  if (!Array.isArray(keys) || !keys.length) return [];
  return db('settings').whereIn('key', keys);
};

export const upsertSetting = (key, value) =>
  db('settings')
    .insert({ key, value })
    .onConflict('key')
    .merge({ value, updated_at: db.fn.now() })
    .returning(['key', 'value', 'updated_at']);
