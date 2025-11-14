#!/usr/bin/env python3
"""
Week 6 seed helper.

Creates:
- Admin account (admin_w6@example.com)
- Seller account with one active product
- Bidder account plus a pending seller request
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

ADMIN_EMAIL = os.getenv("W6_ADMIN_EMAIL", "admin_w6@example.com")
SELLER_EMAIL = os.getenv("W6_SELLER_EMAIL", "seller_w6@example.com")
BIDDER_EMAIL = os.getenv("W6_BIDDER_EMAIL", "bidder_w6@example.com")
SELLER_PASSWORD_HASH = os.getenv(
    "W6_SELLER_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)
ADMIN_PASSWORD_HASH = os.getenv(
    "W6_ADMIN_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)
BIDDER_PASSWORD_HASH = os.getenv(
    "W6_BIDDER_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)
PRODUCT_NAME = os.getenv("W6_PRODUCT_NAME", "Week6 Admin Demo Product")
PRODUCT_SLUG = os.getenv("W6_PRODUCT_SLUG", "week6-admin-demo")


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
                email, password_hash, full_name, phone_number, address,
                role, positive_score, negative_score, status, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, 0, 0, 'CONFIRMED', NOW(), NOW())
            RETURNING id
            """,
            (
                email,
                password_hash,
                email.split("@")[0].replace(".", " ").title(),
                "0909999999",
                "Week6 Street",
                role,
            ),
        )
        return cur.fetchone()[0]


def ensure_category(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM categories WHERE name=%s", ("Week6 Specials",))
        row = cur.fetchone()
        if row:
            return row[0]
        cur.execute(
            """
            INSERT INTO categories(name, created_at, updated_at)
            VALUES (%s, NOW(), NOW())
            RETURNING id
            """,
            ("Week6 Specials",),
        )
        return cur.fetchone()[0]


def reset_product(conn, seller_id, category_id):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM products WHERE slug=%s", (PRODUCT_SLUG,))
        start_at = datetime.now(timezone.utc) - timedelta(hours=2)
        end_at = start_at + timedelta(days=2)
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
                1500000, 50000, 1500000, 4000000,
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
                "description": "Week 6 demo product for admin/watchlist tests.",
                "highlight_until": start_at + timedelta(hours=2),
                "start_at": start_at,
                "end_at": end_at,
            },
        )
        product_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO product_images (product_id, image_url, display_order)
            VALUES
            (%s, 'https://placehold.co/800x600?text=Week6+1', 1),
            (%s, 'https://placehold.co/800x600?text=Week6+2', 2),
            (%s, 'https://placehold.co/800x600?text=Week6+3', 3)
            """,
            (product_id, product_id, product_id),
        )
    return product_id


def create_pending_request(conn, user_id):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM seller_requests WHERE user_id=%s", (user_id,))
        cur.execute(
            """
            INSERT INTO seller_requests (user_id, status, requested_at, expire_at)
            VALUES (%s, 'PENDING', NOW(), NOW() + INTERVAL '7 days')
            RETURNING id
            """,
            (user_id,),
        )
        return cur.fetchone()[0]


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        admin_id = upsert_user(conn, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, 'ADMIN')
        seller_id = upsert_user(conn, SELLER_EMAIL, SELLER_PASSWORD_HASH, 'SELLER')
        bidder_id = upsert_user(conn, BIDDER_EMAIL, BIDDER_PASSWORD_HASH, 'BIDDER')
        create_pending_request(conn, bidder_id)
        category_id = ensure_category(conn)
        product_id = reset_product(conn, seller_id, category_id)
        conn.commit()
        print(f"[OK] Seeded Week6 data (admin={admin_id}, seller={seller_id}, bidder={bidder_id}, product={product_id})")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
