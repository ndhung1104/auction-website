#!/usr/bin/env python3
"""
Week 7 API regression:
- Search endpoint returns seeded products
- Reset password flow (token + new password)
- Order workflow: status change, chat, rating
"""

import json
import os
import uuid

import requests


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"
BYPASS_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")
SELLER_EMAIL = os.getenv("W7_SELLER_EMAIL", "seller_w7@example.com")
SELLER_PASSWORD = os.getenv("W7_SELLER_PASSWORD", "SellerPass123!")
BIDDER_EMAIL = os.getenv("W7_BIDDER_EMAIL", "bidder_w7@example.com")
BIDDER_PASSWORD = os.getenv("W7_BIDDER_PASSWORD", "SellerPass123!")


def pretty(data):
  try:
    return json.dumps(data, indent=2, ensure_ascii=False)
  except Exception:
    return str(data)


def request(method, path, token=None, **kwargs):
  headers = kwargs.pop("headers", {})
  if token:
    headers["Authorization"] = f"Bearer {token}"
  response = requests.request(method.upper(), f"{BASE_API}{path}", headers=headers, timeout=15, **kwargs)
  try:
    payload = response.json()
  except Exception:
    payload = {}
  print(f"\n{method.upper()} {path} -> {response.status_code}")
  print(pretty(payload))
  return response, payload


def login(email, password):
  response, body = request("post", "/auth/login", json={"email": email, "password": password})
  if response.status_code != 200:
    raise RuntimeError(f"Login failed for {email}")
  data = body.get("data") or {}
  return data.get("token")


def main():
  print(f"API base: {API_BASE_URL}")

  # 1. Search
  response, body = request("get", "/search", params={"q": "camera"})
  assert response.status_code == 200, "Search should succeed"
  assert (body.get("data") or {}).get("items"), "Search should return products"

  # 2. Reset password flow
  email = f"w7-reset-{uuid.uuid4().hex[:5]}@example.com"
  register_payload = {
    "email": email,
    "password": "Week7Pass123!",
    "fullName": "Week 7 Tester",
    "phoneNumber": "0909000000",
    "captchaToken": BYPASS_TOKEN
  }
  print(register_payload)
  request("post", "/auth/register", json=register_payload)
  response, reset_body = request("post", "/auth/forgot-password", json={"email": email})
  assert response.status_code == 200
  token = (reset_body.get("data") or {}).get("resetToken")
  assert token, "Seed environment should expose resetToken"
  response, _ = request("post", "/auth/reset-password", json={"token": token, "newPassword": "Week7Pass456!"})
  assert response.status_code == 200
  login(email, "Week7Pass456!")

  # 3. Orders (assumes seed Week7)
  seller_token = login(SELLER_EMAIL, SELLER_PASSWORD)
  bidder_token = login(BIDDER_EMAIL, BIDDER_PASSWORD)

  response, orders_data = request("get", "/orders", seller_token)
  assert response.status_code == 200
  orders = (orders_data.get("data") or {}).get("items") or []
  assert orders, "Seller should have seeded order"
  order_id = orders[0]["id"]

  request("get", f"/orders/{order_id}", seller_token)
  request("post", f"/orders/{order_id}/messages", seller_token, json={"message": "Order ready to ship"})
  request("patch", f"/orders/{order_id}/status", seller_token, json={"status": "PROCESSING"})
  request("post", f"/orders/{order_id}/rating", bidder_token, json={"score": 1, "comment": "Great seller!"})
  request("post", f"/orders/{order_id}/cancel", seller_token)

  print("\n✅ Week 7 search/reset/order flow completed.")


if __name__ == "__main__":
  main()
