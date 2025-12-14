# AccSafe - Browser Profile Management System

Hệ thống quản lý browser profiles với fingerprinting và proxy support.

## 📋 Yêu Cầu Hệ Thống

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **Chrome Browser**: Đã cài đặt hoặc có RUYI Chrome build
- **Kết nối Internet**: Để kết nối đến remote server

## 🚀 Cài Đặt

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd version3
```

### 2. Cài Đặt Dependencies

#### Frontend (Electron App)
```bash
cd fe
npm install
```

#### Server (Backend API) - Chỉ cần nếu muốn chạy local server
```bash
cd server
npm install
```

### 3. Cấu Hình

App mặc định kết nối đến remote server: `http://163.44.193.71:3000/api`

Nếu muốn thay đổi, sửa trong `fe/config/api.config.ts`:
```typescript
remoteUrl: "http://YOUR_SERVER_IP:3000/api"
```

## 🏃 Chạy Ứng Dụng

### Chạy Frontend (Electron App)

```bash
cd fe
npm run dev
```

Hoặc build và chạy production:
```bash
cd fe
npm run build
npm start
```

### Chạy Backend Server (Nếu cần chạy local)

```bash
cd server
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## 📁 Cấu Trúc Project

```
version3/
├── fe/                    # Frontend (Electron App)
│   ├── components/        # React components
│   ├── views/             # Main views
│   ├── services/          # API services & browser launcher
│   ├── config/           # Configuration files
│   └── main.js           # Electron main process
│
├── server/                # Backend API Server
│   ├── server.js         # Express server
│   ├── auth-middleware.js # Authentication middleware
│   └── *.sh              # Deployment scripts
│
└── README.md             # This file
```

## 🔑 Đăng Nhập

Sau khi chạy app, bạn có thể đăng nhập với:

- **Email**: `admin@gmail.com`
- **Password**: `123`

Hoặc đăng ký tài khoản mới.

## 🌐 Kết Nối Server

App mặc định kết nối đến remote server. Đảm bảo:

1. Server đang chạy tại `http://163.44.193.71:3000`
2. Firewall cho phép kết nối đến port 3000
3. Kết nối mạng ổn định

## 📝 Tính Năng

- ✅ Quản lý Profiles với fingerprinting
- ✅ Quản lý Proxies
- ✅ Automation - Mở nhanh các trang web
- ✅ Multi-user support
- ✅ Admin panel
- ✅ Chat support

## 🔧 Troubleshooting

### Lỗi kết nối server

1. Kiểm tra server có đang chạy không
2. Kiểm tra firewall
3. Kiểm tra IP server trong `fe/config/api.config.ts`

### Lỗi Chrome không tìm thấy

1. Cài đặt Google Chrome
2. Hoặc đặt đường dẫn Chrome trong `fe/services/browserLauncher.js`
3. Hoặc sử dụng RUYI Chrome build

### Lỗi dependencies

```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
- Server logs
- Browser console (F12)
- Network tab để xem API calls

## 📄 License

ISC

