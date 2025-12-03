import db from '../db/knex.js';

const DEFAULT_LIMIT = 20;
const SEARCH_SANITIZE_REGEX = /[^\p{L}\p{N}\s]/gu;

const SORT_FIELDS = {
  'end_at': 'p.end_at',
  'price': 'p.current_price',
  'bid_count': 'p.bid_count',
  'created_at': 'p.created_at'
};

const sanitizeTerm = (value = '') =>
  value
    .toString()
    .replace(SEARCH_SANITIZE_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const applyCategoryFilter = (query, categoryId) => {
  if (!categoryId) return query;
  const subCategories = db('categories')
    .select('id')
    .where('id', categoryId)
    .orWhere('parent_id', categoryId);
  return query.whereIn('p.category_id', subCategories);
};

export const searchCategories = async ({ term, limit = 10 }) => {
  const sanitized = sanitizeTerm(term);
  if (!sanitized) {
    return [];
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  return db('categories as c')
    .select('c.id', 'c.name', 'c.parent_id')
    .whereILike('c.name', `%${sanitized}%`)
    .orderBy('c.name', 'asc')
    .limit(safeLimit);
};

export const searchProducts = async ({ term, limit = DEFAULT_LIMIT, offset = 0, categoryId = null, sort = null }) => {
  const sanitized = sanitizeTerm(term);
  if (!sanitized) {
    return { rows: [], total: 0 };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 60);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const baseQuery = db('products as p')
    .where('p.status', 'ACTIVE')
    .andWhereRaw("p.search_vector @@ websearch_to_tsquery('simple', ?)", [sanitized]);

  applyCategoryFilter(baseQuery, categoryId);

  const totalRow = await baseQuery.clone().count({ count: '*' }).first();

  const rowsQuery = baseQuery
    .clone()
    .select('p.*');

  if (sort) {
    const [fieldRaw, dirRaw] = sort.split(',');
    const field = SORT_FIELDS[fieldRaw] || 'p.end_at';
    const direction = dirRaw?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    rowsQuery.orderBy(field, direction);
  } else {
    rowsQuery.orderBy('p.end_at', 'asc');
  }

  const rows = await rowsQuery.limit(safeLimit).offset(safeOffset);

  return {
    rows,
    total: Number(totalRow?.count || 0)
  };
};
