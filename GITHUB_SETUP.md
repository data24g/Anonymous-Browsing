# Hướng Dẫn Đẩy Code Lên GitHub

## 📦 Những Gì Cần Commit

### ✅ Cần Commit (Source Code)

```
version3/
├── fe/                          # ✅ Toàn bộ frontend code
│   ├── components/              # ✅ React components
│   ├── views/                   # ✅ Views
│   ├── services/                # ✅ API services, browser launcher
│   ├── config/                  # ✅ Configuration files
│   ├── hooks/                   # ✅ Custom hooks
│   ├── types/                   # ✅ TypeScript types
│   ├── App.tsx                  # ✅ Main app component
│   ├── main.js                  # ✅ Electron main process
│   ├── index.tsx                # ✅ Entry point
│   ├── index.html               # ✅ HTML template
│   ├── vite.config.ts           # ✅ Vite config
│   ├── tsconfig.json            # ✅ TypeScript config
│   ├── package.json             # ✅ Dependencies
│   └── public/                  # ✅ Public assets (logo.png)
│
├── server/                       # ✅ Toàn bộ server code
│   ├── server.js                # ✅ Express server
│   ├── auth-middleware.js       # ✅ Auth middleware
│   ├── package.json             # ✅ Dependencies
│   ├── *.sh                     # ✅ Deployment scripts
│   └── *.md                     # ✅ Documentation
│
├── .gitignore                    # ✅ Git ignore rules
├── README.md                     # ✅ Project documentation
├── SERVER_ONLY_MODE.md           # ✅ Server mode docs
└── GITHUB_SETUP.md              # ✅ This file
```

### ❌ KHÔNG Commit (Đã được .gitignore)

```
❌ node_modules/                  # Dependencies (npm install sẽ tạo)
❌ package-lock.json              # Lock file (tùy chọn)
❌ dist/                          # Build output
❌ Chrome-bin/                    # Chrome binaries (quá lớn)
❌ code_test_nhan/                # Test files
❌ database.json                  # Chứa passwords - NHẠY CẢM
❌ profiles.json                  # User data - NHẠY CẢM
❌ proxies.json                   # User data - NHẠY CẢM
❌ *.log                          # Log files
❌ ruyi_live_*/                   # Temporary browser data
❌ proxy_auth_plugin_*/           # Temporary extensions
```

## 🔐 File Nhạy Cảm

**QUAN TRỌNG**: Các file sau **KHÔNG BAO GIỜ** được commit:

- `server/database.json` - Chứa passwords của users
- `server/profiles.json` - Chứa dữ liệu profiles của users
- `server/proxies.json` - Chứa dữ liệu proxies của users
- `fe/server.js` - Nếu có chứa secrets (nhưng file này có thể commit nếu không có secrets)

## 📋 Checklist Trước Khi Commit

- [ ] Đã kiểm tra `.gitignore` loại trừ đúng các file
- [ ] Không có file `database.json`, `profiles.json`, `proxies.json` trong staging
- [ ] Không có `node_modules/` trong staging
- [ ] Không có file `.env` hoặc secrets
- [ ] Đã test app chạy được sau khi clone

## 🚀 Các Bước Đẩy Lên GitHub

### 1. Kiểm tra .gitignore

```bash
# Đảm bảo .gitignore đã loại trừ đúng
cat .gitignore
```

### 2. Kiểm tra files sẽ được commit

```bash
git status
```

**Đảm bảo không thấy:**
- `database.json`
- `profiles.json`
- `proxies.json`
- `node_modules/`
- `Chrome-bin/`

### 3. Add files

```bash
git add .
```

### 4. Commit

```bash
git commit -m "Initial commit: AccSafe browser profile management system"
```

### 5. Push lên GitHub

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 📥 Hướng Dẫn Cho Người Clone

Sau khi clone về, người dùng cần:

### 1. Cài đặt Dependencies

```bash
# Frontend
cd fe
npm install

# Server (nếu cần chạy local)
cd ../server
npm install
```

### 2. Tạo Database Files (Tự động)

Khi server chạy lần đầu, nó sẽ tự động tạo:
- `database.json` với admin account mặc định
- `profiles.json` (rỗng)
- `proxies.json` (rỗng)

### 3. Chạy App

```bash
cd fe
npm run dev
```

## ⚠️ Lưu Ý Quan Trọng

1. **Database files**: Mỗi server instance sẽ có database riêng. Khi clone về, database sẽ trống (trừ admin account mặc định).

2. **Remote Server**: App mặc định kết nối đến `http://163.44.193.71:3000`. Nếu muốn dùng server khác, sửa trong `fe/config/api.config.ts`.

3. **Chrome Path**: Nếu Chrome không ở đường dẫn mặc định, sửa trong `fe/services/browserLauncher.js`.

4. **Environment Variables**: Nếu có secrets, dùng `.env` file và đảm bảo nó trong `.gitignore`.

## 🔍 Kiểm Tra Sau Khi Clone

Sau khi clone, test xem app có chạy được không:

```bash
# 1. Cài dependencies
cd fe && npm install

# 2. Chạy app
npm run dev

# 3. Kiểm tra kết nối server
# Mở app và thử đăng nhập
```

## 📝 Template .gitignore

File `.gitignore` đã được cấu hình đúng. Nếu chưa có, tạo file `.gitignore` với nội dung:

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Database files (NHẠY CẢM)
**/database.json
**/profiles.json
**/proxies.json

# Build outputs
dist/
build/

# Chrome binaries
Chrome-bin/

# Test files
code_test_nhan/
ruyi_live_*/
proxy_auth_plugin_*/

# Logs
*.log

# Environment
.env
.env.local
```

## ✅ Kết Quả

Sau khi đẩy lên GitHub, người khác có thể:

1. ✅ Clone repository
2. ✅ Cài đặt dependencies (`npm install`)
3. ✅ Chạy app ngay (`npm run dev`)
4. ✅ Kết nối đến remote server
5. ✅ Sử dụng app bình thường

**Không cần:**
- ❌ Cấu hình database (server tự tạo)
- ❌ Cài đặt server riêng (dùng remote server)
- ❌ Copy files thủ công

