# B DIAMOND BEAUTY SALON OS
## Complete Technical Documentation & REST API Reference

---

### Executive Summary

**B Diamond Beauty Salon OS** is a unified, multi-tenant web application engineered for beauty salons and barber shops. Built on **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS**, it integrates real-time appointment scheduling, staff shift configuration, cash register invoicing, general ledger accounting, customer CRM, and dynamic theme customization into a high-performance system.

The system is configured specifically for **B Diamond Beauty Salon** (Phase 1 Canadian Market Deployment), enforcing **Cash-Only payment processing** and multi-tenant isolation.

---

### 1. System Architecture & Multi-Tenancy

```
                                  ┌───────────────────────────────┐
                                  │      Client Web Browser       │
                                  └──────────────┬────────────────┘
                                                 │ HTTP Requests
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │ Next.js App Router (Port 3000)│
                                  └───────┬───────────────┬───────┘
                                          │               │
                     Server-Side Route    │               │ Server-Side Route
                     /api/auth-proxy      │               │ /api/core-proxy
                                          ▼               ▼
                                 ┌──────────────┐   ┌──────────────┐
                                 │ Auth Service │   │ Core Backend │
                                 │  (Port 3302) │   │  (Port 3301) │
                                 └──────────────┘   └──────────────┘
```

