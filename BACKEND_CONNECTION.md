# Hướng dẫn Kết nối Backend

## 📋 Cấu hình API

Frontend đã được cấu hình để kết nối với backend tại `http://localhost:5264/api`

### 1. **File Cấu hình chính**
- `src/config/api.ts` - Chứa API client và endpoints

### 2. **File Biến môi trường**
- `.env` - Cấu hình môi trường cục bộ
- `.env.example` - Template cho file .env

## 🚀 Cách sử dụng

### Ví dụ 1: Sử dụng AuthService (Authentication)

```typescript
import { authService } from '@/utils/authService'

// Đăng nhập
const result = await authService.login({
  email: 'user@example.com',
  password: 'password123'
})

// Đăng xuất
await authService.logout()
```

### Ví dụ 2: Sử dụng API Client trực tiếp

```typescript
import { apiClient, API_ENDPOINTS } from '@/config/api'

// GET request
const floors = await apiClient.get(API_ENDPOINTS.FLOORS_GET_ALL)

// POST request
const newFloor = await apiClient.post(API_ENDPOINTS.FLOORS_CREATE, {
  name: 'Floor 1',
  capacity: 50
})

// PUT request
const updated = await apiClient.put(API_ENDPOINTS.FLOORS_UPDATE, {
  id: 1,
  name: 'Updated Floor 1'
})

// DELETE request
await apiClient.delete(API_ENDPOINTS.FLOORS_DELETE)
```

## ✅ Checklist

- [x] Cấu hình API client
- [x] Tạo authentication service
- [x] Cấu hình environment variables
- [ ] Tích hợp AuthService vào AuthContext
- [ ] Tạo các service khác (floors, users, etc.)
- [ ] Test kết nối backend

## 🔧 Backend Requirements

Đảm bảo backend đang chạy trên:
- **URL**: http://localhost:5264
- **Swagger**: http://localhost:5264/swagger/index.html
- **API Base**: http://localhost:5264/api

## 📝 Ghi chú

- Token JWT được lưu trong `localStorage` với key `auth_token`
- Refresh token được lưu trong `localStorage` với key `refresh_token`
- Nếu nhận được lỗi 401, user sẽ được chuyển hướng về `/login`

## 🆘 Troubleshooting

Nếu gặp lỗi CORS:
1. Kiểm tra backend có cấu hình CORS cho frontend không
2. Xác nhận URL backend là đúng
3. Kiểm tra network tab trong DevTools

Nếu kết nối bị từ chối:
1. Đảm bảo backend đang chạy
2. Kiểm tra port 5264 có đúng không
3. Sử dụng Swagger UI để test API: http://localhost:5264/swagger/index.html
