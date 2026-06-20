# Folder Structure & File Map

This document explains the root folder structure and the purpose of each directory in the repository.

## Root Directory (`/`)
- **`app/`**: Contains the Next.js App Router frontend pages and backend API routes.
- **`components/`**: Reusable React components used across multiple pages.
- **`lib/`**: Core utilities and helper functions (e.g., Database client, Auth helpers, Google API helpers).
- **`prisma/`**: Database schema definition and seed scripts for Prisma ORM.
- **`scripts/`**: Standalone automation and utility scripts (e.g., syncing data, fixing credentials).
- **`proxy.ts`**: Contains route protection and middleware logic, validating JWT tokens and redirecting based on roles/authentication status.
- **`globals.css`**: (Located inside `app/`) Contains all the vanilla CSS tokens, glassmorphism utilities, and animations used throughout the app.
- **`package.json`**: Lists all project dependencies (`next`, `prisma`, `jose`, `googleapis`, etc.) and NPM scripts.
- **`nixpacks.toml`**: Deployment configuration file for containerized environments.
- **`PROJECT_DOCUMENTATION.md`**: The original high-level technical documentation.

## Detailed Folder Breakdown

### `/app`
- **`/(auth)`**: Route group for public authentication pages (e.g., `/login`).
- **`/(dashboard)`**: Protected route group containing the main CRM application.
  - `/calls`: Call logs module.
  - `/clients`: Client listing and details module.
  - `/dashboard`: Main statistics and overview screen.
  - `/employees`: User management module for admins.
  - `/permissions`: Access control module for admins.
  - `/settings`: System configuration module.
  - `/sheets`: Google Sheets integration module.
- **`/api`**: Backend Next.js Route Handlers exposing RESTful endpoints.

### `/components`
- **`DashboardClient.tsx`**: Client-side interactive component for the main dashboard view.
- **`SideNav.tsx`**: The main navigation sidebar. Contains logic to hide/show links based on user permissions.
- **`TopBar.tsx`**: The top header, typically containing user profile information, logout buttons, and global actions.

### `/lib`
- **`auth.ts`**: JWT token generation and verification using the `jose` library.
- **`google.ts`**: Wrappers for `googleapis` to authenticate and interact with Google Sheets.
- **`prisma.ts`**: Singleton initialization of the Prisma Client to prevent multiple instances in development.

### `/prisma`
- **`schema.prisma`**: The single source of truth for the PostgreSQL database structure.
- **`seed.ts`**: Script to seed the database with initial dummy data or an initial Super Admin user.
