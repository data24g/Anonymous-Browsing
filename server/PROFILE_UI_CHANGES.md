# Tài Liệu Thay Đổi Giao Diện Tạo Profile

## Tổng Quan

Tài liệu này mô tả các thay đổi trong giao diện tạo profile và cách backend xử lý các thay đổi này.

## Các Thay Đổi Chính

### 1. Xóa Tab "Nâng Cao" (Advanced)

- **Trước**: Có 3 tab: Overview, Hardware, Advanced
- **Sau**: Chỉ còn 1 trang duy nhất gộp Overview và Hardware
- **Lý do**: Đơn giản hóa giao diện, các cài đặt nâng cao (Canvas Noise, Audio Noise, WebRTC) được đưa vào phần Hardware

### 2. Gộp Overview và Hardware

- **Trước**: 2 tab riêng biệt
- **Sau**: 1 trang duy nhất với 2 section:
  - **Section "Tổng quan"**: Tên profile, OS, Browser, Proxy, User Agent, Timezone
  - **Section "Phần cứng"**: CPU Cores, RAM, Screen Resolution, GPU, và các cài đặt nâng cao

### 3. Button Random Config

- **Vị trí**: Góc trên bên phải của modal tạo profile
- **Chức năng**: Khi click, tự động random tất cả các cấu hình:
  - OS: Windows, macOS, Linux, Android (ngẫu nhiên)
  - Browser: Chrome, Firefox, Edge (ngẫu nhiên)
  - Device Type: Desktop, Mobile (ngẫu nhiên)
  - User Agent: Random từ danh sách MOCK_USER_AGENTS
  - CPU Cores: Random từ CPU_OPTIONS (2, 4, 8, 16, 32)
  - RAM: Random từ RAM_OPTIONS (4, 8, 16, 32, 64)
  - GPU: Random từ MOCK_GPUS (bao gồm các GPU mới)
  - Screen Resolution: Random từ RESOLUTION_OPTIONS
  - Audio/Canvas/WebGL Noise: Random true/false
  - WebRTC Policy: Random từ disable, real_public_ip, fake_ip

### 4. Bỏ Tự Động Chọn (No Auto-Select)

- **Trước**: Khi mở modal, tất cả các field đã có giá trị mặc định
- **Sau**: Tất cả các field đều trống (trừ Timezone mặc định là "auto")
- **Lý do**: Người dùng phải chủ động chọn hoặc click "Random Config" để tạo profile

### 5. Thêm GPU Mới

Đã thêm các GPU mới vào danh sách `MOCK_GPUS`:

**Danh sách GPU hiện tại (12 lựa chọn):**
1. NVIDIA GeForce RTX 3060
2. NVIDIA GeForce RTX 4090
3. **NVIDIA GeForce GTX 5060** (MỚI)
4. AMD Radeon RX 6700 XT
5. **AMD Radeon RX 7800 XT** (MỚI)
6. Intel Iris Xe Graphics
7. **Intel Arc A770** (MỚI)
8. Apple M1
9. Apple M2 Pro
10. **NVIDIA GeForce RTX 4070** (MỚI)
11. **AMD Radeon RX 6600 XT** (MỚI)
12. **NVIDIA GeForce RTX 3080** (MỚI)

## Validation

Khi tạo profile, frontend sẽ validate các field bắt buộc:

1. **Tên profile**: Không được để trống
2. **OS**: Phải chọn một giá trị
3. **Browser**: Phải chọn một giá trị
4. **CPU Cores**: Phải chọn một giá trị
5. **RAM**: Phải chọn một giá trị
6. **GPU**: Phải chọn một giá trị
7. **Screen Resolution**: Phải chọn một giá trị

Nếu thiếu bất kỳ field nào, sẽ hiển thị thông báo lỗi tương ứng.

## Backend Compatibility

### Không Cần Thay Đổi Backend

Backend (`server/server.js`) **KHÔNG CẦN** thay đổi vì:

1. **API Endpoint**: `POST /api/profiles` vẫn giữ nguyên
2. **Data Structure**: Cấu trúc dữ liệu profile không thay đổi
3. **Validation**: Backend chỉ kiểm tra `userId` là bắt buộc, các field khác được frontend validate

