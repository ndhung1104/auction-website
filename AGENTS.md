# Repository Guidelines
## File Ignore Rules

As an AI agent, you must completely ignore the following folders:

- `node_modules/` (both in backend and frontend)
- `dist/`
- `build/`
- `.git/`
- `.cache/`
- any auto-generated files

Never read or edit anything inside `node_modules`. Treat these directories as forbidden.

## File Editing Rules (Important)

When modifying existing files:

- Do NOT delete or recreate entire files unless explicitly instructed.
- Apply minimal, focused changes.
- Update only the relevant sections of the file.
- Preserve all existing code structure, comments, imports, and formatting.
- Use patch-style modifications (add/modify/remove only the lines needed).
- Never rewrite the whole file unless I write: “rewrite file entirely”.


## Mission & Principles
You are an AI coding agent working on a full-stack **online auction web application**.  
Your job is to:
- Respect the existing architecture and conventions.
- Implement features incrementally, following the project roadmap.
- Keep the code clean, testable, and consistent.
- Avoid breaking database schema, migrations, and environment configuration.

---

## Tech Stack Overview
- **Backend (BE):** Node.js + Express.js (RESTful API)
- **Frontend (FE):** React (Vite) SPA + Bootstrap (via npm import in `main.jsx`)
- **Database:** PostgreSQL
- **ORM / Query Layer:** Knex.js migrations (see `backend/migrations` and `backend/src/db/knex.js`)
- **Auth:** JWT (via `passport-jwt`), middlewares in `backend/src/middlewares`
- **Validation:** Joi/Yup-style validation (if/when added to `backend/src/validators`)
- **Git:** Required. Branches: `main`, `develop` (and feature branches if needed)

---

## Project Structure & Module Organization
### High-Level Summary
- `/frontend` (Vite + React) centers on `src/main.jsx`; UI pieces live in `components/`, `pages/`, `routes/`, with reusable logic in `hooks/`, `services/`, and `utils/`. Static assets stay in `public/` and `src/assets/`.
- `/backend` (Express + PostgreSQL) follows a layered flow `routes/` → `controllers/` → `services/` → `repositories/`, plus `middlewares/` for auth/validation, `db/` helpers, Knex `migrations/`, and shared config in `src/config/`.
- `/docs/ERD.md` documents schema decisions; keep diagrams aligned with the latest Knex migration. Docker tooling (`docker-compose.yml`, service Dockerfiles) sits at the root for local orchestration.

### Detailed Layout
```
.
├─ backend/
│  ├─ .env                 # Local env (never commit real secrets)
│  ├─ .env.example         # Sample env vars – update when adding new config
│  ├─ Dockerfile
│  ├─ knexfile.js          # Knex config (environments, migrations, seeds)
│  ├─ migrations/          # Database schema changes – 1 file per migration
│  │  ├─ 20251103141106_initial_schema.js
│  │  ├─ temp.txt          # Temporary notes – can be cleaned up later
│  ├─ package.json
│  ├─ src/
│  │  ├─ app/
│  │  │  └─ index.js       # Express app creation & middleware wiring
│  │  ├─ config/
│  │  │  ├─ cors.js        # CORS configuration
│  │  │  └─ passport.js    # JWT strategy, passport config
│  │  ├─ controllers/
│  │  │  └─ health.controller.js
│  │  ├─ db/
│  │  │  └─ knex.js        # Knex instance
│  │  ├─ index.js          # Backend entrypoint (server listen)
│  │  ├─ middlewares/
│  │  │  ├─ auth.js        # checkAuth, checkRole, etc.
│  │  │  └─ error.js       # Centralized error handler
│  │  ├─ repositories/
│  │  │  └─ user.repository.js
│  │  ├─ routes/
│  │  │  ├─ health.js
│  │  │  ├─ index.js       # Main router
│  │  │  └─ profile.js
│  │  ├─ services/
│  │  │  ├─ auth.service.js
│  │  │  └─ autoBid.service.js  # Core automatic bidding logic (to be implemented/extended)
│  │  └─ utils/
│  │     ├─ bid.js         # Bid calculation helpers
│  │     ├─ index.js       # Misc shared helpers
│  │     ├─ rating.js      # Rating aggregation, etc.
│  │     └─ response.js    # Standard API response helpers
│  └─ package-lock.json
│
├─ docker-compose.yml      # Orchestration for backend/frontend/db (if configured)
├─ docs/
│  └─ ERD.md               # DB schema, relationships, & notes
│
├─ frontend/
│  ├─ .env
│  ├─ .env.example
│  ├─ .gitignore
│  ├─ Dockerfile
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package.json
│  ├─ public/
│  │  └─ vite.svg
│  ├─ src/
│  │  ├─ assets/
│  │  │  └─ react.svg
│  │  ├─ components/       # Reusable UI components
│  │  ├─ contexts/
│  │  │  └─ AuthContext.jsx
│  │  ├─ hooks/
│  │  ├─ layouts/
│  │  │  └─ MainLayout.jsx # Global layout, navbar, footer, etc.
│  │  ├─ pages/
│  │  │  ├─ ForgotPasswordPage.jsx
│  │  │  ├─ HomePage.jsx
│  │  │  ├─ LoginPage.jsx
│  │  │  └─ RegisterPage.jsx
│  │  ├─ routes/
│  │  │  └─ index.jsx      # Route definitions (React Router)
│  │  ├─ services/
│  │  │  ├─ api.js         # Axios instance / API base config
│  │  │  └─ health.js      # Health check calls
│  │  ├─ utils/
│  │  │  └─ format.js      # Currency/time formatting helpers
│  │  ├─ index.css
│  │  └─ main.jsx          # React entrypoint
│  ├─ vite.config.js
│  └─ README.md
│
├─ readme.md               # Project readme (for humans)
└─ .gitignore
```
When modifying or adding code, respect this structure and extend existing patterns rather than introducing new, inconsistent ones.

