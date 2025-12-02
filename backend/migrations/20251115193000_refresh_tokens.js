/** @type {import('knex').Knex} */
export async function up(knex) {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('token_hash').notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.integer('rotated_from').unsigned().nullable();
    table.string('user_agent').nullable();
    table.string('ip_address').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('refresh_tokens', (table) => {
    table.index(['user_id']);
    table.index(['expires_at']);
  });
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
