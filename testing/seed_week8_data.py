#!/usr/bin/env python3
"""
Week 8 seeding script
- Creates 5 categories and ~20 products spanning manual, auto-bid, and buy-now flows
- Seeds sellers, bidders, orders, bids, auto-bids to support rehearsal scenarios
"""

import os
from datetime import datetime, timedelta, timezone
import random

import psycopg2


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "dbname": os.getenv("DB_NAME", "auction_db"),
    "user": os.getenv("DB_USER", "auction_admin"),
    "password": os.getenv("DB_PASSWORD", "SieuMatKhau123!@"),
}

PASSWORD_HASH = os.getenv(
    "W8_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)

CATEGORIES = [
    ("Week8 Electronics", "Week8 Cameras, laptops, headphones"),
    ("Week8 Fashion", "Limited edition fashion items"),
    ("Week8 Collectibles", "Signed cards and memorabilia"),
    ("Week8 Home", "Home appliances and decor"),
    ("Week8 Art", "Paintings and sculptures"),
]


def upsert_user(conn, email, role):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        row = cur.fetchone()
        if row:
            cur.execute(
                "UPDATE users SET role=%s, password_hash=%s, status='CONFIRMED' WHERE id=%s",
                (role, PASSWORD_HASH, row[0]),
            )
            return row[0]
        cur.execute(
            """
            INSERT INTO users (email, password_hash, full_name, role, status, positive_score, negative_score, created_at, updated_at)
            VALUES (%s, %s, %s, %s, 'CONFIRMED', 0, 0, now(), now())
            RETURNING id
            """,
            (email, PASSWORD_HASH, email.split("@")[0], role),
        )
        return cur.fetchone()[0]


def seed_categories(conn):
    ids = []
    with conn.cursor() as cur:
        for name, description in CATEGORIES:
            cur.execute("SELECT id FROM categories WHERE name=%s", (name,))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                continue
            cur.execute(
                """
                INSERT INTO categories (name, description, created_at, updated_at)
                VALUES (%s, %s, now(), now())
                RETURNING id
                """,
                (name, description),
            )
            ids.append(cur.fetchone()[0])
    return ids


def cleanup_product(conn, slug):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM products WHERE slug=%s", (slug,))
        row = cur.fetchone()
        if not row:
            return
        product_id = row[0]
        # remove dependents with FK
        cur.execute("DELETE FROM product_images WHERE product_id=%s", (product_id,))
        cur.execute("DELETE FROM bids WHERE product_id=%s", (product_id,))
        cur.execute("DELETE FROM auto_bids WHERE product_id=%s", (product_id,))
        cur.execute(
            """
            DELETE FROM order_messages WHERE order_id IN (
              SELECT id FROM orders WHERE product_id=%s
            )
            """,
            (product_id,),
        )
        cur.execute("DELETE FROM orders WHERE product_id=%s", (product_id,))
        cur.execute("DELETE FROM watchlist WHERE product_id=%s", (product_id,))
        cur.execute("DELETE FROM questions WHERE product_id=%s", (product_id,))
        cur.execute("DELETE FROM products WHERE id=%s", (product_id,))


def create_products(conn, seller_id, bidder_ids, category_ids):
    products = []
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        for idx in range(20):
            category_id = category_ids[idx % len(category_ids)]
            name = f"Week8 Product {idx + 1:02d}"
            slug = f"week8-product-{idx + 1:02d}"
            cleanup_product(conn, slug)
            start_at = now - timedelta(hours=2)
            end_at = now + timedelta(days=3 - (idx % 3))
            start_price = 600000 + idx * 25000
            current_price = start_price
            auto_enabled = idx % 2 == 0
            cur.execute(
                """
                INSERT INTO products (
                    seller_id, category_id, name, slug, description,
                    start_price, price_step, current_price, buy_now_price,
                    auto_extend, enable_auto_bid, status,
                    start_at, end_at, created_at, updated_at
                )
                VALUES (
                    %(seller)s, %(category)s, %(name)s, %(slug)s, %(desc)s,
                    %(start_price)s, 50000, %(current_price)s, %(buy_now)s,
                    TRUE, %(auto)s, 'ACTIVE',
                    %(start_at)s, %(end_at)s, %(start_at)s, %(start_at)s
                )
                RETURNING id
                """,
                {
                    "seller": seller_id,
                    "category": category_id,
                    "name": name,
                    "slug": slug,
                    "desc": "Seeded product for Week 8 regression scenarios.",
                    "start_price": start_price,
                    "current_price": current_price,
                    "buy_now": start_price * 2,
                    "auto": auto_enabled,
                    "start_at": start_at,
                    "end_at": end_at,
                },
            )
            product_id = cur.fetchone()[0]
            products.append(product_id)
            for order in range(1, 4):
                cur.execute(
                    """
                    INSERT INTO product_images (product_id, image_url, display_order)
                    VALUES (%s, %s, %s)
                    """,
                    (
                        product_id,
                        f"https://placehold.co/800x600?text=Week8+{idx+1}-{order}",
                        order,
                    ),
                )
            # add some bids / auto bids
            bidder_id = random.choice(bidder_ids)
            bid_amount = current_price + 50000
            cur.execute(
                """
                INSERT INTO bids (product_id, user_id, bid_amount, is_auto_bid)
                VALUES (%s, %s, %s, FALSE)
                """,
                (product_id, bidder_id, bid_amount),
            )
            cur.execute(
                """
                UPDATE products
                SET current_price=%s, current_bidder_id=%s, bid_count=1, updated_at=now()
                WHERE id=%s
                """,
                (bid_amount, bidder_id, product_id),
            )
            if auto_enabled:
                auto_bidder = random.choice(bidder_ids)
                max_amount = bid_amount + 200000
                cur.execute(
                    """
                    INSERT INTO auto_bids (product_id, user_id, max_bid_amount, created_at, updated_at)
                    VALUES (%s, %s, %s, now(), now())
                    ON CONFLICT (product_id, user_id) DO UPDATE
                    SET max_bid_amount=excluded.max_bid_amount, updated_at=now()
                    """,
                    (product_id, auto_bidder, max_amount),
                )
    return products


def create_orders(conn, seller_id, bidder_ids, product_ids):
    with conn.cursor() as cur:
        for product_id in product_ids[:5]:
            winner_id = random.choice(bidder_ids)
            final_price = 1500000 + random.randint(0, 5) * 50000
            cur.execute("DELETE FROM orders WHERE product_id=%s", (product_id,))
            cur.execute(
                """
                INSERT INTO orders (product_id, seller_id, winner_id, final_price, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, 'PENDING_PAYMENT', now(), now())
                RETURNING id
                """,
                (product_id, seller_id, winner_id, final_price),
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
                    winner_id,
                    "Hi seller, please confirm shipping.",
                    order_id,
                    seller_id,
                    "Thanks! Preparing shipment.",
                ),
            )


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        seller_id = upsert_user(conn, "week8-seller@example.com", "SELLER")
        bidder_ids = [
            upsert_user(conn, f"week8-bidder{i}@example.com", "BIDDER")
            for i in range(1, 5)
        ]
        category_ids = seed_categories(conn)
        product_ids = create_products(conn, seller_id, bidder_ids, category_ids)
        create_orders(conn, seller_id, bidder_ids, product_ids)
        conn.commit()
        print("[OK] Week 8 data seeded.")
    except Exception as exc:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
