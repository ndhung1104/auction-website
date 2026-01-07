/** @type {import('knex').Knex} */
export async function up(knex) {
  await knex.schema.raw(`
    ALTER TYPE seller_request_status_enum
    ADD VALUE IF NOT EXISTS 'EXPIRED';
  `);
}

/** @type {import('knex').Knex} */
export async function down() {
  // Enum value removals are not supported in PostgreSQL.
}
