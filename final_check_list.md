# ✅ CHECKLIST – Online Auction Final Project

## 0. Tổng quan dự án
- [ ] Sử dụng đúng technical stack (SSR hoặc CSR hoặc hybrid)
- [ ] Cấu trúc thư mục rõ ràng (backend, frontend nếu CSR)
- [ ] Upload source lên **GitHub từ đầu** (có lịch sử commit)
- [ ] Tạo seed data >= 20 sản phẩm, 4–5 danh mục, mỗi sp có ≥5 lượt bid

---

# 1. Phân hệ Guest (Nặc danh)

## 1.1 Menu
- [ ] Hiển thị danh mục 2 cấp
- [ ] Click category để chuyển sang trang danh sách sản phẩm

## 1.2 Trang chủ
- [ ] Top 5 gần kết thúc
- [ ] Top 5 có nhiều lượt ra giá nhất
- [ ] Top 5 giá cao nhất

## 1.3 Danh sách sản phẩm theo category
- [ ] Hiển thị đúng theo danh mục
- [ ] Phân trang đầy đủ

## 1.4 Tìm kiếm sản phẩm (Full-text search)
- [ ] Tìm theo tên
- [ ] Tìm theo category
- [ ] Phân trang kết quả
- [ ] Sắp xếp theo:
  - [ ] Thời gian kết thúc giảm dần
  - [ ] Giá tăng dần
- [ ] Làm nổi bật sản phẩm mới đăng (N phút)

### Thông tin sản phẩm trong danh sách
- [ ] Ảnh đại diện
- [ ] Tên sản phẩm
- [ ] Giá hiện tại
- [ ] Người đang đặt giá cao nhất
- [ ] Giá mua ngay
- [ ] Ngày đăng
- [ ] Thời gian còn lại
- [ ] Số lượt ra giá

## 1.5 Xem chi tiết sản phẩm
- [ ] 1 ảnh đại diện lớn
- [ ] >=3 ảnh phụ
- [ ] Tên sản phẩm
- [ ] Giá hiện tại
- [ ] Giá mua ngay
- [ ] Thông tin người bán + điểm đánh giá
- [ ] Thông tin bidder cao nhất + điểm đánh giá
- [ ] Thời điểm đăng
- [ ] Thời điểm kết thúc (relative nếu <3 ngày)
- [ ] Mô tả chi tiết
- [ ] Lịch sử hỏi–đáp
- [ ] 5 sản phẩm cùng chuyên mục

## 1.6 Đăng ký tài khoản
- [ ] reCaptcha
- [ ] Hash mật khẩu bằng bcrypt/scrypt
- [ ] Nhập:
  - [ ] Họ tên
  - [ ] Địa chỉ
  - [ ] Email (unique)
- [ ] Email OTP xác nhận tài khoản

---

# 2. Phân hệ Bidder

## 2.1 Watch List
- [ ] Thêm sản phẩm vào wishlist tại trang danh sách
- [ ] Thêm tại trang chi tiết sản phẩm

## 2.2 Ra giá
- [ ] Kiểm tra điểm đánh giá >= 80%
- [ ] Trường hợp chưa có đánh giá → kiểm tra seller cho phép?
- [ ] Gợi ý giá hợp lệ = giá hiện tại + bước giá
- [ ] Yêu cầu xác nhận khi ra giá

## 2.3 Xem lịch sử đấu giá
- [ ] Mask tên người mua
- [ ] Sắp xếp theo thời gian

## 2.4 Hỏi người bán
- [ ] Form gửi câu hỏi trên trang chi tiết
- [ ] Email notify seller có link trả lời nhanh

## 2.5 Quản lý hồ sơ cá nhân
- [ ] Đổi email, họ tên, mật khẩu (có yêu cầu mật khẩu cũ)
- [ ] Xem điểm đánh giá & lịch sử được đánh giá
- [ ] Xem danh sách sản phẩm yêu thích
- [ ] Xem các sản phẩm đang đấu giá
- [ ] Xem sản phẩm đã thắng
- [ ] Đánh giá người bán (+1 / -1 + nhận xét)

## 2.6 Xin quyền bán hàng (upgrade)
- [ ] Gửi yêu cầu
- [ ] Admin duyệt
- [ ] Hệ thống cần check hết hạn sau 7 ngày

---

# 3. Phân hệ Seller

## 3.1 Đăng sản phẩm
- [ ] Tên sản phẩm
- [ ] >=3 ảnh
- [ ] Giá khởi điểm
- [ ] Bước giá
- [ ] Giá mua ngay (tuỳ chọn)
- [ ] Mô tả sản phẩm (WYSIWYG)
- [ ] Tự động gia hạn: nếu có bid trước khi kết thúc 5 phút → +10 phút

