## 🚀 Tổng quan Tech Stack

* **Backend (BE):** Node.js + Express.js (RESTful API).
* **Frontend (FE):** ReactJS (SPA, gọi API) **+ Bootstrap (React-Bootstrap hoặc bootstrap thuần qua CDN)**.
* **Database (DBA):** PostgreSQL (Dữ liệu, FTS, Migration Tool).
* **Quản lý:** Git (Bắt buộc).

---

## 📊 Kế hoạch chi tiết theo tuần

### Tuần 1: Nền tảng & Thiết kế (Foundation & Design)

* **Mục tiêu:** Xây dựng "móng nhà" vững chắc. Chốt toàn bộ CSDL, quy tắc, biến môi trường. **Chuẩn bị sẵn cấu trúc cho đấu giá tự động.**
* **Vai trò:**
  * **Database (DBA):**
    * **Nhiệm vụ chính:** Thiết kế Sơ đồ Quan hệ Thực thể (ERD) chi tiết.
    * Chọn và cài đặt Migration Tool (ví dụ: `Knex.js` hoặc `Prisma Migrate`).
    * **Định nghĩa CSDL (Schema):**
      * **Quy ước:** `snake_case` cho tên cột, `TIMESTAMPTZ` cho thời gian, `INTEGER` hoặc `BIGINT` cho giá (lưu VND, không dùng `float`).
      * **Bảng `settings` (QUAN TRỌNG):** Tạo bảng cấu hình (ví dụ: `key: 'extend_window_min'`, `value: '5'`; `key: 'extend_amount_min'`, `value: '10'`; `key: 'highlight_new_minutes'`, `value: '60'`; **thêm** `key: 'auto_bid_step_mode'` (ví dụ: `STRICT` hoặc `MULTIPLIER` để FE hiển thị đúng)).
      * **Bảng `users`:** `role` (ADMIN, SELLER, BIDDER), `password` (bcrypt), `user_otps` (bảng riêng hoặc cột JSONB).
      * **Bảng `categories`:** 2 cấp (`parent_id`).
      * **Bảng `products`:**
        * `seller_id`, `category_id`
        * `current_bidder_id` (nullable)
        * `bid_count` (default 0)
        * `buy_now_price` (nullable)
        * `auto_extend` (boolean)
        * `status` ('ACTIVE', 'ENDED', 'REMOVED' - cho soft delete)
        * **`current_price`/`current_bid_price`**: để cập nhật liên tục khi có auto-bid.
      * **Bảng `product_images`:** (Tối thiểu 3 ảnh).
      * **Bảng `bids`:** `user_id`, `product_id`, `price`, `created_at`. Tạo `INDEX` trên `(product_id, created_at DESC)`.
      * **Bảng `watchlist`:** `user_id`, `product_id`.
      * **Bảng `questions` & `answers`:** (Liên kết với `products` và `users`).
      * **Bảng `seller_requests`:** `user_id`, `status` ('PENDING', 'APPROVED', 'REJECTED'), `requested_at`, `expire_at` (cho yêu cầu 7 ngày).
      * **Bảng `orders`:** (Tạo khi đấu giá kết thúc/mua ngay), `product_id`, `seller_id`, `winner_id`, `final_price`, `status` (4 bước).
      * **Bảng `order_messages`:** (Cho chat sau đấu giá).
      * **Bảng `ratings`:** `order_id`, `rater_id`, `rated_user_id`, `score` (+1/-1), `comment`. **QUAN TRỌNG:** Thêm `UNIQUE constraint` trên `(order_id, rater_id)` để cho phép `UPDATE`.
      * **Bảng MỚI cho đấu giá tự động** (phục vụ yêu cầu 6.2):
        * **`auto_bids`**:
          * `id` PK
          * `product_id` FK → `products`
          * `user_id` FK → `users`
          * `max_bid_amount` BIGINT (giá-tối-đa mà bidder sẵn sàng trả)
          * `created_at`, `updated_at`
          * **UNIQUE (`product_id`, `user_id`)** để 1 người chỉ có 1 cấu hình auto-bid cho 1 sản phẩm
        * (Tùy chọn) **`auto_bid_events`** để log lại việc hệ thống tự nhảy giá (hỗ trợ audit/Admin).
      * **Lý do làm ở tuần 1:** Cơ chế auto-bid phải biết trước cấu trúc bảng để tuần 5 chỉ cần code logic Transaction, không sửa DB.
  * **Backend (BE):**
    * Setup project Node.js/Express, tích hợp Migration Tool (Knex/Prisma).
    * Cài đặt thư viện: `pg`, `bcrypt`, `passport`, `passport-jwt`, `cors`, `dotenv`, `joi` (hoặc `yup` để validate input).
    * Viết file `.env.example` liệt kê TẤT CẢ các key: `DB_...`, `JWT_SECRET`, `RECAPTCHA_SECRET_KEY`, `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS`, `FRONTEND_URL`.
    * Định nghĩa chuẩn API response (lỗi 400, 401, 403, 404, 422, 500).
    * Tạo Middleware cơ bản: `checkAuth` (JWT) và `checkRole` ('ADMIN', 'SELLER', 'BIDDER').
    * Viết helper (sẽ dùng sau): `maskBidderName(name)`, `aggregateRating(userId)`, **và chuẩn bị interface `recalcAutoBid(productId)` (chưa code, chỉ định nghĩa để tuần 5 gọi).**
  * **Frontend (FE):**
    * Setup project React (Vite) + **Bootstrap** (cài `bootstrap` và import trong `main.jsx`), `react-router-dom`, `axios`.
    * Tạo `.env` với `VITE_API_URL`, `VITE_RECAPTCHA_SITE_KEY`.
    * Thiết kế cấu trúc thư mục (components, pages, services, contexts).
    * Định nghĩa chuẩn format (timezone `Asia/Ho_Chi_Minh`, format tiền tệ VNĐ).
  * **Chung (Cả nhóm):**
    * Tạo Repository GitHub, setup branch (`main`, `develop`).

