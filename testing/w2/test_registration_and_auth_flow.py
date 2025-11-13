#!/usr/bin/env python3
"""
End-to-end tester for auth endpoints:

Registration flow (using reCAPTCHA bypass):
- POST /api/auth/register
  * New user (expect 201)
  * Duplicate email (expect 409)
  * Invalid captcha (expect 422)

Login flow:
- POST /api/auth/login
  * Correct password (expect 200 + JWT)
  * Wrong password (expect 401 AUTH.INVALID_CREDENTIALS)

Config via env:
  API_BASE_URL (default: http://localhost:3001)
  RECAPTCHA_BYPASS_TOKEN (default: local-dev)
"""

import os
import sys
import uuid
import json
import base64
import requests
from dataclasses import dataclass


# ================== CONFIG ==================

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
REGISTER_URL = f"{API_BASE_URL}/api/auth/register"
LOGIN_URL = f"{API_BASE_URL}/api/auth/login"
BYPASS_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")

DEFAULT_PASSWORD = "SuperPass123"
DEFAULT_FULL_NAME = "Test User"
DEFAULT_PHONE = "0909000000"


# ================== DATA STRUCTURES ==================

@dataclass
class TestCase:
    name: str
    email: str
    captcha_token: str
    expected_status: int
    description: str


# ================== HELPERS ==================

def pretty_json(data):
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return str(data)


def b64url_decode(data: str) -> bytes:
    """Decode base64 URL-safe string (without padding) used in JWT."""
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def decode_jwt(token: str):
    """Decode JWT header + payload for inspection (no signature verification)."""
    try:
        header_b64, payload_b64, _ = token.split(".")
        header = json.loads(b64url_decode(header_b64))
        payload = json.loads(b64url_decode(payload_b64))

        print("\n--- Decoded JWT header ---")
        print(pretty_json(header))
        print("\n--- Decoded JWT payload ---")
        print(pretty_json(payload))
    except Exception as e:
        print(f"Could not decode JWT: {e}")


# ================== REGISTRATION TESTS ==================

def run_test_case(test_case: TestCase) -> bool:
    payload = {
        "email": test_case.email,
        "password": DEFAULT_PASSWORD,
        "fullName": DEFAULT_FULL_NAME,
        "phoneNumber": DEFAULT_PHONE,
        "captchaToken": test_case.captcha_token,
    }

    print(f"\n=== Running test: {test_case.name} ===")
    print(f"Description: {test_case.description}")
    print(f"POST {REGISTER_URL}")
    print(f"Payload: {pretty_json(payload)}")

    try:
        response = requests.post(REGISTER_URL, json=payload, timeout=10)
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

    print(f"Status: {response.status_code}")
    try:
        body = response.json()
    except Exception:
        body = response.text

    print("Response body:")
    print(pretty_json(body))

    success = response.status_code == test_case.expected_status
    if success:
        print(f"✅ Test '{test_case.name}' PASSED")
    else:
        print(
            f"❌ Test '{test_case.name}' FAILED "
            f"(expected {test_case.expected_status}, got {response.status_code})"
        )

    # Optional extra checks:
    # - assert on body.get("code") == "AUTH.EMAIL_EXISTS", etc.
    return success


# ================== LOGIN TESTS ==================

def login_user(email: str, password: str) -> requests.Response:
    payload = {
        "email": email,
        "password": password,
    }

    print(f"\n=== LOGIN attempt (password='{password}') ===")
    print(f"POST {LOGIN_URL}")
    print(f"Payload: {pretty_json(payload)}")

    try:
        response = requests.post(LOGIN_URL, json=payload, timeout=10)
    except Exception as e:
        print(f"❌ Login request failed: {e}")
        # Fake a Response-like object
        class DummyResp:
            status_code = 0
            text = str(e)

            def json(self):
                return {"error": str(e)}
        return DummyResp()

    print(f"Status: {response.status_code}")
    try:
        body = response.json()
    except Exception:
        body = response.text

    print("Response body:")
    print(pretty_json(body))

    return response


def run_login_tests(email: str):
    print("\n================ LOGIN FLOW TESTS ================")
    print(f"Using email for login tests: {email}")

    # 1) Correct password
    resp_ok = login_user(email, DEFAULT_PASSWORD)
    if resp_ok.status_code == 200:
        print("✅ Login with correct credentials returned 200 as expected.")
        try:
            data = resp_ok.json()
            token = data.get("token")
        except Exception:
            token = None

        if token:
            print("\nReceived JWT token:")
            print(token)
            decode_jwt(token)
        else:
            print("\n⚠️ No 'token' field in 200 OK login response.")
    else:
        print(
            f"❌ Login with correct credentials FAILED "
            f"(expected 200, got {resp_ok.status_code})"
        )

    # 2) Wrong password
    resp_wrong = login_user(email, "WrongPass123")
    if resp_wrong.status_code == 401:
        print("✅ Login with wrong password returned 401 (invalid credentials) as expected.")
    else:
        print(
            f"⚠️ Login with wrong password did not return 401 "
            f"(got {resp_wrong.status_code})"
        )

    # If you later add an "UNCONFIRMED" user scenario, you can script it here
    # by seeding a user with status != 'CONFIRMED' and calling login_user(...) again.


# ================== MAIN ==================

def main():
    print(f"Using API_BASE_URL = {API_BASE_URL}")
    print(f"Using BYPASS_TOKEN = {BYPASS_TOKEN!r}")
    print(f"Register endpoint = {REGISTER_URL}")
    print(f"Login endpoint    = {LOGIN_URL}")

    # Generate a unique email so the first registration is always new
    unique_suffix = uuid.uuid4().hex[:8]
    base_email = f"tester+{unique_suffix}@example.com"

    print(f"\nGenerated unique base email for this run: {base_email}")

    test_cases = [
        TestCase(
            name="1. New user with valid captcha (bypass token)",
            email=base_email,
            captcha_token=BYPASS_TOKEN,
            expected_status=201,
            description="Should create a new user and return 201 with sanitized user payload.",
        ),
        TestCase(
            name="2. Duplicate registration with same email",
            email=base_email,
            captcha_token=BYPASS_TOKEN,
            expected_status=409,
            description="Should detect existing email and return 409 AUTH.EMAIL_EXISTS.",
        ),
        TestCase(
            name="3. Registration with invalid captcha token",
            email=f"other+{unique_suffix}@example.com",
            captcha_token="totally-invalid-token",
            expected_status=422,
            description="Should reject invalid captcha and return 422 AUTH.INVALID_CAPTCHA.",
        ),
    ]

    all_passed = True
    for tc in test_cases:
        result = run_test_case(tc)
        all_passed = all_passed and result

    print("\n=== Registration Summary ===")
    if all_passed:
        print("🎉 All registration tests PASSED")
    else:
        print("❌ Some registration tests FAILED")

    # Run login tests using the email from the first test case (the new user)
    run_login_tests(base_email)

    # Exit code reflects registration tests only (you can include login if you want)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
