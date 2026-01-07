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

const applyRangeFilter = (query, column, min, max) => {
  if (min !== undefined && min !== null) {
    query.where(column, '>=', min);
  }
  if (max !== undefined && max !== null) {
    query.where(column, '<=', max);
  }
};

const buildGroupFilter = (filters) => {
  const groups = [];

  const addGroup = (logic, handler) => {
    groups.push({ logic: logic === 'or' ? 'or' : 'and', handler });
  };

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    addGroup(filters.priceLogic, (qb) => applyRangeFilter(qb, 'p.current_price', filters.priceMin, filters.priceMax));
  }

  if (filters.bidMin !== undefined || filters.bidMax !== undefined) {
    addGroup(filters.bidLogic, (qb) => applyRangeFilter(qb, 'p.bid_count', filters.bidMin, filters.bidMax));
  }

  if (typeof filters.allowUnrated === 'boolean') {
    addGroup(filters.allowUnratedLogic, (qb) => qb.where('p.allow_unrated_bidders', filters.allowUnrated));
  }

  if (filters.startAtFrom || filters.startAtTo) {
    addGroup(filters.startAtLogic, (qb) => applyRangeFilter(qb, 'p.start_at', filters.startAtFrom, filters.startAtTo));
  }

  if (filters.endAtFrom || filters.endAtTo) {
    addGroup(filters.endAtLogic, (qb) => applyRangeFilter(qb, 'p.end_at', filters.endAtFrom, filters.endAtTo));
  }

  return groups;
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

export const searchProducts = async ({
  term,
  limit = DEFAULT_LIMIT,
  offset = 0,
  categoryId = null,
  sort = null,
  priceMin,
  priceMax,
  priceLogic = 'and',
  bidMin,
  bidMax,
  bidLogic = 'and',
  allowUnrated,
  allowUnratedLogic = 'and',
  startAtFrom,
  startAtTo,
  startAtLogic = 'and',
  endAtFrom,
  endAtTo,
  endAtLogic = 'and'
}) => {
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
  const groups = buildGroupFilter({
    priceMin,
    priceMax,
    priceLogic,
    bidMin,
    bidMax,
    bidLogic,
    allowUnrated,
    allowUnratedLogic,
    startAtFrom,
    startAtTo,
    startAtLogic,
    endAtFrom,
    endAtTo,
    endAtLogic
  });

  if (groups.length) {
    baseQuery.andWhere((qb) => {
      groups.forEach((group, index) => {
        if (index === 0) {
          qb.where((sub) => group.handler(sub));
          return;
        }
        if (group.logic === 'or') {
          qb.orWhere((sub) => group.handler(sub));
        } else {
          qb.andWhere((sub) => group.handler(sub));
        }
      });
    });
  }

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
    rowsQuery.orderBy('p.created_at', 'desc');
  }

  const rows = await rowsQuery.limit(safeLimit).offset(safeOffset);

  return {
    rows,
    total: Number(totalRow?.count || 0)
  };
};
