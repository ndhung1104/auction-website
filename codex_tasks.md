# Codex Task Checklist

## Week 1 – Foundation & Design
### DBA
- [x] Design a detailed ERD that captures every auction flow.
- [x] Select and configure Knex (or another migration tool) for PostgreSQL.
- [x] Define the database schema using `snake_case`, `TIMESTAMPTZ`, and integer-based currency fields.
- [x] Create the `settings` table with keys such as `extend_window_min`, `extend_amount_min`, `highlight_new_minutes`, and `auto_bid_step_mode`.
- [x] Model `users`, `categories`, `products`, `product_images`, `bids`, `watchlist`, `questions`, `answers`, `seller_requests`, `orders`, `order_messages`, `ratings`, `auto_bids`, and optional `auto_bid_events`, including required constraints and indexes.
### Backend
- [x] Bootstrap the Express app and wire it to the migration tool.
- [x] Install core dependencies (`pg`, `bcrypt`, `passport`, `passport-jwt`, `cors`, `dotenv`, `joi`/`yup`).
- [x] Author a comprehensive `.env.example` covering DB, JWT, reCAPTCHA, mail, and frontend URLs.
- [x] Define consistent API response helpers for 400/401/403/404/422/500 errors.
- [x] Implement baseline middleware (`checkAuth`, `checkRole`) plus helpers like `maskBidderName`, `aggregateRating`, and a stub for `recalcAutoBid(productId)`.
### Frontend
- [x] Initialize the Vite + React project with Bootstrap, React Router, and Axios.
- [x] Create `.env` entries for `VITE_API_URL` and `VITE_RECAPTCHA_SITE_KEY`.
- [x] Establish the folder structure for components, pages, services, and contexts.
- [x] Define timezone (`Asia/Ho_Chi_Minh`) and VND currency formatting utilities.
### Admin/Other
- [x] Create the GitHub repository and configure `main`/`develop` branches.

## Week 2 – Auth & Basic View
### DBA
- [x] Run the Week 1 migrations to materialize the schema.
### Backend
- [x] Implement `POST /api/auth/register` with reCAPTCHA verification.
- [ ] Implement `POST /api/auth/login` that returns JWT tokens.
- [ ] Implement `POST /api/auth/forgot-password` that records OTP/token entries.
- [ ] Provide `GET /api/categories` for the two-level catalog.
- [ ] Provide `GET /api/products` with pagination, sorting, and `status = 'ACTIVE'` filtering.
### Frontend
- [ ] Build `Register`, `Login`, and `ForgotPassword` pages with Bootstrap forms.
- [ ] Implement the shared layout (Navbar/Footer) and load categories into the Navbar.
- [ ] Build `ProductListPage` with pagination and sorting hooked to the API.

## Week 3 – Complete View & Homepage
### DBA
- [ ] Write optimized queries for homepage sections (top price, ending soon, most bidded) and add supporting indexes.
### Backend
- [ ] Implement `GET /api/homepage` powered by the curated queries.
- [ ] Complete `GET /api/products/:id` with seller info, keeper stats, Q&A, and related products, including the `auto_bid_enabled` flag.
- [ ] Update `GET /api/products` to surface `is_new` using `highlight_new_minutes`.
- [ ] Implement `GET /api/products/:id/bids` with masked bidder identities.
### Frontend
- [ ] Build `HomePage` components wired to the homepage API.
- [ ] Finish `ProductDetailPage` with media, seller info, Q&A, related products, manual bid UI skeleton, and the auto-bid support badge.
- [ ] Update `ProductCard` to show the “new” badge when `is_new` is true.

## Week 4 – Seller Product & Profile
### DBA
- [ ] Verify that `product_images` and `seller_requests` tables and constraints behave as expected.
### Backend
- [ ] Implement secure image upload handling (e.g., multer pipeline).
- [ ] Implement `POST /api/products` (SELLER role) enforcing min three images, price fields, `buy_now_price`, `auto_extend`, and `enable_auto_bid`.
- [ ] Implement `POST /api/seller/request-upgrade` that sets `expire_at = now() + 7 days`.
- [ ] Expose `GET/PUT /api/profile` for profile viewing and updates.
### Frontend
- [ ] Build `ProfilePage` showing account data and conditional “Request Seller” button.
- [ ] Build `CreateProductPage` with multi-image upload, buy-now, auto-extend, and auto-bid toggle controls.

## Week 5 – Core Bidding & Auto-Bid
### DBA
- [ ] Author transactions for manual bids, auto-bid registrations, and auto-bid recalculations.
### Backend
- [ ] Implement `POST /api/products/:id/bid` with rating checks, step validation, bid recording, and auto-extend logic.
- [ ] Implement `POST /api/products/:id/auto-bid` with upsert behavior and invocation of `recalcAutoBid`.
- [ ] Complete `recalcAutoBid(productId)` to rank auto-bidders, compute minimal winning prices, update product state, and log bid history.
- [ ] Implement `POST /api/products/:id/buy-now` following the original flow.
### Frontend
- [ ] Wire the manual bidding UI on `ProductDetailPage` to the backend API.
- [ ] Add the auto-bid form (currency input + submit) and refresh logic after registration.
- [ ] Annotate bid history entries to indicate auto-bid generated events.

## Week 6 – Admin & Advanced Management
### DBA
- [ ] Provide queries for finding the second-highest bidder to support reject-bidder flows.
### Backend
- [ ] Build admin-only endpoints for category CRUD, product soft delete, user and seller-request management, and viewing auto-bids per product.
- [ ] Provide seller tools: append-only product description updates and `/reject-bidder` handling that reassigns the highest bidder.
- [ ] Provide bidder tools: ask question, add to watchlist, and profile views for watchlist/bidding/won items.
### Frontend
- [ ] Implement an admin dashboard (tables, pagination) for categories, products, users, and seller requests.
- [ ] Extend Profile sections to list active bids and won auctions.
- [ ] Add watchlist and Q&A controls on `ProductDetailPage`, plus seller-only actions for appending description or rejecting bidders.

## Week 7 – Systems & Flow Completion
### DBA
- [ ] Configure PostgreSQL full-text search on product names (and related fields as needed).
### Backend
- [ ] Integrate Nodemailer/SendGrid mailing hooks for registration, bidding (manual + auto), auction end, and Q&A events.
- [ ] Implement `GET /api/search` leveraging FTS.
- [ ] Implement `POST /api/auth/reset-password` and optional social logins (Google/Facebook) if time permits.
- [ ] Build post-auction order APIs covering the four-step workflow, chat, rating updates, and order cancellation.
### Frontend
- [ ] Add a global search bar and search results page.
- [ ] Build `ResetPasswordPage` and wire it to the reset API.
- [ ] Implement the order completion UI with progress steps, chat, rating, and seller cancel controls.
- [ ] Surface a “Cancel transaction” action for sellers where applicable.

## Week 8 – Testing, Seeding & Launch Prep
### DBA
- [ ] Write seeding scripts (4–5 categories, ~20 products) including sample auto-bid data.
- [ ] Review and add any missing indexes before freeze.
### Backend
- [ ] Execute comprehensive API testing (manual + auto-bid interactions, auto-extend) and fix defects.
- [ ] Re-verify security for JWT handling and role checks.
### Frontend
- [ ] Fix outstanding UI/responsive issues uncovered during testing.
### Admin/Other
- [ ] Conduct cross-team end-to-end rehearsals (list product → auto-bid → manual bid → win → chat → rate).
- [ ] Prepare final demo assets (slides, video walkthrough, live demo script).