---

## Environment & Configuration
### Backend `.env` (see `.env.example`)
Typical keys (do not hard-code real values in code):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `RECAPTCHA_SECRET_KEY`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`
- `FRONTEND_URL`

Rules:
- Never commit real secrets to git.
- When adding new env vars: use `process.env.*` in code, add entries to `backend/.env.example` with placeholder values, and update docs as needed.

### Frontend `.env` (see `.env.example`)
Expected keys:
- `VITE_API_URL`
- `VITE_RECAPTCHA_SITE_KEY`

Use them via `import.meta.env.VITE_API_URL` (or other prefixed keys) in React code.

---

## Database Rules & Schema Conventions
The database design is documented in `docs/ERD.md` and implemented via Knex migrations in `backend/migrations`.

Global rules:
- Table & column names: `snake_case`
- Time fields: `TIMESTAMPTZ`
- Money / price: `BIGINT` (or `INTEGER`) storing VND (no float)
- Use FK constraints and indexes for performance-critical queries.

Important tables (conceptually):
- `settings` – key/value configuration such as `extend_window_min`, `extend_amount_min`, `highlight_new_minutes`, `auto_bid_step_mode`.
- `users` – includes role (`ADMIN`, `SELLER`, `BIDDER`), password (bcrypt), auxiliary tables like `user_otps` or JSONB fields.
- `categories` – hierarchical (2 levels) with `parent_id`.
- `products` – seller_id, category_id, `current_bidder_id` (nullable), `bid_count`, `buy_now_price` (nullable), `auto_extend` (boolean), `enable_auto_bid`, `status` (`ACTIVE`, `ENDED`, `REMOVED`), `current_price` / `current_bid_price`.
- `product_images` – minimum three images per product.
- `bids` – manual and automatic bids (`user_id`, `product_id`, `price`, `created_at`) with index on `(product_id, created_at DESC)`.
- `watchlist`, `questions`, `answers`, `seller_requests`, `orders`, `order_messages`, `ratings` (with unique `(order_id, rater_id)`), and auto-bid-specific tables:
  - `auto_bids` (`product_id`, `user_id`, `max_bid_amount`, timestamps, `UNIQUE (product_id, user_id)`).
  - (Optional) `auto_bid_events` – logs for audit/inspection.

As an agent:
- Do not arbitrarily change existing migrations unless explicitly asked.
- For schema changes, create new migrations in `backend/migrations`.
- Keep `docs/ERD.md` in sync with schema updates.

---

## Build, Test, and Development Commands
Run commands from the relevant package directory unless noted.
- `npm install` inside `frontend/` and `backend/` after pulling to sync dependencies.
- Frontend: `npm run dev` starts the Vite dev server, `npm run build` emits the production bundle, and `npm run preview` serves the built assets for smoke tests.
- Backend: `npm run dev` runs nodemon with live reload, `npm start` launches the API with plain Node, and `npm run migrate` / `migrate:rollback` / `seed` manage the PostgreSQL schema via Knex.
- Full stack via Docker: `docker compose up --build` launches React, API, and PostgreSQL; use `docker compose down -v` when cleaning.
- Before committing, run available tests and linters:
  - `cd backend && npm test` (if defined) and `npm run lint`.
  - `cd frontend && npm test` (if defined) and `npm run lint`.

---

## Coding Style & Naming Conventions
- JavaScript modules use ES Modules and 2-space indentation.
- Favor named exports for reusable hooks/components (`hooks/useBid.js`), PascalCase React components, camelCase utilities, and snake_case table names mirroring migration files.
- ESLint is configured in `frontend/eslint.config.js`; run `npm run lint` before committing. Keep backend formatting consistent with Prettier defaults (80-char soft wrap) even though formatting is manual today.
- Code comments and identifiers should be in English. It is fine to keep some high-level docs in Vietnamese if already present, but keep new docs primarily in English for consistency.

---

## Backend Conventions
### 5.1 Entry & App Wiring
- `backend/src/index.js` – server entrypoint that imports the Express app and starts the HTTP server (port from env).
- `backend/src/app/index.js` – sets up the Express instance, JSON parsing, CORS (via `config/cors.js`), Passport JWT (`config/passport.js`), routes (`src/routes/index.js`), and error middleware (`src/middlewares/error.js`).

### 5.2 Routes / Controllers / Services / Repositories
- Routes (`src/routes`): define endpoints & attach middlewares.
- Controllers (`src/controllers`): handle requests/responses and call services; keep business logic minimal.
- Services (`src/services`): contain business logic (auth, auto-bid, etc.) and use repositories plus utils.
- Repositories (`src/repositories`): encapsulate DB access using Knex (e.g., `user.repository.js`).
- Pattern: route → controller → service → repository. Do not put heavy logic in routes.

### 5.3 Auth & Middlewares
- `src/middlewares/auth.js`: `checkAuth` verifies JWT and attaches `req.user`; `checkRole('ADMIN' | 'SELLER' | 'BIDDER')` enforces role-based access.
- `src/config/passport.js`: configures `passport-jwt` using `JWT_SECRET`.
- `src/middlewares/error.js`: central error handler; use `next(err)` from services/controllers to bubble up errors.
- API response style: use helpers from `src/utils/response.js` to maintain consistent success/error shapes (400, 401, 403, 404, 422, 500, etc.).

### 5.4 Auto-Bid Logic (Core)
- Core logic lives in `src/services/autoBid.service.js` with helpers in `src/utils/bid.js` and related utilities (e.g., `src/utils/rating.js`).
- Conceptual behavior (`recalcAutoBid(productId)`):
  - Load all active auto-bids for the product.
  - Sort by `max_bid_amount DESC`, `created_at ASC`.
  - If only one auto-bidder: winner = that bidder; product price = max(current/base price).
  - If two or more: head bidder = highest max; second bidder = next highest; product price = minimal winning price (typically `min(max_bid_head, max_bid_second + step_price)`).
  - Update `products.current_bidder_id`, `products.current_price`, `products.bid_count`.
  - Insert `bids` / `auto_bid_events` rows for history.
  - Respect `status = 'ACTIVE'` and related constraints.
- Important endpoints:
  - Manual bid: `POST /api/products/:id/bid` – validate JWT, user role, minimum rating %, step size, auto-extend, and update bids + product.
  - Register auto-bid: `POST /api/products/:id/auto-bid` – body `{ max_bid_amount }`, upsert into `auto_bids`, then call `recalcAutoBid`.
  - Buy now: `POST /api/products/:id/buy-now` – close auction, create order, etc.
- When implementing or modifying these flows, follow the conceptual design and keep logic centralized in `autoBid.service.js` + helpers.

---

## Frontend Conventions
### 6.1 React App Setup
- Entrypoint: `frontend/src/main.jsx`.
- Routing: `frontend/src/routes/index.jsx`.
- Main layout: `frontend/src/layouts/MainLayout.jsx`.
- State/context: `frontend/src/contexts/AuthContext.jsx`.
- HTTP: `frontend/src/services/api.js` houses the Axios instance with `VITE_API_URL` base; other service files (e.g., `health.js`) call this instance.

### 6.2 Styling & UI
- Use Bootstrap imported in `main.jsx` or `index.css` via npm package.
- Prefer React functional components + hooks.
- Layout & components: reusable pieces go into `src/components/`; page-level screens go into `src/pages/`.

### 6.3 Pages (Existing & Future)
- Existing pages: `HomePage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `ForgotPasswordPage.jsx`.
- Future pages: product detail, profile, create product, admin dashboard, watchlist, etc.

