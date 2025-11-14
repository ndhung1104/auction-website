/** @type {import('knex').Knex} */
export async function up(knex) {
  // Remove duplicate watchlist entries before adding constraint
  await knex.raw(`
    DELETE FROM watchlist a
    USING watchlist b
    WHERE a.ctid < b.ctid
      AND a.user_id = b.user_id
      AND a.product_id = b.product_id
  `);

  await knex.schema.alterTable('watchlist', (table) => {
    table.unique(['user_id', 'product_id'], 'watchlist_user_product_unique');
  });

  await knex.raw(`
    DELETE FROM auto_bids a
    USING auto_bids b
    WHERE a.ctid < b.ctid
      AND a.product_id = b.product_id
      AND a.user_id = b.user_id
  `);

  await knex.schema.alterTable('auto_bids', (table) => {
    table.unique(['product_id', 'user_id'], 'auto_bids_product_user_unique');
  });

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_orders_winner_status_created
    ON orders (winner_id, status, created_at DESC)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created
    ON orders (seller_id, status, created_at DESC)
  `);
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  await knex.schema.alterTable('auto_bids', (table) => {
    table.dropUnique(['product_id', 'user_id'], 'auto_bids_product_user_unique');
  });
  await knex.schema.alterTable('watchlist', (table) => {
    table.dropUnique(['user_id', 'product_id'], 'watchlist_user_product_unique');
  });
  await knex.schema.raw('DROP INDEX IF EXISTS idx_orders_winner_status_created');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_orders_seller_status_created');
}
