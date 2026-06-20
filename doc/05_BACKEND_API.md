# Backend API Endpoints

The project uses Next.js Route Handlers (`app/api/...`) to provide RESTful endpoints for the frontend components. Below is a map of the API structure.

## Base Path: `/api`

### `/auth`
Handles user authentication and session management.
- **`/auth/login`**: POST endpoint. Validates `username` and `password` against the database via `bcryptjs`, and sets an HTTP-only JWT cookie (`auth_token`) via the `jose` library if successful.
- **`/auth/logout`**: Clears the `auth_token` cookie.
- **`/auth/me`**: Returns the current logged-in user's profile and permissions based on the active JWT.
- **`/auth/google`**: Handles Google OAuth flows for Google Sheets integration.

### `/clients`
- **`/clients`**: GET list of clients, POST to create a new client.
- **`/clients/[id]`**: GET single client details, PUT to update status/info, DELETE to remove.

### `/calls`
- **`/calls`**: Endpoints to log phone calls (`CallLog` creation) and retrieve call histories for specific clients or users.

### `/sheets`
- **`/sheets`**: GET list of integrated Google Sheets. POST to initiate a new synchronization.
- **`/sheets/[id]`**: Manage specific spreadsheet configurations or fetch cached `SheetCell` data.

### `/users`, `/employees`, `/permissions`
- API endpoints strictly protected by role checks (must be `SUPER_ADMIN`). Used to create new employee accounts, update passwords, and toggle module access in the `Permission` table.

### `/health`
- Simple health check endpoint to verify the API is responsive.

### `/markets`, `/sms`
- Endpoints for managing regions/markets and potentially sending SMS updates (if configured).

## Security & Validation
All API routes inside `/api` (except `/api/auth/login`) expect a valid HTTP-only cookie. The proxy (`proxy.ts`) ensures that requests reaching these endpoints are pre-validated, though the route handlers may perform secondary validation to verify specific data ownership.
