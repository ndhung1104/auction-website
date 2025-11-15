#!/usr/bin/env python3
"""
Week 9 seeding script:
- Creates a seller + bidder for OTP/eligibility demos
- Adds two products (one blocks unrated bidders, one allows them)
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

PASSWORD_HASH = os.getenv(
    "W9_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)

SELLER_EMAIL = os.getenv("W9_SELLER_EMAIL", "seller_w9@example.com")
BIDDER_EMAIL = os.getenv("W9_BIDDER_EMAIL", "bidder_w9@example.com")


def upsert_user(cur, email, role):
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    row = cur.fetchone()
    if row:
        cur.execute(
            """
            UPDATE users
            SET role=%s,
                password_hash=%s,
                status='CONFIRMED',
                full_name=%s
            WHERE id=%s
            """,
            (role, PASSWORD_HASH, email.split("@")[0], row[0]),
        )
        return row[0]
    cur.execute(
        """
        INSERT INTO users (email, password_hash, full_name, role, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'CONFIRMED', NOW(), NOW())
        RETURNING id
        """,
        (email, PASSWORD_HASH, email.split("@")[0], role),
    )
    return cur.fetchone()[0]


def ensure_category(cur):
    cur.execute("SELECT id FROM categories WHERE name=%s", ("Week9 Specials",))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        """
        INSERT INTO categories (name, created_at, updated_at)
        VALUES (%s, NOW(), NOW())
        RETURNING id
        """,
        ("Week9 Specials",),
    )
    return cur.fetchone()[0]


def create_product(cur, seller_id, category_id, slug, allow_unrated):
    cur.execute("DELETE FROM products WHERE slug=%s", (slug,))
    start_at = datetime.now(timezone.utc) - timedelta(hours=1)
    end_at = start_at + timedelta(days=3)
    cur.execute(
        """
        INSERT INTO products (
            seller_id, category_id, name, slug, description,
            start_price, price_step, current_price, buy_now_price,
            auto_extend, enable_auto_bid, allow_unrated_bidders,
            current_bidder_id, bid_count, highlight_until,
            status, start_at, end_at, created_at, updated_at
        )
        VALUES (
            %(seller)s, %(category)s, %(name)s, %(slug)s, %(description)s,
            1000000, 50000, 1000000, 2500000,
            TRUE, TRUE, %(allow)s,
            NULL, 0, NULL,
            'ACTIVE', %(start_at)s, %(end_at)s, %(start_at)s, %(start_at)s
        )
        RETURNING id
        """,
        {
            "seller": seller_id,
            "category": category_id,
            "name": f"Week9 Demo - { 'Open' if allow_unrated else 'Locked' }",
            "slug": slug,
            "description": "Seeded product for Week 9 verification.",
            "allow": allow_unrated,
            "start_at": start_at,
            "end_at": end_at,
        },
    )
    product_id = cur.fetchone()[0]
    cur.execute(
        """
        INSERT INTO product_images (product_id, image_url, display_order)
        VALUES
        (%s, 'https://placehold.co/600x400?text=Week9+1', 1),
        (%s, 'https://placehold.co/600x400?text=Week9+2', 2),
        (%s, 'https://placehold.co/600x400?text=Week9+3', 3)
        """,
        (product_id, product_id, product_id),
    )
    return product_id


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            seller_id = upsert_user(cur, SELLER_EMAIL, "SELLER")
            bidder_id = upsert_user(cur, BIDDER_EMAIL, "BIDDER")
            category_id = ensure_category(cur)
            locked_id = create_product(cur, seller_id, category_id, "week9-locked", False)
            open_id = create_product(cur, seller_id, category_id, "week9-open", True)
        conn.commit()
        print(
            f"[OK] Week9 seed complete (seller={seller_id}, bidder={bidder_id}, locked_product={locked_id}, open_product={open_id})"
        )
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
