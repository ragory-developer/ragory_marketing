# Marketing Portal - Project Overview

## 1. Introduction
The **Marketing Portal** is a custom-built CRM and operations management system tailored for marketing teams. Its core purpose is to streamline client acquisition, track interactions, and facilitate team collaboration through a centralized dashboard. It manages prospects, activity logs, and integrates heavily with external tools such as Google Sheets.

## 2. Key Objectives
- **Centralized CRM**: End-to-end tracking of client lifecycles (from Prospect to Converted).
- **Team Collaboration**: Employee and Admin roles with granular, module-specific permissions.
- **Activity Auditing**: Detailed logs of every call, visit, and interaction with built-in rating systems.
- **External Integration**: Direct Google Sheets management and automated synchronization directly from the portal.

## 3. Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Vanilla CSS (Global styles with modern Glassmorphism, variables, and animations)
- **Authentication**: Custom JWT-based HTTP-only cookies (using `jose`)
- **External APIs**: Google Sheets API, Google OAuth 2.0 (`googleapis`)

## 4. High-Level Architecture
- **Frontend**: Utilizes Server Components and Client Components in the Next.js App Router. State and layouts are managed via standard React patterns, styled with plain CSS (`globals.css`).
- **Backend API**: Next.js Route Handlers (`app/api/...`) handle database interactions, third-party integrations, and authentication logic.
- **Middleware / Proxy**: Protects routes ensuring only authenticated users and authorized roles (e.g., `SUPER_ADMIN`) access specific modules.
- **Database Layer**: Managed entirely by Prisma ORM, tracking relationships between users, clients, logs, and integrated spreadsheet cells.

## 5. Development & Deployment
- Uses standard Next.js build tools (`npm run dev`, `npm run build`).
- Seed scripts are provided (`npm run db:seed`) to populate initial data.
- Nixpacks configuration (`nixpacks.toml`) is included for seamless containerized deployment (likely on platforms like Railway or Vercel).
