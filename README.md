# SMC Room Booking System
## ระบบจองห้องประชุม SMC 601 & SMC 605

A modern, production-ready room reservation system built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

---

## ✨ Features

- 🏠 **Main Dashboard** — Room status + interactive calendar with reservation dots
- 📅 **Reserve Room** — Date picker, time slot selection with conflict prevention
- 🔐 **Authentication** — Google OAuth + Email/Password with email verification
- 📋 **My Reservations** — View, filter, and cancel your bookings
- 📊 **Statistics** — Monthly analytics, heatmaps, and usage charts
- 📱 **Responsive** — Optimized for mobile and desktop
- 🖥️ **Smartboard toggle** — Option to request smartboard when booking

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd smc-booking
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the entire contents of `supabase-schema.sql`
3. Go to **Authentication > Providers** and enable **Google OAuth**:
   - Get credentials from [Google Cloud Console](https://console.cloud.google.com)
   - Add your site URL and redirect URL: `https://yourproject.supabase.co/auth/v1/callback`
4. Go to **Authentication > URL Configuration** and set:
   - Site URL: `https://your-vercel-domain.vercel.app`
   - Redirect URLs: `https://your-vercel-domain.vercel.app/auth/callback`

### 3. Configure Environment Variables
```bash
cp .env.local.example .env.local
```
Fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` = your Vercel URL
4. Deploy!

After deploying, update Supabase Auth settings with your Vercel domain.

---

## 🗄️ Database Schema

The app uses these Supabase tables:
- **profiles** — User profiles (auto-created on signup)
- **rooms** — The two rooms: SMC 601 and SMC 605
- **reservations** — All bookings with date, time, room, user, smartboard flag

---

## 📁 Project Structure
```
smc-booking/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── reserve/page.tsx      # Book a room
│   ├── my-reservations/      # User's bookings
│   ├── statistics/           # Analytics
│   └── auth/
│       ├── login/page.tsx    # Login/Register
│       └── callback/route.ts # OAuth callback
├── components/
│   └── Navbar.tsx
├── lib/supabase/
│   ├── client.ts             # Browser client
│   ├── server.ts             # Server client
│   └── middleware.ts         # Auth middleware
├── types/index.ts            # TypeScript types
├── supabase-schema.sql       # Run this in Supabase!
└── middleware.ts             # Route protection
```

---

## 🛡️ Security

- Row Level Security (RLS) enabled on all tables
- Users can only cancel their own reservations
- All reservations are publicly viewable (for room availability)
- Protected routes redirect to login

---

## 🎨 Tech Stack

| Technology | Usage |
|------------|-------|
| Next.js 14 | App Router, SSR |
| Supabase | Database, Auth, RLS |
| Tailwind CSS | Styling |
| TypeScript | Type safety |
| date-fns | Date manipulation |
| Sonner | Toast notifications |
| Lucide React | Icons |
| Vercel | Deployment |
