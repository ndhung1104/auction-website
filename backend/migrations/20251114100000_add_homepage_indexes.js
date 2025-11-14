/** @type {import('knex').Knex} */
export async function up(knex) {
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_status_end_at
    ON products (status, end_at);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_status_current_price_desc
    ON products (status, current_price DESC);
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_status_bid_count_desc
    ON products (status, bid_count DESC);
  `);
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_products_status_end_at;');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_products_status_current_price_desc;');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_products_status_bid_count_desc;');
}
