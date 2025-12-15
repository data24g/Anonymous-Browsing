# Hướng Dẫn Deploy Code Chat API Lên Server

## Vấn Đề Hiện Tại

Server đang chạy code cũ, không có các endpoint chat API:
- `GET /api/chats` → 404
- `POST /api/chats` → 404  
- `GET /api/chats/:userId` → 404

## Giải Pháp

Cần deploy code mới lên server. Có 2 cách:

### Cách 1: Deploy qua Git (Khuyến nghị)

1. **Đảm bảo code đã được commit và push lên Git:**
   ```bash
   git status
   git add server/server.js server/SERVER_CONFIG.md
   git commit -m "Add chat API endpoints"
   git push origin main
   ```

2. **SSH vào server và pull code mới:**
   ```bash
   ssh user@163.44.193.71
   cd /path/to/server
   git pull origin main
   ```

3. **Restart server:**
   ```bash
   # Nếu dùng PM2
   pm2 restart accsafe-server
   
   # Hoặc nếu chạy trực tiếp
   # Kill process cũ và chạy lại
   node server.js
   ```

### Cách 2: Copy file trực tiếp qua SCP

1. **Copy file server.js lên server:**
   ```bash
   scp server/server.js user@163.44.193.71:/path/to/server/server.js
   ```

2. **Restart server trên VPS:**
   ```bash
   ssh user@163.44.193.71
   pm2 restart accsafe-server
   ```

## Kiểm Tra Sau Khi Deploy

Sau khi deploy, chạy script kiểm tra:

```bash
cd server
node quick-check.js
```

Hoặc kiểm tra thủ công:

```bash
# Health check
curl http://163.44.193.71:3000/api/health

# Login và lấy token
curl -X POST http://163.44.193.71:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123"}'

# Test chat endpoint (thay TOKEN bằng token từ login)
curl http://163.44.193.71:3000/api/chats \
  -H "Authorization: Bearer TOKEN"
```

## Lưu Ý

1. **Port:** Đảm bảo frontend config đúng port 3000 (đã sửa trong `fe/config/api.config.ts`)
2. **File chats.json:** Server sẽ tự động tạo file `chats.json` khi có request đầu tiên
3. **Permissions:** Đảm bảo server có quyền ghi file trong thư mục server

## Scripts Hữu Ích

- `server/check-server-config.js` - Kiểm tra đầy đủ cấu hình và endpoints
- `server/quick-check.js` - Kiểm tra nhanh các endpoint chat

