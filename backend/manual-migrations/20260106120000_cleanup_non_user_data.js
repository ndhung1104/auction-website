const TABLES_TO_TRUNCATE = [
  'order_messages',
  'orders',
  'ratings',
  'product_description_history',
  'bid_blacklist',
  'auto_bid_events',
  'auto_bids',
  'bids',
  'watchlist',
  'answers',
  'questions',
  'product_images',
  'products',
  'categories',
  'settings'
];

/** @type {import('knex').Knex} */
export async function up(knex) {
  const tables = TABLES_TO_TRUNCATE.map((name) => `"${name}"`).join(', ');
  await knex.raw(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
}

/** @type {import('knex').Knex} */
export async function down() {
  // No rollback for manual cleanup.
}
