# Hướng dẫn Hoàn thiện Login & Register API

## ✅ Hoàn thành

Đã tích hợp **Login** và **Register** API với backend tại `http://localhost:5264/api`

## 📋 Các thay đổi

### 1. **AuthService** (`src/utils/authService.ts`)
```typescript
// Login
await authService.login({
  email: "user@example.com",
  password: "password"
})

// Register  
await authService.register({
  userName: "user123",
  fullName: "Nguyễn Văn A",
  email: "user@example.com",
  phoneNumber: "0123456789",
  password: "password",
  confirmPassword: "password"
})
```

### 2. **AuthContext** (`src/context/AuthContext.tsx`)
- Login/Register giờ là **async functions**
- Tự động lưu **JWT token** vào localStorage
- Tự động redirect khi token hết hạn (401)
- Hỗ trợ **refresh token**

### 3. **Login Page** (`src/pages/Login.tsx`)
- ✅ Async login handling
- ✅ Loading state khi đang gửi request
- ✅ Error messages tự động
- ✅ Form fields bị disable khi loading

### 4. **Register Page** (`src/pages/Register.tsx`)
- ✅ Thêm field `phoneNumber`
- ✅ Async register handling
- ✅ Loading state & error handling
- ✅ Auto-login sau khi register thành công

## 🔐 Request/Response Format

### Login
**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "userName": "username",
      "fullName": "Nguyễn Văn A",
      "phoneNumber": "0123456789",
      "role": "user"
    }
  }
}
```

### Register
**Request:**
```json
{
  "userName": "string",
  "fullName": "string",
  "email": "string",
  "phoneNumber": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "userName": "username",
    "fullName": "Nguyễn Văn A",
    "phoneNumber": "0123456789"
  }
}
```

## 🧪 Cách kiểm tra

### 1. Chạy backend
```bash
cd backend/PBMS
dotnet run
```

### 2. Chạy frontend
```bash
cd frontend
npm install  # nếu chưa chạy
npm run dev
```

### 3. Test Login
1. Truy cập: http://localhost:5173/dang-nhap
2. Nhập email & password
3. Kiểm tra DevTools Network tab để xem API call
4. Kiểm tra localStorage xem token được lưu không

### 4. Test Register
1. Truy cập: http://localhost:5173/dang-ky
2. Nhập thông tin đầy đủ
3. Xem response từ backend

## 🔧 Troubleshooting

### CORS Error
Nếu gặp lỗi CORS, kiểm tra backend cấu hình:
```csharp
// Trong Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

### Token không được lưu
Kiểm tra localStorage trong DevTools:
- `auth_token` - JWT token
- `refresh_token` - Refresh token
- `user_email` - Email người dùng
- `user_name` - Tên người dùng
- `user_role` - Role người dùng

### API Response lỗi
Kiểm tra DevTools Console tab xem error message

## 📝 Ghi chú

- Token tự động attach vào request header: `Authorization: Bearer {token}`
- Token hết hạn → tự động redirect `/login`
- Refresh token tự động gọi nếu accessToken hết hạn
- LocalStorage được xóa khi logout

## 🚀 Bước tiếp theo

1. Tạo các API Service khác (Users, Floors, Bookings, etc.)
2. Thêm role-based access control
3. Tạo dashboard cho từng role
4. Thêm loading skeleton screens
5. Tăng cường error handling
