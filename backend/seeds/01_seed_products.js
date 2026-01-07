import bcrypt from 'bcrypt';
import fs from 'node:fs';

const SEED_PREFIX = 'seed-';
const PRODUCTS_PER_CATEGORY = 7;
const PASSWORD = 'SeedSeller123!';
const SEED_ACCOUNTS = [
  {
    role: 'BIDDER',
    email: process.env.BIDDER_EMAIL,
    password: process.env.BIDDER_PASSWORD,
    fullName: 'Bidder'
  },
  {
    role: 'SELLER',
    email: process.env.SELLER_EMAIL,
    password: process.env.SELLER_PASSWORD,
    fullName: 'Seller'
  },
  {
    role: 'ADMIN',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    fullName: 'Admin'
  }
];

const CATEGORY_NAMES = {
  electronics: 'Electronics',
  phone: 'Phone',
  watch: 'Watch',
  painting: 'Painting'
};

const SELLERS = [
  { email: 'seed-seller1@auction.local', fullName: 'Seed Seller One' },
  { email: 'seed-seller2@auction.local', fullName: 'Seed Seller Two' },
  { email: 'seed-seller3@auction.local', fullName: 'Seed Seller Three' }
];

const PRODUCT_NAMES = {
  phone: [
    'iPhone 14 Pro',
    'Samsung Galaxy S23',
    'Google Pixel 8',
    'OnePlus 11',
    'Xiaomi 13',
    'Sony Xperia 1 V',
    'Nothing Phone 2',
    'Motorola Edge 40',
    'Oppo Find X6',
    'Vivo X90'
  ],
  watch: [
    'Apple Watch Series 9',
    'Samsung Galaxy Watch 6',
    'Garmin Fenix 7',
    'Fitbit Versa 4',
    'Seiko Prospex',
    'Casio G-Shock GA2100',
    'Tissot PRX',
    'Citizen Eco-Drive',
    'Fossil Gen 6',
    'Huawei Watch GT 4'
  ],
  painting: [
    'Starry Night',
    'Mona Lisa',
    'The Persistence of Memory',
    'The Scream',
    'Girl with a Pearl Earring',
    'The Last Supper',
    'Guernica',
    'The Kiss',
    'American Gothic',
    'The Night Watch'
  ]
};

const resolveSeedImageUrl = (folder, productFolder, suffix) => {
  const basePath = `uploads/seed/${folder}/${productFolder}/${suffix}`;
  const pngFile = `${basePath}.png`;
  const jpgFile = `${basePath}.jpg`;
  if (fs.existsSync(pngFile)) return `/${pngFile.replace(/\\/g, '/')}`;
  if (fs.existsSync(jpgFile)) return `/${jpgFile.replace(/\\/g, '/')}`;
  return `/${pngFile.replace(/\\/g, '/')}`;
};

const buildProductImageUrls = (folder, productIndex) => {
  const productFolder = String(productIndex).padStart(2, '0');
  return ['1', '2', '3'].map(
    (suffix) => resolveSeedImageUrl(folder, productFolder, suffix)
  );
};

const ensureCategory = async (trx, name, parentId = null) => {
  const existing = await trx('categories').select('id', 'parent_id').where({ name }).first();
  if (existing) {
    if (parentId && existing.parent_id !== parentId) {
      await trx('categories').where({ id: existing.id }).update({ parent_id: parentId });
    }
    return existing.id;
  }
  const [row] = await trx('categories').insert({ name, parent_id: parentId }).returning(['id']);
  return row.id;
};

const ensureSeller = async (trx, seller, passwordHash) => {
  const existing = await trx('users').select('id', 'role', 'status').where({ email: seller.email }).first();
  if (existing) {
    if (existing.role !== 'SELLER' || existing.status !== 'CONFIRMED') {
      await trx('users')
        .where({ id: existing.id })
        .update({ role: 'SELLER', status: 'CONFIRMED' });
    }
    return existing.id;
  }
  const [row] = await trx('users')
    .insert({
      email: seller.email,
      password_hash: passwordHash,
      full_name: seller.fullName,
      role: 'SELLER',
      status: 'CONFIRMED'
    })
    .returning(['id']);
  return row.id;
};

