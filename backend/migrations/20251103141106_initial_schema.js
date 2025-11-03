// 202311020001_initial_schema.js

/** @type {import('knex').Knex} */
export async function up(knex) {
  // 1) Tạo ENUM native trước (idempotent)
  await knex.schema.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role_enum AS ENUM ('ADMIN','SELLER','BIDDER');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await knex.schema.raw(`
    DO $$ BEGIN
      CREATE TYPE user_status_enum AS ENUM ('CREATED','CONFIRMED','SUSPENDED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await knex.schema.raw(`
    DO $$ BEGIN
      CREATE TYPE otp_purpose_enum AS ENUM ('REGISTER','RESET_PASSWORD');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await knex.schema.raw(`
    DO $$ BEGIN
      CREATE TYPE product_status_enum AS ENUM ('ACTIVE','ENDED','REMOVED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await knex.schema.raw(`
    DO $$ BEGIN
      CREATE TYPE auto_bid_event_type_enum AS ENUM ('PLACE','OUTBID','RECALCULATE');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await knex.schema.raw(`
    DO $$ BEGIN
      CREATE TYPE seller_request_status_enum AS ENUM ('PENDING','APPROVED','REJECTED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await knex.schema.raw(`
    DO $$ BEGIN
      CREATE TYPE order_status_enum AS ENUM ('PENDING_PAYMENT','PROCESSING','COMPLETED','CANCELLED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  // 2) Bảng gốc không phụ thuộc: users, categories, settings
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id');
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('full_name').notNullable();
    table.string('phone_number');
    table.string('address');
    table.specificType('role', 'user_role_enum').notNullable();
    table.integer('positive_score').notNullable().defaultTo(0);
    table.integer('negative_score').notNullable().defaultTo(0);
    table.specificType('status', 'user_status_enum').notNullable();
    table.timestamps(true, true);
    table.index(['status']);
    table.index(['role']);
  });

  await knex.schema.createTable('categories', (table) => {
    table.bigIncrements('id');
    table.string('name').notNullable();
    table.bigInteger('parent_id').unsigned().nullable()
      .references('id').inTable('categories').onDelete('SET NULL');
    table.timestamps(true, true);
    table.index(['parent_id']);
    table.unique(['name']);
  });

  await knex.schema.createTable('settings', (table) => {
    table.bigIncrements('id');
    table.string('key').notNullable().unique();
    table.text('value').notNullable();
    table.text('description');
    table.timestamps(true, true);
  });

  // 3) products (phụ thuộc users, categories)
  await knex.schema.createTable('products', (table) => {
    table.bigIncrements('id');
    table.bigInteger('seller_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.bigInteger('category_id').unsigned().notNullable()
      .references('id').inTable('categories').onDelete('RESTRICT');

    table.string('name').notNullable();
    table.string('slug').notNullable().unique();
    table.text('description');

    table.bigInteger('start_price').notNullable();
    table.bigInteger('price_step').notNullable();
    table.bigInteger('current_price').notNullable();
    table.bigInteger('buy_now_price').nullable();

    table.boolean('auto_extend').notNullable().defaultTo(true);
    table.boolean('enable_auto_bid').notNullable().defaultTo(true);

    table.bigInteger('current_bidder_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    table.integer('bid_count').notNullable().defaultTo(0);
    table.timestamp('highlight_until', { useTz: true }).nullable();

    table.specificType('status', 'product_status_enum').notNullable();

    table.timestamp('start_at', { useTz: true }).notNullable();
    table.timestamp('end_at', { useTz: true }).notNullable();

    table.timestamps(true, true);

    table.index(['seller_id']);
    table.index(['category_id']);
    table.index(['status']);
    table.index(['start_at']);
    table.index(['end_at']);
    table.index(['current_bidder_id']);
  });

  // 4) Các bảng con của products / users
  await knex.schema.createTable('product_images', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.text('image_url').notNullable();
    table.integer('display_order').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['product_id']);
  });

  await knex.schema.createTable('bids', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.bigInteger('bid_amount').notNullable();
    table.boolean('is_auto_bid').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['product_id', 'created_at']);
    table.index(['user_id', 'created_at']);
  });

  await knex.schema.createTable('auto_bids', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.bigInteger('max_bid_amount').notNullable();
    table.timestamps(true, true);
    table.unique(['product_id', 'user_id']);
    table.index(['product_id']);
    table.index(['user_id']);
  });

  await knex.schema.createTable('auto_bid_events', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.bigInteger('auto_bid_id').unsigned().nullable()
      .references('id').inTable('auto_bids').onDelete('SET NULL');
    table.bigInteger('bid_id').unsigned().nullable()
      .references('id').inTable('bids').onDelete('SET NULL');
    table.specificType('event_type', 'auto_bid_event_type_enum').notNullable();
    table.bigInteger('previous_bidder_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.bigInteger('new_bidder_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('triggered_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['product_id', 'triggered_at']);
    table.index(['auto_bid_id']);
    table.index(['bid_id']);
  });

  await knex.schema.createTable('watchlist', (table) => {
    table.bigIncrements('id');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['product_id']);
    table.unique(['user_id','product_id']);
  });

  await knex.schema.createTable('questions', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.text('question_text').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['product_id', 'created_at']);
    table.index(['user_id', 'created_at']);
  });

  await knex.schema.createTable('answers', (table) => {
    table.bigIncrements('id');
    table.bigInteger('question_id').unsigned().notNullable()
      .references('id').inTable('questions').onDelete('RESTRICT');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.text('answer_text').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['question_id', 'created_at']);
    table.index(['user_id', 'created_at']);
  });

  await knex.schema.createTable('seller_requests', (table) => {
    table.bigIncrements('id');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.specificType('status', 'seller_request_status_enum').notNullable();
    table.timestamp('requested_at', { useTz: true }).notNullable();
    table.timestamp('expire_at', { useTz: true }).notNullable();
    table.timestamp('processed_at', { useTz: true }).nullable();
    table.index(['user_id']);
    table.index(['status']);
    table.index(['requested_at']);
  });

  await knex.schema.createTable('orders', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.bigInteger('seller_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.bigInteger('winner_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');

    table.bigInteger('final_price').notNullable();
    table.specificType('status', 'order_status_enum').notNullable();

    table.timestamps(true, true);

    table.index(['product_id']);
    table.index(['seller_id']);
    table.index(['winner_id']);
    table.index(['status']);
  });

  await knex.schema.createTable('order_messages', (table) => {
    table.bigIncrements('id');
    table.bigInteger('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('RESTRICT');
    table.bigInteger('sender_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.text('message').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['order_id', 'created_at']);
    table.index(['sender_id', 'created_at']);
  });

  await knex.schema.createTable('ratings', (table) => {
    table.bigIncrements('id');
    table.bigInteger('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('RESTRICT');
    table.bigInteger('rater_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.bigInteger('rated_user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');

    table.specificType('score', 'smallint').notNullable();

    table.text('comment');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['order_id', 'rater_id']);
    table.index(['rated_user_id']);
  });

  await knex.schema.raw(`
    ALTER TABLE ratings
        ADD CONSTRAINT ratings_score_chk CHECK (score IN (1, -1));
    `);

  await knex.schema.createTable('product_description_history', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.text('content_added').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['product_id', 'created_at']);
  });

  await knex.schema.createTable('bid_blacklist', (table) => {
    table.bigIncrements('id');
    table.bigInteger('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.text('reason');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['product_id']);
    table.index(['user_id']);
    table.unique(['product_id','user_id']); // NGĂN TRÙNG BLACKLIST
  });

  await knex.schema.createTable('user_otps', (table) => {
    table.bigIncrements('id');
    table.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.string('code').notNullable();
    table.specificType('purpose', 'otp_purpose_enum').notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('consumed_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['purpose']);
    table.index(['expires_at']);
  });
}

/** @type {import('knex').Knex} */
export async function down(knex) {
  // Xoá bảng theo thứ tự NGƯỢC phụ thuộc
  await knex.schema.dropTableIfExists('user_otps');
  await knex.schema.dropTableIfExists('bid_blacklist');
  await knex.schema.dropTableIfExists('product_description_history');
  await knex.schema.dropTableIfExists('ratings');
  await knex.schema.dropTableIfExists('order_messages');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('seller_requests');
  await knex.schema.dropTableIfExists('answers');
  await knex.schema.dropTableIfExists('questions');
  await knex.schema.dropTableIfExists('watchlist');
  await knex.schema.dropTableIfExists('auto_bid_events');
  await knex.schema.dropTableIfExists('auto_bids');
  await knex.schema.dropTableIfExists('bids');
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('settings');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('users');

  // Drop ENUM types sau khi chắc chắn không còn bảng nào dùng
  await knex.schema.raw('DROP TYPE IF EXISTS order_status_enum');
  await knex.schema.raw('DROP TYPE IF EXISTS seller_request_status_enum');
  await knex.schema.raw('DROP TYPE IF EXISTS auto_bid_event_type_enum');
  await knex.schema.raw('DROP TYPE IF EXISTS product_status_enum');
  await knex.schema.raw('DROP TYPE IF EXISTS otp_purpose_enum');
  await knex.schema.raw('DROP TYPE IF EXISTS user_status_enum');
  await knex.schema.raw('DROP TYPE IF EXISTS user_role_enum');
}
