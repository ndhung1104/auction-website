#!/usr/bin/env python3
"""
Tester for: GET /api/products

Scenarios:
1) Valid sort=end_at,desc&page=1&limit=5
2) Valid categoryId=2&sort=price,asc&page=2&limit=10
3) Invalid sort=foo,asc -> expect 400 PRODUCTS.INVALID_SORT

Environment variables:
  API_BASE_URL  (default: http://localhost:3000)
"""

import os
import sys
import json
from dataclasses import dataclass
from typing import Dict, Any, Optional
from urllib.parse import urlencode

import requests


# ================== CONFIG ==================

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
PRODUCTS_URL = f"{API_BASE_URL}/api/products"


# ================== DATA STRUCTURES ==================

@dataclass
class ProductsTestCase:
    name: str
    params: Dict[str, Any]
    expected_status: int
    description: str
    expected_error_code: Optional[str] = None  # for error cases only


# ================== HELPERS ==================

def pretty_json(data):
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return str(data)


def extract_items_block(body: dict):
    if not isinstance(body, dict):
        return None

    data = body.get("data")
    if isinstance(data, dict):
        if "items" in data:
            return data["items"]
        if "products" in data:
            return data["products"]

    return body.get("items") or body.get("products")



def validate_products_response(body: Any, expected_sort: Optional[str]) -> bool:
    """
    Validate:
      - body is JSON object
      - products are ACTIVE
      - meta object at root with page, limit, total, totalPages, sort
      - sort.field & sort.direction match expected_sort ("end_at,desc" etc.)
    """
    if not isinstance(body, dict):
        print("❌ Body is not a JSON object")
        return False

    # ---- Check top-level success (if present) ----
    success = body.get("success")
    if success is not None and success is not True:
        print("❌ 'success' field present but not true")
        return False

    # ---- Extract items list ----
    items = extract_items_block(body)
    ok = True

    if items is None:
        print("⚠️ No 'items' / 'products' array found in response.")
    elif not isinstance(items, list):
        print("❌ 'items'/'products' is not a list.")
        ok = False
    else:
        print(f"🔍 Received {len(items)} item(s)")
        # check ACTIVE status
        for idx, product in enumerate(items):
            if not isinstance(product, dict):
                print(f"⚠️ Item {idx} is not an object: {product}")
                continue
            status = product.get("status")
            if status != "ACTIVE":
                print(f"❌ Item {idx} has non-ACTIVE status: {status!r}")
                ok = False

    # ---- Extract meta (your shape: meta at root) ----
    meta = body.get("meta") or body.get("pagination")
    if meta is None:
        print("❌ No 'meta'/'pagination' object found at root.")
        return False

    if not isinstance(meta, dict):
        print("❌ 'meta'/'pagination' is not an object.")
        return False

    print("🔍 Meta object:")
    print(pretty_json(meta))

    # Required fields
    required_meta_fields = ["page", "limit", "total", "totalPages", "sort"]
    for field in required_meta_fields:
        if field not in meta:
            print(f"❌ Meta missing field: {field}")
            ok = False

    # ---- Validate sort object ----
    sort_obj = meta.get("sort")
    if isinstance(sort_obj, dict):
        field = sort_obj.get("field")
        direction = sort_obj.get("direction")
        print(f"🔍 meta.sort.field = {field!r}, direction = {direction!r}")

        if expected_sort:
            try:
                exp_field, exp_dir = expected_sort.split(",", 1)
                exp_field = exp_field.strip()
                exp_dir = exp_dir.strip()
            except ValueError:
                print(f"⚠️ Could not parse expected_sort {expected_sort!r}")
                exp_field = exp_dir = None

            # Allow mapping from client sort key -> DB field
            field_aliases = {
                "price": "current_price",
            }
            normalized_expected_field = field_aliases.get(exp_field, exp_field)

            if normalized_expected_field and field != normalized_expected_field:
                print(
                    f"⚠️ meta.sort.field = {field!r}, "
                    f"expected {normalized_expected_field!r}"
                )
                ok = False

            if exp_dir and direction != exp_dir:
                print(
                    f"⚠️ meta.sort.direction = {direction!r}, "
                    f"expected {exp_dir!r}"
                )
                ok = False

    else:
        # If backend someday returns sort as string instead of object
        print(f"ℹ️ meta.sort is not an object: {sort_obj!r}")
        if expected_sort and sort_obj != expected_sort:
            print(
                f"⚠️ meta.sort = {sort_obj!r}, expected {expected_sort!r}"
            )
            ok = False

    return ok


def check_error_code(body: Any, expected_code: str) -> bool:
    """
    Check for an error code in a 4xx response.
    Common patterns:
      { success: false, code: "PRODUCTS.INVALID_SORT", ... }
      { error: { code: "..." } }
    """
    if not isinstance(body, dict):
        print("⚠️ Error body is not JSON, cannot check code.")
        return False

    code = body.get("code")
    if code is None and isinstance(body.get("error"), dict):
        code = body["error"].get("code")

    if code == expected_code:
        print(f"✅ Error code matches expected: {expected_code}")
        return True

    print(f"⚠️ Expected error code {expected_code!r}, got {code!r}")
    return False


# ================== TEST RUNNER ==================

def run_test_case(tc: ProductsTestCase) -> bool:
    print("\n==============================================")
    print(f"Test: {tc.name}")
    print(f"Description: {tc.description}")
    qs = urlencode(tc.params, doseq=True)
    url = f"{PRODUCTS_URL}?{qs}"

    print(f"GET {url}")

    try:
        resp = requests.get(url, timeout=10)
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

    print(f"Status: {resp.status_code}")

    try:
        body = resp.json()
    except Exception:
        body = resp.text

    print("Response body:")
    print(pretty_json(body))

    if resp.status_code != tc.expected_status:
        print(
            f"❌ FAILED: expected status {tc.expected_status}, "
            f"got {resp.status_code}"
        )
        return False

    # Success flows
    if tc.expected_status == 200:
        expected_sort = tc.params.get("sort")
        return validate_products_response(body, expected_sort)

    # Error flows
    if tc.expected_status >= 400 and tc.expected_error_code:
        return check_error_code(body, tc.expected_error_code)

    print("✅ Status code as expected; no extra validation configured.")
    return True


# ================== MAIN ==================

def main():
    print(f"Using API_BASE_URL = {API_BASE_URL}")
    print(f"Products endpoint = {PRODUCTS_URL}")

    test_cases = [
        ProductsTestCase(
            name="1. List active products sorted by end_at desc (page 1, limit 5)",
            params={"sort": "end_at,desc", "page": 1, "limit": 5},
            expected_status=200,
            description="Should return only ACTIVE products and meta with sort=end_at,desc.",
        ),
        ProductsTestCase(
            name="2. List active products for category 2, sorted by price asc (page 2, limit 10)",
            params={"categoryId": 2, "sort": "price,asc", "page": 2, "limit": 10},
            expected_status=200,
            description="Should return ACTIVE products in category 2 with correct pagination and meta.",
        ),
        ProductsTestCase(
            name="3. Invalid sort parameter",
            params={"sort": "foo,asc", "page": 1, "limit": 5},
            expected_status=400,
            expected_error_code="PRODUCTS.INVALID_SORT",
            description="Should reject invalid sort and return 400 with PRODUCTS.INVALID_SORT.",
        ),
    ]

    all_passed = True
    for tc in test_cases:
        ok = run_test_case(tc)
        all_passed = all_passed and ok

    print("\n============== SUMMARY ==============")
    if all_passed:
        print("🎉 All tests PASSED")
        sys.exit(0)
    else:
        print("❌ Some tests FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
