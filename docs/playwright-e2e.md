# Playwright End-to-End Tests

This repository now includes a Playwright test harness focused on the public
frontend flows (authentication, registration, product browsing, and product
detail interactions).

## Prerequisites

- Node.js 18+ (the frontend already targets Vite 7 + React 19).
- A running backend API + PostgreSQL database with seeded data that includes:
- At least one active bidder account (default: `bidder_w6@example.com` /
  `SellerPass123!`).
  - Enough active products to render pagination on `/products`.
- Frontend environment variables configured (at minimum `VITE_API_URL` and
  `VITE_RECAPTCHA_SITE_KEY` or bypass token).

## Installation

All commands run from the `frontend/` directory:

```bash
cd frontend
npm install
npx playwright install
```

The first command installs project dependencies (including `@playwright/test`);
the second downloads browser binaries for Chromium.

## Starting the stack

Run the backend and frontend in separate terminals:

```bash
# Terminal 1 – backend API
cd backend
npm run dev

# Terminal 2 – frontend
cd frontend
npm run dev
```

By default the Vite dev server listens on `http://localhost:5173`. Adjust the
`PLAYWRIGHT_BASE_URL` environment variable if you run it elsewhere.

## Running the Playwright suite

```bash
# Headless mode
npm run test:e2e

# With the Playwright UI test runner
npm run test:e2e:ui
```

Set environment variables inline if you need to override defaults (example):

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 \
PLAYWRIGHT_BIDDER_EMAIL=custom@example.com \
npm run test:e2e
```

## Configuration & environment variables

- `PLAYWRIGHT_BASE_URL`: Overrides the frontend URL (defaults to
  `http://localhost:5173`).
- `PLAYWRIGHT_BIDDER_EMAIL`, `PLAYWRIGHT_BIDDER_PASSWORD`: Credentials for the
  bidder used in login/product-detail specs. Default:
  `bidder_w6@example.com` / `SellerPass123!`.
- `PLAYWRIGHT_SELLER_EMAIL`, `PLAYWRIGHT_SELLER_PASSWORD`: Credentials for the
  seller account that exercises the create-product form (defaults to
  `seller_w6@example.com` / `SellerPass123!`).
- `PLAYWRIGHT_ADMIN_EMAIL`, `PLAYWRIGHT_ADMIN_PASSWORD`: Credentials for the
  admin dashboard tests (defaults to `admin_w6@example.com` /
  `SellerPass123!`).
- `PLAYWRIGHT_FORGOT_EMAIL`: Email submitted in the forgot-password test
  (defaults to `PLAYWRIGHT_BIDDER_EMAIL`).
- `PLAYWRIGHT_RECAPTCHA_BYPASS`: Captcha token injected in registration tests
  (defaults to `local-dev`).
- `PLAYWRIGHT_TEST_PASSWORD`: Password used when registering new accounts in the
  tests (defaults to `PlaywrightPass123!`).

Make sure the backend honors these credentials and bypass tokens in the current
environment.

## Adding new tests

- Spec files live under `frontend/tests/e2e/`.
- Common helpers (login, random email generation, auth clearing) reside in
  `frontend/tests/e2e/test-utils.js`.
- Each spec should call `clearAuthState(page)` in a `beforeEach` hook to avoid
  leftover localStorage/cookies from previous runs.

Example skeleton:

```js
import { test, expect } from '@playwright/test'
import { clearAuthState } from './test-utils'

test.describe('Example', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('loads the homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/AuctionApp/i)
  })
})
```

## Artifact locations

- Playwright config: `frontend/playwright.config.js`.
- Specs: `frontend/tests/e2e/*.spec.js`.
- Helpers: `frontend/tests/e2e/test-utils.js`.
- Run reports (if generated): `frontend/playwright-report/`,
  `frontend/test-results/` (both ignored in git).
