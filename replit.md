# Tryout SNBT 2026 Platform

A full-stack web application for online exam preparation and tryouts for Indonesian university entrance exams (SNBT 2026).

## Project Overview

This is a React + Express full-stack application that provides:
- Online exam tryouts and practice tests
- User authentication via Supabase
- Admin dashboard for managing tryouts and questions
- Transaction management system
- Student dashboard and profile management

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express server integrated with Vite dev server
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **UI Components**: Radix UI + TailwindCSS + Lucide React icons
- **State Management**: Zustand
- **Routing**: React Router 6 (SPA mode)
- **Package Manager**: npm

## Project Structure

```
client/                   # React SPA frontend
├── pages/                # Route components
│   ├── admin/           # Admin pages (dashboard, tryouts, users, etc.)
│   ├── Dashboard.tsx    # Student dashboard
│   ├── Profile.tsx      # User profile
│   ├── TryoutList.tsx   # Tryout list with filters
│   ├── SignIn.tsx       # Login page
│   └── SignUp.tsx       # Registration page
├── components/          # Reusable components
│   ├── ui/             # UI component library
│   └── admin/          # Admin-specific components
├── stores/             # Zustand state stores
│   └── tryoutStore.ts  # Tryout state management
├── App.tsx             # Main app with routing
└── global.css          # TailwindCSS configuration

server/                  # Express API backend
├── index.ts            # Server setup and routes
└── routes/             # API route handlers

shared/                  # Shared TypeScript types
└── api.ts              # API interfaces
```

## Development

### Running Locally

The project runs on port 5000 in development mode:

```bash
npm run dev        # Start dev server (frontend + backend)
```

### Building for Production

```bash
npm run build      # Build both client and server
npm start          # Start production server
```

### Testing

```bash
npm test           # Run Vitest tests
npm run typecheck  # TypeScript validation
```

## Environment Variables

Required environment variables (managed via Replit Secrets):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `VITE_API_URL` - API endpoint URL
- `CLIENT_ORIGIN` - Client origin URL for CORS
- `PING_MESSAGE` - Test message for ping endpoint

## Key Features

- **Student Features**:
  - Browse tryout packages with advanced filtering (category, schedule, status, search)
  - View tryout details including question count, duration, and progress
  - Take online practice exams
  - View results and analytics
  - Manage profile and account

- **Admin Features**:
  - Add and manage tryout packages
  - Create and edit questions
  - View user management
  - Monitor transactions
  - System settings

## API Routes

- `GET /api/ping` - Health check endpoint
- `GET /api/demo` - Demo endpoint
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

## Deployment

The application is configured for autoscale deployment on Replit:
- Build command: `npm run build`
- Run command: `npm start`
- Port: 5000 (frontend and backend integrated)

## Recent Changes

- **2025-10-27**: Tryout List Page Implementation
  - Created TryoutList.tsx page with complete Figma design implementation
  - Implemented 4 filter types: Kategori (SNBT, UTBK, Saintek, Soshum, Campuran), Jadwal (Hari Ini, Minggu Ini, Bulan Ini), Status (Belum Dikerjakan, Sedang Dikerjakan, Selesai), and Search
  - Added tryout_progress table to database for tracking user progress
  - Integrated with Supabase to fetch tryouts, questions count, and user progress
  - Added status badges and progress bars to tryout cards
  - Implemented date-based filtering using date-fns library
  - Added protected route /tryouts for siswa role
  - Created tryoutStore for state management
  
- **2025-10-27**: Initial Replit setup
  - Configured Vite to run on port 5000 with proper host settings
  - Set up HMR (Hot Module Reload) for Replit environment
  - Configured file serving permissions
  - Set up npm as package manager
  - Configured deployment settings
  - All dependencies installed and working

## Architecture Notes

- Single-port development with Vite + Express integration
- Express server runs as middleware in Vite dev server during development
- Production build creates separate client (SPA) and server bundles
- TypeScript throughout for type safety
- Supabase handles authentication and database
- Full hot reload for rapid development
