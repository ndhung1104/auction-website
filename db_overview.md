# Database Overview & Query Map

## Schema Highlights (from migrations)
- **users**: PK id; unique email; indexes on status, role.
- **categories**: PK id; unique name; index parent_id (2-level hierarchy).
- **settings**: key/value config.
- **products**: FK seller_id, category_id; fields for start_price, price_step, current_price, buy_now_price, auto_extend, enable_auto_bid, allow_unrated_bidders, current_bidder_id, bid_count, highlight_until, status, start_at, end_at. Indexes on seller_id, category_id, status, start_at, end_at, current_bidder_id; slug unique.
- **product_images**: FK product_id; index product_id.
- **bids**: FK product_id, user_id; bid_amount, is_auto_bid; index (product_id, created_at), (user_id, created_at).
- **auto_bids**: FK product_id, user_id; unique (product_id, user_id); indexes product_id, user_id.
- **auto_bid_events**: FK product_id, auto_bid_id, bid_id; event_type; index (product_id, triggered_at), auto_bid_id, bid_id.
- **watchlist**: FK user_id, product_id; unique (user_id, product_id); indexes user_id, product_id.
- **questions/answers**: questions index (product_id, created_at), (user_id, created_at); answers FK question_id.
- **seller_requests, orders, order_messages, ratings, product_description_history, bid_blacklist**: FKs to products/users; appropriate indexes per migration; refresh_tokens table added; order workflow enhancements.

## Service Query Map & Complexity

### product.service.js
- `listProducts`: countActiveProducts + findActiveProducts filtered by category/status=ACTIVE, sort (end_at/price/bid_count/created_at), limit/offset; primary image lookup separately. Complexity: count O(N_filtered); list O(k) with indexed scan.
  - SQL (count): `SELECT COUNT(*) FROM products WHERE status='ACTIVE' AND (:categoryId IS NULL OR category_id=:categoryId);`
  - SQL (list): `SELECT * FROM products WHERE status='ACTIVE' AND (:categoryId IS NULL OR category_id=:categoryId) ORDER BY <sort> LIMIT :limit OFFSET :offset;`
  - SQL (primary images): `SELECT product_id, MIN(image_url) FILTER (ORDER BY display_order) AS image_url FROM product_images WHERE product_id IN (...) GROUP BY product_id;`
- `getProductDetail`: fetch product with seller/current_bidder; product_images; recent questions; answers by questionIds; related products; ratings for seller/keeper; watchlist count; order lookup. Complexity: O(k) per list; PK/index lookups O(1).
  - SQL (product): `SELECT p.*, seller.full_name AS seller_full_name, seller.email AS seller_email, bidder.full_name AS current_bidder_full_name FROM products p LEFT JOIN users seller ON seller.id=p.seller_id LEFT JOIN users bidder ON bidder.id=p.current_bidder_id WHERE p.id=:id;`
  - SQL (images): `SELECT * FROM product_images WHERE product_id=:id ORDER BY display_order;`
  - SQL (questions): `SELECT q.*, asker.full_name FROM questions q LEFT JOIN users asker ON asker.id=q.user_id WHERE q.product_id=:id ORDER BY q.created_at DESC LIMIT 10;`
  - SQL (answers): `SELECT * FROM answers WHERE question_id IN (:questionIds);`
  - SQL (related): `SELECT * FROM products WHERE category_id=:catId AND id<>:id ORDER BY created_at DESC LIMIT 5;`
  - SQL (ratings): `SELECT SUM(positive) , SUM(negative) FROM ratings WHERE user_id=:uid;`
  - SQL (watchlist count): `SELECT COUNT(*) FROM watchlist WHERE product_id=:id;`
  - SQL (order): `SELECT * FROM orders WHERE product_id=:id LIMIT 1;`
- `placeManualBid`: SELECT product FOR UPDATE; eligibility checks; INSERT bid; UPDATE product; optional `recalcAutoBid` (sort auto_bids); fetch seller/bidder/previousBidder; notify. Complexity: O(1) per bid; recalc O(A log A) for auto-bids on product.
  - SQL: `SELECT * FROM products WHERE id=:id FOR UPDATE;` then `INSERT INTO bids (product_id,user_id,bid_amount,is_auto_bid) VALUES (...) RETURNING *;` then `UPDATE products SET current_price=:bid, current_bidder_id=:uid, bid_count=bid_count+1, end_at=:extended WHERE id=:id RETURNING *;`
