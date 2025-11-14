import { findSettingByKey } from '../repositories/setting.repository.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

export const SettingKeys = {
  HIGHLIGHT_NEW_MINUTES: 'highlight_new_minutes'
};

const getFromCache = (key) => {
  if (!cache.has(key)) {
    return { hit: false };
  }

  const entry = cache.get(key);
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return { hit: false };
  }

  return { hit: true, value: entry.value };
};

const putInCache = (key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
};

export const getSettingValue = async (key, defaultValue = null) => {
  const { hit, value } = getFromCache(key);
  if (hit) return value;

  const row = await findSettingByKey(key);
  const resolvedValue = row?.value ?? defaultValue ?? null;
  putInCache(key, resolvedValue);
  return resolvedValue;
};

export const getHighlightNewMinutes = async (fallback = 60) => {
  const raw = await getSettingValue(SettingKeys.HIGHLIGHT_NEW_MINUTES, String(fallback));
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};
