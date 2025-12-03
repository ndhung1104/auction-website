/** @type {import('knex').Knex} */
export async function up(knex) {
  await knex.schema.raw(`
    ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'WAITING_BUYER_DETAILS';
    ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'WAITING_SELLER_CONFIRM';
    ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'WAITING_BUYER_RECEIPT';
  `);

  await knex.schema.alterTable('orders', (table) => {
    table.text('shipping_address');
    table.text('buyer_invoice_note');
    table.timestamp('invoice_submitted_at', { useTz: true });
    table.timestamp('payment_confirmed_at', { useTz: true });
    table.text('shipping_code');
    table.timestamp('buyer_received_at', { useTz: true });
  });
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  await knex.schema.alterTable('orders', (table) => {
    table.dropColumn('shipping_address');
    table.dropColumn('buyer_invoice_note');
    table.dropColumn('invoice_submitted_at');
    table.dropColumn('payment_confirmed_at');
    table.dropColumn('shipping_code');
    table.dropColumn('buyer_received_at');
  });
  // Enum values remain for compatibility.
}

export const config = {
  transaction: false
};
