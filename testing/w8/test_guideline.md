# Week 8 Test Guideline

Manual checklist to validate the release build. Do not auto-run scripts; execute steps in the order below.

## Prep
1. Seed data: `python testing/seed_week8_data.py` (uses Week 8 categories/products).
2. Start stack: `docker compose up --build` (backend `.env` must contain SMTP + DB info).
3. Optionally inspect seed via `SELECT` queries (categories, products, orders).

## Backend / API
1. **Registration + Reset**  
   - POST `/api/auth/register` with `captchaToken=local-dev`.  
   - POST `/api/auth/forgot-password` and ensure dev response returns `resetToken`.  
   - POST `/api/auth/reset-password` with the token and new password, then login.
2. **Search & watchlist**  
   - GET `/api/search?q=Week8` (should return 4–5 categories worth of products).  
   - POST `/api/watchlist/:id`, verify `/api/profile` shows the item, then DELETE it.
3. **Bidding**  
   - POST `/api/products/:id/bid` with the next valid increment.  
   - POST `/api/products/:id/auto-bid` with a higher max; confirm response indicates success.
4. **Orders**  
   - GET `/api/orders` for seeded seller; open `/api/orders/:id`.  
   - POST `/api/orders/:id/messages` twice (seller + bidder).  
   - PATCH `/api/orders/:id/status` to `PROCESSING`, then POST `/rating`.  
5. **Security spot-check**  
   - Attempt to access `/api/orders` without a token (expect 401).  
   - Attempt to post messages as a different bidder (expect 403).  

## Frontend
1. Run `npm run dev` (frontend) and check:
   - Navbar search navigates to `/search?q=Week8`.  
   - Search results page shows pagination summary + cards.  
   - Orders page renders responsive table + status badges.  
   - Order detail page displays timeline, chat, and action buttons properly on mobile width.  
2. Profile page lists watchlist/active/won tables with fallback messages.  
3. Reset password page accessible via Forgot Password success alert link.  

## Rehearsal Script
1. Seller creates a new product via UI (ensure at least 3 images).  
2. Bidder places manual bid + auto-bid.  
3. Force auction end (or manually update DB) → ensure order is generated.  
4. Seller updates order status to `PROCESSING`, chats with bidder, bidder leaves rating.  
5. Export screenshots/logs for demo deck.

## Automation (optional)
- Run `python testing/w8/test_full_regression.py` manually to print API responses.

Document any failures and link to issues before sign-off.
