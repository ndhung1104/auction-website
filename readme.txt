Hướng dẫn thiết lập Website Đấu giá
Hướng dẫn này mô tả ba cách để thiết lập cơ sở dữ liệu (database), backend và frontend. Các đường dẫn được tính từ thư mục gốc của dự án: d:\Project\auction-website

Điều kiện:
- Node.js 18+ và npm
- PostgreSQL 14+ (dành cho thiết lập thủ công)
- Docker Desktop (dành cho thiết lập bằng Docker)

Các file env:
- backend/.env: Copy từ backend/.env.example và cập nhật các giá trị.

- frontend/.env: Copy từ frontend/.env.example và cập nhật các giá trị.


Cách 1: Sử dụng Docker (Khuyên dùng, đây là cách tác giả test trên máy):

- Từ thư mục gốc của dự án, chạy lệnh: "docker compose up --build"

Đợi các dịch vụ khởi động:

- Backend: http://localhost:3000

- Frontend: http://localhost:5173

Lưu ý:

- Container backend sẽ tự động chạy migration và nạp dữ liệu mẫu (seed) thông qua lệnh seed:ensure.

- Nếu dataseed chưa được load có thể chạy: "docker compose exec backend npm run seed" để seed lại lần nữa.

- Nếu thay đổi các giá trị trong tệp .env, khởi động lại các container: "docker compose down docker compose up --build"

Cách 2: Thiết lập thủ công sử dụng Knex migrations

- Tạo cơ sở dữ liệu và người dùng PostgreSQL. Ví dụ (sử dụng psql):

SQL

CREATE ROLE auction_user LOGIN PASSWORD 'change_me';
CREATE DATABASE auction_db OWNER auction_user;
Cấu hình tệp backend/.env với thông tin đăng nhập DB của bạn.

- Cài đặt các thư viện backend và chạy migration:

Bash

cd backend
npm install
npm run migrate

- (Tùy chọn) Nạp dữ liệu mẫu: npm run seed

- Khởi chạy backend: npm run dev

- Khởi chạy frontend:

Bash

cd ../frontend
npm install
npm run dev

Cách 3: Thiết lập thủ công sử dụng file db.sql (chỉ dùng schema SQL)

- Tạo cơ sở dữ liệu và người dùng PostgreSQL (tương tự Cách 2).

- Chạy file db.sql để tạo cấu trúc bảng (schema): psql -U auction_user -d auction_db -f db.sql

- Cấu hình tệp backend/.env trỏ đến cơ sở dữ liệu này.

- Cài đặt và chạy backend:

Bash

cd backend
npm install
npm run dev

- Cài đặt và chạy frontend:

Bash

cd ../frontend
npm install
npm run dev

- (Tùy chọn) Nạp dữ liệu mẫu sau khi đã tạo schema bằng SQL:

Bash

cd ../backend
npm run seed
