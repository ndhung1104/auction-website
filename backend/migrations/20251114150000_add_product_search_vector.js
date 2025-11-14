/** @type {import('knex').Knex} */
export async function up(knex) {
  await knex.schema.raw("ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector");
  await knex.schema.raw(`
    UPDATE products
    SET search_vector = to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
  `);
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_search_vector
    ON products
    USING GIN(search_vector)
  `);
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION products_search_vector_trigger()
    RETURNS trigger AS $$
    begin
      new.search_vector :=
        to_tsvector('simple', coalesce(new.name, '') || ' ' || coalesce(new.description, ''));
      return new;
    end
    $$ LANGUAGE plpgsql;
  `);
  await knex.schema.raw(`
    CREATE TRIGGER trg_products_search_vector
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_vector_trigger();
  `);
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  await knex.schema.raw('DROP TRIGGER IF EXISTS trg_products_search_vector ON products');
  await knex.schema.raw('DROP FUNCTION IF EXISTS products_search_vector_trigger');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_products_search_vector');
  await knex.schema.raw('ALTER TABLE products DROP COLUMN IF EXISTS search_vector');
}