- `registerAutoBid`: upsert auto_bids (unique); recalcAutoBid. Complexity: O(1) upsert; O(A log A) recalc.
  - SQL: `INSERT INTO auto_bids (product_id,user_id,max_bid_amount) VALUES (...) ON CONFLICT (product_id,user_id) DO UPDATE SET max_bid_amount=EXCLUDED.max_bid_amount RETURNING *;`
- `buyNowProduct`: UPDATE product to ENDED, insert bid, delete auto_bids for product, ensureOrderForProduct, notifications. Complexity: delete O(A); others O(1).
  - SQL: `INSERT INTO bids (...) VALUES (...) RETURNING *;` `DELETE FROM auto_bids WHERE product_id=:id;` `UPDATE products SET status='ENDED', current_price=:price, current_bidder_id=:uid, bid_count=bid_count+1, enable_auto_bid=false, end_at=NOW() WHERE id=:id RETURNING *;`
- `finalizeEndedAuctions`: scan expired ACTIVE products; per item update status/disable auto_bid; ensureOrderForProduct if winner else seller notification. Complexity: O(E) items; per-item O(A) if auto-bids.
  - SQL: `SELECT * FROM products WHERE status='ACTIVE' AND end_at<=NOW();` then per row `UPDATE products SET status='ENDED', enable_auto_bid=false, end_at=NOW() WHERE id=:id RETURNING *;`
- `appendProductDescription`: insert history + update product. O(1).
  - SQL: `INSERT INTO product_description_history (product_id, content_added) VALUES (:pid,:content); UPDATE products SET updated_at=NOW() WHERE id=:pid;`
- `rejectBidder`: add to bid_blacklist; delete bids/auto_bids by user; recompute top bid (findTopBids limit 1), bid_count; update product; recalcAutoBid; notify rejected user. Complexity: O(Bu + Au) deletes; recalc O(A log A).
  - SQL: `INSERT INTO bid_blacklist (product_id,user_id,reason) VALUES (...); DELETE FROM bids WHERE product_id=:pid AND user_id=:uid; DELETE FROM auto_bids WHERE product_id=:pid AND user_id=:uid; SELECT * FROM bids WHERE product_id=:pid ORDER BY bid_amount DESC, created_at ASC LIMIT 1; UPDATE products SET current_price=:..., current_bidder_id=:..., bid_count=:... WHERE id=:pid RETURNING *;`
- `getProductBidHistory`: fetch bids by product with limit, uses index (product_id, created_at). O(k).
  - SQL: `SELECT b.*, u.full_name AS bidder_full_name FROM bids b LEFT JOIN users u ON u.id=b.user_id WHERE product_id=:pid ORDER BY created_at DESC LIMIT :limit;`
- `createProductListing`: insert product + images. O(1) per insert.
  - SQL: `INSERT INTO products (...) VALUES (...) RETURNING *; INSERT INTO product_images (...) VALUES (...);`

### autoBid.service.js
- `recalcAutoBid`: load auto_bids for product ordered by max_bid_amount desc/created_at asc; compute winning bid; insert events/bids; update product. Complexity: O(A log A) sort; inserts O(1)-O(A).
  - SQL: `SELECT * FROM auto_bids WHERE product_id=:pid ORDER BY max_bid_amount DESC, created_at ASC;` followed by conditional `INSERT INTO bids (...)`, `INSERT INTO auto_bid_events (...)`, `UPDATE products SET current_price=:..., current_bidder_id=:..., bid_count=bid_count+1 WHERE id=:pid RETURNING *;`

### question.service.js
- `askQuestion`: fetch product with seller; insert question; async sendQuestionNotification. O(1).
  - SQL: `SELECT p.*, seller.email AS seller_email FROM products p LEFT JOIN users seller ON seller.id=p.seller_id WHERE p.id=:pid; INSERT INTO questions (product_id,user_id,question_text) VALUES (:pid,:uid,:text) RETURNING *;`
