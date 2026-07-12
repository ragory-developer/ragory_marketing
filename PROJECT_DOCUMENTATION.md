# Marketing Portal - Technical Documentation (v2.0)

> [!NOTE]
> This is the updated, comprehensive documentation of the **Marketing Portal** codebase, merging individual component guides and codebase assessments.

---

## 1. Project Overview
The **Marketing Portal** is a high-end, custom-built CRM and operations management system designed for marketing teams. It simplifies client acquisition, tracking, and team collaboration by providing a centralized dashboard for managing prospects, logging activities, and integrating with external tools like Google Sheets.

### Key Objectives:
- **Centralized CRM**: Track client lifecycles from Prospect to Converted Client.
- **Team Collaboration**: Granular permission system for employees and admins.
- **Activity Auditing**: Detailed logs of every interaction (calls, visits, etc.).
- **External Integration**: Direct management and synchronization with Google Sheets.

---

## 2. Folder Structure & Files

- **App Directory**: [app/](file:///D:/MERKETING-PROJECT-IN-HOUSE/app) contains route groups and API routes.
  - `(auth)`: Login route and layout.
  - `(dashboard)`: Dashboard routes like calls, clients, employees, permissions, settings, sheets.
  - `api`: API endpoints for CRM database manipulation and Google integrations.
  - [globals.css](file:///D:/MERKETING-PROJECT-IN-HOUSE/app/globals.css): Vanilla styling variables, animations, and glassmorphism.
- **Components**: Reusable UI blocks in [components/](file:///D:/MERKETING-PROJECT-IN-HOUSE/components).
  - [SideNav.tsx](file:///D:/MERKETING-PROJECT-IN-HOUSE/components/SideNav.tsx): Renders the main sidebar dynamically filtered by user permissions.
  - [TopBar.tsx](file:///D:/MERKETING-PROJECT-IN-HOUSE/components/TopBar.tsx): Shared header with user info, status online indicator, notifications, and logout action.
  - [DashboardClient.tsx](file:///D:/MERKETING-PROJECT-IN-HOUSE/components/DashboardClient.tsx): Client-side wrapper for sidebars, responsiveness, and overlay.
- **Libraries**: Logic modules under [lib/](file:///D:/MERKETING-PROJECT-IN-HOUSE/lib).
  - [auth.ts](file:///D:/MERKETING-PROJECT-IN-HOUSE/lib/auth.ts): JWT verification and signing using the `jose` library.
  - [google.ts](file:///D:/MERKETING-PROJECT-IN-HOUSE/lib/google.ts): Google Sheets API integrations using `googleapis` with settings-based configurations.
  - [prisma.ts](file:///D:/MERKETING-PROJECT-IN-HOUSE/lib/prisma.ts): Singleton wrapper for the database client.
- **Database Schema**: [schema.prisma](file:///D:/MERKETING-PROJECT-IN-HOUSE/prisma/schema.prisma) defines model rules and relations.
- **Scripts**: Automation scripts inside [scripts/](file:///D:/MERKETING-PROJECT-IN-HOUSE/scripts).
  - [sync-emergency-counts.ts](file:///D:/MERKETING-PROJECT-IN-HOUSE/scripts/sync-emergency-counts.ts): Denormalizes client emergency counters.
  - [check-google.js](file:///D:/MERKETING-PROJECT-IN-HOUSE/scripts/check-google.js): Validates OAuth keys setup.
  - [fix-google-creds.js](file:///D:/MERKETING-PROJECT-IN-HOUSE/scripts/fix-google-creds.js): Updates broken credentials in the database.
- **Routing Proxy**: [proxy.ts](file:///D:/MERKETING-PROJECT-IN-HOUSE/proxy.ts) manages route protections and redirects.
- **Detailed Documentation**: Find supplementary files in the [doc/](file:///D:/MERKETING-PROJECT-IN-HOUSE/doc) directory.

---

## 3. Database Structure & Relations
The backend is backed by a PostgreSQL database with Prisma ORM.

### Models:
1.  **User**: Stores credentials, names, and roles (`SUPER_ADMIN`, `EMPLOYEE`).
2.  **Permission**: A join table mapping a `User` to specific navigation keys (`navKey`).
3.  **Setting**: Simple key-value store for system-wide configuration, specifically used to store Google OAuth refresh tokens and Client IDs.
4.  **Client**: CRM entity tracking address, phone, priority, status, ratings, and social URLs.
5.  **ClientNote**: Logs interaction history (calls, visits, follow-ups, complaints, SMS, etc.).
6.  **EmergencyNote**: Urgent notes flagging a client's emergency status.
7.  **CallLog**: Phone dial auditing, log details, and call duration values.
8.  **GoogleSheet**: Tracks spreadsheet metadata for integration.
9.  **SheetCell**: Represents individual cell data within an integrated sheet.

### Key Relationships:
- `User` 1:N `Client` (Assigned/Created)
- `Client` 1:N `ClientNote`
- `Client` 1:N `EmergencyNote`
- `Client` 1:N `CallLog`
- `GoogleSheet` 1:N `SheetCell`

---

## 4. Role & Permission System

### Roles:
- **SUPER_ADMIN**: Full access to all modules, settings, employee control, and permission overrides.
- **EMPLOYEE**: Restricted access based on assigned permissions.

### Permission Logic:
- **Proxy Protection**: [proxy.ts](file:///D:/MERKETING-PROJECT-IN-HOUSE/proxy.ts) intercepts requests and redirects unauthorized roles from admin pages like `/settings` and `/permissions`.
- **SideNav Filtering**: [SideNav.tsx](file:///D:/MERKETING-PROJECT-IN-HOUSE/components/SideNav.tsx) trims navigation options for employee sessions.
- **Route Authorization**: Individual API routes check user permission entries before serving queries.

---

## 5. Main Components & Modules

### Dashboard Overview (`/dashboard`)
Displays campaigns count, budgets, active employee counters, and analytical graphs.

### Client Management (`/clients`)
- Searchable, filterable client lists sorted dynamically.
- Client details views listing all notes, logs, and a status update panel.

### Google Sheets Module (`/sheets`)
- Sync interface for linking external Google Spreadsheets directly to the dashboard.
- Format tracking and caching using the `SheetCell` relation.

### Team Control (`/employees` & `/permissions`)
- Admin managers for registration, access key configuration, and credentials resetting.

---

## 6. Functional Workflows

### Client Status Transitions:
1. New client record initialized as `PROSPECT`.
2. Interaction logged via calls/visits moves status to `CONTACTED` or `INTERESTED`.
3. High feedback ratings prioritize conversions.

### Permission Toggling:
1. Admin visits the permissions panel.
2. Selects an employee and checks/unchecks module keys.
3. Access controls update immediately on the next navigation request.

---

## 7. Developer Instructions

### Environment Setup:
- Requires `DATABASE_URL` pointing to a PostgreSQL server.
- Requires `JWT_SECRET` for signing authentication payloads.
- Requires setup of Google settings table fields (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.) for integrations.

### Operations Commands:
- Run development server: `npm run dev`
- Build production code: `npm run build`
- Populate initial users: `npm run db:seed`
- Push database changes: `npm run db:push`
- Re-generate client: `npm run db:generate`

---

## 8. Current Codebase Issues & Recommendations

> [!WARNING]
> The codebase has several "happy path" assumptions that must be addressed for true enterprise production-readiness.

- **Widespread `any` Types**: Pervasive use of `any` bypasses compilation safety.
  - *Fix*: Replace with Prisma-generated types like `Client`, `CallLog`, or custom TypeScript types.
- **Lack of API Validation**: Request bodies inside routes are destructured without verification. Enums could cause unhandled 500 errors.
  - *Fix*: Integrate validation using libraries like **Zod** to validate schema payloads.
- **Unbounded Queries**: Certain database collections (e.g., `callLogs`) are queried without size constraints.
  - *Fix*: Enforce pagination or `take` parameters on large datasets.
- **Empty `catch` Blocks**: Network failures are caught but swallowed silently.
  - *Fix*: Use `react-hot-toast` prompts to alert the user of network or API issues.
- **Broken Linting Script**: The Next.js linter fails due to structural arguments.
  - *Fix*: Adjust `package.json` lint commands to explicitly point to directories.
