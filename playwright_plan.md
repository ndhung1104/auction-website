You are a codebase automation agent (Codex) working in an existing fullstack repository.

## Absolute constraints (very important)

You are working in **file-edit–only mode**:

- ❌ Do NOT run any shell commands (no `npm`, `npx`, `playwright`, `node`, etc.).
- ❌ Do NOT install packages or tools.
- ❌ Do NOT start dev servers or tests.
- ✅ Only **read, create, and edit files** in the repo.
- ✅ Your goal is to fully wire up configuration & test code so that a human can later run the commands successfully.

If something “needs to be installed” (like `@playwright/test`), you must:
- Only **edit `package.json`** to include the dependency and scripts.
- Do NOT execute any install commands yourself.

Do NOT touch `node_modules` in any way.

---

## Goal

Set up **Playwright E2E testing** for the frontend, by:

1. Adding the right Playwright dependency and `test:e2e` scripts to the correct `package.json`.
2. Creating a `playwright.config.(ts|js)` file.
3. Creating E2E tests for the main flows:
   - Authentication (login, register, forgot password).
   - Product listing (sorting + pagination).
   - Product detail (if applicable).
4. Creating a **short documentation file** explaining how a human should:
   - Install dependencies.
   - Start backend + frontend.
   - Run Playwright tests.

You must **only modify code and config files**. Do not run anything.

---

## Project assumptions (adapt to actual code)

From earlier backend work, the project likely has:

- Backend: Node + Express, with endpoints such as:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/forgot-password`
  - `GET /api/products` with `status='ACTIVE'`, `categoryId`, `sort`, `page`, `limit`, and meta `{ page, limit, total, totalPages, sort: { field, direction } }`.
- Frontend: React SPA consuming these APIs.

You must inspect the repo and adapt to actual filenames/routes, but keep the above in mind for test scenarios.

---

## Step 1 – Detect project structure (read-only)

1. Locate the relevant `package.json` files:
   - Root and/or `frontend/`, `apps/*/`, etc.
2. Identify the **frontend app package** where E2E tests should live:
   - If there is a dedicated frontend package (e.g. `frontend/package.json`), use that.
   - Otherwise, use the root `package.json`.
3. Determine:
   - How the frontend is started (e.g. `npm run dev`, `npm run start`, Vite, CRA, etc.).
   - The typical frontend base URL (e.g. `http://localhost:5173` or `http://localhost:3000`).

Do NOT modify files in this step — just analyze internally, then proceed.

---

## Step 2 – Add Playwright dependency & scripts (edit only)

In the chosen `package.json` (root or frontend package):

1. Add `@playwright/test` as a `devDependency` (if not already present).  
   - Use a recent stable version (for example `"@playwright/test": "^1.48.0"`).
   - Do NOT run any install commands; just edit the file.

2. Add scripts (merging with existing ones, not deleting anything):

   ```jsonc
   "scripts": {
     // keep all existing scripts
     "test:e2e": "playwright test",
     "test:e2e:ui": "playwright test --ui"
   }
Make sure you keep valid JSON and do not break the structure.

Step 3 – Create Playwright config file

In the same package where you updated package.json, create:

playwright.config.ts if the repo already uses TypeScript there,
otherwise playwright.config.js.

Config requirements:

Import from @playwright/test.

Set testDir to a clean folder, e.g. "tests/e2e".

Configure at least one project, "chromium":

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173', // adjust default based on frontend
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});


Adjust baseURL default according to the frontend dev URL used in this repo:

Vite: usually http://localhost:5173.

CRA / custom: often http://localhost:3000.

If the repo already defines an env var for frontend URL, prefer that pattern and document it later in the docs.

Step 4 – Create E2E test directory and helper

Create directory:

tests/e2e/ at the same level as playwright.config.(ts|js).

Inside it, create:

tests/e2e/test-utils.(ts|js) with helpers:

A login helper that:

Navigates to the login page route (deduce route from frontend router).

Fills email/password fields (use stable selectors: getByLabelText, getByRole, or data-testid if present).

Submits the form and waits for successful navigation.

If you need data-testid attributes to make selectors stable, minimally add them to frontend components (e.g. login form inputs/buttons). Do not refactor components heavily — only small attribute additions.

Step 5 – Implement concrete Playwright tests

Create these spec files in tests/e2e/ (TypeScript or JS matching the config):

5.1 tests/e2e/auth.spec.(ts|js)

Scenarios:

Login success

Go to login page.

Fill valid email/password for a known test user.

Assume a seeded user or document later that tests expect such a user.

Submit.

Assert:

The URL changes to a logged-in area (e.g. /, /dashboard, etc.).

Some logged-in indicator appears (user name, logout button, etc.).

Login failure (invalid credentials)

Use a wrong password.

Assert an error message is visible (match actual text from the app).

Forgot password UI

Navigate to forgot password page.

Fill email.

Submit.

Assert:

A success toast or message like “If the account exists, password reset instructions have been recorded” (adjust to actual UI text).

Do NOT rely on backend internals; just ensure UI reacts correctly.

5.2 tests/e2e/register.spec.(ts|js)

Scenarios:

Happy path registration

Go to register page.

Fill email, password, full name, phone.

If the registration form sends a RECAPTCHA bypass token (e.g. captchaToken), fill it appropriately (you may assume there is a bypass token in .env used by the backend).

Submit.

Assert a success state: success message and/or redirect, according to actual UI.

Duplicate email error

Attempt to register again with the same email.

Assert the app shows an error message that matches the backend’s AUTH.EMAIL_EXISTS handling (or the UI’s generic error).

5.3 tests/e2e/products-list.spec.(ts|js)

Based on the existing backend /api/products behavior:

It returns only ACTIVE products.

It supports query ?sort=end_at,desc&page=1&limit=5.

It returns a root-level meta object:

{
  "success": true,
  "data": { "items": [ ... ] },
  "meta": {
    "page": 1,
    "limit": 5,
    "total": 27,
    "totalPages": 6,
    "sort": {
      "field": "end_at",
      "direction": "desc"
    }
  }
}


Tests:

List renders products

Navigate to the product list page (deduce route).

Assert that product cards/rows render.

Optionally check that only products with visible “ACTIVE” state are shown if the UI displays that status.

Sorting & pagination wiring

Use the UI to:

Apply a sort that corresponds to end_at,desc (e.g. “Ending soon”).

Navigate to next page via pagination controls.

Assert:

URL reflects the expected query parameters, if the frontend syncs them (e.g. ?sort=end_at,desc&page=2).

The visible list changes between pages (e.g. different product names).

If sorting/pagination are not visible in the UI, do not fabricate UI; adapt tests to what actually exists.

5.4 tests/e2e/product-detail.spec.(ts|js) (optional but recommended)

If the app has a product detail page:

From the list, click a product.

Assert:

URL includes the product’s slug or id.

The detail page shows correct name/price.

If applicable, “Bid” / “Buy now” buttons exist and are enabled for ACTIVE products.

Step 6 – Add documentation file for how to run Playwright

Create a markdown file, for example:

docs/playwright-e2e.md
(If a docs/ folder doesn’t exist, create it at repo root.)

Contents (adapt to actual scripts):

Prerequisites

Node.js version.

Backend and frontend must be configured and runnable.

Any required env vars:

JWT_SECRET, RECAPTCHA_BYPASS_TOKEN, etc.

PLAYWRIGHT_BASE_URL (optional override for baseURL).

Install dependencies (these are instructions for a human, not actions you perform):

# From the package where Playwright was configured
npm install
npx playwright install


Run the app(s) (again, instructions only):

# Terminal 1 – backend
cd backend
npm run dev

# Terminal 2 – frontend
cd frontend
npm run dev


Or equivalent npm run dev from root if the repo uses a monorepo dev script.

Run Playwright tests (headless)

npm run test:e2e


Run Playwright tests with UI

npm run test:e2e:ui


Config notes

Explain how baseURL is determined:

By PLAYWRIGHT_BASE_URL env var OR

By default value from playwright.config.(ts|js).

Describe any test users that the tests assume (e.g. seeded user tester@example.com with known password).

How to add more tests

Short example of a new spec file in tests/e2e:

import { test, expect } from '@playwright/test';

test('example home page test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Your App Title/);
});

Step 7 – (Optional) Update checklist/task file

If the repo contains a checklist file such as task_list.md, and there is an item for setting up Playwright / E2E tests:

After completing everything above, mark that item as done, e.g.:

- [x] Setup Playwright E2E tests (auth + products)


Do not mark unrelated items as done.

Final requirement

When you finish:

Summarize in a short message (for the human) exactly:

Which files you created.

Which files you modified.

What scripts are now available.

Do not show extremely long file contents unless necessary; focus on diffs or key snippets.

Remind the human that they must run:

npm install

npx playwright install

Then start backend/frontend and run npm run test:e2e.

Remember: do not run any commands yourself; only edit files.