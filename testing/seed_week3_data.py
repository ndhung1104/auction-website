#!/usr/bin/env python3
"""
Seed helper for Week 3 tests.

This script inserts:
- Seller + bidder accounts (if missing)
- A test category hierarchy
- One showcase product with images
- Sample Q&A thread
- A couple of manual bids to populate history

It reads DB credentials from environment variables (see testing/.env).
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "dbname": os.getenv("DB_NAME", "auction_db"),
    "user": os.getenv("DB_USER", "auction_admin"),
    "password": os.getenv("DB_PASSWORD", "SieuMatKhau123!@"),
}

SELLER = {
    "email": os.getenv("W3_SELLER_EMAIL", "seller_w3@example.com"),
    "full_name": "Week3 Seller",
    "role": "SELLER",
}

BIDDERS = [
    {
        "email": os.getenv("W3_BIDDER1_EMAIL", "bidder_one_w3@example.com"),
        "full_name": "Week3 Bidder One",
    },
    {
        "email": os.getenv("W3_BIDDER2_EMAIL", "bidder_two_w3@example.com"),
        "full_name": "Week3 Bidder Two",
    },
]

CATEGORY_PARENT = "Week3 Specials"
CATEGORY_CHILD = "Week3 Phones"

PRODUCT_NAME = "Week3 Showcase Phone"
PRODUCT_DESCRIPTION = (
    "Demo product inserted via seed_week3_data.py to support homepage/product detail tests."
)
PRODUCT_IMAGES = [
    "https://placehold.co/800x600?text=Week3+Hero",
    "https://placehold.co/800x600?text=Week3+Alt1",
    "https://placehold.co/800x600?text=Week3+Alt2",
]


def ensure_user(conn, profile):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email=%s", (profile["email"],))
        row = cur.fetchone()
        if row:
            return row[0]

        cur.execute(
            """
            INSERT INTO users (
                email, password_hash, full_name, phone_number, address,
                role, positive_score, negative_score, status,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, 0, 0, 'CONFIRMED', NOW(), NOW())
            RETURNING id
            """,
            (
                profile["email"],
                "seeded-password",
                profile["full_name"],
                "0909000000",
                "Week3 Lane",
                profile.get("role", "BIDDER"),
            ),
        )
        return cur.fetchone()[0]


def ensure_category(conn, name, parent_id=None):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM categories WHERE name=%s AND parent_id IS NOT DISTINCT FROM %s",
            (name, parent_id),
        )
        row = cur.fetchone()
        if row:
            return row[0]

        cur.execute(
            """
            INSERT INTO categories (name, parent_id, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            RETURNING id
            """,
            (name, parent_id),
        )
        return cur.fetchone()[0]


def insert_product(conn, seller_id, category_id):
    slug = f"{PRODUCT_NAME.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc)
    end_at = now + timedelta(days=3)

    with conn.cursor() as cur:
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
                %(start_at)s, %(end_at)s, %(created_at)s, %(created_at)s
            )
            RETURNING id
            """,
            {
                "seller_id": seller_id,
                "category_id": category_id,
                "name": PRODUCT_NAME,
                "slug": slug,
                "description": PRODUCT_DESCRIPTION,
                "start_price": 5_000_000,
                "price_step": 200_000,
                "current_price": 5_000_000,
                "buy_now_price": 9_500_000,
                "highlight_until": now + timedelta(hours=2),
                "start_at": now,
                "end_at": end_at,
                "created_at": now,
            },
        )
        return cur.fetchone()[0]


def insert_product_images(conn, product_id):
    with conn.cursor() as cur:
        for order, url in enumerate(PRODUCT_IMAGES, start=1):
            cur.execute(
                """
                INSERT INTO product_images (product_id, image_url, display_order)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (product_id, url, order),
            )


def insert_qna(conn, product_id, asker_id, seller_id):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO questions (product_id, user_id, question_text, created_at)
            VALUES (%s, %s, %s, NOW())
            RETURNING id
            """,
            (product_id, asker_id, "Is this item eligible for auto-bid?"),
        )
        question_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO answers (question_id, user_id, answer_text, created_at)
            VALUES (%s, %s, %s, NOW())
            """,
            (
                question_id,
                seller_id,
                "Yes, auto-bid is enabled and the device ships within Vietnam.",
            ),
        )


def insert_bids(conn, product_id, bidder_ids, price_step):
    bids = [
        (bidder_ids[0], 5_200_000, False),
        (bidder_ids[1], 5_600_000, False),
        (bidder_ids[0], 5_800_000, False),
    ]

    latest_bidder = None
    latest_price = None

    with conn.cursor() as cur:
        for user_id, amount, is_auto in bids:
            cur.execute(
                """
                INSERT INTO bids (
                    product_id, user_id, bid_amount, is_auto_bid, created_at
                )
                VALUES (%s, %s, %s, %s, NOW())
                """,
                (product_id, user_id, amount, is_auto),
            )
            latest_bidder = user_id
            latest_price = amount

        cur.execute(
            """
            UPDATE products
            SET current_price=%s,
                current_bidder_id=%s,
                bid_count=%s,
                updated_at=NOW()
            WHERE id=%s
            """,
            (latest_price, latest_bidder, len(bids), product_id),
        )


def main():
    print("Connecting to database with:", DB_CONFIG)
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False

    try:
        seller_id = ensure_user(conn, SELLER)
        bidder_ids = [ensure_user(conn, {**bidder, "role": "BIDDER"}) for bidder in BIDDERS]

        parent_id = ensure_category(conn, CATEGORY_PARENT, None)
        child_id = ensure_category(conn, CATEGORY_CHILD, parent_id)

        product_id = insert_product(conn, seller_id, child_id)
        insert_product_images(conn, product_id)
        insert_qna(conn, product_id, bidder_ids[0], seller_id)
        insert_bids(conn, product_id, bidder_ids, price_step=200_000)

        conn.commit()
        print(f"✅ Seeded product #{product_id} for Week 3 tests.")
        print(f"   Seller email: {SELLER['email']}")
        print("   Bidder emails:", ", ".join(user["email"] for user in BIDDERS))
    except Exception as exc:
        conn.rollback()
        print("❌ Failed to seed data:", exc)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
