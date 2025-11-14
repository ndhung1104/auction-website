# Week 6 Test Guideline

Use this checklist after completing the Week 6 backend/frontend implementation. Follow the order below to ensure data dependencies are satisfied.

## Prerequisites
1. Backend + frontend running (`docker compose up` or `npm run dev` in each folder).
2. Database seeded for Week 6: `python testing/seed_week6_data.py` (from your preferred Python env). This provides:
   - Admin: `admin_w6@example.com / SellerPass123!`
   - Seller: `seller_w6@example.com / SellerPass123!`
   - Bidder: `bidder_w6@example.com / SellerPass123!`
   - Demo product slug `week6-admin-demo`
3. Optional: run `python testing/w6/test_admin_and_watchlist_flow.py` to sanity-check APIs before manual testing.

## A. Admin Workflow
1. **Login** as the seeded admin. Verify navbar shows “Admin” link.
2. **Dashboard overview**: categories, users, requests, products populate with data.
3. **Category CRUD**:
   - Create a new category (top form).
   - Edit an existing category name using inline button.
   - Delete a test category (confirm dialog).
4. **Seller requests**:
   - Approve or reject the pending request from the seeded bidder account.
   - Refresh to confirm status + user role updates.
5. **User table**: change a user’s role via dropdown and confirm update call works.
6. **Product actions**:
   - View auto-bids for the seeded product (modal/card below table).
   - Soft-delete a product and ensure status flips to `REMOVED` (it should disappear from `/products`). Re-seed if needed for repeat tests.

## B. Seller Tools
1. Login as seeded seller and open the product detail page.
2. **Append description**: use the new form to add text; verify the content re-renders in the description block.
3. **Reject bidder** (if there’s an active bid):
   - Place manual bids from another browser (bidder account) first.
   - Use reject form; confirm current bidder changes and watch bid history rebuild.
4. **Answer questions**: after a bidder posts a question (see section C), submit an answer from the seller view; ensure question card updates to “answered” state.

## C. Bidder Features
1. Login as seeded bidder or new bidder account.
2. **Watchlist**:
   - Add the seeded product via new “Add/Remove watchlist” button on the detail page.
   - Refresh page to confirm state persists; watchlist count increments.
   - Remove and ensure count decrements.
3. **Questions**:
   - Submit a question (form above Q&A list).
   - Confirm pending state (“Awaiting seller response”) until answered.
4. **Profile page**:
   - Ensure watchlist, active bids, and won auctions tables populate (even if empty, expect friendly messages).

## D. Frontend Regression
1. **Manual/auto bid** (Week 5 features) still operate alongside Week 6 controls.
2. Verify buy-now still works and hides active forms once status changes.
3. Confirm no dark-theme flash/regression after login/remember-password prompts (global CSS update).

## E. API Test Scripts (optional but recommended)
1. `python testing/w5/test_bidding_flows.py` – ensures Week 5 bidding logic remains intact.
2. `python testing/w6/test_admin_and_watchlist_flow.py` – covers admin, watchlist, and Q&A flows end to end.
   - Run after Week 6 seed; inspect output for any 4xx/5xx.

## F. Notes
- If you soft-delete the only demo product, re-run `python testing/seed_week6_data.py` to restore fixtures.
- Admin credentials should remain secret; reset via seed script if modified.
