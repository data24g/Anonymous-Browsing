# Hướng Dẫn Deploy Server lên VPS

## 🚀 Các bước deploy

### 1. Upload code lên VPS

```bash
# Sử dụng SCP hoặc Git
scp -r server/ user@163.44.193.71:/var/www/accsafe-api/
# hoặc
git clone <repo> /var/www/accsafe-api
```

### 2. Cài đặt dependencies

```bash
cd /var/www/accsafe-api
npm install
```

### 3. Cấu hình Server

Đảm bảo `server.js` có:
- ✅ Listen trên `0.0.0.0:3000` (không phải localhost)
- ✅ CORS cho phép tất cả origins
- ✅ Health check endpoint `/api/health`

### 4. Mở Firewall

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 3000/tcp
sudo ufw reload
sudo ufw status

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 5. Khởi động Server

#### Cách 1: Dùng PM2 (Khuyến nghị)

```bash
# Cài PM2
npm install -g pm2

# Khởi động server
pm2 start server.js --name accsafe-api

# Tự động khởi động khi reboot
pm2 startup
pm2 save

# Xem logs
pm2 logs accsafe-api

# Restart
pm2 restart accsafe-api
```

#### Cách 2: Dùng nohup

```bash
nohup node server.js > server.log 2>&1 &
```

### 6. Kiểm tra Server

```bash
# Test local
curl http://localhost:3000/api/health

# Test từ bên ngoài (từ máy local của bạn)
curl http://163.44.193.71:3000/api/health
```

### 7. Chạy Script Fix Connection

```bash
cd /var/www/accsafe-api
chmod +x FIX_CONNECTION.sh
./FIX_CONNECTION.sh
```

## 🔧 Troubleshooting

### Lỗi: ERR_CONNECTION_REFUSED

**Nguyên nhân:**
1. Server chưa chạy
2. Server chỉ listen trên localhost (127.0.0.1)
3. Firewall chặn port 3000
4. Cloud provider security group chặn port 3000

**Cách fix:**

1. **Kiểm tra server có chạy không:**
   ```bash
   ps aux | grep node
   netstat -tuln | grep 3000
   ```

2. **Kiểm tra server.js có listen trên 0.0.0.0:**
   ```bash
   grep "app.listen" server.js
   # Phải thấy: app.listen(PORT, "0.0.0.0"
   ```

3. **Mở firewall:**
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw reload
   ```

4. **Kiểm tra Cloud Provider Security Group:**
   - AWS: Security Groups → Inbound Rules → Thêm port 3000
   - Google Cloud: Firewall Rules → Thêm port 3000
   - Azure: Network Security Group → Thêm port 3000
   - DigitalOcean: Firewall → Thêm port 3000

5. **Restart server:**
   ```bash
   pm2 restart accsafe-api
   # hoặc
   pkill -f "node.*server.js"
   node server.js
   ```

### Lỗi: CORS

Đảm bảo trong `server.js` có:
```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
```

## 📋 Checklist Deploy

- [ ] Code đã được upload lên VPS
- [ ] Dependencies đã được cài đặt (`npm install`)
- [ ] Server.js listen trên `0.0.0.0:3000`
- [ ] Firewall đã mở port 3000
- [ ] Cloud provider security group đã mở port 3000
- [ ] Server đang chạy (kiểm tra bằng `ps aux | grep node`)
- [ ] Health check endpoint hoạt động (`/api/health`)
- [ ] Có thể kết nối từ bên ngoài (test từ máy local)

## 🔍 Kiểm tra nhanh

```bash
# 1. Server có chạy không?
ps aux | grep node

# 2. Port 3000 có được sử dụng không?
netstat -tuln | grep 3000

# 3. Firewall có mở port 3000 không?
sudo ufw status | grep 3000

# 4. Test local
curl http://localhost:3000/api/health

# 5. Test từ bên ngoài (từ máy khác)
curl http://163.44.193.71:3000/api/health
```

## 📞 Lệnh hữu ích

```bash
# Xem logs server
pm2 logs accsafe-api
# hoặc
tail -f server.log

# Restart server
pm2 restart accsafe-api

# Kiểm tra status
pm2 status

# Xem process đang chạy
ps aux | grep node

# Kiểm tra port
netstat -tuln | grep 3000

# Test API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123"}'
```

