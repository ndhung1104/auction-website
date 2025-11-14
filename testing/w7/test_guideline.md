# Week 7 Test Guideline

Use this checklist after landing the Week 7 scope (search, reset-password, order workflow). Avoid running the automation in CI; these steps are for local/manual verification.

## Prerequisites
1. Backend, frontend, and PostgreSQL running (via `docker compose up` or individual `npm run dev`).
2. Week 7 seed data loaded: `python testing/seed_week7_data.py` (creates searchable products plus an order for seller/bidder accounts).
3. API base defaults to `http://localhost:3001/api`. Update `.env` files if ports change.

## A. Full-Text Search
1. Use the navbar search box to look for `camera` or `retro`.
2. Confirm you are redirected to `/search?q=camera` and results show cards with prices, badges, and pagination summary.
3. Navigate between pages using the Previous/Next buttons; verify the summary updates and `meta.hasMore` toggles correctly.
4. Submit an empty query; the page should reset to the helper message rather than firing the API.

## B. Password Reset Flow
1. Visit `/forgot-password`, request a reset for a test account, and copy the token shown (non-production convenience).
2. Follow the inline link to `/reset-password`, enter the token + new password, and confirm the success banner appears.
3. Log in with the new password to ensure the auth service accepted the change.

## C. Order Workflow
1. Log in as the seeded seller (`seller_w7@example.com` / `SellerPass123!`).
2. Open `/orders` and confirm the seeded order renders with badges, formatted prices, and links.
3. Drill into `/orders/:id`:
   - Observe the timeline badges and participant labels.
   - Send a chat message; ensure it displays immediately with timestamps.
   - Use **Mark processing** then **Mark completed**; status alerts should show and the timeline should update after refresh.
4. Switch to the bidder account (`bidder_w7@example.com`) and verify the same order shows the updated status and chat history; submit a positive rating.
5. As the seller, click **Cancel order** on another test order (create via seed if needed) and confirm the badge switches to `Cancelled` and actions disable.

## D. API Regression Script
- Optional: run `python testing/w7/test_search_reset_order_flow.py` to cover search, reset-password, and order APIs in one go. Review console output for any 4xx/5xx before shipping.

## Notes
- Re-run the seed script if you need fresh users/orders; it safely upserts the Week 7 fixtures.
- When testing email hooks without SMTP credentials, monitor the backend logs for `[mail]` messages confirming skip/pass.
