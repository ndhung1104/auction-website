#!/usr/bin/env python3
"""
Tester for: POST /api/auth/forgot-password

Expected Response (200):
{
  "success": true,
  "data": {
    "resetDispatched": true,
    "resetToken": "...",   # omitted in production
    "expiresAt": "2025-01-01T00:00:00.000Z"
  },
  "message": "If the account exists, password reset instructions have been recorded"
}

Environment variables:
  API_BASE_URL (default: http://localhost:3000)
  TEST_EMAIL    (default: tester@example.com)
"""

import os
import sys
import json
import requests


# ================== CONFIG ==================

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
FORGOT_URL = f"{API_BASE_URL}/api/auth/forgot-password"

TEST_EMAIL = os.getenv("TEST_EMAIL", "tester+5d9551a2@example.com")


# ================== HELPERS ==================

def pretty_json(data):
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return str(data)


# ================== TEST ==================

def call_forgot_password(email: str):
    print(f"\n=== Testing forgot-password for {email} ===")
    print(f"POST {FORGOT_URL}")
    payload = {"email": email}

    print("Payload:")
    print(pretty_json(payload))

    try:
        resp = requests.post(FORGOT_URL, json=payload, timeout=10)
    except Exception as e:
        print(f"❌ Request failed: {e}")
        sys.exit(1)

    print(f"\nStatus: {resp.status_code}")

    try:
        body = resp.json()
    except Exception:
        body = resp.text

    print("\nResponse body:")
    print(pretty_json(body))

    # --------------------------
    # Validate top-level fields
    # --------------------------
    if resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {resp.status_code}")
        sys.exit(1)

    if not isinstance(body, dict):
        print("❌ FAILED: Body is not a JSON object")
        sys.exit(1)

    if body.get("success") is not True:
        print("❌ FAILED: 'success' must be true")
        sys.exit(1)

    data = body.get("data")
    if not isinstance(data, dict):
        print("❌ FAILED: Missing or invalid 'data' field")
        sys.exit(1)

    # --------------------------
    # Validate data.resetDispatched
    # --------------------------
    if data.get("resetDispatched") is not True:
        print("❌ FAILED: 'data.resetDispatched' must be true")
        sys.exit(1)
    print("🔍 resetDispatched = true")

    # --------------------------
    # Token fields
    # --------------------------
    reset_token = data.get("resetToken")
    expires_at = data.get("expiresAt")

    if reset_token:
        print(f"🔑 resetToken: {reset_token}")
    else:
        print("ℹ️ resetToken omitted (likely production mode).")

    if expires_at:
        print(f"⏳ expiresAt: {expires_at}")
    else:
        print("⚠️ Warning: expiresAt missing?")

    print("\n✅ Test PASSED")
    return True


# ================== MAIN ==================

def main():
    print(f"Using API_BASE_URL = {API_BASE_URL}")
    call_forgot_password(TEST_EMAIL)


if __name__ == "__main__":
    main()
