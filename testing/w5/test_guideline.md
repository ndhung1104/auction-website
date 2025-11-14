# Week 5 Frontend Test Guide

Use these scenarios after running the backend API tests and seeding scripts. They target UI behaviors introduced for Week 5 (manual bid, auto-bid, buy-now, history annotations).

## Prerequisites
1. Backend + DB running with the latest code (`docker compose up` or local).
2. Seed Week 5 data: `conda activate seed` (or your Python env) then `python testing/seed_week5_data.py`.
3. Start the frontend: `cd frontend && npm run dev`.
4. Ensure you have at least three bidder accounts (Week 5 API test script already creates them). You can re-use those credentials on the UI.

## Manual Testing Checklist

1. **Manual Bid Flow**
   - Login as a bidder who is not the seller.
   - Open the seeded Week 5 product detail page.
   - Enter a bid equal to `current price + step` and submit.
   - Expect success toast/alert, price increase, and bid history entry labeled “Manual”.
   - Try an invalid amount (non step-aligned) to confirm validation error surfaces inline.

2. **Auto-Bid Registration**
   - Still on the detail page, enter a max auto-bid value (>= minimum shown).
   - Submit and verify success state plus new badge in history after someone else bids.
   - Refresh to ensure state persists.

3. **Auto-Bid Reaction**
   - From another browser/incognito, login as a different bidder and place a manual bid that undercuts the auto-bid ceiling.
   - Observe the first browser refresh: price should jump again with “Auto bid” badge and keeper info updating.

4. **Buy Now**
   - Login as a third bidder; click “Buy now” and confirm the CTA disables afterwards.
   - Product status should change to ENDED and endpoints return 404 for detail (expected). UI should show finished state after refresh.

5. **Role-based Visibility**
   - Login as seller: ensure manual/auto/buy-now forms are hidden/disabled with explanatory text.

6. **Error States**
   - Try bidding while logged out; confirm you are prompted to login and the form disables.

Document results (pass/fail, screenshots) alongside automated test output before closing Week 5.***