### 6.4 UX & Formatting Rules
- Locale/timezone: `Asia/Ho_Chi_Minh`.
- Currency: Vietnam Dong (VND); use helpers in `src/utils/format.js` for consistent price formatting.
- When backend returns `is_new` flags or `auto_bid_enabled`, show appropriate badges/labels (`NEW`, `Hỗ trợ đấu giá tự động`, etc.).

---

## Testing Guidelines
- No automated suite exists yet; prioritize adding React Testing Library + Vitest specs under `frontend/src/**/*.test.jsx` and supertest/Jest cases under `backend/src/**/*.test.js` as you touch features.
- When adding tests, structure describe blocks after route or component names, use seeded test databases for deterministic data, and assert both success and failure paths to protect the bidding logic.

---

## Project Roadmap (High-Level Guidance for Priorities)
The project follows an 8-week schedule:
- **Week 1 – Foundation & Design**: DB schema finalized, migrations, settings table, auto-bid tables, backend bootstrapped, JWT auth infra, middlewares/helpers, frontend setup (Vite, Bootstrap, routing, API config).
- **Week 2 – Auth & Basic Views**: Register + Login + ForgotPassword (without full mailing), list categories & products (`status = 'ACTIVE'` only).
- **Week 3 – Complete Guest View & Homepage**: Homepage sections (top price, ending soon, most bidded), product detail page with history, related products, `auto_bid_enabled` flag.
- **Week 4 – Seller & Profile**: Product posting with images, buy-now, auto-extend, enable auto-bid flag, upgrade-to-seller request flows.
- **Week 5 – Core Logic: Manual Bid + Auto-Bid + Buy Now**: Implement manual bid API, auto-bid registration & `recalcAutoBid`, integrate both on FE.
- **Week 6 – Admin & Advanced Management**: Admin management for categories, users, seller requests, products; seller tools (append description, reject bidder – second highest logic); bidder tools (watchlist, questions, profile lists).
- **Week 7 – Search, Mailing, Post-Auction Flow**: Full-text search, email notifications, reset password, 4-step order process, rating.
- **Week 8 – Seeding, Testing, Polish**: Seed data (including auto-bid scenarios), bug fixing, UX polish, demo readiness.

