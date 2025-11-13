import db from '../db/knex.js';

const BASE_COLUMNS = [
  'id',
  'name',
  'slug',
  'category_id',
  'seller_id',
  'start_price',
  'price_step',
  'current_price',
  'buy_now_price',
  'auto_extend',
  'enable_auto_bid',
  'current_bidder_id',
  'bid_count',
  'highlight_until',
  'status',
  'start_at',
  'end_at',
  'created_at',
  'updated_at'
];

const buildBaseQuery = (filters = {}) => {
  const query = db('products').select(BASE_COLUMNS).where({ status: 'ACTIVE' });

  if (filters.categoryId) {
    query.andWhere('category_id', filters.categoryId);
  }

  return query;
};

export const countActiveProducts = async (filters = {}) => {
  const [{ count }] = await db('products')
    .where({ status: 'ACTIVE' })
    .modify((qb) => {
      if (filters.categoryId) {
        qb.andWhere('category_id', filters.categoryId);
      }
    })
    .count({ count: '*' });

  return Number(count) || 0;
};

export const findActiveProducts = (filters = {}, options = {}) => {
  const { limit = 20, offset = 0, sortField = 'end_at', sortDirection = 'asc' } = options;

  return buildBaseQuery(filters)
    .orderBy(sortField, sortDirection)
    .limit(limit)
    .offset(offset);
};
