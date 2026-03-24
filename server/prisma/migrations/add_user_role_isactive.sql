-- Migration: Thêm field role và isActive vào bảng User
-- Chạy script này trong Supabase SQL Editor

-- Thêm cột role (mặc định 'user')
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

-- Thêm cột isActive (mặc định true)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Cấp quyền admin cho tài khoản đầu tiên (nếu muốn)
-- UPDATE "User" SET "role" = 'admin' WHERE "email" = 'your-admin@email.com';

-- Kiểm tra kết quả
SELECT id, name, email, role, "isActive" FROM "User" LIMIT 5;
