#!/usr/bin/env python3
"""
Week 4 regression tests:
- Profile GET/PUT
- Seller upgrade request
- Product creation with multipart images

Configuration:
  API_BASE_URL (default http://localhost:3001)
  RECAPTCHA_BYPASS_TOKEN (default local-dev)
  W4_SELLER_EMAIL / W4_SELLER_PASSWORD for seller login (defaults set in seed script)
"""

import io
import json
import os
import uuid
from datetime import datetime, timedelta, timezone

import requests

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"
BYPASS_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")

SELLER_EMAIL = os.getenv("W4_SELLER_EMAIL", "seller_w4@example.com")
SELLER_PASSWORD = os.getenv("W4_SELLER_PASSWORD", "SellerPass123!")


def pretty(data):
  try:
    return json.dumps(data, indent=2, ensure_ascii=False)
  except Exception:
    return str(data)


def api_post(path, json=None, token=None, files=None, data=None):
  headers = {}
  if token:
    headers["Authorization"] = f"Bearer {token}"
  response = requests.post(
    f"{BASE_API}{path}",
    json=json,
    data=data,
    files=files,
    headers=headers,
    timeout=15,
  )
  try:
    payload = response.json()
  except Exception:
    payload = {}
  print(f"\nPOST {path} -> {response.status_code}")
  print(pretty(payload))
  return response, payload


def api_get(path, token=None, params=None):
  headers = {}
  if token:
    headers["Authorization"] = f"Bearer {token}"
  response = requests.get(f"{BASE_API}{path}", headers=headers, params=params, timeout=15)
  try:
    payload = response.json()
  except Exception:
    payload = {}
  print(f"\nGET {path} -> {response.status_code}")
  print(pretty(payload))
  return response, payload


def api_put(path, json=None, token=None):
  headers = {}
  if token:
    headers["Authorization"] = f"Bearer {token}"
  response = requests.put(f"{BASE_API}{path}", json=json, headers=headers, timeout=15)
  try:
    payload = response.json()
  except Exception:
    payload = {}
  print(f"\nPUT {path} -> {response.status_code}")
  print(pretty(payload))
  return response, payload


def register_user(email, password):
  payload = {
    "email": email,
    "password": password,
    "fullName": "Week4 Tester",
    "phoneNumber": "0909000000",
    "captchaToken": BYPASS_TOKEN,
  }
  response, body = api_post("/auth/register", json=payload)
  if response.status_code != 201:
    raise RuntimeError(f"Register failed: {body}")


def login_user(email, password):
  response, body = api_post("/auth/login", json={"email": email, "password": password})
  if response.status_code != 200:
    raise RuntimeError(f"Login failed for {email}")
  token = (body.get("data") or {}).get("token")
  if not token:
    raise RuntimeError("Login response did not include token")
  return token


def build_fake_image(name):
  buffer = io.BytesIO()
  buffer.write(b"fake-image-content")
  buffer.seek(0)
  return (name, buffer, "image/jpeg")


def main():
  print(f"API base: {API_BASE_URL}")

  unique_suffix = uuid.uuid4().hex[:6]
  bidder_email = f"week4-bidder-{unique_suffix}@example.com"
  bidder_password = "TestPass123!"

  register_user(bidder_email, bidder_password)
  bidder_token = login_user(bidder_email, bidder_password)

  resp, profile = api_get("/profile", token=bidder_token)
  assert resp.status_code == 200, "Profile GET should succeed"

  update_payload = {
    "fullName": "Updated Tester",
    "phoneNumber": "0909888777",
    "address": "Week4 Street",
  }
  resp, updated = api_put("/profile", json=update_payload, token=bidder_token)
  assert resp.status_code == 200, "Profile update should succeed"
  assert updated.get("data", {}).get("user", {}).get("fullName") == "Updated Tester"

  resp, request_body = api_post("/seller/request-upgrade", token=bidder_token)
  assert resp.status_code == 201, "Seller request should return 201"
  assert request_body.get("data", {}).get("request"), "Seller request payload missing"

  seller_token = login_user(SELLER_EMAIL, SELLER_PASSWORD)

  categories_resp, categories_payload = api_get("/categories")
  assert categories_resp.status_code == 200, "Categories endpoint unavailable"
  categories = categories_payload.get("data", {}).get("categories", [])
  if not categories:
    raise RuntimeError("No categories available for product creation")

  category_id = categories[0]["id"]
  start_at = datetime.now(timezone.utc).isoformat()
  end_at = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

  files = [
    ("images", build_fake_image("img1.jpg")),
    ("images", build_fake_image("img2.jpg")),
    ("images", build_fake_image("img3.jpg")),
  ]

  data = {
    "name": f"Week4 Camera {unique_suffix}",
    "description": "Test product created by automated script.",
    "categoryId": str(category_id),
    "startPrice": "1000000",
    "priceStep": "50000",
    "buyNowPrice": "2000000",
    "autoExtend": "true",
    "enableAutoBid": "true",
    "startAt": start_at,
    "endAt": end_at,
  }

  resp, product_payload = api_post(
    "/products",
    data=data,
    files=files,
    token=seller_token,
  )
  assert resp.status_code == 201, "Product creation should return 201"
  created_product = product_payload.get("data", {}).get("product")
  assert created_product, "Product payload missing"
  assert len(product_payload.get("data", {}).get("images", [])) >= 3

  print("\n🎯 Week 4 API tests completed successfully.")


if __name__ == "__main__":
  main()
