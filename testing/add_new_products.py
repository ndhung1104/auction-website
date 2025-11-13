# seed_products.py
import os
import psycopg2
from datetime import datetime, timedelta

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "dbname": os.getenv("DB_NAME", "auction_db"),
    "user": os.getenv("DB_USER", "auction_admin"),
    "password": os.getenv("DB_PASSWORD", "SieuMatKhau123!@"),
}

CATEGORIES = [
    ("Electronics", None),
    ("Phones", "Electronics"),
    ("Fashion", None),
]

PRODUCTS = [
    {
        "name": "iPhone 15 Pro",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 15000000,
        "price_step": 500000,
        "buy_now": 25000000,
        "duration_days": 5,
    },
    {
        "name": "Vintage Jacket",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 800000,
        "price_step": 50000,
        "buy_now": None,
        "duration_days": 3,
    },

    # --- Thêm 28 sản phẩm mới ---
    {
        "name": "Samsung Galaxy S24",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 12000000,
        "price_step": 400000,
        "buy_now": 20000000,
        "duration_days": 4,
    },
    {
        "name": "Google Pixel 8 Pro",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 11000000,
        "price_step": 300000,
        "buy_now": 18000000,
        "duration_days": 5,
    },
    {
        "name": "Xiaomi 14 Ultra",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 10000000,
        "price_step": 300000,
        "buy_now": 17000000,
        "duration_days": 4,
    },
    {
        "name": "Sony Xperia 1 V",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 9000000,
        "price_step": 250000,
        "buy_now": 15000000,
        "duration_days": 5,
    },
    {
        "name": "Nokia X30",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 5000000,
        "price_step": 150000,
        "buy_now": 8000000,
        "duration_days": 3,
    },
    {
        "name": "Asus ROG Phone 8",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 18000000,
        "price_step": 600000,
        "buy_now": 26000000,
        "duration_days": 6,
    },
    {
        "name": "Oppo Find X7",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 8500000,
        "price_step": 200000,
        "buy_now": 13000000,
        "duration_days": 4,
    },
    {
        "name": "Huawei Mate 60 Pro",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 14000000,
        "price_step": 400000,
        "buy_now": 23000000,
        "duration_days": 5,
    },
    {
        "name": "Realme GT 6",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 6000000,
        "price_step": 180000,
        "buy_now": 9500000,
        "duration_days": 3,
    },
    {
        "name": "Motorola Edge 40",
        "category": "Phones",
        "seller_email": "tester@example.com",
        "start_price": 7000000,
        "price_step": 200000,
        "buy_now": None,
        "duration_days": 4,
    },

    # --- Fashion ---
    {
        "name": "Classic Leather Boots",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 1200000,
        "price_step": 70000,
        "buy_now": 2200000,
        "duration_days": 3,
    },
    {
        "name": "Summer Floral Dress",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 500000,
        "price_step": 30000,
        "buy_now": 900000,
        "duration_days": 3,
    },
    {
        "name": "Men's Slim Jeans",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 450000,
        "price_step": 20000,
        "buy_now": None,
        "duration_days": 3,
    },
    {
        "name": "Sports Hoodie",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 550000,
        "price_step": 20000,
        "buy_now": 950000,
        "duration_days": 3,
    },
    {
        "name": "Luxury Silk Scarf",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 300000,
        "price_step": 15000,
        "buy_now": 600000,
        "duration_days": 4,
    },
    {
        "name": "Vintage Leather Belt",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 200000,
        "price_step": 10000,
        "buy_now": None,
        "duration_days": 2,
    },
    {
        "name": "Designer Handbag",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 2500000,
        "price_step": 100000,
        "buy_now": 4000000,
        "duration_days": 5,
    },
    {
        "name": "Men's Oxford Shoes",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 900000,
        "price_step": 60000,
        "buy_now": 1600000,
        "duration_days": 4,
    },
    {
        "name": "Casual T-Shirt Pack",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 300000,
        "price_step": 15000,
        "buy_now": None,
        "duration_days": 2,
    },
    {
        "name": "Wool Winter Coat",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 1500000,
        "price_step": 80000,
        "buy_now": 2500000,
        "duration_days": 4,
    },
    {
        "name": "Kids Cartoon Hoodie",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 250000,
        "price_step": 10000,
        "buy_now": None,
        "duration_days": 2,
    },
    {
        "name": "Unisex Baseball Cap",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 150000,
        "price_step": 10000,
        "buy_now": 300000,
        "duration_days": 3,
    },
    {
        "name": "Running Sneakers",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 850000,
        "price_step": 50000,
        "buy_now": 1400000,
        "duration_days": 4,
    },
    {
        "name": "Formal Suit Set",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 2500000,
        "price_step": 120000,
        "buy_now": 3800000,
        "duration_days": 5,
    },
    {
        "name": "Handmade Wool Sweater",
        "category": "Fashion",
        "seller_email": "tester@example.com",
        "start_price": 700000,
        "price_step": 30000,
        "buy_now": None,
        "duration_days": 3,
    },
]


def ensure_user(conn, email):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        row = cur.fetchone()
        if row:
            return row[0]
        raise RuntimeError(f"User {email} not found. Register/login first.")

def ensure_categories(conn):
    ids = {}
    with conn.cursor() as cur:
        for name, parent in CATEGORIES:
            parent_id = ids.get(parent)
            cur.execute(
                """
                INSERT INTO categories(name, parent_id)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                """,
                (name, parent_id),
            )
            ids[name] = cur.fetchone()[0]
    return ids

def insert_product(conn, product, cat_ids, seller_id):
    with conn.cursor() as cur:
        start = datetime.utcnow()
        end = start + timedelta(days=product["duration_days"])
        cur.execute(
            """
            INSERT INTO products (
                seller_id, category_id, name, slug, description,
                start_price, price_step, current_price, buy_now_price,
                auto_extend, enable_auto_bid, current_bidder_id,
                bid_count, highlight_until, status, start_at, end_at, created_at, updated_at
            )
            VALUES (
                %(seller_id)s, %(category_id)s, %(name)s, %(slug)s, %(description)s,
                %(start_price)s, %(price_step)s, %(current_price)s, %(buy_now_price)s,
                true, true, NULL, 0, NULL, 'ACTIVE', %(start_at)s, %(end_at)s, %(start_at)s, %(start_at)s
            )
            ON CONFLICT (slug) DO UPDATE SET
                current_price = EXCLUDED.current_price,
                status = EXCLUDED.status,
                end_at = EXCLUDED.end_at
            """,
            {
                "seller_id": seller_id,
                "category_id": cat_ids[product["category"]],
                "name": product["name"],
                "slug": product["name"].lower().replace(" ", "-"),
                "description": f"Auto-seeded product {product['name']}",
                "start_price": product["start_price"],
                "price_step": product["price_step"],
                "current_price": product["start_price"],
                "buy_now_price": product["buy_now"],
                "start_at": start,
                "end_at": end,
            },
        )

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        seller_id = ensure_user(conn, "tester@example.com")
        cat_ids = ensure_categories(conn)
        for product in PRODUCTS:
            insert_product(conn, product, cat_ids, seller_id)
        conn.commit()
        print("Seeded products successfully.")
    except Exception as exc:
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