As an agent, when asked to implement something, check where it fits in this roadmap and reuse the intended design rather than inventing ad-hoc behavior.

---

## Git & Pull Request Guidelines
- History shows Conventional Commit prefixes (`feat`, `feat(auth)`, etc.). Follow `type(scope): summary` with imperative verbs, link issues in the body when applicable, and prefer small, focused commits.
- Sample commit messages: `feat(api): add auto-bid registration endpoint`, `feat(ui): implement product detail auto-bid form`, `fix(bid): correct auto-bid price calculation`, `chore: update knex migration for ratings`.
- If a change spans BE+FE, split into logical commits (e.g., API vs. UI) when possible.
- Pull requests must explain what changed, why, and how to verify (e.g., `npm run dev`, `docker compose up`, screenshots). Call out migration IDs, new env vars, and manual test notes so reviewers can reproduce quickly.

---

## Agent Workflow Expectations
- **Understand before editing:** Read related files (routes, controllers, services, utils, migrations, ERD) before changing logic and keep consistency with existing naming/patterns.
- **Backend changes:** Add/modify routes in `src/routes`, implement logic in controllers/services, use repositories for DB access, shared helpers in `src/utils`, and maintain response format via `src/utils/response.js`.
- **Frontend changes:** Use `MainLayout`, React Router config, add new pages/components under `pages/` and `components/`, and reuse `services/api.js` for HTTP calls.
- **Database changes:** Create new migration files in `backend/migrations` and update `docs/ERD.md` to reflect structural changes.
- **Error handling & Security:** Validate inputs before use, apply `checkAuth`/`checkRole` on protected endpoints, and avoid leaking sensitive info in error messages.
- **Language & Comments:** Follow English for code comments/identifiers; keep new docs primarily in English.
- When in doubt, read existing code and `docs/ERD.md` first; reuse patterns, utilities, and conventions already present.

---

## Security & Configuration Tips
- Never commit `.env` files; document new keys in `docs/` and mirror them in `.env.example`.
- Keep Knex migrations idempotent; add a new migration for breaking schema work instead of rewriting history.
- Validate user input via the existing Joi schemas in `backend/middlewares/` and reuse service-layer helpers rather than issuing ad hoc SQL in controllers.
- Use the roadmap, conventions, and architecture described above to avoid accidental regressions, and prefer additive, well-tested changes before opening a PR.
