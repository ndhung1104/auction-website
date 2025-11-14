#!/usr/bin/env python3
"""
Seed helper for Week 7 features (search + orders + reset).

Creates:
- Search seller/bidder accounts
- Two searchable products
- One order with messages
"""

import os
from datetime import datetime, timedelta, timezone

import psycopg2


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "dbname": os.getenv("DB_NAME", "auction_db"),
    "user": os.getenv("DB_USER", "auction_admin"),
    "password": os.getenv("DB_PASSWORD", "SieuMatKhau123!@"),
}

SELLER_EMAIL = os.getenv("W7_SELLER_EMAIL", "seller_w7@example.com")
BIDDER_EMAIL = os.getenv("W7_BIDDER_EMAIL", "bidder_w7@example.com")
SELLER_PASSWORD_HASH = os.getenv(
    "W7_SELLER_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)
BIDDER_PASSWORD_HASH = os.getenv(
    "W7_BIDDER_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)

PRODUCTS = [
    ("Vintage camera kit", "week7-camera-kit", "Vintage camera kit with lenses and bag."),
    ("Retro gaming console", "week7-retro-console", "Retro console for collectors.")
]


def upsert_user(conn, email, password_hash, role):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        row = cur.fetchone()
        if row:
            cur.execute(
                """
                UPDATE users
                SET role=%s,
                    password_hash=%s,
                    status='CONFIRMED'
                WHERE id=%s
                """,
                (role, password_hash, row[0]),
            )
            return row[0]

        cur.execute(
            """
            INSERT INTO users (
                email, password_hash, full_name, role, status,
                positive_score, negative_score, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, 'CONFIRMED', 0, 0, NOW(), NOW())
            RETURNING id
            """,
            (email, password_hash, email.split("@")[0], role),
        )
        return cur.fetchone()[0]


def ensure_category(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM categories WHERE name=%s", ("Week7 Search",))
        row = cur.fetchone()
        if row:
            return row[0]
        cur.execute(
            """
            INSERT INTO categories(name, created_at, updated_at)
            VALUES (%s, NOW(), NOW())
            RETURNING id
            """,
            ("Week7 Search",),
        )
        return cur.fetchone()[0]


def create_products(conn, seller_id, category_id):
    ids = []
    with conn.cursor() as cur:
        for name, slug, description in PRODUCTS:
            cur.execute("DELETE FROM products WHERE slug=%s", (slug,))
            start_at = datetime.now(timezone.utc) - timedelta(hours=1)
            end_at = start_at + timedelta(days=1)
            cur.execute(
                """
                INSERT INTO products (
                    seller_id, category_id, name, slug, description,
                    start_price, price_step, current_price, buy_now_price,
                    auto_extend, enable_auto_bid, status,
                    start_at, end_at, created_at, updated_at
                )
                VALUES (
                    %(seller_id)s, %(category_id)s, %(name)s, %(slug)s, %(description)s,
                    900000, 50000, 900000, 2000000,
                    TRUE, TRUE, 'ACTIVE',
                    %(start_at)s, %(end_at)s, %(start_at)s, %(start_at)s
                )
                RETURNING id
                """,
                {
                    "seller_id": seller_id,
                    "category_id": category_id,
                    "name": name,
                    "slug": slug,
                    "description": description,
                    "start_at": start_at,
                    "end_at": end_at,
                },
            )
            product_id = cur.fetchone()[0]
            ids.append(product_id)
            cur.execute(
                """
                INSERT INTO product_images (product_id, image_url, display_order)
                VALUES
                (%s, 'https://placehold.co/800x600?text=Week7+1', 1)
                """,
                (product_id,),
            )
    return ids


def create_order(conn, seller_id, bidder_id, product_id):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM orders WHERE product_id=%s", (product_id,))
        cur.execute(
            """
            INSERT INTO orders (
                product_id, seller_id, winner_id, final_price, status,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, 'PENDING_PAYMENT', NOW(), NOW())
            RETURNING id
            """,
            (product_id, seller_id, bidder_id, 1200000),
        )
        order_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO order_messages (order_id, sender_id, message)
            VALUES
            (%s, %s, %s),
            (%s, %s, %s)
            """,
            (
                order_id,
                bidder_id,
                "Hi seller, please confirm shipping details.",
                order_id,
                seller_id,
                "Thanks! Shipping within 2 days."
            ),
        )
    return order_id


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        seller_id = upsert_user(conn, SELLER_EMAIL, SELLER_PASSWORD_HASH, 'SELLER')
        bidder_id = upsert_user(conn, BIDDER_EMAIL, BIDDER_PASSWORD_HASH, 'BIDDER')
        category_id = ensure_category(conn)
        product_ids = create_products(conn, seller_id, category_id)
        create_order(conn, seller_id, bidder_id, product_ids[0])
        conn.commit()
        print("[OK] Week7 seed completed")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
