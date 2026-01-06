/** @type {import('knex').Knex} */
export async function up(knex) {
  // Products: created_at for "newly listed" when ACTIVE
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created_at
    ON products (created_at)
    WHERE status = 'ACTIVE';
  `);

  // Products: category + end_at for category-filtered "ending soon"
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_cat_end_at
    ON products (category_id, end_at)
    WHERE status = 'ACTIVE';
  `);

  // Auto-bids: ordering by max_bid_amount desc, created_at asc for recalc
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auto_bids_product_maxbid_created
    ON auto_bids (product_id, max_bid_amount DESC, created_at ASC);
  `);

  // Product images: fetch by product with display order
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_display_order
    ON product_images (product_id, display_order);
  `);
  await knex.schema.raw(`DROP INDEX CONCURRENTLY IF EXISTS product_images_product_id_index;`);

  // Answers: question lookup
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_question_id
    ON answers (question_id);
  `);

  // Ratings: per-user aggregation
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_rated_user_id
    ON ratings (rated_user_id);
  `);

  // Orders: enforce single order per product
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_product_id_unique'
      ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_product_id_unique UNIQUE (product_id);
      END IF;
    END
    $$;
  `);

  // Order messages: timeline by order
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_messages_order_created_at
    ON order_messages (order_id, created_at);
  `);
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_order_messages_order_created_at;');
  await knex.schema.raw('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_id_unique;');
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_ratings_rated_user_id;');
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_answers_question_id;');
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_product_images_product_display_order;');
  await knex.schema.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS product_images_product_id_index
    ON product_images (product_id);
  `);
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_auto_bids_product_maxbid_created;');
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_products_active_cat_end_at;');
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_products_active_created_at;');
}

export const config = {
  transaction: false
};