### Cấu Trúc Dữ Liệu Profile

```json
{
  "id": "string",
  "userId": "string (email)",
  "name": "string",
  "deviceType": "desktop" | "mobile",
  "os": "windows" | "mac" | "linux" | "android",
  "browser": "chrome" | "firefox" | "edge",
  "userAgent": "string",
  "timezone": "string",
  "hardware": {
    "cpuCores": "number",
    "ram": "number",
    "gpu": "string",
    "screenResolution": "string",
    "audioContextNoise": "boolean",
    "canvasNoise": "boolean",
    "webGLNoise": "boolean",
    "webRTCPolicy": "disable" | "real_public_ip" | "fake_ip"
  },
  "status": "running" | "stopped",
  "proxyId": "string (optional)",
  "createdAt": "number (timestamp)",
  "updatedAt": "number (timestamp)"
}
```

## Cách Sử Dụng

### Tạo Profile Thủ Công

1. Click nút "Tạo Hồ sơ"
2. Nhập tên profile
3. Chọn OS, Browser
4. Chọn Proxy (nếu có)
5. Chọn hoặc để trống User Agent (sẽ tự động tạo nếu để trống)
6. Chọn Timezone
7. Chọn CPU Cores, RAM, Screen Resolution, GPU
8. Cấu hình các tùy chọn nâng cao (Canvas Noise, Audio Noise, WebRTC)
9. Click "Lưu"

### Tạo Profile Tự Động (Random)

1. Click nút "Tạo Hồ sơ"
2. Click nút "Random Config" ở góc trên bên phải
3. Tất cả các field sẽ được điền tự động với giá trị ngẫu nhiên
4. Có thể chỉnh sửa lại nếu cần
5. Nhập tên profile (bắt buộc)
6. Click "Lưu"

## Lưu Ý

1. **Timezone**: Mặc định là "auto" (tự động dựa trên IP)
2. **User Agent**: Nếu để trống, sẽ tự động chọn random khi tạo profile
3. **Device Type**: Mặc định là "desktop" nếu không chọn
4. **Advanced Settings**: Các cài đặt nâng cao (Canvas Noise, Audio Noise, WebRTC) vẫn hoạt động bình thường, chỉ được đưa vào section Hardware thay vì tab riêng

## Files Đã Thay Đổi

### Frontend

1. **`fe/views/ProfileView.tsx`**:
   - Xóa state `activeProfileTab`
   - Xóa tab "Advanced"
   - Gộp Overview và Hardware thành 1 trang
   - Thêm function `randomizeProfile()`
   - Bỏ auto-select trong `profileForm` state
   - Thêm validation cho các field bắt buộc

2. **`fe/constants.ts`**:
   - Thêm 6 GPU mới vào `MOCK_GPUS`:
     - NVIDIA GeForce GTX 5060
     - AMD Radeon RX 7800 XT
     - Intel Arc A770
     - NVIDIA GeForce RTX 4070
     - AMD Radeon RX 6600 XT
     - NVIDIA GeForce RTX 3080

### Backend

**KHÔNG CẦN THAY ĐỔI** - Backend tương thích hoàn toàn với các thay đổi frontend.

## Testing

Để test các thay đổi:

1. **Test Random Config**:
   - Mở modal tạo profile
   - Click "Random Config" nhiều lần
   - Kiểm tra các giá trị thay đổi ngẫu nhiên

2. **Test Validation**:
   - Mở modal tạo profile
   - Không điền gì, click "Lưu"
   - Kiểm tra các thông báo lỗi validation

3. **Test Tạo Profile**:
   - Tạo profile thủ công
   - Tạo profile bằng Random Config
   - Kiểm tra profile được lưu đúng trên server

## Kết Luận

Các thay đổi này giúp:
- **Đơn giản hóa giao diện**: Gộp các tab thành 1 trang
- **Tăng tính linh hoạt**: Button Random Config giúp tạo profile nhanh chóng
- **Cải thiện UX**: Bỏ auto-select, người dùng chủ động hơn
- **Mở rộng tùy chọn**: Thêm nhiều GPU mới cho người dùng lựa chọn

Backend không cần thay đổi, đảm bảo tính tương thích ngược.

