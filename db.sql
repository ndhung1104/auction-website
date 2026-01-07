-- db.sql
-- Schema for auction-website (PostgreSQL)
-- Run this script while connected to the target database.
-- Optional: create role/database in psql, then connect:
-- DO $$ BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auction_user') THEN
--     CREATE ROLE auction_user LOGIN PASSWORD 'change_me';
--   END IF;
-- END $$;
-- CREATE DATABASE auction_db OWNER auction_user;
-- \connect auction_db

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('ADMIN','SELLER','BIDDER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE user_status_enum AS ENUM ('CREATED','CONFIRMED','SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE otp_purpose_enum AS ENUM ('REGISTER','RESET_PASSWORD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE product_status_enum AS ENUM ('ACTIVE','ENDED','REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE auto_bid_event_type_enum AS ENUM ('PLACE','OUTBID','RECALCULATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE seller_request_status_enum AS ENUM ('PENDING','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM (
    'PENDING_PAYMENT',
    'PROCESSING',
    'WAITING_BUYER_DETAILS',
    'WAITING_SELLER_CONFIRM',
    'WAITING_BUYER_RECEIPT',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Base tables
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255),
  address VARCHAR(255),
  role user_role_enum NOT NULL,
  positive_score INTEGER NOT NULL DEFAULT 0,
  negative_score INTEGER NOT NULL DEFAULT 0,
  status user_status_enum NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);

CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  start_price BIGINT NOT NULL,
  price_step BIGINT NOT NULL,
  current_price BIGINT NOT NULL,
  buy_now_price BIGINT,
  auto_extend BOOLEAN NOT NULL DEFAULT TRUE,
  enable_auto_bid BOOLEAN NOT NULL DEFAULT TRUE,
  allow_unrated_bidders BOOLEAN NOT NULL DEFAULT FALSE,
  current_bidder_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  bid_count INTEGER NOT NULL DEFAULT 0,
  highlight_until TIMESTAMPTZ,
  status product_status_enum NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products (seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_start_at ON products (start_at);
CREATE INDEX IF NOT EXISTS idx_products_end_at ON products (end_at);
CREATE INDEX IF NOT EXISTS idx_products_current_bidder_id ON products (current_bidder_id);

CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product_display_order
  ON product_images (product_id, display_order);

CREATE TABLE IF NOT EXISTS bids (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  bid_amount BIGINT NOT NULL,
  is_auto_bid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bids_product_created ON bids (product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bids_user_created ON bids (user_id, created_at);

CREATE TABLE IF NOT EXISTS auto_bids (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  max_bid_amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auto_bids_product_user_unique UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_auto_bids_product_id ON auto_bids (product_id);
CREATE INDEX IF NOT EXISTS idx_auto_bids_user_id ON auto_bids (user_id);
CREATE INDEX IF NOT EXISTS idx_auto_bids_product_maxbid_created
  ON auto_bids (product_id, max_bid_amount DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS auto_bid_events (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  auto_bid_id BIGINT REFERENCES auto_bids(id) ON DELETE SET NULL,
  bid_id BIGINT REFERENCES bids(id) ON DELETE SET NULL,
  event_type auto_bid_event_type_enum NOT NULL,
  previous_bidder_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  new_bidder_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auto_bid_events_product_triggered ON auto_bid_events (product_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_auto_bid_events_auto_bid_id ON auto_bid_events (auto_bid_id);
CREATE INDEX IF NOT EXISTS idx_auto_bid_events_bid_id ON auto_bid_events (bid_id);

CREATE TABLE IF NOT EXISTS watchlist (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_user_product_unique UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_product_id ON watchlist (product_id);

CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  question_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_product_created ON questions (product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_questions_user_created ON questions (user_id, created_at);

CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_answers_question_created ON answers (question_id, created_at);
CREATE INDEX IF NOT EXISTS idx_answers_user_created ON answers (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers (question_id);

CREATE TABLE IF NOT EXISTS seller_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status seller_request_status_enum NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  expire_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_requests_user_id ON seller_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_requests_status ON seller_requests (status);
CREATE INDEX IF NOT EXISTS idx_seller_requests_requested_at ON seller_requests (requested_at);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  winner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  final_price BIGINT NOT NULL,
  status order_status_enum NOT NULL,
  shipping_address TEXT,
  buyer_invoice_note TEXT,
  invoice_submitted_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,
  shipping_code TEXT,
  buyer_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_winner_id ON orders (winner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_winner_status_created
  ON orders (winner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created
  ON orders (seller_id, status, created_at DESC);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_product_id_unique'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_product_id_unique UNIQUE (product_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS order_messages (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_messages_order_created_at
  ON order_messages (order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender_created_at
  ON order_messages (sender_id, created_at);

CREATE TABLE IF NOT EXISTS ratings (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  rater_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rated_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score SMALLINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ratings_order_rater_unique UNIQUE (order_id, rater_id)
);
ALTER TABLE ratings
  ADD CONSTRAINT ratings_score_chk CHECK (score IN (1, -1));
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user_id ON ratings (rated_user_id);

CREATE TABLE IF NOT EXISTS product_description_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  content_added TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_description_history_product_created
  ON product_description_history (product_id, created_at);

CREATE TABLE IF NOT EXISTS bid_blacklist (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bid_blacklist_product_user_unique UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bid_blacklist_product_id ON bid_blacklist (product_id);
CREATE INDEX IF NOT EXISTS idx_bid_blacklist_user_id ON bid_blacklist (user_id);

CREATE TABLE IF NOT EXISTS user_otps (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  code VARCHAR(255) NOT NULL,
  purpose otp_purpose_enum NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_otps_user_id ON user_otps (user_id);
CREATE INDEX IF NOT EXISTS idx_user_otps_purpose ON user_otps (purpose);
CREATE INDEX IF NOT EXISTS idx_user_otps_expires_at ON user_otps (expires_at);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  rotated_from INTEGER,
  user_agent VARCHAR(255),
  ip_address VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- Search vector trigger
CREATE OR REPLACE FUNCTION products_search_vector_trigger()
RETURNS trigger AS $$
begin
  new.search_vector :=
    to_tsvector('simple', coalesce(new.name, '') || ' ' || coalesce(new.description, ''));
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search_vector ON products;
CREATE TRIGGER trg_products_search_vector
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION products_search_vector_trigger();

UPDATE products
SET search_vector = to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING GIN(search_vector);

-- Homepage/product list indexes
CREATE INDEX IF NOT EXISTS idx_products_status_end_at
  ON products (status, end_at);
CREATE INDEX IF NOT EXISTS idx_products_status_current_price_desc
  ON products (status, current_price DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_bid_count_desc
  ON products (status, bid_count DESC);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_active_created_at
  ON products (created_at)
  WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_products_active_cat_end_at
  ON products (category_id, end_at)
  WHERE status = 'ACTIVE';