---

### Tuần 2: Xác thực & Hiển thị cơ bản (Auth & Basic View)

* **Mục tiêu:** Người dùng có thể đăng ký (với reCaptcha), đăng nhập. Guest xem danh mục, sản phẩm (đã filter soft-delete).
* **Vai trò:**
  * **DBA:**
    * Chạy migration để tạo CSDL từ thiết kế Tuần 1.
  * **Backend (BE):**
    * Xây dựng API endpoints:
      * `POST /api/auth/register`: Thêm logic kiểm tra **reCaptcha** (nhận token từ FE, gọi API Google).
      * `POST /api/auth/login`: Trả về JWT Token.
      * `POST /api/auth/forgot-password`: Tạo OTP/token, lưu vào `user_otps`, *tạm thời chưa gửi email*.
      * `GET /api/categories`: Lấy danh mục 2 cấp.
      * `GET /api/products`: Lấy DS SP theo Danh mục (có phân trang). **Luôn `WHERE status = 'ACTIVE'`**. Có tham số `sort` (`end_at,desc`, `price,asc`).
    * **Lưu ý:** Chưa bật auto-bid ở tuần này, chỉ mới có list sản phẩm.
  * **Frontend (FE):**
    * Xây dựng các trang (Pages): `Register`, `Login`, `ForgotPassword` bằng **React + Bootstrap** (Form, Alert, Button).
    * Xây dựng Layout chung (Navbar, Footer) bằng Bootstrap.
    * Tích hợp API để `Navbar` hiển thị danh mục.
    * Xây dựng trang `ProductListPage`: Gọi API, hiển thị DS sản phẩm, UI phân trang, UI sắp xếp.

---

### Tuần 3: Hoàn thiện "Xem" & Trang chủ (Complete View & Homepage)

