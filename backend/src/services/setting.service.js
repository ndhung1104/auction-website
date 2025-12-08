import { findSettingByKey } from '../repositories/setting.repository.js';
import { upsertSetting } from '../repositories/setting.repository.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

export const SettingKeys = {
  HIGHLIGHT_NEW_MINUTES: 'highlight_new_minutes',
  EXTEND_WINDOW_MINUTES: 'extend_window_min',
  EXTEND_AMOUNT_MINUTES: 'extend_amount_min'
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

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

export const getExtendSettings = async () => {
  const DEFAULT_WINDOW = 5;
  const DEFAULT_EXTEND = 10;

  const [windowRaw, extendRaw] = await Promise.all([
    getSettingValue(SettingKeys.EXTEND_WINDOW_MINUTES, String(DEFAULT_WINDOW)),
    getSettingValue(SettingKeys.EXTEND_AMOUNT_MINUTES, String(DEFAULT_EXTEND))
  ]);

  return {
    windowMinutes: parsePositiveNumber(windowRaw, DEFAULT_WINDOW),
    extendMinutes: parsePositiveNumber(extendRaw, DEFAULT_EXTEND)
  };
};

export const updateExtendSettings = async ({ windowMinutes, extendMinutes }) => {
  if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
    throw new Error('windowMinutes must be a positive number');
  }
  if (!Number.isFinite(extendMinutes) || extendMinutes <= 0) {
    throw new Error('extendMinutes must be a positive number');
  }

  const values = [
    { key: SettingKeys.EXTEND_WINDOW_MINUTES, value: String(windowMinutes) },
    { key: SettingKeys.EXTEND_AMOUNT_MINUTES, value: String(extendMinutes) }
  ];

  await Promise.all(values.map(({ key, value }) => upsertSetting(key, value)));
  values.forEach(({ key, value }) => putInCache(key, value));

  return {
    windowMinutes,
    extendMinutes
  };
};
