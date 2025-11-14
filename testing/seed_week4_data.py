#!/usr/bin/env python3
"""
Seed helper for Week 4 flows.

- Ensures a SELLER account exists with a known password hash.
- Prepares a dedicated category branch for seller listings.

Uses the same DB env vars as other seeders (see testing/.env).
"""

import os
import psycopg2

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "dbname": os.getenv("DB_NAME", "auction_db"),
    "user": os.getenv("DB_USER", "auction_admin"),
    "password": os.getenv("DB_PASSWORD", "SieuMatKhau123!@"),
}

SELLER_EMAIL = os.getenv("W4_SELLER_EMAIL", "seller_w4@example.com")
SELLER_PASSWORD_HASH = os.getenv(
    "W4_SELLER_PASSWORD_HASH",
    "$2b$10$xZOqVPBacXrQhfhbJDPdkuJ3yS8rsGVABg6WbmJnVZYTiHJ3YZlKa",
)

CATEGORY_PARENT = "Week4 Electronics"
CATEGORY_CHILD = "Week4 Cameras"


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
                "Week4 Seller",
                "0909000000",
                "Week4 Seller Street",
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


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        seller_id = upsert_seller(conn)
        parent_id, child_id = ensure_categories(conn)
        conn.commit()
        print("✅ Week4 seed complete")
        print(f"   Seller email: {SELLER_EMAIL}")
        print(f"   Seller user id: {seller_id}")
        print(f"   Category parent id: {parent_id}, child id: {child_id}")
    except Exception as exc:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
