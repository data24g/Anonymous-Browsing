# Hướng Dẫn Deploy Code User Management API Lên Server

## Vấn Đề Hiện Tại

Server trên cloud có thể đang chạy code cũ, không có các endpoint user management:
- `GET /api/users` → 403 Forbidden hoặc 404
- `DELETE /api/users/:email` → 403 Forbidden hoặc 404

## Giải Pháp

Cần deploy code mới lên server. Có 2 cách:

### Cách 1: Sử dụng Deploy Script (Khuyến nghị)

Từ máy local, chạy:

```bash
bash deploy.sh
```

Script này sẽ:
1. Upload folder `server/` lên VPS tại `/var/www/accsafe-api`
2. Cài đặt dependencies
3. Restart PM2 process

**Lưu ý:** Script deploy.sh đang deploy lên `/var/www/accsafe-api`, nhưng server có thể đang chạy từ `/opt/accsafe-server`. Cần kiểm tra và cập nhật đường dẫn trong `deploy.sh` nếu cần.

### Cách 2: Copy file trực tiếp qua SCP

1. **Copy file server.js lên server:**

```bash
# Nếu server ở /opt/accsafe-server
scp server/server.js root@163.44.193.71:/opt/accsafe-server/server.js

# Hoặc nếu server ở /var/www/accsafe-api
scp server/server.js root@163.44.193.71:/var/www/accsafe-api/server.js
```

2. **SSH vào server và restart:**

```bash
ssh root@163.44.193.71

# Kiểm tra PM2 process name
pm2 list

# Restart server
pm2 restart accsafe-api
# hoặc
pm2 restart accsafe-server
```

### Cách 3: Pull code từ Git (nếu server có Git repo)

Trên server:

```bash
cd /opt/accsafe-server  # hoặc /var/www/accsafe-api
git pull origin main
pm2 restart accsafe-api
```

## Kiểm Tra Sau Khi Deploy

### 1. Kiểm tra code mới đã được deploy chưa

Trên server, chạy:

```bash
# Kiểm tra xem có endpoint /api/users không
grep -q "/api/users" server.js && echo "✓ Có endpoint /api/users" || echo "✗ Không có (code cũ)"

# Kiểm tra function checkAdmin
grep -q "checkAdmin" server.js && echo "✓ Có function checkAdmin" || echo "✗ Không có"

# Kiểm tra DELETE endpoint
grep -q "DELETE.*users" server.js && echo "✓ Có DELETE endpoint" || echo "✗ Không có"
```

### 2. Test endpoints trực tiếp

```bash
# Health check
curl http://localhost:3000/api/health

# Login và lấy token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Test GET /api/users endpoint
curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" | jq .

# Nếu không có jq, dùng:
curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Kiểm tra PM2 logs

```bash
pm2 logs accsafe-api --lines 50
```

Tìm các log:
- `[Users] GET request received`
- `[checkAdmin] Token: ...`
- `[checkAdmin] User found: ...`
- `[checkAdmin] Is admin: ...`

## Các Thay Đổi Trong Code Mới

### 1. Function `checkAdmin` (dòng 171-218)

Function này kiểm tra quyền admin từ token:
- Extract email từ token format: `fake-jwt-{timestamp}-{email}`
- Tìm user trong database
- Kiểm tra role === "admin"

### 2. Endpoint `GET /api/users` (dòng 220-255)

- Yêu cầu authentication (middleware `authenticate`)
- Kiểm tra quyền admin (function `checkAdmin`)
- Trả về danh sách users (ẩn password)

### 3. Endpoint `DELETE /api/users/:email` (dòng 260-330)

- Yêu cầu authentication
- Kiểm tra quyền admin
- Xóa user và tất cả dữ liệu liên quan (profiles, proxies, chats)

## Lưu Ý

1. **Port:** Đảm bảo server đang chạy trên port 3000 (đã sửa trong code)
2. **Database:** File `database.json` phải có user với `role: "admin"` (mặc định là `admin@gmail.com`)
3. **Token Format:** Token phải có format `fake-jwt-{timestamp}-{email}` để `checkAdmin` hoạt động đúng
4. **PM2 Process Name:** Kiểm tra tên process PM2 (`accsafe-api` hoặc `accsafe-server`) và restart đúng process

## Troubleshooting

### Lỗi 403 Forbidden

**Nguyên nhân:**
- Token không được gửi đúng
- User không có role "admin"
- `checkAdmin` function không hoạt động đúng

**Giải pháp:**
1. Kiểm tra token trong request header
2. Kiểm tra user trong `database.json` có `role: "admin"` không
3. Xem PM2 logs để debug `checkAdmin` function

### Lỗi 404 Not Found

**Nguyên nhân:**
- Endpoint chưa được deploy
- Server đang chạy code cũ

**Giải pháp:**
1. Deploy lại code mới
2. Restart PM2 process
3. Kiểm tra file `server.js` trên server có endpoint `/api/users` không

### Server không restart

**Giải pháp:**
```bash
# Kill process cũ
pm2 delete accsafe-api

# Start lại
cd /opt/accsafe-server  # hoặc /var/www/accsafe-api
pm2 start server.js --name accsafe-api
pm2 save
```

