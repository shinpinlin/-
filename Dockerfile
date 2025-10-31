# ------------------------------------
# 階段 1: 建置階段 (Build Stage)
# 使用 Node.js 環境來編譯 Angular 程式碼
# ------------------------------------
FROM node:18-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和相關檔案，並安裝依賴套件
# 根據您的檔案結構，您可能也需要 package-lock.json 或 yarn.lock
COPY package.json package-lock.json ./
RUN npm install

# 複製所有程式碼
COPY . .

# 執行 Angular 編譯，生成最終的靜態檔案
# 這裡假設您的 package.json 中的 'build' 指令可以正確運行
# Angular 專案通常會輸出到 /app/dist/ 裡的一個子資料夾
RUN npm run build


# ------------------------------------
# 階段 2: 服務階段 (Serve Stage)
# 使用 Nginx (極小的 Web 伺服器) 來提供靜態檔案
# ------------------------------------
FROM nginx:alpine

# 移除預設的 Nginx 歡迎頁面
RUN rm /etc/nginx/conf.d/default.conf

# 複製自訂的 Nginx 配置，讓它監聽 Cloud Run 要求的 8080 埠
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 將編譯好的靜態檔案從 'builder' 階段複製到 Nginx 的網頁目錄
# ***重要：這裡的路徑 /app/dist/projectName/ 需要根據您的 Angular 專案實際編譯輸出的資料夾名稱進行調整！***
# 假設您的專案名稱是 'pinghouse' 或 'your-app-name'
COPY --from=builder /app/dist/pinghouse /usr/share/nginx/html

# Cloud Run 會將流量導向到 8080 埠
EXPOSE 8080
