import db from '../db/knex.js';

const BASE_COLUMNS = [
  'id',
  'name',
  'slug',
  'description',
  'category_id',
  'seller_id',
  'start_price',
  'price_step',
  'current_price',
  'buy_now_price',
  'auto_extend',
  'enable_auto_bid',
  'allow_unrated_bidders',
  'current_bidder_id',
  'bid_count',
  'highlight_until',
  'status',
  'start_at',
  'end_at',
  'created_at',
  'updated_at'
];

const withAlias = (alias) => BASE_COLUMNS.map((column) => `${alias}.${column}`);

const buildBaseQuery = (filters = {}) => {
  const query = db('products as p')
    .leftJoin('users as bidder', 'bidder.id', 'p.current_bidder_id')
    .select([...withAlias('p'), 'bidder.full_name as current_bidder_full_name'])
    .where('p.status', 'ACTIVE');

  if (filters.categoryId) {
    const subCategories = db('categories')
      .select('id')
      .where('id', filters.categoryId)
      .orWhere('parent_id', filters.categoryId);
    query.andWhereIn('p.category_id', subCategories);
  }

  return query;
};

export const countActiveProducts = async (filters = {}) => {
  const [{ count }] = await db('products')
    .where({ status: 'ACTIVE' })
    .modify((qb) => {
      if (filters.categoryId) {
        const subCategories = db('categories')
          .select('id')
          .where('id', filters.categoryId)
          .orWhere('parent_id', filters.categoryId);
        qb.andWhereIn('category_id', subCategories);
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

export const findProductStatusById = (id) =>
  db('products').select('id', 'status').where({ id }).first();

export const findProductBySlug = (slug) =>
  db('products').select('id').where({ slug }).first();

export const insertProduct = (productData, trx = db) =>
  trx('products')
    .insert(productData)
    .returning(BASE_COLUMNS);

export const insertProductImages = (images, trx = db) => {
  if (!Array.isArray(images) || !images.length) return [];
  return trx('product_images').insert(images);
};

export const findProductByIdForUpdate = (id, trx = db) =>
  trx('products').where({ id }).forUpdate().first();

export const findProductByIdWithSeller = (id) =>
  db('products as p')
    .select([
      ...withAlias('p'),
      'seller.full_name as seller_full_name',
      'seller.email as seller_email',
      'seller.positive_score as seller_positive_score',
      'seller.negative_score as seller_negative_score',
      'p.current_bidder_id',
      'bidder.full_name as current_bidder_full_name'
    ])
    .leftJoin('users as seller', 'seller.id', 'p.seller_id')
    .leftJoin('users as bidder', 'bidder.id', 'p.current_bidder_id')
    .where('p.id', id)
    .first();

export const findProductImages = (productId) =>
  db('product_images')
    .select('id', 'product_id', 'image_url', 'display_order')
    .where({ product_id: productId })
    .orderBy('display_order', 'asc');

export const findRecentQuestions = (productId, limit = 10) =>
  db('questions as q')
    .leftJoin('users as asker', 'asker.id', 'q.user_id')
    .select(
      'q.id',
      'q.product_id',
      'q.question_text',
      'q.created_at',
      'asker.id as asker_id',
      'asker.full_name as asker_name'
    )
    .where('q.product_id', productId)
    .orderBy('q.created_at', 'desc')
    .limit(limit);

export const findAnswersByQuestionIds = (questionIds = []) => {
  if (!Array.isArray(questionIds) || !questionIds.length) {
    return [];
  }

  return db('answers as a')
    .leftJoin('users as responder', 'responder.id', 'a.user_id')
    .select(
      'a.id',
      'a.question_id',
      'a.answer_text',
      'a.created_at',
      'responder.id as responder_id',
      'responder.full_name as responder_name'
    )
    .whereIn('a.question_id', questionIds)
    .orderBy('a.created_at', 'desc');
};

export const findRelatedProducts = (categoryId, excludeProductId, limit = 5) =>
  db('products as p')
    .select(withAlias('p'))
    .where('p.status', 'ACTIVE')
    .andWhere('p.category_id', categoryId)
    .andWhereNot('p.id', excludeProductId)
    .orderBy('p.end_at', 'asc')
    .limit(limit);

export const findPrimaryImagesForProducts = async (productIds = []) => {
  if (!Array.isArray(productIds) || !productIds.length) {
    return new Map();
  }

  const rows = await db('product_images')
    .select('product_id', 'image_url')
    .whereIn('product_id', productIds)
    .orderBy([{ column: 'product_id', order: 'asc' }, { column: 'display_order', order: 'asc' }]);

  const imageMap = new Map();
  rows.forEach((row) => {
    if (!imageMap.has(row.product_id)) {
      imageMap.set(row.product_id, row.image_url);
    }
  });

  return imageMap;
};

export const findProductBidsWithUsers = (productId, limit = 20) =>
  db('bids as b')
    .leftJoin('users as u', 'u.id', 'b.user_id')
    .select(
      'b.id',
      'b.product_id',
      'b.user_id',
      'b.bid_amount',
      'b.is_auto_bid',
      'b.created_at',
      'u.full_name as bidder_full_name'
    )
    .where('b.product_id', productId)
    .orderBy('b.created_at', 'desc')
    .limit(limit);

export const findTopPriceProducts = (limit = 6) =>
  db('products as p')
    .select(withAlias('p'))
    .where('p.status', 'ACTIVE')
    .orderBy('p.current_price', 'desc')
    .orderBy('p.end_at', 'asc')
    .limit(limit);

export const findEndingSoonProducts = (limit = 6) =>
  db('products as p')
    .select(withAlias('p'))
    .where('p.status', 'ACTIVE')
    .orderBy('p.end_at', 'asc')
    .limit(limit);

export const findMostBiddedProducts = (limit = 6) =>
  db('products as p')
    .select(withAlias('p'))
    .where('p.status', 'ACTIVE')
    .orderBy('p.bid_count', 'desc')
    .orderBy('p.end_at', 'asc')
    .limit(limit);
