import db from '../db/knex.js';

const DEFAULT_LIMIT = 20;
const SEARCH_SANITIZE_REGEX = /[^\p{L}\p{N}\s]/gu;

const sanitizeTerm = (value = '') =>
  value
    .toString()
    .replace(SEARCH_SANITIZE_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const searchProducts = async ({ term, limit = DEFAULT_LIMIT, offset = 0 }) => {
  const sanitized = sanitizeTerm(term);
  if (!sanitized) {
    return { rows: [], total: 0 };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 60);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const baseQuery = db('products as p')
    .where('p.status', 'ACTIVE')
    .andWhereRaw("p.search_vector @@ websearch_to_tsquery('simple', ?)", [sanitized]);

  const totalRow = await baseQuery.clone().count({ count: '*' }).first();
  const rows = await baseQuery
    .clone()
    .select('p.*')
    .orderBy('p.end_at', 'asc')
    .limit(safeLimit)
    .offset(safeOffset);

  return {
    rows,
    total: Number(totalRow?.count || 0)
  };
};
