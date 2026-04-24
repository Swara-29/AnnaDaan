# AnnaDaan - Hyperlocal Food Surplus Network

Production-ready MVP scaffold for India-focused food redistribution:

- Donor creates donations
- NGOs browse nearby donations and accept
- Volunteers/admin flows are ready for phase extension
- Realtime donation events via Socket.io
- Geospatial search with MongoDB `2dsphere` index
- Frontend is mobile-first React + Tailwind with PWA support

## Monorepo Structure

- `frontend/` - React + Vite + Tailwind + Zustand + PWA
- `backend/` - Node.js + Express + Mongoose + Socket.io

## Quick Start

### 1) Backend

1. Copy `backend/.env.example` to `backend/.env`
2. Start MongoDB locally (or use cloud URI)
3. Run:

```bash
cd backend
npm install
npm run dev
```

Backend base URL: `http://localhost:5000/api`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

Set optional `frontend/.env`:

```bash
VITE_API_URL=http://localhost:5000/api
```

## Implemented API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/admin/stats` (admin only)
- `GET /api/admin/users` (admin only)
- `GET /api/admin/donations` (admin only)
- `GET /api/admin/activity` (admin only)
- `POST /api/donations/create`
- `GET /api/donations/nearby`
- `POST /api/donations/accept`
- `POST /api/delivery/update-status`
- `GET /api/dashboard`

## Auth and Admin Notes

- Registration for public users supports roles: donor/ngo/volunteer only
- Login uses the same page for all users (`phone/email + password`)
- JWT-based auth protects admin APIs via `verifyToken + isAdmin`
- Admin account is hidden from UI and should be created via seed:

```bash
cd backend
npm run seed:admin
```

- Offline-first setup is prepared through `vite-plugin-pwa`
- Smart matching can be layered over `GET /donations/nearby` scoring