* **Mục tiêu:** Hoàn thiện 100% trải nghiệm "Xem" của Guest.
* **Vai trò:**
  * **DBA:**
    * Viết các câu query phức tạp cho Trang chủ (Top 5 giá cao, sắp hết hạn, nhiều lượt bid).
    * Tối ưu (tạo `INDEX`) cho các query này.
  * **Backend (BE):**
    * Xây dựng API `GET /api/homepage`: Sử dụng các query của DBA.
    * Hoàn thiện API `GET /api/products/:id`:
      * Thông tin SP
      * Người bán & Người giữ giá (kèm điểm đánh giá tổng hợp)
      * Lịch sử Hỏi/Đáp
      * 5 sản phẩm khác cùng chuyên mục
      * **(Chuẩn bị cho tuần 5)**: trả về cờ `auto_bid_enabled: true` nếu SP cho phép auto-bid (lấy từ bảng `settings` hoặc cờ trong `products`).
    * Cập nhật API `GET /api/products`:
      * Đọc `highlight_new_minutes` từ bảng `settings`.
      * Nếu `created_at` < `N phút` ➔ Trả về `is_new: true`.
    * Xây dựng API `GET /api/products/:id/bids`: Trả về lịch sử đấu giá (mask tên bidder).
  * **Frontend (FE):**
    * Xây dựng trang `HomePage` và tích hợp API.
    * Hoàn thiện trang `ProductDetailPage`:
      * Hiển thị ảnh, mô tả, người bán, đấu giá gần nhất, Hỏi/Đáp
      * Hiển thị “5 sản phẩm cùng chuyên mục”
      * **Hiển thị trước UI đấu giá (Manual)**: nút “Đấu giá” nhưng tuần 5 mới gọi API thật.
      * **Hiển thị nhãn “Hỗ trợ đấu giá tự động”** nếu API báo true.
    * Cập nhật component `ProductCard`: Hiển thị "badge" nếu `is_new: true`.

---

### Tuần 4: Seller - Đăng sản phẩm & Profile (Seller - Post Product & Profile)

* **Mục tiêu:** Seller có thể đăng sản phẩm (với `buy_now`, `auto_extend`) và Bidder có thể xin làm Seller (có hạn 7 ngày).
* **Vai trò:**
  * **DBA:**
    * Đảm bảo bảng `product_images` và `seller_requests` hoạt động.
  * **Backend (BE):**
    * API Upload ảnh (multer).
    * API Đăng sản phẩm `POST /api/products` (yêu cầu JWT, role `SELLER`):
      * Tối thiểu 3 ảnh
      * Giá khởi điểm, bước giá
      * `buy_now_price` (nullable)
      * `auto_extend` (boolean)
      * **Cờ cho auto-bid**: có thể cho phép bật/tắt tự động đấu giá trên từng sản phẩm (`enable_auto_bid = true/false`), để tuần 5 logic đọc được.
    * API `POST /api/seller/request-upgrade`: tạo record trong `seller_requests`, `expire_at = now() + 7 days`.
    * API xem/cập nhật Profile (`GET/PUT /api/profile`).
  * **Frontend (FE):**
    * Trang `ProfilePage`: hiển thị thông tin, nút "Xin làm Seller" (ẩn/hiện theo trạng thái).
    * Form `CreateProductPage`:
      * Dùng Bootstrap Form
      * Upload nhiều ảnh
      * “Giá mua ngay”
      * Checkbox “Tự động gia hạn”
      * **Checkbox “Cho phép đấu giá tự động”** để set cờ ở sản phẩm.

---

### Tuần 5: Logic Cốt lõi - Đấu giá & Mua ngay & ĐẤU GIÁ TỰ ĐỘNG (Core Logic - Bidding, Buy Now, Auto-Bid)

* **Mục tiêu:** Hoàn thiện cả 2 cơ chế:
  1. Đấu giá thủ công (manual bidding) như ban đầu.
  2. **Đấu giá tự động (auto-bid) theo yêu cầu mới 6.2**.
