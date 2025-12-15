# Hướng Dẫn Cấu Hình Server

## Tổng Quan

Server này cung cấp API backend cho ứng dụng AccSafe, bao gồm:
- Quản lý người dùng (authentication)
- Quản lý profiles
- Quản lý proxies
- Quản lý chat sessions (admin)

## Yêu Cầu Hệ Thống

- Node.js >= 14.x
- PM2 (để quản lý process - khuyến nghị)
- Port 3000 mở trên firewall

## Cài Đặt

### 1. Cài đặt Dependencies

```bash
cd server
npm install
```

### 2. Cấu Hình

Server sử dụng các file JSON để lưu trữ dữ liệu:
- `database.json` - Lưu thông tin users
- `profiles.json` - Lưu profiles của users
- `proxies.json` - Lưu proxies của users
- `chats.json` - Lưu chat sessions

Các file này sẽ được tạo tự động khi server chạy lần đầu.

### 3. Tài Khoản Admin Mặc Định

Khi server chạy lần đầu, một tài khoản admin mặc định sẽ được tạo:
- **Email**: `admin@gmail.com`
- **Password**: `123`
- **Role**: `admin`

**Lưu ý**: Nên đổi mật khẩu ngay sau khi cài đặt!

## Chạy Server

### Chạy Trực Tiếp (Development)

```bash
cd server
node server.js
```

Server sẽ chạy tại: `http://localhost:3000`

### Chạy với PM2 (Production - Khuyến Nghị)

#### Cài đặt PM2:
```bash
npm install -g pm2
```

#### Khởi động server:
```bash
cd server
pm2 start server.js --name accsafe-server
```

#### Các lệnh PM2 hữu ích:
```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs accsafe-server

# Restart server
pm2 restart accsafe-server

# Stop server
pm2 stop accsafe-server

# Xóa khỏi PM2
pm2 delete accsafe-server

# Tự động khởi động lại khi server reboot
pm2 startup
pm2 save
```

## Cấu Hình Firewall

### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### CentOS/RHEL (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Cấu Hình Nginx (Reverse Proxy - Tùy Chọn)

Nếu muốn sử dụng domain và HTTPS, có thể cấu hình Nginx làm reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập

### Profiles
- `GET /api/profiles?userId={email}` - Lấy profiles của user
- `POST /api/profiles` - Tạo profile mới
- `PUT /api/profiles/:id` - Cập nhật profile
- `DELETE /api/profiles/:id` - Xóa profile

### Proxies
- `GET /api/proxies?userId={email}` - Lấy proxies của user
- `POST /api/proxies` - Tạo proxy mới
- `PUT /api/proxies/:id` - Cập nhật proxy
- `DELETE /api/proxies/:id` - Xóa proxy

### Chat Sessions (Admin Only)
- `GET /api/chats` - Lấy tất cả chat sessions (chỉ admin)
- `GET /api/chats/:userId` - Lấy chat session của user
- `POST /api/chats` - Tạo/cập nhật chat session
- `PUT /api/chats/:userId` - Cập nhật chat session
- `DELETE /api/chats/:userId` - Xóa chat session

### Health Check
- `GET /api/health` - Kiểm tra server có đang chạy không

## Cấu Hình Frontend

Frontend đã được cấu hình để kết nối với remote server. Cấu hình mặc định:

- **Remote URL**: `http://163.44.193.71:3000/api`
- **Local URL**: `http://localhost:3000/api` (không được sử dụng trong production)

Cấu hình này nằm trong file `fe/config/api.config.ts` và đã được set để **luôn dùng remote server**, không cho phép dùng localhost.

Nếu cần thay đổi IP server, sửa trong file `fe/config/api.config.ts`:
```typescript
const defaultConfig: ApiConfig = {
  useLocalServer: false,
  localUrl: "http://localhost:3000/api",
  remoteUrl: "http://YOUR_SERVER_IP:3000/api", // Thay đổi IP ở đây
  timeout: 10000,
};
```

## Bảo Mật

### 1. Đổi Mật Khẩu Admin
Sửa trực tiếp trong file `database.json` hoặc đăng nhập và đổi mật khẩu qua ứng dụng.

### 2. CORS
Server hiện tại cho phép tất cả origins (`origin: '*'`). Trong production, nên giới hạn:
```javascript
app.use(cors({
  origin: ['http://your-frontend-domain.com'],
  // ...
}));
```

### 3. HTTPS
Khuyến nghị sử dụng HTTPS trong production. Có thể sử dụng Let's Encrypt với Certbot.

### 4. Authentication Token
Hiện tại server sử dụng token đơn giản (`fake-jwt-{timestamp}-{email}`). Trong production, nên sử dụng JWT thật với secret key.

## Monitoring & Logs

### PM2 Logs
```bash
# Xem logs real-time
pm2 logs accsafe-server

# Xem logs của ngày hôm nay
pm2 logs accsafe-server --lines 1000

# Xóa logs cũ
pm2 flush
```

### Server Logs
Server tự động log tất cả requests vào console. Với PM2, logs được lưu tại:
- `~/.pm2/logs/accsafe-server-out.log` - Standard output
- `~/.pm2/logs/accsafe-server-error.log` - Error output

## Backup Dữ Liệu

Các file dữ liệu quan trọng cần backup:
- `database.json` - Users
- `profiles.json` - Profiles
- `proxies.json` - Proxies
- `chats.json` - Chat sessions

Khuyến nghị backup định kỳ (hàng ngày hoặc hàng tuần).

### Script Backup Đơn Giản
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backup"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /path/to/server/*.json $BACKUP_DIR/backup_$DATE/
```

## Troubleshooting

### Server không khởi động
1. Kiểm tra port 3000 có đang được sử dụng không:
   ```bash
   lsof -i :3000
   # hoặc
   netstat -tulpn | grep 3000
   ```

2. Kiểm tra logs:
   ```bash
   pm2 logs accsafe-server
   ```

### Không kết nối được từ frontend
1. Kiểm tra firewall đã mở port 3000 chưa
2. Kiểm tra server có đang chạy không:
   ```bash
   curl http://YOUR_SERVER_IP:3000/api/health
   ```

3. Kiểm tra CORS settings trong `server.js`

### Dữ liệu bị mất
1. Kiểm tra quyền ghi file trong thư mục server
2. Kiểm tra disk space
3. Khôi phục từ backup nếu có

## Liên Hệ & Hỗ Trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Server logs
2. Frontend console logs
3. Network requests trong browser DevTools

