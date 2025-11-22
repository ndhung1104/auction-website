# Sử dụng base image Node.js 22
FROM node:22-bullseye

# Set thư mục làm việc
WORKDIR /usr/src/app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ source code
COPY . .

# Expose port 5173 (port mặc định của Vite)
EXPOSE 5173

# Lệnh để chạy app (host 0.0.0.0 là bắt buộc để Docker expose ra ngoài)
CMD [ "npm", "run", "dev", "--", "--host", "0.0.0.0" ]