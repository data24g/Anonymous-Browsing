const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, "database.json");

// --- CẤU HÌNH ---
app.use(cors());
app.use(express.json());

// --- HÀM HỖ TRỢ ĐỌC/GHI FILE ---

// Hàm đọc dữ liệu từ file
const readDatabase = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Nếu file chưa có, tạo file mới với tài khoản Admin mặc định
      const defaultData = [
        {
          email: "admin@gmail.com",
          password: "123",
          name: "Super Admin",
          role: "admin",
        },
      ];
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Lỗi đọc database:", error);
    return [];
  }
};

// Hàm ghi dữ liệu vào file
const writeDatabase = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Lỗi ghi database:", error);
    return false;
  }
};

// --- API ROUTES ---

// 0. API DEBUG: Xem tất cả users (ĐÃ BẢO MẬT)
// Cách dùng: http://IP:3000/api/users?key=AccsafeSecret2024
app.get("/api/users", (req, res) => {
  const secretKey = req.query.key;

  // Chỉ cho phép xem nếu nhập đúng mã bí mật
  if (secretKey !== "AccsafeSecret2024") {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền truy cập danh sách này!" });
  }

  const users = readDatabase();
  // Ẩn mật khẩu khi trả về
  const safeUsers = users.map((u) => ({
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  }));
  res.json(safeUsers);
});

// 1. API Đăng ký
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  console.log(`[REGISTER] Yêu cầu từ: ${email}`);

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập email và mật khẩu!" });
  }

  const users = readDatabase(); // Đọc dữ liệu mới nhất

  // Kiểm tra trùng email
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ message: "Email này đã được sử dụng!" });
  }

  // Tạo user mới
  const newUser = {
    email,
    password,
    name: email.split("@")[0],
    role: "user",
    createdAt: new Date().toISOString(),
  };

  users.push(newUser); // Thêm vào danh sách
  writeDatabase(users); // Ghi xuống ổ cứng

  console.log(`[REGISTER] Thành công: ${email}`);
  res.json({
    message: "Đăng ký thành công",
    token: "fake-jwt-" + Date.now(),
    user: { email: newUser.email, name: newUser.name, role: newUser.role },
  });
});

// 2. API Đăng nhập
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  console.log(`[LOGIN] Kiểm tra: ${email}`);

  const users = readDatabase(); // Đọc dữ liệu mới nhất

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng!" });
  }

  res.json({
    message: "Đăng nhập thành công",
    token: "fake-jwt-" + Date.now(),
    user: { email: user.email, name: user.name, role: user.role },
  });
});

// Khởi chạy Server
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`   SERVER ĐANG CHẠY TẠI PORT ${PORT}`);
  console.log(`   Dữ liệu lưu tại: ${DB_FILE}`);
  console.log(`=============================================`);
});
