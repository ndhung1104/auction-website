Unfinished Tasks
- Add seed data: >=20 products, 4-5 categories, each product with >=5 bids;
- Full-text search: ensure migration 20251114150000_add_product_search_vector is applied in all environments; extend search to support category filter, sorting, and highlight "new" products per checklist.
- Product list/detail UX: show posted date and relative end time (<3 days); add bid confirmation prompt; enable watchlist action from product listings.
- Auto-extend/bid logic: implement +10 minutes extension when bids land in the last 5 minutes (currently +5); ensure applies to relevant bid types.
- Notifications: send answer notifications to all relevant bidders/watchers when applicable; handle auction-end emails for no-winner and winner cases.
- Admin safeguards: prevent deleting categories with products; add missing user CRUD operations beyond role/status updates.
- Post-auction flow: build 4-step payment/shipping UI and automatic redirect for participants after auction end; surface "auction ended" state to non-participants.
- Modify the footer with real category / link
