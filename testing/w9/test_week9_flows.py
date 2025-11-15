#!/usr/bin/env python3
"""
Week 9 regression:
- Registration + email verification flow
- Change password endpoint
- Allow-unrated-bidder toggle enforcement
"""

import json
import os
import uuid

import psycopg2
import requests


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"
CAPTCHA_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "dbname": os.getenv("DB_NAME", "auction_db"),
    "user": os.getenv("DB_USER", "auction_admin"),
    "password": os.getenv("DB_PASSWORD", "SieuMatKhau123!@"),
}
W9_BIDDER_EMAIL = os.getenv("W9_BIDDER_EMAIL", "bidder_w9@example.com")
W9_BIDDER_PASSWORD = os.getenv("W9_BIDDER_PASSWORD", "SellerPass123!")


def pretty(data):
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return str(data)


def request(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.request(
        method=method.upper(),
        url=f"{BASE_API}{path}",
        headers=headers,
        timeout=15,
        **kwargs,
    )
    try:
        payload = response.json()
    except Exception:
        payload = {}
    print(f"\n{method.upper()} {path} -> {response.status_code}")
    print(pretty(payload))
    return response, payload


def fetch_registration_code(email):
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT uo.code
                FROM user_otps uo
                INNER JOIN users u ON u.id = uo.user_id
                WHERE u.email=%s AND uo.purpose='REGISTER'
                ORDER BY uo.created_at DESC
                LIMIT 1
                """,
                (email,),
            )
            row = cur.fetchone()
            return row[0] if row else None
    finally:
        conn.close()


def login(email, password):
    resp, body = request("post", "/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        raise RuntimeError(f"Login failed for {email}")
    data = body.get("data") or {}
    return data.get("token")


def find_product_by_slug(slug, token):
    resp, payload = request("get", "/products", token, params={"limit": 50})
    if resp.status_code != 200:
        raise RuntimeError("Unable to load products for bidding test.")
    items = (payload.get("data") or {}).get("items") or []
    for item in items:
        if item.get("slug") == slug:
            return item
    raise RuntimeError(f"Product with slug {slug} not found. Seed Week9 data first.")


def main():
    print(f"API base: {API_BASE_URL}")
    email = f"week9_{uuid.uuid4().hex[:6]}@example.com"
    password = "Week9UserPass123!"

    # 1. Register new account (should require verification)
    request(
        "post",
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "fullName": "Week Nine Tester",
            "phoneNumber": "0909000000",
            "captchaToken": CAPTCHA_TOKEN,
        },
    )

    # Login must fail before verification
    resp, _ = request("post", "/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 403, "Unverified users should not be able to log in."

    # Fetch OTP directly from DB (test helper)
    otp = fetch_registration_code(email)
    if not otp:
        raise RuntimeError("Unable to obtain verification OTP for test user.")

    # Verify email
    request("post", "/auth/verify-email", json={"email": email, "code": otp})

    # Login should now succeed
    token = login(email, password)

    # Change password flow
    request(
        "post",
        "/auth/change-password",
        token,
        json={"currentPassword": password, "newPassword": "Week9UserPass456!"},
    )
    # Confirm new password works
    login(email, "Week9UserPass456!")

    # 2. Bidder eligibility tests
    bidder_token = login(W9_BIDDER_EMAIL, W9_BIDDER_PASSWORD)
    locked_product = find_product_by_slug("week9-locked", bidder_token)
    open_product = find_product_by_slug("week9-open", bidder_token)

    # attempt to bid on locked product (should be rejected)
    resp, _ = request(
        "post",
        f"/products/{locked_product['id']}/bid",
        bidder_token,
        json={"amount": locked_product["currentPrice"] + locked_product["priceStep"]},
    )
    assert resp.status_code == 403, "Unrated bidder should be blocked on locked product."

    # bid on open product (should succeed)
    request(
        "post",
        f"/products/{open_product['id']}/bid",
        bidder_token,
        json={"amount": open_product["currentPrice"] + open_product["priceStep"]},
    )

    print("\n✅ Week 9 verification flow completed.")


if __name__ == "__main__":
    main()
