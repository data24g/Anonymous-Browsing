# ✅ Checklist Trước Khi Commit Lên GitHub

## 🔍 Kiểm Tra Trước Khi Commit

### 1. Kiểm tra .gitignore

```bash
# Xem .gitignore có đúng không
cat .gitignore
```

**Đảm bảo loại trừ:**
- ✅ `node_modules/`
- ✅ `database.json`
- ✅ `profiles.json`
- ✅ `proxies.json`
- ✅ `Chrome-bin/`
- ✅ `code_test_nhan/`
- ✅ `dist/`
- ✅ `*.log`

### 2. Kiểm tra Files Sẽ Được Commit

```bash
git status
```

**KHÔNG được thấy:**
- ❌ `database.json`
- ❌ `profiles.json`
- ❌ `proxies.json`
- ❌ `node_modules/`
- ❌ `Chrome-bin/`

**PHẢI thấy:**
- ✅ `fe/` (toàn bộ source code)
- ✅ `server/` (toàn bộ server code)
- ✅ `.gitignore`
- ✅ `README.md`
- ✅ `package.json` files

### 3. Test Local Trước Khi Commit

```bash
# Test app có chạy được không
cd fe
npm install
npm run dev
```

## 📦 Files Cần Commit

### ✅ Source Code (BẮT BUỘC)

```
fe/
├── components/          ✅
├── views/              ✅
├── services/           ✅
├── config/             ✅
├── hooks/              ✅
├── types/              ✅
├── App.tsx             ✅
├── main.js             ✅
├── index.tsx           ✅
├── index.html          ✅
├── vite.config.ts      ✅
├── tsconfig.json       ✅
├── package.json        ✅
└── public/            ✅

server/
├── server.js           ✅
├── auth-middleware.js  ✅
├── package.json        ✅
├── *.sh                ✅
└── *.md                ✅

Root:
├── .gitignore          ✅
├── README.md           ✅
├── package.json        ✅ (nếu có)
└── *.md                ✅
```

### ❌ KHÔNG Commit

```
❌ node_modules/
❌ database.json
❌ profiles.json
❌ proxies.json
❌ Chrome-bin/
❌ code_test_nhan/
❌ dist/
❌ *.log
❌ package-lock.json (tùy chọn)
```

## 🚀 Lệnh Commit

```bash
# 1. Kiểm tra status
git status

# 2. Add files
git add .

# 3. Kiểm tra lại files đã add
git status

# 4. Commit
git commit -m "Initial commit: AccSafe browser profile management system"

# 5. Push
git push origin main
```

## ⚠️ QUAN TRỌNG

**KHÔNG BAO GIỜ commit:**
- Database files (chứa passwords)
- User data files
- node_modules (quá lớn)
- Build outputs
- Temporary files

## ✅ Sau Khi Commit

Người khác clone về sẽ:
1. Clone repository
2. Chạy `npm install` trong `fe/`
3. Chạy `npm run dev`
4. App hoạt động ngay (kết nối remote server)

**Không cần:**
- Cấu hình database
- Copy files thủ công
- Setup server riêng

