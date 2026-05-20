# Marketing Portal - Technical Documentation

## 1. Project Overview
The **Marketing Portal** is a high-end, custom-built CRM and operations management system designed for marketing teams. It simplifies client acquisition, tracking, and team collaboration by providing a centralized dashboard for managing prospects, logging activities, and integrating with external tools like Google Sheets.

### Key Objectives:
- **Centralized CRM**: Track client lifecycles from Prospect to Converted Client.
- **Team Collaboration**: Granular permission system for employees and admins.
- **Activity Auditing**: Detailed logs of every interaction (calls, visits, etc.).
- **External Integration**: Direct management and synchronization with Google Sheets.

---

## 2. Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Vanilla CSS with Modern Glassmorphism & Animations
- **Authentication**: JWT-based cookie authentication
- **External APIs**: Google Sheets API, Google OAuth 2.0

---

## 3. Database Structure & Relations

### Core Models:
1.  **User**:
    - Stores credentials, names, and roles (`SUPER_ADMIN`, `EMPLOYEE`).
    - **Relations**: Owns clients, notes, sheets, and permissions.
2.  **Client**:
    - The heart of the CRM. Stores shop names, contact info, status (`PROSPECT`, `INTERESTED`, etc.), and priority.
    - **Relations**: Linked to a `Market`, assigned to a `User`, and has many `ClientNotes`.
3.  **ClientNote**:
    - Logs specific interactions.
    - **Fields**: `type` (CALL, VISIT, FOLLOW_UP, etc.), `content`, and a custom `feedbackRating` (1-10).
4.  **GoogleSheet**:
    - Tracks spreadsheet metadata for integration.
    - **Relations**: Tracks which cells (`SheetCell`) belong to which sheet.
5.  **Permission**:
    - A join table linking `Users` to specific `navKeys` (e.g., `clients`, `sheets`) to control UI access.

### Relationship Diagram (Simplified):
- `User` 1:N `Client` (Assigned/Created)
- `Client` 1:N `ClientNote`
- `Client` 1:N `CallLog`
- `Market` 1:N `Client`
- `GoogleSheet` 1:N `SheetCell`

---

## 4. Role & Permission System

### Roles:
- **SUPER_ADMIN**: Full access to all modules, system settings, employee management, and permission overrides.
- **EMPLOYEE**: Restricted access based on assigned permissions.

### Permission Logic:
The system uses a combination of Proxy logic and Component-level checks:
- **Proxy (proxy.ts)**: Blocks access to sensitive API routes and pages (like `/settings` and `/permissions`) for non-admins.
- **SideNav Filtering**: Dynamically hides navigation links based on the `permissions` array stored in the user session.
- **Action Level**: Only authors or admins can edit certain records.

---

## 5. Main Components & Modules

### Dashboard (`/dashboard`)
Displays high-level statistics:
- Total Clients vs. Converted Clients.
- Recent activities and conversion rates.

### Client Management (`/clients`)
- **Listing**: Searchable, filterable table with status-based color coding.
- **Details**: Comprehensive view of client data, activity history, and a quick-log form to update statuses and ratings.

### Google Sheets Module (`/sheets`)
- Allows users to link and manage Google Spreadsheets directly from the portal.
- Tracks cell-level data changes for auditing.

### Employee Management (`/employees` & `/permissions`)
- Admin tools to create new users and toggle specific module access (e.g., giving an employee access to 'Clients' but not 'Sheets').

---

## 6. Functional Workflows

### Adding/Updating a Client:
1. High-level info (Name, Phone, Market) is entered.
2. The user can log an "Activity" which automatically updates the client's `status` and `lastFollowUpAt`.
3. Feedback scores (1-10) are used to prioritize high-potential leads.

### Permission Management:
1. Super Admin visits the Permissions page.
2. Selects an Employee.
3. Toggles access for specific navigation keys (e.g., `calls`, `sheets`).
4. Changes take effect on the employee's next page load/session refresh.

---

## 7. Developer Instructions (Future AI/Humans)

### Environment Setup:
- Requires `DATABASE_URL` for PostgreSQL.
- Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and various `REFRESH_TOKENS` in the `settings` table for Google integration.

### Modifying Schema:
1. Update `prisma/schema.prisma`.
2. Run `npx prisma generate` and `npx prisma db push` (or create a migration).

### Adding a New Module:
1. Create a new route group in `app/(dashboard)`.
2. Add a new `key` to the `NAV_GROUPS` constant in `components/SideNav.tsx`.
3. Ensure the `proxy.ts` includes the new path if it requires special protection.

---

## 8. Assessment & Recommendations
- **Robustness**: The schema is well-designed with proper auditing fields (`createdAt`, `createdBy`).
- **UI Performance**: Client listing uses glassmorphism; ensure virtualization is used if the client count exceeds 1000 records.
- **Security**: Authentication is handled via secure HTTP-only cookies and JWT verification.