* **Vai trò:**
  * **DBA:**
    * Viết/Tối ưu **Transaction** cho:
      * “Ra giá thủ công”
      * **“Đăng ký auto-bid”** (insert/update vào bảng `auto_bids`)
      * **“Recalculate auto-bid khi có bid mới”** (có thể hiện thực bằng hàm SQL hoặc để BE làm)
  * **Backend (BE):**
    * **API 1 – Manual bid vẫn giữ nguyên ý tưởng cũ**  
      * `POST /api/products/:id/bid`
      * Kiểm tra điểm 80%, kiểm tra bước giá, cập nhật `products`, chèn `bids`, auto-extend.
    * **API 2 – Đăng ký đấu giá tự động (MỚI)**  
      * `POST /api/products/:id/auto-bid`
      * Body: `{ max_bid_amount: 11700000 }`
      * Logic:
        1. Kiểm tra sản phẩm còn `status = 'ACTIVE'`
        2. Upsert vào `auto_bids` (nếu người đó đã đăng ký thì cập nhật `max_bid_amount`)
        3. Gọi hàm nội bộ `recalcAutoBid(productId)` để tính lại người đang giữ giá
    * **Hàm nội bộ – `recalcAutoBid(productId)` (QUAN TRỌNG):**
      * Lấy tất cả auto-bid của sản phẩm, sắp xếp theo:
        1. `max_bid_amount` DESC
        2. `created_at` ASC (để thỏa rule: “Nếu 2 bidder ra cùng mức giá, bidder ra giá trước được ghi nhận là người-ra-giá-cao-nhất”)
      * Lấy 2 người đứng đầu danh sách auto-bid:
        * Nếu chỉ có 1 người: giá vào sản phẩm = giá khởi điểm (hoặc current_price hiện tại nếu đã có)
        * Nếu có 2 người:
          * Người đứng đầu: được giữ giá
          * Giá vào sản phẩm = **giá-vừa-đủ-thắng** (bằng `min(max_bid_head, max_bid_second + step_price)`)
      * Cập nhật:
        * `products.current_bidder_id = user_id_của_người_thắng`
        * `products.current_price = giá_vừa_đủ_thắng`
        * Tăng `products.bid_count`
      * Ghi lại bảng `bids`/`auto_bid_events` để hiển thị lịch sử
    * **API 3 – Buy now**  
      * `POST /api/products/:id/buy-now`
      * Giống bản cũ.
    * **Lưu ý về logic giống ví dụ bạn đưa:**
      * Người mua nhập “giá-tối-đa”
      * Hệ thống sẽ liên tục so giá để đưa “giá-vừa-đủ-thắng”
      * Nếu 2 người cùng mức giá, người đặt trước thắng
      * Đây chính là thứ đã mô tả ở trên trong `recalcAutoBid(...)`
  * **Frontend (FE):**
    * Trên `ProductDetailPage`:
      * Giữ nút “Đấu giá” (manual) như kế hoạch gốc.
      * **Thêm form/nút “Đấu giá tự động”**:
        * Input số (định dạng VNĐ, bội số 100k nếu SP quy định)
        * Nút “Đăng ký auto-bid”
        * Khi đăng ký xong thì reload lại dữ liệu sản phẩm để thấy mình đang là người giữ giá
      * UI hiển thị lịch sử đấu giá vẫn giống trước, chỉ khác là sẽ có dòng “(auto-bid)” nếu bản ghi sinh từ hệ thống.
    * Vì FE dùng **React + Bootstrap**, UI có thể làm rất nhanh: Modal Bootstrap cho Manual Bid, 1 Card riêng cho Auto-Bid.

---

### Tuần 6: Admin & Quản lý Nâng cao (Admin & Advanced Management)

