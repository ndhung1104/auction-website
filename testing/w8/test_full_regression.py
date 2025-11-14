#!/usr/bin/env python3
"""
Week 8 regression harness (do not auto-run):
- Seeds product catalog via Week8 seeder
- Exercises register/login/reset, watchlist, bidding, auto-bid, orders chat/status/rating
"""

import json
import os
import uuid

import requests


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"
BYPASS_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")
SELLER_EMAIL = os.getenv("W8_SELLER_EMAIL", "week8-seller@example.com")
SELLER_PASSWORD = os.getenv("W8_SELLER_PASSWORD", "SellerPass123!")
BIDDER_EMAIL = os.getenv("W8_REGRESSION_BIDDER", "week8-bidder1@example.com")
BIDDER_PASSWORD = os.getenv("W8_REGRESSION_PASSWORD", "SellerPass123!")


def pretty(payload):
  try:
    return json.dumps(payload, indent=2, ensure_ascii=False)
  except Exception:
    return str(payload)


def request(method, path, token=None, **kwargs):
  headers = kwargs.pop("headers", {})
  if token:
    headers["Authorization"] = f"Bearer {token}"
  response = requests.request(method.upper(), f"{BASE_API}{path}", headers=headers, timeout=20, **kwargs)
  try:
    body = response.json()
  except Exception:
    body = {}
  print(f"\n{method.upper()} {path} -> {response.status_code}")
  print(pretty(body))
  return response, body


def login(email, password):
  response, body = request("post", "/auth/login", json={"email": email, "password": password})
  if response.status_code != 200:
    raise RuntimeError(f"Login failed for {email}")
  return body.get("data", {}).get("token")


def main():
  print(f"API base: {API_BASE_URL}")

  # 1. Registration + reset password
  email = f"week8-{uuid.uuid4().hex[:5]}@example.com"
  register_payload = {
    "email": email,
    "password": "Week8Pass123!",
    "fullName": "Week 8 Tester",
    "phoneNumber": "0909008800",
    "captchaToken": BYPASS_TOKEN
  }
  request("post", "/auth/register", json=register_payload)
  response, body = request("post", "/auth/forgot-password", json={"email": email})
  assert response.status_code == 200, "Forgot password should succeed"
  reset_token = (body.get("data") or {}).get("resetToken")
  assert reset_token, "Dev env should return reset token"
  response, _ = request("post", "/auth/reset-password", json={"token": reset_token, "newPassword": "Week8Pass456!"})
  assert response.status_code == 200
  login(email, "Week8Pass456!")

  # 2. Watchlist & search
  bidder_token = login(BIDDER_EMAIL, BIDDER_PASSWORD)
  response, search_body = request("get", "/search", params={"q": "Week8"})
  assert response.status_code == 200
  items = (search_body.get("data") or {}).get("items") or []
  assert items, "Week8 search should return seeded products"
  product_id = items[0]["id"]
  request("post", f"/watchlist/{product_id}", bidder_token)
  request("delete", f"/watchlist/{product_id}", bidder_token)

  # 3. Manual bid + auto-bid
  bid_amount = (items[0]["currentPrice"] or 0) + 50000
  request("post", f"/products/{product_id}/bid", bidder_token, json={"amount": bid_amount})
  request("post", f"/products/{product_id}/auto-bid", bidder_token, json={"maxBidAmount": bid_amount + 200000})

  # 4. Orders workflow
  seller_token = login(SELLER_EMAIL, SELLER_PASSWORD)
  response, data = request("get", "/orders", seller_token)
  assert response.status_code == 200
  existing_orders = (data.get("data") or {}).get("items") or []
  assert existing_orders, "Seed script should create orders"
  order_id = existing_orders[0]["id"]
  request("get", f"/orders/{order_id}", seller_token)
  request("post", f"/orders/{order_id}/messages", seller_token, json={"message": "Week8 regression check"})
  request("patch", f"/orders/{order_id}/status", seller_token, json={"status": "PROCESSING"})
  request("post", f"/orders/{order_id}/rating", bidder_token, json={"score": 1, "comment": "Smooth transaction"})

  print("\n✅ Week 8 regression script completed (manual execution only).")


if __name__ == "__main__":
  main()
