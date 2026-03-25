# Social Network

Nền tảng mạng xã hội full-stack gồm frontend React và backend NestJS, có realtime chat/thông báo với Socket.IO, upload media qua Cloudinary, quản trị admin riêng và tích hợp Gemini AI.

## Tong Quan

- Client: React 19 + Vite + TypeScript + Tailwind + shadcn/ui.
- Server: NestJS 11 + Prisma + PostgreSQL.
- Realtime: Socket.IO cho chat, notification và các sự kiện tức thời.
- Admin: Khu vực quản trị tách biệt với JWT riêng, có 2FA qua email.

## Tinh Nang Chinh

- Dang ky, dang nhap, quan ly ho so nguoi dung.
- Dang bai viet, reaction, comment, share, save.
- Reels, stories, life events, tim kiem.
- Chat realtime (text, media, file, voice), call metadata.
- Notification realtime.
- Admin dashboard: quan ly users, posts, reels, comments, sessions.
- 2FA cho admin bang OTP email trong luong dang nhap.

## Cau Truc Thu Muc

```text
social-network/
├── client/                       # React app
│   ├── src/components/
│   ├── src/pages/
│   ├── src/services/
│   └── vite.config.ts            # dev server port 3001
├── server/                       # NestJS API
│   ├── prisma/schema.prisma
│   └── src/
│       ├── auth/
│       ├── users/
│       ├── posts/
│       ├── comments/
│       ├── reels/
│       ├── stories/
│       ├── chat/
│       ├── notifications/
│       ├── search/
│       ├── admin/
│       ├── upload/
│       └── gemini/
└── README.md
```

## Yeu Cau Moi Truong

- Node.js 20+
- npm 10+
- PostgreSQL
- Tai khoan Cloudinary
- Redis (khuyen nghi)
- Gmail app password (neu can gui mail)
- Gemini API key (neu dung tinh nang AI)

## Cai Dat Nhanh

### 1) Cai dat backend

```bash
cd server
npm install
```

Tao file .env trong thu muc server voi cac bien toi thieu:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/social_network"

PORT=3000
NODE_ENV=development
CLIENT_URL=http://127.0.0.1:3001

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
ADMIN_JWT_SECRET=your_admin_secret
ADMIN_CREATE_SECRET=your_admin_create_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

REDIS_PASSWORD=your_redis_password
REDIS_TLS=true

MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password

GEMINI_API_KEY=your_gemini_api_key
```

Khoi tao Prisma va chay server:

```bash
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

### 2) Cai dat frontend

```bash
cd ../client
npm install
```

Tao file .env trong thu muc client:

```env
VITE_API_URL=http://localhost:3000
VITE_TINYMCE_API_KEY=your_tinymce_api_key
```

Chay frontend:

```bash
npm run dev
```

## Dia Chi Chay Local

- Frontend: http://127.0.0.1:3001
- Backend API: http://localhost:3000
- Admin login: http://127.0.0.1:3001/admin/login

## Scripts Huu Ich

### Backend (server/package.json)

- npm run start:dev
- npm run build
- npm run start:prod
- npm run prisma:generate
- npm run prisma:push
- npm run prisma:migrate
- npm run prisma:studio
- npm run test
- npm run test:e2e

### Frontend (client/package.json)

- npm run dev
- npm run build
- npm run lint
- npm run preview

## Ghi Chu Van Hanh

- Neu Prisma generate bi loi EPERM tren Windows, hay tat cac process Node/Nest dang giu file query engine truoc khi chay lai.
- Client dev server dang bind 127.0.0.1:3001 theo cau hinh trong client/vite.config.ts.
- CORS backend phu thuoc CLIENT_URL, can khop voi dia chi frontend.

## License

UNLICENSED
