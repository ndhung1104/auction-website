# Playwright Test Coverage Plan

This plan maps the final checklist to Playwright suites under `testing/frontend/tests/**`.

## Setup & Helpers
- `playwright.config.ts`: baseURL, storageState fixtures (guest/bidder/seller/admin), globalSetup seeding baseline data (20+ products, 4-5 categories, >=5 bids/product, auto-bid settings, >=4 images/product). Use dynamic timestamps (ending soon <3 days, new within N minutes) and seed one new vs one old product for badge checks.
- Helpers in `tests/utils/`: API seeding, OTP/email capture, role logins.

## Guest & Navigation (Checklist 1.1-1.5)
- `guest-navigation.spec.ts`: verify 2-level menu rendering and category click-through.
- `home-sections.spec.ts`: Top 5 ending soon, most bid, highest price.
- `category-list.spec.ts`: category filter, pagination, and product card fields (thumb, title, price, buy-now, bidder, posted time, end time/countdown, bid count).
- `search.spec.ts`: full-text search by name/category, pagination, sorting (end time desc, price asc), "new within N minutes" badge (only the new product is highlighted).
- `product-detail.spec.ts`: gallery (1 main + >=3 thumbs), meta (seller + rating, highest bidder + rating, buy-now/current price, posted time, end times with relative <3 days), description, Q&A history, related products; after auction, non-winner/guest sees "Sản phẩm đã kết thúc".

## Auth & Registration (Checklist 1.6, 5.1-5.4)
- `auth.spec.ts`: register with CAPTCHA stub; required fields (họ tên, địa chỉ, email); unique email check; OTP email verify; login success/failure; forgot/reset password via OTP; change password (hash implied).

## Bidder Flows (Checklist 2.x)
- `watchlist.spec.ts`: add/remove from list and detail pages.
- `bidding.spec.ts`: rating >=80% or seller exception, min bid = current + step, confirmation modal, auto-extend window, bid history order + masked names.
- `questions.spec.ts`: submit question, seller notification email link.
- `profile-bidder.spec.ts`: edit name/email/password (complexity) and date of birth; view ratings history, watchlist, active bids, wins; leave ratings (+1/-1 with note).
- `upgrade.spec.ts`: submit seller upgrade request, 7-day expiry handling.

## Seller Flows (Checklist 3.x)
- `create-product.spec.ts`: create product (title, >=3 images, start price, step, optional buy-now, rich-text description, auto-extend toggle).
- `append-description.spec.ts`: append-only description with timestamp formatting.
- `block-bidder.spec.ts`: block bidder on active product and reassign highest bidder to second place.
- `seller-qa.spec.ts`: reply in detail page thread and email bidders involved.
- `seller-dashboard.spec.ts`: list active/ended products, rate buyer, cancel deal -> auto -1 to winner.

## Admin Flows (Checklist 4.x)
- `admin-categories.spec.ts`: CRUD categories; prevent delete when products exist.
- `admin-products.spec.ts`: remove products.
- `admin-users.spec.ts`: CRUD users; list and approve bidder->seller requests.
- `admin-settings.spec.ts`: edit auto-extend config (>=5 min remaining -> +10 min) and verify in bid scenario.

## Auto-Bid & Notifications (Checklist 6.x)
- `auto-bid.spec.ts`: register auto-bids, incremental bidding to beat competitors, tie-breaker favors earlier bidder, current bidder/price updates, event logs.
- `notifications.spec.ts`: emails for bid success (seller + current + previous bidder), bidder blocked, auction ends (with/without winner), question asked/answered.

## Post-Auction Orders (Checklist 7.x)
- `order-flow.spec.ts`: winner/seller redirected to 4-step flow: buyer payment/shipping, seller payment confirm + tracking, buyer receipt confirm, ratings that can be updated/edited; seller cancel anytime -> auto -1 to winner; private chat thread; third-party/non-winner sees "Sản phẩm đã kết thúc" and no payment flow.

## Data & Infra Checks (Checklist 0, 8.x)
- `seed-data.spec.ts`: assert counts via API (20+ products, 4-5 categories, >=5 bids/product, >=4 images/product). Git history/upload is manual outside Playwright.
