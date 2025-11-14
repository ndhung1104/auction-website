#!/usr/bin/env python3
"""
Week 3 smoke tests:
- GET /api/homepage returns the curated sections.
- GET /api/products exposes `isNew` flag and basic pagination.
- GET /api/products/:id returns rich detail payload.
- GET /api/products/:id/bids returns masked bidder history.

Configuration:
  API_BASE_URL (default: http://localhost:3001)
"""

import json
import os
import sys
from typing import Any, Dict, Tuple

import requests


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"


def pretty(data: Any) -> str:
  try:
    return json.dumps(data, indent=2, ensure_ascii=False)
  except Exception:
    return str(data)


def request_json(method: str, path: str, **kwargs) -> Tuple[requests.Response, Dict[str, Any]]:
  url = f"{BASE_API}{path}"
  print(f"\n=== {method.upper()} {url} ===")
  if kwargs.get("params"):
    print(f"Query params: {kwargs['params']}")
  response = requests.request(method=method.upper(), url=url, timeout=10, **kwargs)
  print(f"Status: {response.status_code}")
  try:
    payload = response.json()
  except Exception:
    payload = {}
  print("Response body:")
  print(pretty(payload))
  return response, payload


def test_homepage_sections() -> bool:
  resp, payload = request_json("get", "/homepage")
  if resp.status_code != 200:
    print("❌ /homepage did not return 200.")
    return False

  data = payload.get("data") or {}
  required_keys = {"topPrice", "endingSoon", "mostBidded"}
  missing = required_keys - set(data.keys())
  if missing:
    print(f"❌ /homepage is missing sections: {missing}")
    return False

  print("✅ /homepage includes all sections.")
  return True


def fetch_first_product_id() -> int:
  resp, payload = request_json("get", "/products", params={"limit": 5, "sort": "end_at,asc"})
  if resp.status_code != 200:
    raise AssertionError("Unable to list products")

  items = (payload.get("data") or {}).get("items") or []
  if not items:
    raise AssertionError("Product list is empty – seed data is required for W3 tests.")

  sample = items[0]
  if "isNew" not in sample:
    raise AssertionError("Product payload is missing `isNew` property.")

  print(f"✅ Product listing returned {len(items)} items. Using product ID {sample['id']}.")
  return sample["id"]


def test_product_detail(product_id: int) -> bool:
  resp, payload = request_json("get", f"/products/{product_id}")
  if resp.status_code != 200:
    print("❌ Product detail did not return 200.")
    return False

  data = payload.get("data") or {}
  required_keys = {"product", "seller", "images", "relatedProducts"}
  if not required_keys.issubset(data.keys()):
    print(f"❌ Product detail missing keys: {required_keys - set(data.keys())}")
    return False

  product = data["product"]
  if "enableAutoBid" not in product:
    print("❌ Product detail missing `enableAutoBid` flag.")
    return False

  print(f"✅ Product detail loaded for '{product.get('name')}'.")
  return True


def test_bid_history(product_id: int) -> bool:
  resp, payload = request_json("get", f"/products/{product_id}/bids", params={"limit": 5})
  if resp.status_code != 200:
    print("❌ Bid history endpoint failed.")
    return False

  bids = (payload.get("data") or {}).get("bids") or []
  for bid in bids:
    if "bidderAlias" not in bid:
      print("❌ Bid entry missing bidderAlias.")
      return False

  print(f"✅ Bid history returned {len(bids)} rows (may be empty if no bids).")
  return True


def main():
  print(f"API base URL: {API_BASE_URL}")
  homepage_ok = test_homepage_sections()

  try:
    product_id = fetch_first_product_id()
  except AssertionError as exc:
    print(f"❌ {exc}")
    sys.exit(1)

  detail_ok = test_product_detail(product_id)
  bids_ok = test_bid_history(product_id)

  all_passed = homepage_ok and detail_ok and bids_ok
  if all_passed:
    print("\n🎉 Week 3 API checks passed.")
    sys.exit(0)

  print("\n❌ Week 3 API checks failed.")
  sys.exit(1)


if __name__ == "__main__":
  main()
