#!/usr/bin/env python3
"""
Manual refresh-token regression (do not auto-run):
- Login, capture access token
- Call refresh to get new access token
- Call logout to revoke refresh token
"""

import json
import os
import uuid

import requests

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
BASE_API = f"{API_BASE_URL}/api"
BYPASS_TOKEN = os.getenv("RECAPTCHA_BYPASS_TOKEN", "local-dev")
USER_EMAIL = os.getenv("W8_SELLER_EMAIL", "week8-seller@example.com")
USER_PASSWORD = os.getenv("W8_SELLER_PASSWORD", "SellerPass123!")


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
    method.upper(),
    f"{BASE_API}{path}",
    headers=headers,
    timeout=15,
    **kwargs
  )
  try:
    payload = response.json()
  except Exception:
    payload = {}
  print(f"\n{method.upper()} {path} -> {response.status_code}")
  print(pretty(payload))
  return response, payload, response.cookies


def main():
  print(f"API base: {API_BASE_URL}")
  if not USER_EMAIL or not USER_PASSWORD:
    raise SystemExit("Please set W8_REFRESH_EMAIL and W8_REFRESH_PASSWORD for an existing confirmed account.")

  # login and capture cookies
  response, body, cookies = request("post", "/auth/login", json={"email": USER_EMAIL, "password": USER_PASSWORD})
  assert response.status_code == 200, "Login should succeed"
  access_token = (body.get("data") or {}).get("token")

  # call refresh with cookie
  response, body, cookies = request("post", "/auth/refresh", cookies=cookies)
  assert response.status_code == 200, "Refresh should succeed"
  new_access = (body.get("data") or {}).get("token")
  print("\nOld access token:", access_token)
  print("New access token:", new_access)
  assert new_access and new_access != access_token, "New access token should differ"

  # verify new token works on a protected endpoint
  response, _body, _ = request("get", "/orders", token=new_access)
  assert response.status_code != 401, "Refreshed token should access protected endpoints"

  # logout to revoke refresh
  request("post", "/auth/logout", cookies=cookies)

  print("\n✅ Refresh/logout flow executed and verified.")


if __name__ == "__main__":
  main()