- `answerQuestion`: fetch question; fetch product with seller; check existing answer; insert answer; fetch asker + distinct bidder emails; async sendAnswerNotification. Complexity: O(B) for distinct bidder emails; others O(1).
  - SQL: `SELECT * FROM questions WHERE id=:qid; SELECT p.*, seller.email FROM products p LEFT JOIN users seller ON seller.id=p.seller_id WHERE p.id=:pid; SELECT * FROM answers WHERE question_id=:qid; INSERT INTO answers (question_id,user_id,answer_text) VALUES (...) RETURNING *; SELECT DISTINCT u.email FROM bids b LEFT JOIN users u ON u.id=b.user_id WHERE b.product_id=:pid;`

### order.service.js
- `ensureOrderForProduct`: insert/update order + messages; fetch product; sendAuctionResultNotification/OrderNotification. O(1).
  - SQL: `INSERT INTO orders (...) VALUES (...) ON CONFLICT (product_id) DO UPDATE SET ... RETURNING *; INSERT INTO order_messages (...) VALUES (...);`
- `getOrdersByUser` / `getOrderDetail`: joins orders/products/users/messages filtered by seller/bidder; pagination. O(k) with indexes on orders/product_id/user_id.
  - SQL (list): `SELECT o.*, p.name, p.seller_id, p.current_bidder_id FROM orders o JOIN products p ON p.id=o.product_id WHERE p.seller_id=:uid OR o.winner_id=:uid ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset;`
  - SQL (detail): `SELECT o.*, p.* FROM orders o JOIN products p ON p.id=o.product_id WHERE o.id=:id AND (p.seller_id=:uid OR o.winner_id=:uid); SELECT * FROM order_messages WHERE order_id=:id ORDER BY created_at ASC;`

### watchlist.service.js
- Add/remove watchlist (unique constraint); list/watchlisted product ids. O(1) per op; list O(k) with product_id index.
  - SQL: `INSERT INTO watchlist (user_id,product_id) VALUES (...) ON CONFLICT DO NOTHING; DELETE FROM watchlist WHERE user_id=:uid AND product_id=:pid; SELECT product_id FROM watchlist WHERE user_id=:uid;`

### search/homepage (controllers)
- `searchProducts`: paginated, sorted search (end_at, price, bid_count, created_at), uses search/homepage indexes. Complexity: O(k) with indexes; count O(N_filtered).
  - SQL (typical): `SELECT * FROM products WHERE status='ACTIVE' AND (name ILIKE :term OR search_vector @@ to_tsquery(:ts)) AND (:categoryId IS NULL OR category_id=:categoryId) ORDER BY <sort> LIMIT :limit OFFSET :offset; SELECT COUNT(*) ...` (per migrations adding search vector).
- `fetchHomepageSections`: pulls top price/ending soon/most bid with limits; O(k) with indexes on price/end_at/bid_count.
  - SQL: `SELECT * FROM products WHERE status='ACTIVE' ORDER BY current_price DESC LIMIT 5;` `SELECT * FROM products WHERE status='ACTIVE' ORDER BY end_at ASC LIMIT 5;` `SELECT * FROM products WHERE status='ACTIVE' ORDER BY bid_count DESC LIMIT 5;`

### admin.service.js
- User deletion cascades: deletes bids/auto_bids/watchlist/etc. Complexity proportional to related rows. Updates products to disable auto_bid on user removal.
  - SQL (examples): `DELETE FROM bids WHERE user_id=:id; DELETE FROM auto_bids WHERE user_id=:id; UPDATE products SET enable_auto_bid=false WHERE seller_id=:id;`

### testing.service.js (seed)
- TRUNCATE tables; insert users/categories/products/bids/images. Complexity linear in inserted rows.
  - SQL: `TRUNCATE ... RESTART IDENTITY CASCADE; INSERT INTO users ...; INSERT INTO categories ...; INSERT INTO products ...; INSERT INTO product_images ...; INSERT INTO bids ...;`

## Mail Sending (async)
- Questions: askQuestion/answerQuestion fire-and-forget notifications.
- Other routes still synchronous for mail (bid, buy-now, reject, order finalizers); consider wrapping sends in async if needed for latency.