const ensureSeedAccount = async (trx, account) => {
  if (!account.email || !account.password) return null;
  const passwordHash = await bcrypt.hash(account.password, 10);
  const existing = await trx('users').select('id').where({ email: account.email }).first();
  if (existing) {
    await trx('users')
      .where({ id: existing.id })
      .update({
        password_hash: passwordHash,
        full_name: account.fullName,
        role: account.role,
        status: 'CONFIRMED'
      });
    return existing.id;
  }
  const [row] = await trx('users')
    .insert({
      email: account.email,
      password_hash: passwordHash,
      full_name: account.fullName,
      role: account.role,
      status: 'CONFIRMED'
    })
    .returning(['id']);
  return row.id;
};

const deleteSeedData = async (trx, productIds) => {
  if (!productIds.length) return;
  const orderIds = await trx('orders').whereIn('product_id', productIds).pluck('id');
  const questionIds = await trx('questions').whereIn('product_id', productIds).pluck('id');

  if (orderIds.length) {
    await trx('ratings').whereIn('order_id', orderIds).del();
    await trx('order_messages').whereIn('order_id', orderIds).del();
    await trx('orders').whereIn('id', orderIds).del();
  }

  if (questionIds.length) {
    await trx('answers').whereIn('question_id', questionIds).del();
    await trx('questions').whereIn('id', questionIds).del();
  }

  await trx('auto_bid_events').whereIn('product_id', productIds).del();
  await trx('auto_bids').whereIn('product_id', productIds).del();
  await trx('bids').whereIn('product_id', productIds).del();
  await trx('watchlist').whereIn('product_id', productIds).del();
  await trx('bid_blacklist').whereIn('product_id', productIds).del();
  await trx('product_description_history').whereIn('product_id', productIds).del();
  await trx('product_images').whereIn('product_id', productIds).del();
  await trx('products').whereIn('id', productIds).del();
};

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    const seedProductIds = await trx('products')
      .where('slug', 'like', `${SEED_PREFIX}%`)
      .pluck('id');

    await deleteSeedData(trx, seedProductIds);

    const electronicsId = await ensureCategory(trx, CATEGORY_NAMES.electronics);
    const phoneId = await ensureCategory(trx, CATEGORY_NAMES.phone, electronicsId);
    const watchId = await ensureCategory(trx, CATEGORY_NAMES.watch, electronicsId);
    const paintingId = await ensureCategory(trx, CATEGORY_NAMES.painting);

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const sellerIds = [];
    for (const seller of SELLERS) {
      const sellerId = await ensureSeller(trx, seller, passwordHash);
      sellerIds.push(sellerId);
    }

    for (const account of SEED_ACCOUNTS) {
      await ensureSeedAccount(trx, account);
    }

    const productGroups = [
      { key: 'phone', categoryId: phoneId, baseName: 'Seed Phone', sellerId: sellerIds[0] },
      { key: 'watch', categoryId: watchId, baseName: 'Seed Watch', sellerId: sellerIds[1] },
      { key: 'painting', categoryId: paintingId, baseName: 'Seed Painting', sellerId: sellerIds[2] }
    ];

    const now = new Date();

    for (const group of productGroups) {
      for (let index = 0; index < PRODUCTS_PER_CATEGORY; index += 1) {
        const productIndex = index + 1;
        const suffix = String(productIndex).padStart(2, '0');
        const name = PRODUCT_NAMES[group.key]?.[index] || `${group.baseName} ${suffix}`;
        const slug = `${SEED_PREFIX}${group.key}-${suffix}`;
        const startPrice = 150000 + index * 25000;
        const priceStep = 5000;
        const buyNowPrice = startPrice + 200000;
        const startAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const endAt = new Date(now.getTime() + (index + 2) * 24 * 60 * 60 * 1000);

        const [productRow] = await trx('products')
          .insert({
            seller_id: group.sellerId,
            category_id: group.categoryId,
            name,
            slug,
            description: `<p>${name} - seeded listing.</p>`,
            start_price: startPrice,
            price_step: priceStep,
            current_price: startPrice,
            buy_now_price: buyNowPrice,
            auto_extend: true,
            enable_auto_bid: true,
            allow_unrated_bidders: true,
            bid_count: 0,
            status: 'ACTIVE',
            start_at: startAt,
            end_at: endAt
          })
          .returning(['id']);

        const imageSet = buildProductImageUrls(group.key, productIndex);
        const images = imageSet.map((url, displayOrder) => ({
          product_id: productRow.id,
          image_url: url,
          display_order: displayOrder
        }));

        await trx('product_images').insert(images);
      }
    }
  });
}