* **Mục tiêu:** Admin quản lý hệ thống. Hoàn thiện tính năng nâng cao cho Seller/Bidder. **Thêm phần giám sát auto-bid.**
* **Vai trò:**
  * **DBA:**
    * Viết query logic "tìm người ra giá cao thứ nhì" (cho tính năng "Từ chối Bidder") – có thể tái dùng trong auto-bid.
  * **Backend (BE):**
    * API Admin (bảo vệ bằng `checkRole('ADMIN')`):
      * CRUD Danh mục (không xóa khi có SP - dùng `ON DELETE RESTRICT`).
      * `DELETE /api/admin/products/:id`: Soft delete.
      * `GET /api/admin/users`, `GET /api/admin/seller-requests`, `POST /api/admin/approve-seller/:userId`.
      * **MỚI:** `GET /api/admin/products/:id/auto-bids` để xem danh sách auto-bid của SP nếu cần kiểm tra khi demo.
    * API cho Seller:
      * `PUT /api/products/:id/description`: Append-only.
      * `POST /api/products/:id/reject-bidder`: nếu bidder bị từ chối đang giữ giá thì tìm người cao thứ nhì → cập nhật lại sản phẩm; **logic này dùng lại được với bảng `bids` do auto-bid sinh ra.**
    * API cho Bidder:
      * `POST /api/products/:id/ask`
      * `POST /api/watchlist/:id`
      * `GET /api/profile/watchlist`, `GET /api/profile/bidding`, `GET /api/profile/won`
  * **Frontend (FE):**
    * Admin Dashboard bằng React + Bootstrap (Table, Pagination).
    * Trên Profile: thêm tab “DS Đang đấu giá”, “DS Đã thắng”.
    * Trên Product Detail: nút “Thêm vào Watchlist”, form hỏi đáp.
    * Nếu là Seller → hiển thị các nút nâng cao (“Bổ sung mô tả”, “Từ chối Bidder”).

---

### Tuần 7: Hệ thống & Hoàn tất Luồng (Systems & Flow Completion)

* **Mục tiêu:** Hoàn tất FTS, Mailing, Quên mật khẩu, và Quy trình sau đấu giá.
* **Vai trò:**
  * **DBA:**
    * Cấu hình **Full-Text Search (FTS)** trên PostgreSQL (cho cột `product_name`).
  * **Backend (BE):**
    * **Mailing System:** Tích hợp `Nodemailer` + `SendGrid`.
      * Chèn logic gửi mail vào: đăng ký, ra giá (cả manual và auto-bid – gửi cho bidder bị vượt), kết thúc đấu giá, hỏi/đáp.
    * API `GET /api/search`: dùng FTS.
    * API `POST /api/auth/reset-password`.
    * Login Google/Facebook (tùy thời gian).
    * API cho Quy trình sau đấu giá:
      * 4 bước
      * Chat
      * `POST /api/orders/:id/rate` (cho phép update)
      * `POST /api/orders/:id/cancel`
  * **Frontend (FE):**
    * Thanh Tìm kiếm + trang kết quả.
    * Trang `ResetPasswordPage`.
    * Trang “Hoàn tất đơn hàng”: UI 4 bước, Chat, Đánh giá.
    * Nút “Hủy giao dịch” cho Seller.

---

### Tuần 8: Sửa lỗi, Seeding & Buffer (Testing, Seeding & Buffer)

* **Mục tiêu:** Ứng dụng chạy ổn định, không lỗi, có đủ dữ liệu mẫu, sẵn sàng demo.
* **Vai trò:**
  * **DBA:**
    * Viết script Seeding:
      * 20 sản phẩm
      * 4-5 danh mục
      * **Sinh cả dữ liệu auto-bid mẫu**: 1 SP có 3-4 auto-bid để khi demo thấy được “giá-vừa-đủ-thắng”.
    * Rà soát lại toàn bộ CSDL, thêm INDEX ở bất cứ đâu còn thiếu.
  * **Backend (BE):**
    * Test API (Postman/Insomnia) và sửa lỗi.
    * Test kỹ nhất: endpoint manual bid + auto-bid chồng lên nhau + auto-extend.
    * Kiểm tra bảo mật (JWT, check role).
  * **Frontend (FE):**
    * Sửa lỗi UI (Bootstrap), responsive.
  * **Chung (Cả nhóm):**
    * Test chéo
    * Dùng app như người thật (đăng sản phẩm → auto-bid → đấu tay → thắng → chat → đánh giá)
    * Chuẩn bị slide, video, demo.