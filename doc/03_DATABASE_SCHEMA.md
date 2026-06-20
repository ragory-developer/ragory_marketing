# Database Schema & Models

The project uses PostgreSQL with Prisma ORM. Below is a detailed breakdown of the core models defined in `prisma/schema.prisma`.

## 1. User & Access Control
- **`User`**: Represents system users (Admins and Employees).
  - Contains `role` (`SUPER_ADMIN`, `EMPLOYEE`), credentials, and active status.
  - **Relations**: Owns clients, logs, Google Sheets, and permissions.
- **`Permission`**: A join table mapping a `User` to specific navigation keys (`navKey`).
  - Used to dynamically render the sidebar and allow access to modules like `clients`, `sheets`, `calls`.
- **`Setting`**: Simple key-value store for system-wide configuration, specifically used to store Google OAuth refresh tokens and Client IDs.

## 2. Core CRM Models
- **`Client`**: The primary entity in the CRM representing a shop/business.
  - Tracks status (`PROSPECT`, `INTERESTED`, `CLIENTS`, `LOST`, etc.), priority, contact info, rating, and physical location.
  - **Relations**: Linked to a `Market`, assigned to a `User`, and has many `ClientNote`, `EmergencyNote`, and `CallLog` entries.
- **`Market`**: A simple grouping entity (e.g., a city or region) that holds many Clients.

## 3. Auditing & Activity Logs
- **`ClientNote`**: General interactions with a client.
  - Includes a `type` (`CALL`, `VISIT`, `FOLLOW_UP`, `COMPLAINT`, `SMS`) and text content.
- **`CallLog`**: Specific records of phone calls.
  - Tracks the `phoneNumber` dialed, call `duration` (in seconds), and notes.
- **`EmergencyNote`**: High-priority tasks/notes requiring immediate action.
  - Tracks priority and a boolean `isDone` flag to mark completion by a specific user.

## 4. Google Sheets Integration
- **`GoogleSheet`**: Metadata for an integrated Google Spreadsheet.
  - Stores the external `spreadsheetId`, row/col counts, and tracks who created/updated/deleted the integration.
- **`SheetCell`**: Represents individual cell data within an integrated sheet.
  - Stores `row`, `col`, `value`, and styling information (`bold`, `italic`, `fillColor`, `align`) to allow replicating spreadsheet views inside the portal.

## Database Enums
- **`Role`**: `SUPER_ADMIN`, `EMPLOYEE`
- **`ClientStatus`**: `PROSPECT`, `CONTACTED`, `INTERESTED`, `NEGOTIATING`, `CLIENTS`, `LOST`, `INACTIVE`
- **`Priority`**: `LOW`, `MEDIUM`, `HIGH`
- **`NoteType`**: `GENERAL`, `CALL`, `VISIT`, `FOLLOW_UP`, `COMPLAINT`, `SMS`