## 3.2 Bổ sung mô tả
- [ ] Chỉ được append, không replace
- [ ] Ghi timestamp mỗi lần bổ sung
- [ ] Khi render ra UI cần format giống yêu cầu (ví dụ: ✏️ 31/10/2025).

## 3.3 Từ chối bidder
- [ ] Block bidder khỏi sản phẩm
- [ ] Nếu đang giữ giá → chuyển cho người cao thứ 2

## 3.4 Trả lời câu hỏi
- [ ] Trả lời trong trang chi tiết sản phẩm
- [ ] Notify email cho bidder liên quan

## 3.5 Hồ sơ seller
- [ ] Danh sách sản phẩm đang đăng
- [ ] Danh sách sản phẩm đã kết thúc
- [ ] Đánh giá người thắng (+1 / -1 + nhận xét)
- [ ] Hủy giao dịch → auto -1 + nhận xét “Người thắng không thanh toán”

---

# 4. Phân hệ Administrator

## 4.1 Quản lý Category
- [ ] CRUD category
- [ ] Không cho xóa category có sản phẩm

## 4.2 Quản lý sản phẩm
- [ ] Gỡ bỏ sản phẩm

## 4.3 Quản lý User
- [ ] CRUD user
- [ ] Xem danh sách bidder yêu cầu nâng cấp
- [ ] Duyệt bidder → seller

## 4.4 Quản lý cấu hình hệ thống
- [ ] Cho phép Admin thay đổi tham số thời gian gia hạn tự động (mặc định là 5 phút trước khi hết giờ và cộng thêm 10 phút).
---

# 5. Tính năng chung

## 5.1 Đăng nhập
- [ ] Đăng nhập thường
- [ ] (Optional) Login Google/Facebook/Twitter/Github

## 5.2 Cập nhật thông tin cá nhân
- [ ] Họ tên
- [ ] Email
- [ ] Ngày sinh

## 5.3 Đổi mật khẩu
- [ ] Hash bcrypt/scrypt

## 5.4 Quên mật khẩu
- [ ] OTP qua email

---

# 6. Hệ thống

## 6.1 Mailing System – gửi email khi:
- [ ] Bid thành công (seller + bidder hiện tại + bidder trước đó)
- [ ] Bidder bị từ chối
- [ ] Đấu giá kết thúc không có người mua
- [ ] Đấu giá kết thúc có người thắng (seller + winner)
- [ ] Người mua đặt câu hỏi (seller)
- [ ] Seller trả lời câu hỏi (mọi bidder liên quan)

## 6.2 Đấu giá tự động
- [ ] Cho phép bidder đặt giá-tối-đa
- [ ] Tự tăng theo bước giá cho đến khi vượt người khác
- [ ] Nếu bằng nhau → ưu tiên người đặt trước

---

# 7. Quy trình thanh toán sau đấu giá

## Khi truy cập chi tiết sản phẩm sau khi kết thúc
- [ ] Buyer + seller được chuyển sang màn hình “Hoàn tất đơn hàng”
- [ ] Người khác thấy thông báo “Sản phẩm đã kết thúc”

## Quy trình 4 bước
1. [ ] Buyer gửi hoá đơn thanh toán + địa chỉ giao hàng  
2. [ ] Seller xác nhận nhận tiền + gửi mã vận chuyển  
3. [ ] Buyer xác nhận đã nhận hàng  
4. [ ] Hai bên đánh giá lẫn nhau (+1 / -1 + nhận xét)

## Chức năng khác
- [ ] Seller có thể cancel bất cứ lúc nào → auto -1 cho winner
- [ ] Giao diện chat riêng seller ↔ winner
- [ ] Cả hai được phép đổi lại điểm đánh giá

---

# 8. Yêu cầu kỹ thuật & dữ liệu

## 8.1 Web App
- [ ] SSR (Express + HBS/EJS + DB)  
hoặc  
- [ ] CSR (React SPA + REST API backend)

## 8.2 Dữ liệu mẫu
- [ ] >=20 sản phẩm
- [ ] 4–5 danh mục
- [ ] Mỗi sản phẩm >=5 lượt bid

## 8.3 GitHub
- [ ] Repo đầy đủ
- [ ] Commit đều đặn
- [ ] Không để repo trống → 0 điểm

---

# ✔ Hoàn tất
- [ ] Mọi chức năng đúng theo yêu cầu
- [ ] Không làm thừa chức năng ngoài yêu cầu
- [ ] Hiệu ứng UI/UX nhẹ (tùy chọn)