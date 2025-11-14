#!/usr/bin/env python3
"""
Week 6 API regression:
- Admin dashboard actions (category create, seller-request approval, product removal)
- Bidder watchlist + question
- Seller answer and description append
"""

import json
import os
import uuid

import requests


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"
ADMIN_EMAIL = os.getenv("W6_ADMIN_EMAIL", "admin_w6@example.com")
ADMIN_PASSWORD = os.getenv("W6_ADMIN_PASSWORD", "SellerPass123!")
SELLER_EMAIL = os.getenv("W6_SELLER_EMAIL", "seller_w6@example.com")
SELLER_PASSWORD = os.getenv("W6_SELLER_PASSWORD", "SellerPass123!")
BIDDER_EMAIL = os.getenv("W6_BIDDER_EMAIL", "bidder_w6@example.com")
BIDDER_PASSWORD = os.getenv("W6_BIDDER_PASSWORD", "SellerPass123!")
PRODUCT_SLUG = os.getenv("W6_PRODUCT_SLUG", "week6-admin-demo")


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


def login(email, password):
  response, body = request("post", "/auth/login", json={"email": email, "password": password})
  if response.status_code != 200:
    raise RuntimeError(f"Login failed for {email}")
  data = body.get("data") or {}
  return data.get("token")


def find_product_by_slug(token):
  response, body = request("get", "/products", params={"limit": 50})
  if response.status_code != 200:
    raise RuntimeError("Unable to load products list")
  items = (body.get("data") or {}).get("items") or []
  for item in items:
    if item.get("slug") == PRODUCT_SLUG:
      return item
  raise RuntimeError(f"Product with slug '{PRODUCT_SLUG}' not found. Seed Week6 data first.")


def main():
  print(f"API base: {API_BASE_URL}")
  admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

  # Dashboard overview
  request("get", "/admin/dashboard", admin_token)

  # Create a throwaway category
  request(
    "post",
    "/admin/categories",
    admin_token,
    json={"name": f"Week6 Cat {uuid.uuid4().hex[:4]}", "parentId": None},
  )

  # Approve the first pending seller request if present
  resp, dashboard = request("get", "/admin/dashboard", admin_token)
  pending_requests = [
    req for req in (dashboard.get("data") or {}).get("sellerRequests", []) if req["status"] == "PENDING"
  ]
  if pending_requests:
    request("post", f"/admin/seller-requests/{pending_requests[0]['id']}/approve", admin_token)

  # Locate seeded product
  product = find_product_by_slug(admin_token)
  product_id = product["id"]

  # Bidder actions
  bidder_token = login(BIDDER_EMAIL, BIDDER_PASSWORD)
  request("post", f"/watchlist/{product_id}", bidder_token)
  request(
    "post",
    f"/questions/products/{product_id}",
    bidder_token,
    json={"questionText": "Is shipping included for this item?"},
  )

  detail_resp, detail_payload = request("get", f"/products/{product_id}", bidder_token)
  question_list = detail_payload.get("data", {}).get("questions", [])
  question_id = question_list[0]["id"] if question_list else None

  # Seller answers + append description
  seller_token = login(SELLER_EMAIL, SELLER_PASSWORD)
  if question_id:
    request(
      "post",
      f"/questions/{question_id}/answer",
      seller_token,
      json={"answerText": "Yes, nationwide shipping is included."},
    )
  request(
    "post",
    f"/products/{product_id}/append-description",
    seller_token,
    json={"content": "Added packing details for Week6 demo."},
  )

  # Admin removes product after verification
  request("patch", f"/admin/products/{product_id}/status", admin_token)

  print("\n✅ Week 6 admin/watchlist flow completed.")


if __name__ == "__main__":
  main()