#### Multi-Tenancy Identifier Headers
All business logic requests sent to the Core Backend enforce multi-tenant isolation via HTTP request headers:
* **`x-tenant-id`**: `5c9d3520-65a7-4b84-be2f-acc21ea88bb4` (*B Diamond Beauty Salon Tenant*)
* **`x-branch-id`**: `065f43af-56ad-4ce3-91f3-436f024493a7` (*Downtown Main Branch `bd-downtown-main`, 593 King Street — the shop's only branch and the app-wide default; override with `NEXT_PUBLIC_BRANCH_ID`*)
* **`Authorization`**: `Bearer <JWT_ACCESS_TOKEN>`

---

### 2. Design System & Color Schema

The application features a warm luxury design system built around a soft beige canvas, deep earthy rose brand accents, warm elevated cards, and high-contrast typography.

#### Color Tokens & Schema Reference

```css
:root {
  /* Light mode */
  --background: #FAF6F0;
  --foreground: #362E28;
  --primary: #8B3A3A;
  --primary-hover: #6F2C2C;
  --primary-light: #F3E4DE;
  --primary-ring: rgba(139, 58, 58, 0.15);
  --card: #FFFFFF;
  --card-foreground: #362E28;
  --muted: #F1EAE1;
  --muted-foreground: #7A6F62;
  --border: #EAE1D5;
  --border-strong: #D9CCB8;
}

.dark {
  /* Dark mode */
  --background: #17130F;
  --foreground: #F0E9E0;
  --primary: #A84A41;
  --primary-hover: #C15D52;
  --primary-light: rgba(168, 74, 65, 0.12);
  --primary-ring: rgba(168, 74, 65, 0.25);
  --card: #211B16;
  --card-foreground: #F0E9E0;
  --muted: #241D17;
  --muted-foreground: #A69A8C;
  --border: #2C241D;
  --border-strong: #3D3226;
}
```

| Token Name | Light Mode Hex | Dark Mode Hex | Usage & Purpose |
| :--- | :--- | :--- | :--- |
| `--background` | `#FAF6F0` | `#17130F` | Primary warm page canvas background |
| `--foreground` | `#362E28` | `#F0E9E0` | Primary typography & high-contrast headers |
| `--primary` | `#8B3A3A` | `#A84A41` | Brand primary accent (Deep Earthy Rose) |
| `--primary-hover` | `#6F2C2C` | `#C15D52` | Primary button hover & active state |
| `--primary-light` | `#F3E4DE` | `rgba(168, 74, 65, 0.12)` | Soft badge fills & subtle highlights |
| `--primary-ring` | `rgba(139, 58, 58, 0.15)` | `rgba(168, 74, 65, 0.25)` | Focus ring outline shadow |
| `--card` | `#FFFFFF` | `#211B16` | UI Container & card backgrounds |
| `--card-foreground`| `#362E28` | `#F0E9E0` | Container title & body text |
| `--muted` | `#F1EAE1` | `#241D17` | Input background & subtle panel fills |
| `--muted-foreground`| `#7A6F62` | `#A69A8C` | Subtitles, labels, and metadata text |
| `--border` | `#EAE1D5` | `#2C241D` | Soft divider borders |
| `--border-strong` | `#D9CCB8` | `#3D3226` | Card borders & input outlines |

---

### 3. Theme & Branding Customization Studio (`/admin/settings`)

The Theme & Branding Studio provides salon owners with dynamic, real-time customization options. All settings persist locally via `ThemeContext` and `localStorage` (`bdiamond_theme_settings`).

#### A. Dynamic Color Pickers & Live CSS Injections
* **Primary Theme Color**: Native color picker + preset swatches (Earthy Red `#8B3A3A`, Warm Rose `#BE123C`, Royal Gold `#D97706`, Emerald `#059669`).
* **Secondary Theme Color**: Secondary brand accent for badges & subtle container highlights.
* **Accent Color**: Contrast accent color for call-to-action badges.
* **Live DOM Injection**: Updates inject dynamic CSS custom properties (`--theme-primary`, `--theme-secondary`, `--theme-accent`) onto document `:root` element in real-time.

#### B. Store Logo & Favicon Management
* **Store Logo Picker (`logoUrl`)**:
  * Upload custom image file or input external image URL.
  * Includes preset high-res salon logos (`/bdiamond-logo.png`).
  * Automatically updates the Site Header (`Navbar`), Admin Sidebar, and Landing Page.
* **Dynamic Favicon Synchronization**: Replaces `<link rel="icon">` dynamically on state change so browser tabs immediately reflect the active logo.

#### C. Featured Branding Photo (`featuredImageUrl`)
* **Branding Hero Photo**: Upload image or select preset high-resolution salon studio interior photos (`/bdiamond-hero.png`).
* **Landing Page Display**: Dynamically bound to the Hero Banner section on the public homepage (`/`).

#### D. Store Identity Metadata
* **Site Name**: Editable business name (e.g. `B DIAMOND BEAUTY`).
* **Tagline**: Subtitle text for headers (e.g. `Salon & Barber Management OS`).
* **Currency**: Default operational currency (`CAD $`).

---

### 4. Core Modules & Features

#### Public Homepage (`/`)
A server-rendered marketing page for **B Diamond Barbershop** (593 King Street, Fredericton). Contains no invented content:
* **Business facts** (address, phone, email, hours, about text, Facebook) live in `src/lib/business.ts`, copied from the shop's Setmore page.
* **Service menu**: services published in the Core Backend (`status: ACTIVE`, online-bookable) are read server-side by `src/lib/server/publicCatalog.ts` using a dedicated catalog account (`CATALOG_USERID` / `CATALOG_PASSWORD` env vars, see `.env.example`), because the backend has no anonymous endpoints. Only name, description, price, duration and category are exposed. **Until at least one service is ACTIVE**, the page shows the shop's live Setmore menu instead and "Book" links go to Setmore.
* **Reviews carousel**: real reviews and the overall rating are read from the shop's public Setmore page (`src/lib/server/setmore.ts`, refreshed hourly; Setmore also aggregates Google reviews). If that page can't be read, the section is hidden.
* **Booking from the homepage**: while `NEXT_PUBLIC_ONLINE_BOOKING` is not `true`, every "Book" button goes to the shop's Setmore page and `/customer/book` shows a link there, because the backend rejects customer-account bookings until the Auth Service issues each customer's real tenant. Staff/admin booking in `/admin/appointments` is unaffected. Set the flag to `true` once customer bookings work.
* **Availability**: time slots come from the backend availability engine (branch opening hours + one capacity rule per service). New services created or activated in **Admin → Services** get a capacity rule automatically (`NEXT_PUBLIC_SHOP_CAPACITY`, default 3 customers at once). The booking wizard only offers times the engine returns.
* **Leaving a review**: the Core Backend has no reviews module, so customers leave reviews on Setmore (link on the homepage and on each completed visit in `/customer/profile`); new reviews then appear in the carousel.

#### A. Business Owner & Admin Portal (`/admin/*`)
1. **Admin Dashboard (`/admin/dashboard`)**: Real-time KPI summary (Revenue Today, Appointments, Staff on Duty, Pending Invoices), list of today's bookings, and quick cash register modal.
2. **Appointments Calendar (`/admin/appointments`)**: Full calendar & schedule manager. Allows creating new bookings with date/time pickers, customer details, service assignment, stylist selection, and live status editing (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED).
3. **Services Catalog (`/admin/services`)**: Directory of salon services with category filters (Hair, Nails, Facial, Barbering), duration in minutes, CAD pricing, and active status toggles.
4. **Staff & Specialists Directory (`/admin/staff`)**: Specialist cards displaying expertise badges, contact details, and working branch. Includes:
   * **Add Staff Modal**: High-contrast form to register new specialists.
   * **Configure Schedule & Working Hours Modal**: Day-by-day shift manager (Mon–Sun) with active/day-off toggles and start/end shift time selectors.
5. **Payments (`/admin/invoices`)**: A bill is created automatically when an appointment is marked **Done** (customer, service and price come from the booking). The page lists **Unpaid** bills with a one-click **Cash received**, and **Paid** bills with a "give money back" refund. Other sales (e.g. products) go in the Money Book as Money In.
6. **Money Book (`/admin/accounting`)**: Simple bookkeeping for the owner. Record **Money In** (Services, Product sales, Tips, Other income) or **Money Out** (Rent, Supplies, Utilities, Wages, Equipment, Other expense) with an amount, date, cash/bank and an optional note. Shows monthly Money In, Money Out, Profit/Loss and a per-category breakdown. Behind the scenes each entry is posted as a balanced journal to the backend accounting module (`src/lib/moneyBook.ts` picks the accounts), so no chart-of-accounts knowledge is needed. Removing an entry reverses the journal (audit trail is kept). The navbar **Cash In** button records walk-in cash as Money In.
7. **Expenses & Receipts (`/admin/expenses`)**: Track business operating expenses (rent, supplies, utilities) with category tagging and amount inputs.
8. **Payroll Records (`/admin/payroll`)**: Staff payroll log with base salary, commission calculations, and payment posting.
9. **Customers CRM (`/admin/customers`)**: Client directory tracking total visits, spent balance, loyalty points, and VIP membership badges (Silver, Gold, Platinum).
10. **Theme & Branding Studio (`/admin/settings`)**: Theme customization panel to update primary/secondary colors, store logo URL, and featured branding hero image URL.

#### B. Customer Portal & Self-Booking (`/customer/*`)
1. **Self-Booking Wizard (`/customer/book`)**: 4-step booking process:
   * Step 1: Select Service & Category
   * Step 2: Select Specialist Stylist
   * Step 3: Choose Preferred Date & Available Time Slot
   * Step 4: Confirm Booking Summary
2. **Customer Profile (`/customer/profile`)**: Client overview showing upcoming appointments, past visit history, accumulated loyalty points, and active tier badge.

---

### 5. Next.js Server-Side Proxy Handlers

To eliminate browser CORS restrictions, all frontend components route through server-side proxy route handlers. Both proxies are **pure pass-throughs**: they never fabricate tokens, profiles or records, and upstream errors (e.g. `401 Invalid userid or password`) are returned to the browser unchanged. Network failures return `502`/`504`. The core proxy rejects requests without an `Authorization` header (`401`).

#### 1. Auth Service Proxy
* **Client Path**: `/api/auth-proxy/[...path]`
* **Target Destination**: `http://3.6.123.11:3302/[...path]`
* **File Location**: `src/app/api/auth-proxy/[...path]/route.ts`

#### 2. Core Service Proxy
* **Client Path**: `/api/core-proxy/[...path]`
* **Target Destination**: `http://3.6.123.11:3301/[...path]`
* **File Location**: `src/app/api/core-proxy/[...path]/route.ts`

---

#### Authentication & Roles
* Sign-in succeeds only when the Auth Service accepts the credentials; the app then loads `GET /users/me`.
* The app role is derived from the server-provided `roleCode` only: `ROLE_ADMIN` → **Owner/Admin**; staff role codes, or an account linked to an `ACTIVE` staff record (by `userId`/email) → **Staff**; anything else → **Customer**.
* Saved sessions are re-validated against `/users/me` on page load; an invalid/expired session is cleared. Access tokens are refreshed through a single shared refresh request.
* `/admin/*` requires Owner/Admin or Staff. Money Book, Expenses, Payroll and Settings are Owner/Admin only (enforced in `src/app/admin/layout.tsx`).
* Online booking (`/customer/book`) requires a signed-in customer account, because the Core Backend does not answer anonymous requests.

---

### 6. Auth Service API Reference (`http://3.6.123.11:3302`)

The Authentication Service handles user login, token issuance, token renewal, profile retrieval, and password management.

#### `POST /auth/login`
* **Description**: Authenticates user credentials and returns JWT access and refresh tokens.
* **Frontend Caller**: `src/context/AuthContext.tsx` (`login()`)
* **Request Content-Type**: `application/json`
* **Request Body (LoginRequest DTO)**:
```json
{
  "userid": "admin@system.com",
  "password": "123456789"
}
```

#### `POST /auth/refresh`
* **Description**: Rotates access token silently when token TTL approaches expiry.
* **Frontend Caller**: `src/lib/api/client.ts` (`refreshAuthToken()`)
* **Request Body (RefreshTokenRequest DTO)**:
```json
{
  "refreshToken": "800152fa-4444-424c-bebb-9c5aa3919ca1"
}
```

#### `POST /auth/logout`
* **Description**: Invalidates active refresh token on user sign out.
* **Frontend Caller**: `src/context/AuthContext.tsx` (`logout()`)

#### `GET /users/me`
* **Description**: Retrieves current authenticated user profile details.
* **Frontend Caller**: `src/context/AuthContext.tsx`
* **Headers**: `Authorization: Bearer <access_token>`

#### `POST /auth/register`
* **Description**: Registers a new system user account.

#### `POST /auth/forgot-password`
* **Description**: Triggers a password reset OTP for a registered account.

#### `POST /auth/verify-otp`
* **Description**: Verifies a 4-digit OTP code for password recovery.

#### `POST /auth/reset-password`
* **Description**: Resets account password using a validated reset token.

---

### 7. Core Service API Reference (`http://3.6.123.11:3301`)

The Core Service manages staff specialists, working shifts, appointments, cash payments, expenses, and services.

#### `GET /api/v1/staff`
* **Description**: Retrieves staff directory list for active tenant.
* **Frontend Caller**: `src/app/staff/page.tsx`, `src/app/admin/dashboard/page.tsx`
* **Headers**: `x-tenant-id`, `x-branch-id`, `Authorization`

#### `POST /api/v1/staff`
* **Description**: Registers a new staff specialist in the salon.
* **Frontend Caller**: `src/app/staff/page.tsx` (`handleCreateStaff()`)

#### `POST /api/v1/staff/{id}/expertise`
* **Description**: Configures specialist shift hours and working schedule.
* **Frontend Caller**: `src/app/staff/page.tsx` (`handleSaveSchedule()`)

#### `GET /api/v1/bookings`
* **Description**: Fetches list of appointments for calendar display.
* **Frontend Caller**: `src/app/appointments/page.tsx`, `src/app/admin/dashboard/page.tsx`

#### `POST /api/v1/bookings`
* **Description**: Creates a new appointment booking.
* **Frontend Caller**: `src/app/appointments/page.tsx` (`handleCreateBooking()`)

#### `POST /api/v1/bookings/{id}/reschedule`
* **Description**: Updates date, time, or status of an appointment.
* **Frontend Caller**: `src/app/appointments/page.tsx` (`handleSaveEdit()`)

#### `GET /api/v1/payments`
* **Description**: Lists recorded cash register payment entries.
* **Frontend Caller**: `src/app/invoices/page.tsx`

#### `POST /api/v1/payments`
* **Description**: Posts manual cash payment entry against customer invoice.
* **Frontend Caller**: `src/app/invoices/page.tsx`, `src/app/admin/dashboard/page.tsx`

#### `GET /api/v1/expenses`
* **Description**: Lists business operating expenses.
* **Frontend Caller**: `src/app/expenses/page.tsx`

#### `POST /api/v1/expenses`
* **Description**: Records a new operating expense.
* **Frontend Caller**: `src/app/expenses/page.tsx`

#### `GET /api/v1/services/branches/{branchId}`
* **Description**: Fetches available service catalog for a branch.
* **Frontend Caller**: `src/app/services/page.tsx`

#### `POST /api/v1/services`
* **Description**: Adds a new service offering to catalog.
* **Frontend Caller**: `src/app/services/page.tsx`

---

### 8. Summary Table of Frontend Pages & API Mappings

| Page Route | Page Title | Primary Backend APIs Consumed | Browser Storage |
| :--- | :--- | :--- | :--- |
| `/login` | Sign In Portal | `POST /auth/login`, `GET /users/me` | `auth_access_token`, `auth_refresh_token`, `bdiamond_user_info` |
| `/admin/dashboard` | Admin Dashboard | `GET /api/v1/bookings`, `GET /api/v1/staff`, `GET /api/v1/payments` | — |
| `/admin/appointments` | Appointments Calendar | `GET/POST /api/v1/bookings`, `POST /api/v1/customers`, `POST /api/v1/bookings/{id}/reschedule` | — |
| `/admin/staff` | Staff & Working Shifts | `GET /api/v1/staff`, `POST /api/v1/staff`, `POST /api/v1/staff/{id}/expertise` | — |
| `/admin/invoices` | Cash Register Invoices | `GET/POST /api/v1/billing/invoices`, `GET/POST /api/v1/payments` | — |
| `/admin/services` | Services Catalog | `GET /api/v1/services/branches/{id}`, `POST /api/v1/services` | — |
| `/admin/accounting` | Money Book | `GET /api/v1/accounting/accounts`, `GET/POST /api/v1/accounting/journals`, `POST /api/v1/accounting/journals/{id}/reverse` | — |
| `/admin/expenses` | Expenses & Receipts | `GET /api/v1/expenses`, `POST /api/v1/expenses` | — |
| `/admin/settings` | Theme Studio | `ThemeContext` | `bdiamond_theme_settings` |
| `/customer/book` | Booking Wizard (sign-in required) | `GET /api/v1/services/branches/{id}`, `GET /api/v1/staff`, `POST /api/v1/bookings` | — |
| `/customer/profile` | Customer Profile | `GET /users/me`, `GET /api/v1/bookings` | `bdiamond_user_info` |

> All business data lives in the backend. There is no local/offline mock data store.
