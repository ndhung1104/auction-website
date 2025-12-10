import bcrypt from 'bcrypt';
import db from '../db/knex.js';

const DEFAULT_OPTIONS = {
  products: 20,
  categories: 5,
  bidsPerProduct: 5,
  imagesPerProduct: 4,
  autoBidSettings: {},
};

const DEFAULT_USERS = {
  bidder: {
    email: process.env.PLAYWRIGHT_BIDDER_EMAIL || 'bidder@example.com',
    password: process.env.PLAYWRIGHT_BIDDER_PASSWORD || 'BidderPass123!',
    fullName: 'Test Bidder',
    role: 'BIDDER',
  },
  seller: {
    email: process.env.PLAYWRIGHT_SELLER_EMAIL || 'seller@example.com',
    password: process.env.PLAYWRIGHT_SELLER_PASSWORD || 'SellerPass123!',
    fullName: 'Test Seller',
    role: 'SELLER',
  },
  admin: {
    email: process.env.PLAYWRIGHT_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'AdminPass123!',
    fullName: 'Test Admin',
    role: 'ADMIN',
  },
};

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const buildTimestamps = () => {
  const now = new Date();
  const endingSoon = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
  const newPostedAt = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const oldPostedAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { endingSoon, newPostedAt, oldPostedAt, later };
};

async function ensureUser(trx, { email, password, fullName, role }) {
  const existing = await trx('users').where({ email }).first();
  if (existing) return existing;
  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await trx('users')
    .insert({
      email,
      password_hash,
      full_name: fullName,
      address: 'Test Address',
      role,
      status: 'CONFIRMED',
      positive_score: 10,
      negative_score: 0,
    })
    .returning('*');
  return user;
}

async function seedCategories(trx, total) {
  const roots = Math.max(2, Math.min(total, 3));
  const childrenPerRoot = Math.ceil(total / roots);
  const ids = [];

  for (let i = 0; i < roots; i++) {
    const [root] = await trx('categories')
      .insert({
        name: `Category ${i + 1}`,
      })
      .returning('*');
    ids.push(root.id);

    for (let j = 0; j < childrenPerRoot && ids.length < total; j++) {
      const [child] = await trx('categories')
        .insert({
          name: `Category ${i + 1}.${j + 1}`,
          parent_id: root.id,
        })
        .returning('*');
      ids.push(child.id);
    }
  }

  return ids;
}

async function seedProducts(trx, opts, users, categoryIds) {
  const { products, bidsPerProduct, imagesPerProduct } = opts;
  const { endingSoon, newPostedAt, oldPostedAt, later } = buildTimestamps();
  const productIds = [];

  for (let i = 0; i < products; i++) {
    const isNew = i === 0;
    const startAt = isNew ? newPostedAt : oldPostedAt;
    const endAt = i < 5 ? endingSoon : new Date(later.getTime() + i * 60 * 60 * 1000);
    const startPrice = 100000 + i * 5000;
    const priceStep = 10000;
    const categoryId = categoryIds[i % categoryIds.length];
    const name = `Sample Product ${i + 1}`;
    const slug = `${slugify(name)}-${i + 1}`;

    const [product] = await trx('products')
      .insert({
        seller_id: users.seller.id,
        category_id: categoryId,
        name,
        slug,
        description: `Description for ${name}`,
        start_price: startPrice,
        price_step: priceStep,
        current_price: startPrice,
        buy_now_price: startPrice + 10 * priceStep,
        auto_extend: true,
        enable_auto_bid: true,
        current_bidder_id: null,
        bid_count: 0,
        highlight_until: isNew ? new Date(newPostedAt.getTime() + 60 * 60 * 1000) : null,
        status: 'ACTIVE',
        start_at: startAt,
        end_at: endAt,
        created_at: startAt,
        updated_at: startAt,
      })
      .returning('*');

    productIds.push(product.id);

    const images = Array.from({ length: imagesPerProduct }).map((_, idx) => ({
      product_id: product.id,
      image_url: `https://placehold.co/600x400?text=Product-${i + 1}-img-${idx + 1}`,
      display_order: idx,
      created_at: startAt,
    }));
    await trx('product_images').insert(images);

    const bids = [];
    for (let b = 1; b <= bidsPerProduct; b++) {
      bids.push({
        product_id: product.id,
        user_id: users.bidder.id,
        bid_amount: startPrice + priceStep * b,
        is_auto_bid: false,
        created_at: new Date(startAt.getTime() + b * 60 * 1000),
      });
    }
    await trx('bids').insert(bids);

    await trx('products')
      .where({ id: product.id })
      .update({
        current_price: startPrice + priceStep * bidsPerProduct,
        current_bidder_id: users.bidder.id,
        bid_count: bidsPerProduct,
        updated_at: new Date(),
      });
  }

  return productIds;
}

export async function seedBaseline(options = {}) {
  if (
    process.env.ENABLE_TEST_ENDPOINTS !== 'true' &&
    (process.env.NODE_ENV || '').toLowerCase() === 'production'
  ) {
    throw new Error('Testing endpoints are disabled');
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  return db.transaction(async (trx) => {
    await trx.raw(
      `
        TRUNCATE TABLE
          order_messages,
          orders,
          ratings,
          bid_blacklist,
          product_description_history,
          watchlist,
          answers,
          questions,
          auto_bid_events,
          auto_bids,
          bids,
          product_images,
          products,
          categories
        RESTART IDENTITY CASCADE
      `
    );

    const bidder = await ensureUser(trx, DEFAULT_USERS.bidder);
    const seller = await ensureUser(trx, DEFAULT_USERS.seller);
    const admin = await ensureUser(trx, DEFAULT_USERS.admin);

    const categories = await seedCategories(trx, opts.categories);
    const productIds = await seedProducts(trx, opts, { bidder, seller, admin }, categories);

    return {
      productsCreated: productIds.length,
      categoriesCreated: categories.length,
      bidsPerProduct: opts.bidsPerProduct,
      imagesPerProduct: opts.imagesPerProduct,
    };
  });
}

export async function getSeedStatus() {
  const productCount = Number((await db('products').count('id as count').first())?.count || 0);
  const categoryCount = Number((await db('categories').count('id as count').first())?.count || 0);

  const minBidsRow = await db
    .select(db.raw('MIN(cnt) as min_cnt'))
    .from(
      db('bids')
        .select(db.raw('count(*) as cnt'))
        .groupBy('product_id')
        .as('bid_counts')
    )
    .first();

  const minImagesRow = await db
    .select(db.raw('MIN(cnt) as min_cnt'))
    .from(
      db('product_images')
        .select(db.raw('count(*) as cnt'))
        .groupBy('product_id')
        .as('img_counts')
    )
    .first();

  return {
    productCount,
    categoryCount,
    minBidsPerProduct: Number(minBidsRow?.min_cnt || 0),
    minImagesPerProduct: Number(minImagesRow?.min_cnt || 0),
  };
}
