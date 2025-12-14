# Hướng Dẫn Setup Cho Người Clone Code

## 📋 Yêu Cầu

- Node.js >= 18.x
- npm >= 9.x
- Google Chrome đã cài đặt (hoặc RUYI Chrome)
- Kết nối Internet để kết nối đến remote server

## 🚀 Các Bước Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd version3
```

### 2. Cài Đặt Dependencies

#### Frontend (Electron App)
```bash
cd fe
npm install
```

#### Server (Chỉ cần nếu muốn chạy local server)
```bash
cd server
npm install
```

### 3. Cấu Hình Chrome Path (Nếu cần)

Nếu Chrome không ở đường dẫn mặc định, sửa trong `fe/services/browserLauncher.js`:

```javascript
const possiblePaths = [
  'C:\\Your\\Custom\\Chrome\\Path\\chrome.exe', // Thêm đường dẫn của bạn
  // ... các đường dẫn khác
];
```

### 4. Chạy App

```bash
cd fe
npm run dev
```

## 🌐 Kết Nối Server

App mặc định kết nối đến: `http://163.44.193.71:3000/api`

- ✅ **Không cần cấu hình gì thêm** - App tự động kết nối
- ✅ **Database tự động tạo** - Server tự tạo khi chạy lần đầu
- ✅ **Đăng nhập ngay** - Dùng admin account hoặc đăng ký mới

## 🔑 Tài Khoản Mặc Định

Khi server chạy lần đầu, tự động tạo:

- **Email**: `admin@gmail.com`
- **Password**: `123`

## ⚠️ Lưu Ý

1. **Database Files**: Mỗi server instance có database riêng. Khi clone về, database sẽ trống (trừ admin mặc định).

2. **Remote Server**: App dùng remote server, không cần chạy server local.

3. **Chrome**: Đảm bảo Chrome đã được cài đặt hoặc có RUYI Chrome build.

## 🐛 Troubleshooting

### Lỗi: "Chrome not found"

**Giải pháp:**
1. Cài đặt Google Chrome
2. Hoặc sửa đường dẫn Chrome trong `fe/services/browserLauncher.js`

### Lỗi: "Cannot connect to server"

**Giải pháp:**
1. Kiểm tra kết nối Internet
2. Kiểm tra server có đang chạy không: `http://163.44.193.71:3000/api/health`
3. Kiểm tra firewall

### Lỗi: "npm install failed"

**Giải pháp:**
```bash
# Xóa và cài lại
rm -rf node_modules package-lock.json
npm install
```

## ✅ Kiểm Tra Setup Thành Công

Sau khi setup, test:

1. ✅ App mở được
2. ✅ Đăng nhập được (admin@gmail.com / 123)
3. ✅ Thấy được Profiles và Proxies (có thể trống)
4. ✅ Tạo được profile mới
5. ✅ Mở được browser với profile

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
- Kiểm tra console (F12) để xem lỗi
- Kiểm tra network tab để xem API calls
- Đảm bảo server đang chạy

