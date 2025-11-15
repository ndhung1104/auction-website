/** @type {import('knex').Knex} */
export async function up(knex) {
  await knex.schema.alterTable('products', (table) => {
    table.boolean('allow_unrated_bidders').notNullable().defaultTo(false);
  });

  await knex.schema.alterTable('users', (table) => {
    table.date('date_of_birth').nullable();
  });
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('date_of_birth');
  });

  await knex.schema.alterTable('products', (table) => {
    table.dropColumn('allow_unrated_bidders');
  });
}
