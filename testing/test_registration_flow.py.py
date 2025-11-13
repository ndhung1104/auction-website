import os
import sys
import uuid
import json
import requests
from dataclasses import dataclass

# Config (can be overridden via environment variables)
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
REGISTER_URL = f"{API_BASE_URL}/api/auth/register"
BYPASS_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")

DEFAULT_PASSWORD = "SuperPass123"
DEFAULT_FULL_NAME = "Test User"
DEFAULT_PHONE = "0909000000"


@dataclass
class TestCase:
    name: str
    email: str
    captcha_token: str
    expected_status: int
    description: str


def pretty_json(data):
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return str(data)


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
    # - You could assert on body["code"] == "AUTH.EMAIL_EXISTS" etc. if your API guarantees that.
    return success


def main():
    print(f"Using API_BASE_URL = {API_BASE_URL}")
    print(f"Using BYPASS_TOKEN = {BYPASS_TOKEN!r}")
    print(f"Register endpoint = {REGISTER_URL}")

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

    print("\n=== Summary ===")
    if all_passed:
        print("🎉 All tests PASSED")
        sys.exit(0)
    else:
        print("❌ Some tests FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
