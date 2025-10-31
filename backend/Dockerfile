# Sử dụng base image Node.js 22
FROM node:22-alpine

# Set thư mục làm việc bên trong container
WORKDIR /usr/src/app

# Copy package.json và package-lock.json trước
# Tận dụng cache của Docker, chỉ cài lại khi dependencies thay đổi
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ source code còn lại vào
COPY . .

# Cài nodemon để tự động restart server khi code thay đổi
# RUN npm install -g nodemon --quiet (Nếu bạn không cài ở trên)

# Expose port 3000 (port mặc định của Express)
EXPOSE 3000

# Lệnh để chạy app khi container khởi động (dùng nodemon)
# Giả sử file chính của bạn là src/index.js
CMD [ "npm", "run", "dev" ]