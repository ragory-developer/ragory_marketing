# Authentication & Permissions

Security and access control are critical parts of the Marketing Portal. The system implements a robust Role-Based Access Control (RBAC) combined with dynamic, module-level permissions.

## 1. Authentication Flow
- **Library**: `jose` (for JWT) and `bcryptjs` (for password hashing).
- **Mechanism**: Stateless JWTs stored in HTTP-Only cookies.
- **Flow**:
  1. User submits credentials to `/api/auth/login`.
  2. Server verifies the password and generates a JWT containing the user's `id`, `username`, and `role`.
  3. The JWT is set as an `auth_token` cookie.
  4. Subsequent requests include this cookie automatically.

## 2. Route Protection (`proxy.ts`)
The project utilizes Next.js middleware (customized as `proxy.ts` in the root).
- **Public Routes**: `/api/auth/*`, `/login`, `/`. If a logged-in user hits these, they are redirected to `/dashboard`.
- **Protected Routes**: All other routes require a valid `auth_token`. Unauthenticated users are redirected to `/login`.
- **Admin-Only Routes**: Routes starting with `/settings` or `/permissions` check the JWT payload. If the `role` is not `SUPER_ADMIN`, the user is immediately redirected back to `/dashboard`.

## 3. Role-Based Access Control (RBAC)
The `User` model defines two roles:
- **`SUPER_ADMIN`**: Unrestricted access. Can manage other users, view global settings, and modify permissions.
- **`EMPLOYEE`**: Restricted access. Can only access modules explicitly granted to them.

## 4. Granular Permissions (The `Permission` Table)
While Roles handle high-level access, the `Permission` table handles module-level access for Employees.
- **Structure**: Maps a `userId` to a `navKey` (e.g., `calls`, `clients`, `sheets`).
- **Frontend Enforcement**: The `SideNav.tsx` component fetches the user's permissions and only renders the navigation links they have `canAccess: true` for.
- **Backend Enforcement**: APIs verify that the requesting user has the appropriate permission record before returning module-specific data.
- **Management**: Only a `SUPER_ADMIN` can visit the `/permissions` page to toggle access on/off for individual employees.
