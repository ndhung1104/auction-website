# Playwright E2E Setup Plan

## Absolute Constraints (Very Important)

You are working in **file-edit-only mode**:

- Do NOT run any shell commands (no `npm`, `npx`, `playwright`, `node`, etc.).
- Do NOT install packages or tools.
- Do NOT start dev servers or tests.
- Only **read, create, and edit files** in the repo.
- Your goal is to wire up configuration and test code so a human can run the commands later.
- If something needs to be installed (for example `@playwright/test`):
  - Only edit the relevant `package.json` to add the dependency and scripts.
  - Do NOT execute installation commands yourself.
- Do NOT touch `node_modules/` in any way.

---

## Goal

Set up **Playwright E2E testing** for the frontend by completing all of the following:

1. Add the Playwright dependency and the `test:e2e` scripts to the correct `package.json`.
2. Create a `playwright.config.(ts|js)` file.
3. Add E2E tests covering:
   - Authentication (login, register, forgot password).
   - Product listing (sorting and pagination).
   - Product detail (if the page exists).
4. Write a short documentation file explaining how to install deps, start the apps, and run the Playwright suite.

Only modify code and configuration files. Do not run any commands while doing this work.

---

## Project Assumptions (Adapt to Actual Code)

- Backend: Node + Express with endpoints similar to:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/forgot-password`
  - `GET /api/products` supporting `status`, `categoryId`, `sort`, `page`, and `limit`, returning meta `{ page, limit, total, totalPages, sort: { field, direction } }`.
- Frontend: React SPA consuming these APIs.

Investigate the repository to confirm actual filenames, routes, and behavior before writing tests.

---

## Requirement Trace (project_plan_raw.md)

`project_plan_raw.md` enumerates features by week. The Playwright plan must verify the following deliverables end-to-end:

- **Foundation (Week 1)**: Core layout, navigation, category dropdown, search box, timezone/currency helpers, and the presence of `Home`, `Products`, `Login`, and `Register` routes.
- **Week 2 (Auth & Basic View)**: Register/Login/Forgot Password pages, categories rendered in the navbar, `ProductListPage` with pagination + sorting.
- **Week 3 (Homepage & Detail)**: Homepage hero + curated sections (top price, ending soon, most bidded), `ProductDetailPage` with badges, bid UIs, Q&A placeholders, watchlist toggle, and related products list.
- **Week 4 (Seller & Profile)**: `ProfilePage` for bidders, `/sell/create` flow for sellers with upload form, and navbar links that change by role.
- **Week 5 (Bidding & Auto-Bid)**: Manual bid form, auto-bid registration form, buy-now CTA, and watchlist/question interactions on the product detail view.
- **Week 6 (Admin & Advanced Management)**: Admin dashboard entry point plus seller/bidder tooling (watchlist, Q&A buttons, seller-only nav items).
- **Week 7 (Search, Reset, Orders)**: Search bar and results page, reset password entry point, multi-step order workflow surface on `/orders`.
- **Week 8 (Testing & Seeding)**: Seeded fixtures for multiple products so pagination + sorting + bid history make sense.
- **Week 9 (Demo polish)**: Admin-only features (reject bidder, append description) appear in UI, seller-only actions show up, card metadata such as buy-now price/highest bidder/remaining time is visible.

Every Playwright spec referenced below should assert at least one UI artifact tied to these requirements.

---

### Step 1 - Detect project structure (read-only)

1. Locate all relevant `package.json` files (root, `frontend/`, `apps/*/`, etc.).
2. Identify the frontend package where the E2E tests belong. Use that package (for example `frontend/package.json`) unless there is only a root package.
3. Determine how the frontend is started (e.g., `npm run dev`, `npm run start`, Vite, CRA) and what base URL it uses (e.g., `http://localhost:5173` or `http://localhost:3000`).

Do **not** modify files in this step; only analyze.

---

### Step 2 – Add Playwright dependency and scripts (edit only)

Inside the chosen `package.json`:

1. Add `@playwright/test` as a `devDependency` (use a recent stable release such as `"^1.48.0"`). Do not run installation commands.
2. Merge the following scripts with any existing ones:

```jsonc
"scripts": {
  // keep existing scripts
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

Ensure the JSON stays valid.

---

### Step 3 – Create the Playwright config file

Create `playwright.config.ts` if the package already uses TypeScript, otherwise `playwright.config.js`. Place it next to the chosen `package.json` and configure it as follows:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

Adjust `baseURL` so that it matches the frontend dev server in this repo (Vite usually uses `http://localhost:5173`, CRA often uses `http://localhost:3000`). If the repo already exposes an env var for the frontend URL, follow that pattern and document it later.

---

### Step 4 – Create the E2E test directory and helpers

1. Create `tests/e2e/` alongside the Playwright config.
2. Inside it, add `tests/e2e/test-utils.(ts|js)` with shared helpers, including a login helper that:
   - Navigates to the login route defined in the frontend router.
   - Fills the email and password fields using stable selectors (`getByLabelText`, `getByRole`, or `data-testid`).
   - Submits the form and waits for the logged-in state (navigation or visible indicator).
3. If you need reliable selectors, minimally add `data-testid` attributes to the frontend components. Do not refactor components heavily; add only what is necessary.

---

### Step 5 – Implement concrete Playwright tests

Create the following spec files in `tests/e2e/` (match the language you chose for the config):

#### 5.1 `tests/e2e/auth.spec.(ts|js)`

Scenarios to cover:

- **Login success**
  - Go to the login page.
  - Fill valid credentials for a known seeded user (document this user later).
  - Submit and assert that the app navigates to the logged-in area (home/dashboard) and shows a logged-in indicator (user info, logout button, etc.).
- **Login failure (invalid credentials)**
  - Submit the form with the wrong password.
  - Assert that the error message shown by the UI appears.
- **Forgot password UI**
  - Navigate to the forgot-password page, fill the email, and submit.
  - Assert that the UI displays the expected success or info message (e.g., “If the account exists…“).

Do not rely on backend internals; assert only what the UI exposes.

#### 5.2 `tests/e2e/register.spec.(ts|js)`

- **Happy-path registration**
  - Visit the register page, fill all required fields (email, password, full name, phone, etc.).
  - If the form requires a RECAPTCHA bypass token, provide the expected token from the backend/test env.
  - Submit and assert the success path (toast, redirect, etc.).
- **Duplicate email error**
  - Attempt to register again with the same email.
  - Assert that the UI surfaces the error that the backend returns (e.g., `AUTH.EMAIL_EXISTS` message or the UI’s generic error state).

#### 5.3 `tests/e2e/products-list.spec.(ts|js)`

Use the expected `/api/products` behavior for reference:

```json
{
  "success": true,
  "data": { "items": [/* ... */] },
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
```

Tests to add:

- List renders products: navigate to the product list page and assert that product cards/rows appear (showing only ACTIVE items if the UI labels that state).
- Sorting and pagination wiring: trigger the UI control that corresponds to `sort=end_at,desc` (e.g., “Ending soon”), move to the next page via pagination, then assert that:
  - The URL reflects the expected query params if the frontend syncs them (`?sort=end_at,desc&page=2`).
  - The visible results change between pages.

If the UI lacks sorting or pagination, adapt the tests to what is actually implemented; do not invent behavior.

#### 5.4 `tests/e2e/product-detail.spec.(ts|js)` (optional but recommended)

If a product detail page exists:

- Click a product from the list and assert that the detail URL contains the slug or ID.
- Verify that the detail page shows the correct name, price, and relevant actions (Bid/Buy now) for ACTIVE products.
- Assert that manual bid, auto-bid, watchlist, buy-now, and Q&A widgets render to satisfy Weeks 3–5 + 6 requirements.

---

#### 5.5 `tests/e2e/navigation.spec.(ts|js)`

- Covers Week 1/2 navbar requirements:
  - Anonymous users see `Home`, `Products`, `Login`, `Register`, `Categories`, and the search form.
  - After bidder login the navbar should expose `Profile`, `Orders`, `Logout`, and hide seller/admin-only entries.
  - Verifies category dropdown + search controls exist and that the layout honors timezone/currency formatting cues on visible cards.

#### 5.6 `tests/e2e/search.spec.(ts|js)`

- Exercises the global search UX from Week 7: submit a keyword, ensure the router navigates to `/search?q=value`, and assert that product cards render with the same visual treatment as the listing grid.

#### 5.7 `tests/e2e/profile.spec.(ts|js)`

- Authenticated bidder journey for Week 4 + Week 7:
  - After login, visit `/profile` and ensure profile, watchlist, bidder stats, and seller request controls render.
  - Visit `/orders` and confirm the multi-step order list/table is visible together with reset-password entry points or helpful CTAs.

#### 5.8 `tests/e2e/seller.spec.(ts|js)`

- Seller-only coverage for Week 4/6:
  - Login with a seeded seller, verify navbar shows `Create product`, click it, and confirm the listing form (with multi-image upload, buy-now, auto-extend, auto-bid toggle) renders.
  - Optionally assert that seller-only controls (append description, reject bidder) appear on their product detail page if seeded data exposes them.

#### 5.9 `tests/e2e/admin.spec.(ts|js)`

- Administrative tooling for Week 6/9:
  - Login as the seeded admin account, confirm the `Admin` link appears, and navigate to `/admin` to ensure dashboard widgets/tables render for categories/products/users/seller requests.
  - If seller/bidder rejection controls exist, assert that the view exposes them (even if they are disabled in test data).

---

### Step 6 - Document how to run Playwright

Create `docs/playwright-e2e.md` (create the `docs/` folder at the repo root if needed) with the following sections:

- **Prerequisites**: Node.js version, backend/frontend readiness, required environment variables (`JWT_SECRET`, `RECAPTCHA_BYPASS_TOKEN`, etc., plus optional `PLAYWRIGHT_BASE_URL`).
- **Install dependencies** (instructions for humans):

  ```bash
  npm install
  npx playwright install
  ```

  (Run these inside the package where Playwright was configured.)

- **Run the apps** in separate terminals:

  ```bash
  # Terminal 1 – backend
  cd backend
  npm run dev

  # Terminal 2 – frontend
  cd frontend
  npm run dev
  ```

  Mention any monorepo scripts if they exist.

- **Run the Playwright suite**:

  ```bash
  npm run test:e2e       # headless
  npm run test:e2e:ui    # with UI
  ```

- **Config notes**: explain how `baseURL` is derived (from `PLAYWRIGHT_BASE_URL` or the default in `playwright.config.*`) and document any test users the specs depend on.
- **How to add more tests**: include a short example snippet (see below) and note the folder to place new specs in.

Example snippet to include:

```js
import { test, expect } from '@playwright/test';

test('example home page test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Your App Title/);
});
```

---

## Final Requirement

When all steps are complete, provide a short summary to the hooman reviewer detailing:

- Which files were created.
- Which files were modified.
- Which scripts are now available.

Remind them to run:

```bash
npm install
npx playwright install
```

Then start the backend and frontend, and finally run `npm run test:e2e` (or `npm run test:e2e:ui`).

**Remember:** do not run any commands yourself; only edit files.
