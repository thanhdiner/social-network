# 🌐 Social Network — Full-Stack Social Media Platform

<div align="center">

![Tech Stack](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

Nền tảng mạng xã hội hiện đại với đầy đủ tính năng — bài viết, reels, stories, chat real-time, thông báo, và tích hợp AI.

</div>

---

## ✨ Tính năng nổi bật

### 📝 Bài viết (Posts)
- Tạo bài viết với ảnh (tối đa 10), video, và văn bản
- **Privacy/Visibility**: Công khai · Bạn bè · Chỉ mình tôi
- Kéo-thả ảnh/video vào modal
- **Cảm xúc/Mood**: Chọn emoji để gắn tâm trạng vào bài
- **Vị trí**: Tự động lấy địa điểm qua Geolocation API
- **Gắn thẻ bạn bè**: Tìm kiếm và tag @mention
- **AI Writing Tools**: Hoàn chỉnh văn bản & cải thiện nội dung với Gemini AI
- Like với 6 loại reaction (❤️ 😂 😮 😢 😡 👍), bình luận, chia sẻ, lưu bài
- Chỉnh sửa & xoá bài viết

### 🎬 Reels
- Upload và xem video dạng short-form
- Sidebar bình luận trượt ra, không đè header
- Like, chia sẻ bài viết từ reel

### 📖 Stories
- Stories 24 giờ tự hết hạn

### 💬 Chat Real-time
- Nhắn tin 1-1 qua Socket.io
- Gửi ảnh, video, file, giọng nói, sticker
- Trả lời tin nhắn (reply), ghim tin nhắn
- Gọi thoại / video call (WebRTC + SimplePeer)
- Tuỳ chỉnh giao diện hội thoại (theme, emoji, biệt danh)
- Tắt thông báo cuộc trò chuyện

### 🔔 Thông báo
- Real-time qua Socket.io cho like, comment, follow, message
- Đánh dấu đã đọc từng thông báo hoặc tất cả

### 👤 Hồ sơ người dùng
- Ảnh đại diện, ảnh bìa, bio, thông tin cá nhân
- Life Events (công việc, học vấn, mối quan hệ, địa điểm...)
- Tab Bài viết · Ảnh · Reels

### 🔍 Tìm kiếm
- Tìm người dùng và bài viết

### 🛡️ Admin Panel (tách biệt hoàn toàn)
- Dashboard với biểu đồ tăng trưởng
- Quản lý Users, Posts, Reels, Comments
- Tạo/sửa/xoá nội dung, export CSV
- JWT riêng (`adminToken`) — không dùng chung với user

---

## 🗂️ Cấu trúc dự án

```
social-network/
├── client/                   # React 19 + Vite + TailwindCSS
│   └── src/
│       ├── components/
│       │   └── shared/       # CreatePostCard, EditPostModal, FeedPosts...
│       ├── contexts/          # AuthContext, ThemeContext
│       ├── hooks/             # useTitle, useSocket...
│       ├── pages/
│       │   ├── Home/
│       │   ├── Profile/
│       │   ├── Reels/
│       │   ├── Chat/
│       │   ├── Stories/
│       │   ├── Notifications/
│       │   ├── Search/
│       │   ├── Admin/         # AdminDashboard, AdminUsers, AdminPosts...
│       │   └── ...
│       └── services/          # postService, userService, geminiService...
│
└── server/                   # NestJS 11
    ├── prisma/
    │   └── schema.prisma      # Database schema
    └── src/
        ├── auth/              # JWT auth, refresh tokens
        ├── users/             # Users CRUD, follow, block
        ├── posts/             # Posts, likes, saves, shares
        ├── comments/          # Comments + replies + likes
        ├── reels/             # Reels CRUD
        ├── stories/           # Stories
        ├── chat/              # WebSocket gateway + messages
        ├── notifications/     # Real-time notifications
        ├── search/            # Full-text search
        ├── gemini/            # Gemini AI integration
        ├── upload/            # Cloudinary image/video upload
        ├── admin/             # Admin endpoints
        └── life-events/       # Profile life events
```

---

## 🛠️ Tech Stack

### Frontend (Client)
| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| React | 19 | UI Framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool |
| TailwindCSS | 4 | Styling |
| React Router | 7 | Routing |
| Axios | 1.12 | HTTP client |
| Socket.io Client | 4.8 | Real-time |
| Framer Motion | 12 | Animations |
| Lucide React | 0.548 | Icons |
| Sonner | 2 | Toast notifications |
| date-fns | 4 | Date formatting |
| SimplePeer | 9 | WebRTC |
| RecordRTC | 5.6 | Audio recording |

### Backend (Server)
| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| NestJS | 11 | Backend Framework |
| TypeScript | 5.7 | Type safety |
| Prisma | 6.18 | ORM |
| PostgreSQL | — | Database (Supabase) |
| Socket.io | — | WebSocket |
| JWT / Passport | — | Authentication |
| Cloudinary | 2 | Media storage |
| Redis (Upstash) | — | Caching |
| Nodemailer | 7 | Email |
| Gemini AI | 0.24 | AI features |
| bcrypt | 6 | Password hashing |
| class-validator | 0.14 | DTO validation |

---

## ⚙️ Hướng dẫn cài đặt

### Yêu cầu
- Node.js ≥ 20
- npm ≥ 10
- PostgreSQL (hoặc tài khoản Supabase)
- Tài khoản Cloudinary
- Redis (hoặc tài khoản Upstash)
- Gemini API key

### 1. Clone repo
```bash
git clone https://github.com/thanhdiner/social-network.git
cd social-network
```

### 2. Cài đặt Server
```bash
cd server
npm install
```

Tạo file `.env` trong `server/`:
```env
# Database (Supabase)
DATABASE_URL="postgresql://user:password@host:5432/postgres?sslmode=require"

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
ADMIN_JWT_SECRET=your_admin_secret

# Server
PORT=3000
NODE_ENV=development

# Redis (Upstash)
REDIS_HOST=your-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true

# CORS
CLIENT_URL=http://localhost:3001

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
MAIL_USER=your@gmail.com
MAIL_PASS=your_app_password

# Gemini AI
GEMINI_API_KEY=your_gemini_key
```

Chạy database migration:
```bash
npx prisma db push
# hoặc
npx prisma migrate dev
```

Khởi động server:
```bash
npm run start:dev
```

### 3. Cài đặt Client
```bash
cd ../client
npm install
```

Tạo file `.env` trong `client/`:
```env
VITE_API_URL=http://localhost:3000
```

Khởi động client:
```bash
npm run dev
```

### 4. Truy cập
| URL | Mô tả |
|---|---|
| `http://localhost:3001` | Ứng dụng chính |
| `http://localhost:3001/admin` | Trang admin |
| `http://localhost:3000` | API server |

---

## 🗃️ Database Schema (tóm tắt)

```
User ──┬── Post (visibility: public/friends/private)
       ├── Comment
       ├── Like / CommentLike
       ├── Follow
       ├── Block
       ├── Message
       ├── Notification
       ├── Story
       ├── Reel
       ├── LifeEvent
       └── SavedPost / Share
```

---

## 🚀 Scripts hữu ích

### Server
```bash
npm run start:dev        # Dev mode (watch)
npm run start:prod       # Production
npm run prisma:studio    # Prisma Studio (DB GUI)
npm run prisma:push      # Sync schema to DB
npm run prisma:generate  # Regenerate Prisma client
```

### Client
```bash
npm run dev     # Dev server
npm run build   # Production build
npm run lint    # ESLint check
```

---

## 📸 Tính năng AI

Tích hợp **Google Gemini AI** cho:
- **Hoàn chỉnh văn bản** (Complete with AI) — tự động viết tiếp nội dung
- **Cải thiện nội dung** (Improve with AI) — nâng cao chất lượng văn phong

---

## 🔐 Bảo mật

- JWT Access + Refresh token (httpOnly cookie)
- Admin panel có JWT riêng biệt (`adminToken`)
- Password hashing với bcrypt
- Rate limiting với NestJS Throttler
- CORS cấu hình strict theo domain

---

## 📄 License

MIT © 2024 — Social Network Project
