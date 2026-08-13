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
* **`x-branch-id`**: `189dc618-8fe1-410f-9ec3-c47026de2206` (*Downtown Main Branch `BD-DT01`*)
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

#### A. Business Owner & Admin Portal (`/admin/*`)
1. **Admin Dashboard (`/admin/dashboard`)**: Real-time KPI summary (Revenue Today, Appointments, Staff on Duty, Pending Invoices), list of today's bookings, and quick cash register modal.
2. **Appointments Calendar (`/admin/appointments`)**: Full calendar & schedule manager. Allows creating new bookings with date/time pickers, customer details, service assignment, stylist selection, and live status editing (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED).
3. **Services Catalog (`/admin/services`)**: Directory of salon services with category filters (Hair, Nails, Facial, Barbering), duration in minutes, CAD pricing, and active status toggles.
4. **Staff & Specialists Directory (`/admin/staff`)**: Specialist cards displaying expertise badges, contact details, and working branch. Includes:
   * **Add Staff Modal**: High-contrast form to register new specialists.
   * **Configure Schedule & Working Hours Modal**: Day-by-day shift manager (Mon–Sun) with active/day-off toggles and start/end shift time selectors.
5. **Invoices & Cash Pay Register (`/admin/invoices`)**: Invoice ledger enforcing **Phase 1 Cash Payments**. Supports recording cash payments directly against customer invoices with automatic ID generation.
6. **Accounting & General Ledger (`/admin/accounting`)**: Trial balance summary, total debits/credits, income statement previews, and chart of accounts.
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

To eliminate browser CORS restrictions and prevent request body/header truncation on POST/PUT requests, all frontend components route through server-side proxy route handlers:

#### 1. Auth Service Proxy
* **Client Path**: `/api/auth-proxy/[...path]`
* **Target Destination**: `http://3.6.123.11:3302/[...path]`
* **File Location**: `src/app/api/auth-proxy/[...path]/route.ts`

#### 2. Core Service Proxy
* **Client Path**: `/api/core-proxy/[...path]`
* **Target Destination**: `http://3.6.123.11:3301/[...path]`
* **File Location**: `src/app/api/core-proxy/[...path]/route.ts`

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

| Page Route | Page Title | Primary Backend APIs Consumed | Local Fallback Storage |
| :--- | :--- | :--- | :--- |
| `/login` | Sign In Portal | `POST /auth/login` | `auth_access_token`, `auth_refresh_token` |
| `/admin/dashboard` | Admin Dashboard | `GET /api/v1/bookings`, `GET /api/v1/staff`, `POST /api/v1/payments` | React State |
| `/admin/appointments` | Appointments Calendar | `GET /api/v1/bookings`, `POST /api/v1/bookings`, `POST /api/v1/bookings/{id}/reschedule` | React State |
| `/admin/staff` | Staff & Working Shifts | `GET /api/v1/staff`, `POST /api/v1/staff`, `POST /api/v1/staff/{id}/expertise` | `custom_staff_directory` |
| `/admin/invoices` | Cash Register Invoices | `GET /api/v1/payments`, `POST /api/v1/payments` | React State |
| `/admin/services` | Services Catalog | `GET /api/v1/services/branches/{id}`, `POST /api/v1/services` | React State |
| `/admin/expenses` | Expenses & Receipts | `GET /api/v1/expenses`, `POST /api/v1/expenses` | React State |
| `/admin/settings` | Theme Studio | `ThemeContext` | `bdiamond_theme_settings` |
| `/customer/book` | Booking Wizard | `GET /api/v1/services`, `GET /api/v1/staff`, `POST /api/v1/bookings` | React State |
| `/customer/profile` | Customer Profile | `GET /users/me`, `GET /api/v1/bookings` | `user_info` |
