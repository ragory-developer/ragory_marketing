# Frontend Architecture

The frontend is built using Next.js 14 App Router, focusing on a clean, modern Glassmorphism UI using vanilla CSS.

## 1. Route Groups
The `app/` directory uses route groups (folders in parentheses) to organize layouts without affecting the URL path.

### `(auth)`
- Contains the `/login` page.
- Uses a minimal layout designed for authentication.

### `(dashboard)`
- The core application interface. All routes here share the main application layout (`layout.tsx`) which includes the `SideNav` and `TopBar`.
- **`/dashboard`**: The landing view post-login. Displays high-level analytics and `DashboardClient.tsx`.
- **`/clients`**: Displays lists of clients. Includes a detailed view page (`/clients/[id]`) to see full client history, activity logs, and edit statuses.
- **`/calls`, `/employees`, `/permissions`, `/settings`, `/sheets`**: Module-specific pages rendering data tables and forms for their respective entities.

## 2. Global Styling (`globals.css`)
Unlike typical Tailwind projects, this project relies heavily on vanilla CSS for a highly customized aesthetic:
- **CSS Variables**: Defines an extensive palette of colors, gradients, and UI tokens.
- **Glassmorphism**: Utilities like `.glass-panel` create semi-transparent backgrounds with backdrop filters.
- **Animations**: Custom keyframes for smooth micro-interactions (hover states, modal popups, toast notifications).

## 3. Shared Components (`/components`)
- **`TopBar.tsx`**: Contains the application title, breadcrumbs/context, and user profile snippet.
- **`SideNav.tsx`**: The main navigation menu. It defines a `NAV_GROUPS` constant. It filters these groups based on the logged-in user's permissions, ensuring employees only see the modules they have been granted access to.
- **`DashboardClient.tsx`**: A client-side component handling the interactive portions of the dashboard charts/data display.

## 4. State & Data Fetching
- **Server Components**: Used extensively to fetch data directly from the Prisma database on the server side, ensuring fast initial loads and high security.
- **Client Components**: Used (`"use client"`) only where interactivity is required (forms, stateful tables, modals).
- **Toast Notifications**: Handled via `react-hot-toast` for user feedback on actions (e.g., "Client updated successfully").
