# Scripts, Utils & Integrations

The repository includes several standalone scripts and utilities to handle external integrations and data maintenance.

## 1. Google Sheets Integration (`lib/google.ts`)
The portal integrates deeply with Google Sheets, allowing users to sync CRM data with external spreadsheets.
- **Library**: `googleapis`
- **Auth**: Uses OAuth 2.0. The `SUPER_ADMIN` authorizes the application, and the resulting `refresh_token` is stored securely in the `Setting` database table.
- **Functionality**:
  - `google.ts` exports helper functions to instantiate the Google Sheets API client using the stored credentials.
  - Can read/write rows and sync cell formatting (`SheetCell` model) back to the portal's database.

## 2. Standalone Scripts (`/scripts`)
These scripts are run via Node.js/`tsx` to perform administrative or maintenance tasks.

- **`check-google.js`**: A utility script to verify that the Google API credentials and environment variables are correctly configured.
- **`fix-google-creds.js`**: Assists in repairing or updating stored Google OAuth tokens in the database if they expire or become malformed.
- **`sync-emergency-counts.ts`**: A data synchronization script. It likely recounts the active `EmergencyNote` entries for all clients and updates the denormalized `activeEmergencyCount` field on the `Client` table to ensure dashboard statistics remain accurate.

## 3. Database Utilities (`lib/prisma.ts` & `prisma/seed.ts`)
- **`lib/prisma.ts`**: Ensures that only a single instance of the `PrismaClient` is instantiated during development, preventing database connection exhaustion during Next.js Hot Module Replacement (HMR).
- **`prisma/seed.ts`**: Used to initially populate the database. Running `npm run db:seed` will execute this file, typically creating the initial `SUPER_ADMIN` account required to log in to a fresh deployment.
