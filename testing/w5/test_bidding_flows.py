#!/usr/bin/env python3
"""
Week 5 regression tests:
- Manual bid placement with step validation
- Auto-bid registration + automatic response when outbid
- Buy-now flow closing the auction

Prerequisites:
  1. Backend running at API_BASE_URL (default http://localhost:3001)
  2. Database seeded via testing/seed_week5_data.py
"""

import os
import uuid
import json
import requests


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"
BYPASS_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")
SEED_PRODUCT_NAME = os.getenv("W5_PRODUCT_NAME", "Week5 Test Product")


def pretty(data):
  try:
    return json.dumps(data, indent=2, ensure_ascii=False)
  except Exception:
    return str(data)


def request_json(method, path, token=None, **kwargs):
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


def register_user(email, password):
  payload = {
    "email": email,
    "password": password,
    "fullName": "Week5 Tester",
    "phoneNumber": "0911222333",
    "captchaToken": BYPASS_TOKEN,
  }
  response, body = request_json("post", "/auth/register", json=payload)
  if response.status_code != 201:
    raise RuntimeError("Registration failed", body)


def login_user(email, password):
  response, body = request_json("post", "/auth/login", json={"email": email, "password": password})
  if response.status_code != 200:
    raise RuntimeError(f"Login failed for {email}")
  data = body.get("data") or {}
  return data.get("token"), data.get("user", {}).get("id")


def find_seed_product():
  response, body = request_json("get", "/products", params={"limit": 50})
  if response.status_code != 200:
    raise RuntimeError("Unable to list products", body)
  items = (body.get("data") or {}).get("items") or []
  for item in items:
    if item.get("name") == SEED_PRODUCT_NAME:
      return item
  raise RuntimeError(f"Seed product '{SEED_PRODUCT_NAME}' not found. Run seed_week5_data.py first.")


def fetch_product_detail(product_id):
  response, body = request_json("get", f"/products/{product_id}")
  if response.status_code == 404:
    return None
  if response.status_code != 200:
    raise RuntimeError("Cannot fetch product detail")
  return body.get("data") or {}


def main():
  print(f"API base: {API_BASE_URL}")
  product_summary = find_seed_product()
  product_id = product_summary["id"]
  current_price = int(product_summary["currentPrice"])
  price_step = int(product_summary["priceStep"])
  buy_now_price = int(product_summary.get("buyNowPrice") or 0)

  # Register bidders
  manual_email = f"w5-manual-{uuid.uuid4().hex[:6]}@example.com"
  auto_email = f"w5-auto-{uuid.uuid4().hex[:6]}@example.com"
  buyer_email = f"w5-buyer-{uuid.uuid4().hex[:6]}@example.com"
  competitor_email = f"w5-competitor-{uuid.uuid4().hex[:6]}@example.com"
  password = "Week5Pass123!"

  for email in (manual_email, auto_email, buyer_email, competitor_email):
    register_user(email, password)

  manual_token, manual_user_id = login_user(manual_email, password)
  auto_token, auto_user_id = login_user(auto_email, password)
  buyer_token, _ = login_user(buyer_email, password)
  competitor_token, _ = login_user(competitor_email, password)

  # 1. Manual bid
  manual_amount = current_price + price_step
  response, _ = request_json(
    "post",
    f"/products/{product_id}/bid",
    token=manual_token,
    json={"amount": manual_amount},
  )
  assert response.status_code == 201, "Manual bid should succeed"

  detail = fetch_product_detail(product_id)
  assert str(detail["product"]["currentBidderId"]) == str(manual_user_id)

  # 2. Register auto-bid with higher ceiling
  auto_max = manual_amount + price_step * 4
  response, _ = request_json(
    "post",
    f"/products/{product_id}/auto-bid",
    token=auto_token,
    json={"maxBidAmount": auto_max},
  )
  assert response.status_code == 201, "Auto-bid registration should succeed"

  # 3. Competitor manual bid to trigger auto-bid reaction
  competitor_bid = manual_amount + price_step * 2
  response, _ = request_json(
    "post",
    f"/products/{product_id}/bid",
    token=competitor_token,
    json={"amount": competitor_bid},
  )
  assert response.status_code == 201, "Competitor bid should succeed"

  detail = fetch_product_detail(product_id)
  assert str(detail["product"]["currentBidderId"]) == str(auto_user_id), "Auto-bidder should hold the lead"

  # 4. Buy now to close auction
  if not buy_now_price:
    raise RuntimeError("Seed product missing buy-now price")

  response, buy_now_payload = request_json(
    "post",
    f"/products/{product_id}/buy-now",
    token=buyer_token,
  )
  assert response.status_code == 200, "Buy-now should succeed"

  detail = fetch_product_detail(product_id)
  if detail:
    assert detail["product"]["status"] == 'ENDED'
  else:
    data = buy_now_payload.get("data") or {}
    assert data.get("product", {}).get("status") == 'ENDED'

  print("\n🎯 Week 5 bidding flows completed successfully.")


if __name__ == "__main__":
  main()
