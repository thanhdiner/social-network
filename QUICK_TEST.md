# Quick Test Guide - Frontend

## 1. Khởi động backend
```bash
cd server
npm run start:dev
```

Backend chạy tại: http://localhost:3000

## 2. Khởi động frontend
```bash
cd client
npm run dev
```

Frontend chạy tại: http://localhost:5173

## 3. Test Authentication Flow

### A. Đăng ký tài khoản mới
1. Mở http://localhost:5173
2. Click "Đăng ký ngay"
3. Điền thông tin:
   - Tên: Test User
   - Email: test@example.com
   - Mật khẩu: password123
   - Xác nhận mật khẩu: password123
4. Click "Đăng ký"
5. ✅ Nếu thành công → redirect về trang Home

### B. Kiểm tra token
1. Mở DevTools (F12)
2. Application → Local Storage → http://localhost:5173
3. Xem `accessToken` đã được lưu
4. Application → Cookies → http://localhost:3000
5. Xem `refreshToken` cookie

### C. Kiểm tra Profile
1. Click vào avatar (góc phải header)
2. Xem thông tin user hiển thị

### D. Logout
1. Click icon đăng xuất (màu đỏ) trong header
2. ✅ Redirect về trang login
3. Token đã bị xóa

### E. Đăng nhập lại
1. Ở trang login, điền:
   - Email: test@example.com
   - Mật khẩu: password123
2. Click "Đăng nhập"
3. ✅ Redirect về Home

## 4. Test Auto Token Refresh

### Manual test (Advanced)
1. Đăng nhập thành công
2. Mở DevTools → Application → Local Storage
3. Xóa `accessToken`
4. Refresh trang (F5)
5. ✅ Token tự động refresh, user vẫn đăng nhập

### Hoặc đợi 15 phút
1. Đăng nhập
2. Đợi 15 phút (access token expired)
3. Click vào Profile hoặc bất kỳ action nào
4. ✅ Token tự động refresh, không cần login lại

## 5. Test Protected Routes

### Khi chưa login:
```
http://localhost:5173/         → Redirect to /login
http://localhost:5173/profile  → Redirect to /login
http://localhost:5173/chat     → Redirect to /login
```

### Khi đã login:
```
http://localhost:5173/         → ✅ Home page
http://localhost:5173/profile  → ✅ Profile page
http://localhost:5173/chat     → ✅ Chat page
http://localhost:5173/login    → ✅ Accessible (có thể logout first)
```

## 6. Test Error Handling

### Email đã tồn tại (Register)
1. Đăng ký với email đã dùng
2. ✅ Hiển thị error: "Email đã được sử dụng"

### Sai mật khẩu (Login)
1. Login với sai password
2. ✅ Hiển thị error: "Email hoặc mật khẩu không đúng"

### Email không tồn tại (Login)
1. Login với email chưa đăng ký
2. ✅ Hiển thị error: "Email hoặc mật khẩu không đúng"

### Validation errors
1. Thử register với:
   - Tên < 2 ký tự → Error
   - Email không đúng format → Error
   - Password < 6 ký tự → Error
   - Password không khớp → Error

## 7. Network Debug

### Mở DevTools → Network
1. Filter: Fetch/XHR
2. Xem các requests:

#### Register/Login:
```
POST /auth/register
POST /auth/login
→ Response: { accessToken: "..." }
```

#### Get Profile:
```
GET /users/profile
Header: Authorization: Bearer {token}
→ Response: { id, email, name, ... }
```

#### Refresh Token:
```
POST /auth/refresh
Cookie: refreshToken
→ Response: { accessToken: "..." }
```

#### Logout:
```
POST /auth/logout
→ Response: { message: "Đăng xuất thành công" }
```

## 8. Common Issues

### Issue: CORS error
**Fix**: Kiểm tra backend đã chạy và CORS đã enable

### Issue: Network error / Cannot connect
**Fix**: 
- Kiểm tra backend running (port 3000)
- Kiểm tra VITE_API_URL trong .env

### Issue: Token không được lưu
**Fix**: 
- Kiểm tra withCredentials: true trong api.ts
- Kiểm tra browser không block cookies

### Issue: Infinite redirect loop
**Fix**:
- Clear localStorage
- Clear cookies
- Hard refresh (Ctrl + Shift + R)

## ✅ Checklist hoàn chỉnh

- [ ] Backend chạy thành công
- [ ] Frontend chạy thành công  
- [ ] Đăng ký được
- [ ] Đăng nhập được
- [ ] Token được lưu
- [ ] Profile hiển thị đúng
- [ ] Logout hoạt động
- [ ] Protected routes hoạt động
- [ ] Auto refresh token hoạt động
- [ ] Error handling hiển thị đúng

Nếu tất cả ✅ → Frontend integration hoàn tất! 🎉
