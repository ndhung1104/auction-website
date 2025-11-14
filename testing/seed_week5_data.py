#!/usr/bin/env python3
"""
Seed helper for Week 5 bidding scenarios.

Creates a dedicated test product with predictable state:
- Active auction (started 1h ago, ends in 3 days)
- Auto-bid enabled, auto-extend on
- Cleans up previous bids/auto-bids/images for the same slug

Run this script before executing the Week 5 API tests.
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

SELLER_EMAIL = os.getenv("W5_SELLER_EMAIL", "seller_w5@example.com")
SELLER_PASSWORD_HASH = os.getenv(
    "W5_SELLER_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)
PRODUCT_NAME = os.getenv("W5_PRODUCT_NAME", "Week5 Test Product")
PRODUCT_SLUG = os.getenv("W5_PRODUCT_SLUG", "week5-test-product")
CATEGORY_PARENT = os.getenv("W5_CATEGORY_PARENT", "Week5 Collectibles")
CATEGORY_CHILD = os.getenv("W5_CATEGORY_CHILD", "Week5 Gadgets")


def upsert_seller(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email=%s", (SELLER_EMAIL,))
        row = cur.fetchone()
        if row:
            cur.execute(
                """
                UPDATE users
                SET role='SELLER',
                    password_hash=%s,
                    status='CONFIRMED'
                WHERE id=%s
                """,
                (SELLER_PASSWORD_HASH, row[0]),
            )
            return row[0]

        cur.execute(
            """
            INSERT INTO users (
                email, password_hash, full_name, phone_number, address,
                role, positive_score, negative_score, status, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, 'SELLER', 0, 0, 'CONFIRMED', NOW(), NOW())
            RETURNING id
            """,
            (
                SELLER_EMAIL,
                SELLER_PASSWORD_HASH,
                "Week5 Seller",
                "0909555666",
                "Week5 Seller Lane",
            ),
        )
        return cur.fetchone()[0]


def ensure_categories(conn):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM categories WHERE name=%s AND parent_id IS NULL",
            (CATEGORY_PARENT,),
        )
        row = cur.fetchone()
        if row:
            parent_id = row[0]
        else:
            cur.execute(
                """
                INSERT INTO categories (name, parent_id, created_at, updated_at)
                VALUES (%s, NULL, NOW(), NOW())
                RETURNING id
                """,
                (CATEGORY_PARENT,),
            )
            parent_id = cur.fetchone()[0]

        cur.execute(
            "SELECT id FROM categories WHERE name=%s AND parent_id=%s",
            (CATEGORY_CHILD, parent_id),
        )
        row = cur.fetchone()
        if row:
            child_id = row[0]
        else:
            cur.execute(
                """
                INSERT INTO categories (name, parent_id, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                RETURNING id
                """,
                (CATEGORY_CHILD, parent_id),
            )
            child_id = cur.fetchone()[0]

    return parent_id, child_id


def reset_product(conn, seller_id, category_id):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM products WHERE slug=%s", (PRODUCT_SLUG,))
        row = cur.fetchone()
        if row:
            product_id = row[0]
            cur.execute("DELETE FROM auto_bid_events WHERE product_id=%s", (product_id,))
            cur.execute("DELETE FROM auto_bids WHERE product_id=%s", (product_id,))
            cur.execute("DELETE FROM bids WHERE product_id=%s", (product_id,))
            cur.execute("DELETE FROM product_images WHERE product_id=%s", (product_id,))
            cur.execute("DELETE FROM products WHERE id=%s", (product_id,))

        start_at = datetime.now(timezone.utc) - timedelta(hours=1)
        end_at = start_at + timedelta(days=3)

        cur.execute(
            """
            INSERT INTO products (
                seller_id, category_id, name, slug, description,
                start_price, price_step, current_price, buy_now_price,
                auto_extend, enable_auto_bid, current_bidder_id,
                bid_count, highlight_until, status,
                start_at, end_at, created_at, updated_at
            )
            VALUES (
                %(seller_id)s, %(category_id)s, %(name)s, %(slug)s, %(description)s,
                %(start_price)s, %(price_step)s, %(current_price)s, %(buy_now_price)s,
                TRUE, TRUE, NULL, 0, %(highlight_until)s, 'ACTIVE',
                %(start_at)s, %(end_at)s, %(start_at)s, %(start_at)s
            )
            RETURNING id
            """,
            {
                "seller_id": seller_id,
                "category_id": category_id,
                "name": PRODUCT_NAME,
                "slug": PRODUCT_SLUG,
                "description": "Week 5 seeded product for bidding tests.",
                "start_price": 1_000_000,
                "price_step": 50_000,
                "current_price": 1_000_000,
                "buy_now_price": 5_000_000,
                "highlight_until": start_at + timedelta(hours=2),
                "start_at": start_at,
                "end_at": end_at,
            },
        )
        product_id = cur.fetchone()[0]

        images = [
            ("https://placehold.co/800x600?text=Week5+1", 1),
            ("https://placehold.co/800x600?text=Week5+2", 2),
            ("https://placehold.co/800x600?text=Week5+3", 3),
        ]
        for url, order in images:
            cur.execute(
                """
                INSERT INTO product_images (product_id, image_url, display_order)
                VALUES (%s, %s, %s)
                """,
                (product_id, url, order),
            )

    return product_id


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        seller_id = upsert_seller(conn)
        _, child_id = ensure_categories(conn)
        product_id = reset_product(conn, seller_id, child_id)
        conn.commit()
        print("✅ Week5 seed completed")
        print(f"   Seller: {SELLER_EMAIL} (id={seller_id})")
        print(f"   Product: {PRODUCT_NAME} (id={product_id})")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()

