# 📚 Appointask Complete API Documentation Reference

> **Comprehensive API Reference Guide** for frontend integration, API endpoints, parameters, request/response bodies, and authentication workflows.

## 🌐 Service Environments & Base URLs

| Service | Base URL | Documentation / Swagger URL |
| :--- | :--- | :--- |
| **Auth Service** | `http://3.6.123.11:3302` | [Auth Swagger](http://3.6.123.11:3302/swagger-ui/index.html) |
| **Appointask Core Backend** | `http://3.6.123.11:3301` | [Appointask Swagger](http://3.6.123.11:3301/api/docs) |

### 🔐 Authentication & Header Guidelines

1. Obtain JWT access token via Auth Service: `POST http://3.6.123.11:3302/auth/login`.
2. Include token in the `Authorization` header for protected endpoints:
```http
Authorization: Bearer <access_token>
```

## 📑 Quick Navigation Index

- [1. Auth Service (10 APIs)](#1-auth-service-apis-http36123113302)
  - [Authentication](#authentication-auth)
  - [User Management](#user-management-users)
- [2. Appointask Backend Service (222 APIs)](#2-appointask-backend-service-apis-http36123113301)
  - [Accounting (13 APIs)](#accounting)
  - [App (2 APIs)](#app)
  - [Availability (35 APIs)](#availability)
  - [Billing (12 APIs)](#billing)
  - [Bookings (10 APIs)](#bookings)
  - [Branches (5 APIs)](#branches)
  - [Customers (19 APIs)](#customers)
  - [Expenses (13 APIs)](#expenses)
  - [Expertise (5 APIs)](#expertise)
  - [File Upload (6 APIs)](#file-upload)
  - [Overbooking (6 APIs)](#overbooking)
  - [Payments (4 APIs)](#payments)
  - [Payroll (7 APIs)](#payroll)
  - [Resource Types (5 APIs)](#resource-types)
  - [Resources (8 APIs)](#resources)
  - [Service Categories (6 APIs)](#service-categories)
  - [Services (33 APIs)](#services)
  - [Staff (14 APIs)](#staff)
  - [Tenant Customers (7 APIs)](#tenant-customers)
  - [Tenants (15 APIs)](#tenants)
  - [Waitlist (7 APIs)](#waitlist)

---

# 1. Auth Service APIs (`http://3.6.123.11:3302`)

## Authentication (`/auth`)

### `POST /auth/register`

**Description:** register

**Request Body (`application/json`):**

- `name` (`string`) **(required)**
- `userid` (`string`) **(required)**
- `password` (`string`) **(required)**

---

### `POST /auth/login`

**Description:** login

**Request Body (`application/json`):**

- `userid` (`string`) **(required)**
- `password` (`string`) **(required)**

---

### `POST /auth/refresh`

**Description:** refreshToken

**Request Body (`application/json`):**

- `refreshToken` (`string`) **(required)**

---

### `POST /auth/forgot-password`

**Description:** forgotPassword

**Request Body (`application/json`):**

- `userid` (`string`) **(required)**

---

### `POST /auth/verify-otp`

**Description:** verifyOtp

**Request Body (`application/json`):**

- `userid` (`string`) **(required)**
- `otp` (`string`) **(required)**

---

### `POST /auth/reset-password`

**Description:** resetPassword

**Request Body (`application/json`):**

- `resetToken` (`string`) **(required)**
- `newPassword` (`string`) **(required)**
- `confirmPassword` (`string`) **(required)**

---

### `POST /auth/logout`

**Description:** logout

---

## User Management (`/users`)

### `GET /users/me`

**Description:** getCurrentUser

---

### `PUT /users/me/password`

**Description:** changePassword

**Request Body (`application/json`):**

- `oldPassword` (`string`) **(required)**
- `newPassword` (`string`) **(required)**
- `confirmPassword` (`string`) **(required)**

---

### `PUT /users/{id}/roles`

**Description:** updateRoles

**Parameters:**

- `id` in `path` (`integer`) **(required)**: 

**Request Body (`application/json`):**

- `roleCodes` (`Array<string>`) **(required)**

---

# 2. Appointask Backend Service APIs (`http://3.6.123.11:3301`)

## Accounting

*Total Endpoints: 13*

### `GET /api/v1/accounting/accounts`

**Summary:** List accounts

---

### `POST /api/v1/accounting/accounts`

**Summary:** Create account

**Request Body (`application/json`):**

- `accountCode` (`string`) **(required)** - example: `4001`, Account code (unique per tenant)
- `accountName` (`string`) **(required)** - example: `Service Revenue`, Account name
- `accountType` (`string`) **(required)** - enum: `["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "DIVIDENDS"]`, example: `REVENUE`, Account type
- `parentAccountId` (`string`) *(optional)* - Parent account ID (for hierarchical accounts)

---

### `POST /api/v1/accounting/accounts/initialize`

**Summary:** Initialize default chart of accounts for tenant

---

### `GET /api/v1/accounting/accounts/{accountId}`

**Summary:** Get account details

**Parameters:**

- `accountId` in `path` (`string`) **(required)** - Account UUID

---

### `PUT /api/v1/accounting/accounts/{accountId}`

**Summary:** Update account

**Parameters:**

- `accountId` in `path` (`string`) **(required)** - Account UUID

**Request Body (`application/json`):**

- `accountName` (`string`) *(optional)* - example: `Service Revenue - Updated`, Account name
- `isActive` (`boolean`) *(optional)* - example: `True`, Is account active

---

### `PATCH /api/v1/accounting/accounts/{accountId}/disable`

**Summary:** Disable account

**Parameters:**

- `accountId` in `path` (`string`) **(required)** - Account UUID

---

### `GET /api/v1/accounting/journals`

**Summary:** List journals

**Parameters:**

- `from` in `query` (`string`) *(optional)* - Start date (YYYY-MM-DD)
- `to` in `query` (`string`) *(optional)* - End date (YYYY-MM-DD)
- `referenceType` in `query` (`string`) *(optional)*

---

### `POST /api/v1/accounting/journals`

**Summary:** Create manual journal

**Request Body (`application/json`):**

- `branchId` (`string`) *(optional)* - example: `uuid`, Branch ID (optional for company-wide entries)
- `description` (`string`) **(required)** - example: `Owner Investment`, Description of the journal entry
- `entryDate` (`string`) **(required)** - example: `2026-02-22`, Entry date (YYYY-MM-DD)
- `lines` (`Array<JournalLineDto>`) **(required)** - Journal lines (must have at least 2 lines, debit total must equal credit total)

---

### `GET /api/v1/accounting/journals/{journalId}`

**Summary:** Get journal details

**Parameters:**

- `journalId` in `path` (`string`) **(required)** - Journal UUID

---

### `POST /api/v1/accounting/journals/{journalId}/reverse`

**Summary:** Reverse journal entry

**Parameters:**

- `journalId` in `path` (`string`) **(required)** - Journal UUID

---

### `GET /api/v1/accounting/ledger/{accountId}`

**Summary:** Get account ledger

**Parameters:**

- `accountId` in `path` (`string`) **(required)** - Account UUID
- `from` in `query` (`string`) *(optional)* - Start date (YYYY-MM-DD)
- `to` in `query` (`string`) *(optional)* - End date (YYYY-MM-DD)

---

### `POST /api/v1/accounting/periods/lock`

**Summary:** Lock accounting period

**Request Body (`application/json`):**

- `year` (`number`) **(required)** - example: `2026`, Year to lock
- `month` (`number`) **(required)** - example: `1`, Month to lock (1-12)

---

### `GET /api/v1/accounting/trial-balance`

**Summary:** Get trial balance

**Parameters:**

- `asOfDate` in `query` (`string`) *(optional)* - As-of date (YYYY-MM-DD)

---

## App

*Total Endpoints: 2*

### `GET /`

---

### `GET /health`

---

## Availability

*Total Endpoints: 35*

### `GET /api/v1/availability/branch-config`

**Summary:** List branch scheduling configs

**Parameters:**

- `branchId` in `query` (`string`) *(optional)*
- `timezone` in `query` (`string`) *(optional)*
- `allowOverbooking` in `query` (`string`) *(optional)*

---

### `POST /api/v1/availability/branch-config`

**Summary:** Create or update branch scheduling config

**Request Body (`application/json`):**

- `branchId` (`string`) **(required)** - Branch ID
- `timezone` (`string`) **(required)** - example: `Asia/Dhaka`, Timezone
- `slotIntervalMinutes` (`number`) *(optional)* - Slot interval in minutes
- `bookingHorizonDays` (`number`) *(optional)* - Booking horizon days
- `allowOverbooking` (`boolean`) *(optional)* - Allow overbooking

---

### `GET /api/v1/availability/branch-config/{branchId}`

**Summary:** Get branch scheduling config

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch ID

---

### `PATCH /api/v1/availability/branch-config/{branchId}`

**Summary:** Update branch scheduling config

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch ID

**Request Body (`application/json`):**

- `branchId` (`string`) *(optional)* - Branch ID
- `timezone` (`string`) *(optional)* - example: `Asia/Dhaka`, Timezone
- `slotIntervalMinutes` (`number`) *(optional)* - Slot interval in minutes
- `bookingHorizonDays` (`number`) *(optional)* - Booking horizon days
- `allowOverbooking` (`boolean`) *(optional)* - Allow overbooking

---

### `POST /api/v1/availability/capacity-rules`

**Summary:** Create capacity rule

**Request Body (`application/json`):**

- `serviceId` (`string`) **(required)** - Service ID
- `maxConcurrentBookings` (`number`) **(required)** - Maximum concurrent bookings
- `bufferTimeMinutes` (`number`) *(optional)* - Buffer time in minutes
- `effectiveFrom` (`string`) **(required)** - Effective from date (YYYY-MM-DD)
- `effectiveTo` (`string`) *(optional)* - Effective to date (YYYY-MM-DD)

---

### `GET /api/v1/availability/capacity-rules/service/{serviceId}`

**Summary:** Get capacity rules for service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `DELETE /api/v1/availability/capacity-rules/{ruleId}`

**Summary:** Delete capacity rule

**Parameters:**

- `ruleId` in `path` (`string`) **(required)** - Rule ID

---

### `GET /api/v1/availability/capacity-rules/{ruleId}`

**Summary:** Get capacity rule by ID

**Parameters:**

- `ruleId` in `path` (`string`) **(required)** - Rule ID

---

### `PATCH /api/v1/availability/capacity-rules/{ruleId}`

**Summary:** Update capacity rule

**Parameters:**

- `ruleId` in `path` (`string`) **(required)** - Rule ID

**Request Body (`application/json`):**

- `serviceId` (`string`) *(optional)* - Service ID
- `maxConcurrentBookings` (`number`) *(optional)* - Maximum concurrent bookings
- `bufferTimeMinutes` (`number`) *(optional)* - Buffer time in minutes
- `effectiveFrom` (`string`) *(optional)* - Effective from date (YYYY-MM-DD)
- `effectiveTo` (`string`) *(optional)* - Effective to date (YYYY-MM-DD)

---

### `GET /api/v1/availability/entities/resources`

**Summary:** Get available resources for a service in a date/time range

**Parameters:**

- `branchId` in `query` (`string`) **(required)** - Branch ID
- `serviceId` in `query` (`string`) **(required)** - Service ID
- `startDate` in `query` (`string`) **(required)** - Start date (YYYY-MM-DD)
- `endDate` in `query` (`string`) **(required)** - End date (YYYY-MM-DD)
- `startTime` in `query` (`string`) *(optional)* - Start time filter (HH:MM:SS)
- `endTime` in `query` (`string`) *(optional)* - End time filter (HH:MM:SS)
- `preferredStaffId` in `query` (`string`) *(optional)* - Preferred staff ID
- `partySize` in `query` (`number`) *(optional)* - Party size for group bookings
- `includeMetadata` in `query` (`boolean`) *(optional)* - Include metadata in response

---

### `GET /api/v1/availability/entities/staff`

**Summary:** Get available staff for a service in a date/time range

**Parameters:**

- `branchId` in `query` (`string`) **(required)** - Branch ID
- `serviceId` in `query` (`string`) **(required)** - Service ID
- `startDate` in `query` (`string`) **(required)** - Start date (YYYY-MM-DD)
- `endDate` in `query` (`string`) **(required)** - End date (YYYY-MM-DD)
- `startTime` in `query` (`string`) *(optional)* - Start time filter (HH:MM:SS)
- `endTime` in `query` (`string`) *(optional)* - End time filter (HH:MM:SS)
- `preferredStaffId` in `query` (`string`) *(optional)* - Preferred staff ID
- `partySize` in `query` (`number`) *(optional)* - Party size for group bookings
- `includeMetadata` in `query` (`boolean`) *(optional)* - Include metadata in response

---

### `POST /api/v1/availability/generate-slots`

**Summary:** Manually generate availability slots

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - Tenant ID
- `branchId` (`string`) **(required)** - Branch ID
- `serviceId` (`string`) **(required)** - Service ID
- `startDate` (`string`) **(required)** - example: `2026-04-10`, Start date (YYYY-MM-DD)
- `endDate` (`string`) **(required)** - example: `2026-04-10`, End date (YYYY-MM-DD)
- `slotDurationMinutes` (`number`) *(optional)* - example: `30`, Slot duration in minutes
- `staffIds` (`Array<string>`) *(optional)* - Limit slot generation to specific staff IDs
- `resourceIds` (`Array<string>`) *(optional)* - Limit slot generation to specific resource IDs

---

### `POST /api/v1/availability/lock`

**Summary:** Create short-lived entity lock(s)

**Request Body (`application/json`):**

- `branchId` (`string`) **(required)** - Branch ID
- `serviceId` (`string`) *(optional)* - Service ID for context
- `staffId` (`string`) *(optional)* - Staff ID to lock
- `resourceIds` (`Array<string>`) *(optional)* - Resource IDs to lock
- `startAt` (`string`) **(required)** - example: `2026-03-20T10:00:00Z`, Lock start timestamp (ISO-8601)
- `endAt` (`string`) **(required)** - example: `2026-03-20T10:40:00Z`, Lock end timestamp (ISO-8601)
- `bookingId` (`string`) *(optional)* - Optional booking ID to attach
- `ttlMinutes` (`number`) *(optional)* - TTL in minutes

---

### `GET /api/v1/availability/locks`

**Summary:** List entity locks

**Parameters:**

- `branchId` in `query` (`string`) *(optional)*
- `entityType` in `query` (`string`) *(optional)*
- `entityId` in `query` (`string`) *(optional)*
- `status` in `query` (`string`) *(optional)*
- `startFrom` in `query` (`string`) *(optional)*
- `startTo` in `query` (`string`) *(optional)*

---

### `GET /api/v1/availability/locks/{lockId}`

**Summary:** Get lock details

**Parameters:**

- `lockId` in `path` (`string`) **(required)** - Lock ID

---

### `GET /api/v1/availability/overrides`

**Summary:** List availability overrides

**Parameters:**

- `branchId` in `query` (`string`) *(optional)*
- `entityType` in `query` (`string`) *(optional)*
- `entityId` in `query` (`string`) *(optional)*
- `dateFrom` in `query` (`string`) *(optional)*
- `dateTo` in `query` (`string`) *(optional)*
- `type` in `query` (`string`) *(optional)*
- `status` in `query` (`string`) *(optional)*

---

### `POST /api/v1/availability/overrides`

**Summary:** Create availability override

**Request Body (`application/json`):**

- `entityType` (`string`) **(required)** - enum: `["BRANCH", "STAFF", "RESOURCE"]`
- `entityId` (`string`) **(required)** - Entity ID
- `branchId` (`string`) **(required)** - Branch ID
- `date` (`string`) **(required)** - Date (YYYY-MM-DD)
- `type` (`string`) *(optional)* - enum: `["BLOCK", "EXTRA"]`
- `startTime` (`string`) *(optional)* - Start time (HH:MM:SS)
- `endTime` (`string`) *(optional)* - End time (HH:MM:SS)
- `reason` (`string`) *(optional)* - Reason

---

### `DELETE /api/v1/availability/overrides/{overrideId}`

**Summary:** Delete availability override

**Parameters:**

- `overrideId` in `path` (`string`) **(required)** - Override ID

---

### `GET /api/v1/availability/overrides/{overrideId}`

**Summary:** Get availability override details

**Parameters:**

- `overrideId` in `path` (`string`) **(required)** - Override ID

---

### `PATCH /api/v1/availability/overrides/{overrideId}`

**Summary:** Update availability override

**Parameters:**

- `overrideId` in `path` (`string`) **(required)** - Override ID

**Request Body (`application/json`):**

- `entityType` (`string`) *(optional)* - enum: `["BRANCH", "STAFF", "RESOURCE"]`
- `entityId` (`string`) *(optional)* - Entity ID
- `branchId` (`string`) *(optional)* - Branch ID
- `date` (`string`) *(optional)* - Date (YYYY-MM-DD)
- `type` (`string`) *(optional)* - enum: `["BLOCK", "EXTRA"]`
- `startTime` (`string`) *(optional)* - Start time (HH:MM:SS)
- `endTime` (`string`) *(optional)* - End time (HH:MM:SS)
- `reason` (`string`) *(optional)* - Reason

---

### `POST /api/v1/availability/overrides/{overrideId}/approve`

**Summary:** Approve availability override

**Parameters:**

- `overrideId` in `path` (`string`) **(required)** - Override ID

---

### `POST /api/v1/availability/overrides/{overrideId}/cancel`

**Summary:** Cancel availability override

**Parameters:**

- `overrideId` in `path` (`string`) **(required)** - Override ID

**Request Body (`application/json`):**

- `cancellationReason` (`string`) *(optional)* - Reason for cancellation

---

### `POST /api/v1/availability/overrides/{overrideId}/reject`

**Summary:** Reject availability override

**Parameters:**

- `overrideId` in `path` (`string`) **(required)** - Override ID

**Request Body (`application/json`):**

- `rejectionReason` (`string`) *(optional)* - Reason for rejection

---

### `POST /api/v1/availability/regenerate-slots`

**Summary:** Regenerate slots for a date range (replaces existing)

**Request Body (`application/json`):**

- `branchId` (`string`) **(required)** - Branch ID
- `serviceId` (`string`) **(required)** - Service ID
- `startDate` (`string`) **(required)** - example: `2026-04-10`, Start date (YYYY-MM-DD)
- `endDate` (`string`) **(required)** - example: `2026-04-10`, End date (YYYY-MM-DD)
- `slotDurationMinutes` (`number`) *(optional)* - example: `30`, Slot duration in minutes

---

### `POST /api/v1/availability/release`

**Summary:** Release lock by lockId

**Request Body (`application/json`):**

- `lockId` (`string`) **(required)** - Lock ID

---

### `POST /api/v1/availability/reserve`

**Summary:** Reserve a time slot temporarily

**Request Body (`application/json`):**

- `slotId` (`string`) *(optional)* - Slot ID (for pre-calculated slots)
- `tenantId` (`string`) **(required)** - Tenant ID
- `branchId` (`string`) **(required)** - Branch ID
- `serviceId` (`string`) **(required)** - Service ID
- `customerId` (`string`) **(required)** - Customer ID
- `date` (`string`) **(required)** - example: `2026-03-05`, Date (YYYY-MM-DD)
- `startTime` (`string`) **(required)** - example: `10:00:00`, Start time (HH:MM:SS)
- `endTime` (`string`) **(required)** - example: `11:00:00`, End time (HH:MM:SS)
- `preferredStaffId` (`string`) *(optional)* - Preferred staff ID
- `staffId` (`string`) *(optional)* - Selected staff ID
- `resourceIds` (`Array<string>`) *(optional)* - Selected resource IDs
- `ttlMinutes` (`number`) *(optional)* - TTL in minutes (default: 15)

---

### `DELETE /api/v1/availability/reserve/{reservationId}`

**Summary:** Release a slot reservation

**Parameters:**

- `reservationId` in `path` (`string`) **(required)** - Reservation ID

---

### `GET /api/v1/availability/reserve/{reservationId}`

**Summary:** Get reservation details

**Parameters:**

- `reservationId` in `path` (`string`) **(required)** - Reservation ID

---

### `GET /api/v1/availability/staff/{staffId}`

**Summary:** Get staff availability for a date

**Parameters:**

- `staffId` in `path` (`string`) **(required)** - Staff ID
- `date` in `query` (`string`) **(required)**
- `slotDuration` in `query` (`string`) *(optional)*

---

### `GET /api/v1/availability/unified`

**Summary:** Get available time slots (unified engine)

**Parameters:**

- `branchId` in `query` (`string`) **(required)** - Branch ID
- `serviceId` in `query` (`string`) **(required)** - Service ID
- `startDate` in `query` (`string`) **(required)** - Start date (YYYY-MM-DD)
- `endDate` in `query` (`string`) **(required)** - End date (YYYY-MM-DD)
- `startTime` in `query` (`string`) *(optional)* - Start time filter (HH:MM:SS)
- `endTime` in `query` (`string`) *(optional)* - End time filter (HH:MM:SS)
- `preferredStaffId` in `query` (`string`) *(optional)* - Preferred staff ID
- `partySize` in `query` (`number`) *(optional)* - Party size for group bookings
- `includeMetadata` in `query` (`boolean`) *(optional)* - Include metadata in response

---

### `GET /api/v1/availability/weekly-schedules`

**Summary:** List weekly schedules

**Parameters:**

- `branchId` in `query` (`string`) *(optional)*
- `entityType` in `query` (`string`) *(optional)*
- `entityId` in `query` (`string`) *(optional)*
- `dayOfWeek` in `query` (`string`) *(optional)*
- `activeOnly` in `query` (`string`) *(optional)*
- `startTime` in `query` (`string`) *(optional)*
- `endTime` in `query` (`string`) *(optional)*

---

### `POST /api/v1/availability/weekly-schedules`

**Summary:** Create weekly schedule

**Request Body (`application/json`):**

- `entityType` (`string`) **(required)** - enum: `["BRANCH", "STAFF", "RESOURCE"]`
- `entityId` (`string`) **(required)** - Entity ID
- `branchId` (`string`) **(required)** - Branch ID
- `dayOfWeek` (`number`) **(required)** - Day of week (0=Sunday..6=Saturday)
- `startTime` (`string`) **(required)** - Start time (HH:MM:SS)
- `endTime` (`string`) **(required)** - End time (HH:MM:SS)
- `isActive` (`boolean`) *(optional)* - Is active
- `recurrenceRule` (`string`) *(optional)* - Recurrence rule

---

### `DELETE /api/v1/availability/weekly-schedules/{scheduleId}`

**Summary:** Delete weekly schedule

**Parameters:**

- `scheduleId` in `path` (`string`) **(required)** - Schedule ID

---

### `GET /api/v1/availability/weekly-schedules/{scheduleId}`

**Summary:** Get weekly schedule details

**Parameters:**

- `scheduleId` in `path` (`string`) **(required)** - Schedule ID

---

### `PATCH /api/v1/availability/weekly-schedules/{scheduleId}`

**Summary:** Update weekly schedule

**Parameters:**

- `scheduleId` in `path` (`string`) **(required)** - Schedule ID

**Request Body (`application/json`):**

- `entityType` (`string`) *(optional)* - enum: `["BRANCH", "STAFF", "RESOURCE"]`
- `entityId` (`string`) *(optional)* - Entity ID
- `branchId` (`string`) *(optional)* - Branch ID
- `dayOfWeek` (`number`) *(optional)* - Day of week (0=Sunday..6=Saturday)
- `startTime` (`string`) *(optional)* - Start time (HH:MM:SS)
- `endTime` (`string`) *(optional)* - End time (HH:MM:SS)
- `isActive` (`boolean`) *(optional)* - Is active
- `recurrenceRule` (`string`) *(optional)* - Recurrence rule

---

## Billing

*Total Endpoints: 12*

### `GET /api/v1/billing/invoices`

**Summary:** List invoices

**Parameters:**

- `customerId` in `query` (`string`) *(optional)* - Filter by customer UUID
- `status` in `query` (`string`) *(optional)*
- `from` in `query` (`string`) *(optional)* - Start date (YYYY-MM-DD)
- `to` in `query` (`string`) *(optional)* - End date (YYYY-MM-DD)

---

### `POST /api/v1/billing/invoices`

**Summary:** Create invoice

**Request Body (`application/json`):**

- `customerId` (`string`) **(required)** - example: `uuid`, Customer UUID
- `issueDate` (`string`) **(required)** - example: `2026-03-10`, Issue date (YYYY-MM-DD)
- `dueDate` (`string`) **(required)** - example: `2026-04-10`, Due date (YYYY-MM-DD)
- `items` (`Array<InvoiceItemDto>`) **(required)** - Invoice line items
- `taxAmount` (`number`) *(optional)* - example: `0`, Tax amount
- `taxRate` (`number`) *(optional)* - example: `10`, Invoice-level tax rate percentage. Used when taxAmount is not provided.
- `discountAmount` (`number`) *(optional)* - example: `0`, Discount amount
- `tipAmount` (`number`) *(optional)* - example: `0`, Tip amount
- `notes` (`string`) *(optional)* - example: `Thank you for your business`, Notes
- `terms` (`string`) *(optional)* - example: `Payment due within 30 days`, Terms
- `currency` (`string`) *(optional)* - example: `USD`, Currency code
- `subscriptionId` (`string`) *(optional)* - example: `uuid`, Subscription ID

---

### `GET /api/v1/billing/invoices/{invoiceId}`

**Summary:** Get invoice details

**Parameters:**

- `invoiceId` in `path` (`string`) **(required)** - Invoice UUID

---

### `PUT /api/v1/billing/invoices/{invoiceId}`

**Summary:** Update invoice

**Parameters:**

- `invoiceId` in `path` (`string`) **(required)** - Invoice UUID

**Request Body (`application/json`):**

- `status` (`string`) *(optional)* - enum: `["DRAFT", "SENT", "PAID", "OVERDUE", "VOID", "CANCELLED", "PARTIALLY_PAID"]`, Invoice status
- `dueDate` (`string`) *(optional)* - example: `2026-04-10`, Due date (YYYY-MM-DD)
- `notes` (`string`) *(optional)* - example: `Updated notes`, Notes
- `terms` (`string`) *(optional)* - example: `Updated terms`, Terms

---

### `PATCH /api/v1/billing/invoices/{invoiceId}/void`

**Summary:** Void invoice

**Parameters:**

- `invoiceId` in `path` (`string`) **(required)** - Invoice UUID

---

### `GET /api/v1/billing/subscriptions`

**Summary:** List subscriptions

**Parameters:**

- `customerId` in `query` (`string`) *(optional)* - Filter by customer UUID
- `status` in `query` (`string`) *(optional)*

---

### `POST /api/v1/billing/subscriptions`

**Summary:** Create subscription

**Request Body (`application/json`):**

- `customerId` (`string`) **(required)** - example: `uuid`, Customer UUID
- `planName` (`string`) **(required)** - example: `Premium Plan`, Plan name
- `planDescription` (`string`) *(optional)* - example: `Includes all features`, Plan description
- `amount` (`number`) **(required)** - example: `99.99`, Subscription amount
- `currency` (`string`) *(optional)* - example: `USD`, Currency code
- `billingInterval` (`string`) **(required)** - enum: `["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]`, Billing interval
- `billingIntervalCount` (`number`) *(optional)* - example: `1`, Billing interval count
- `startDate` (`string`) **(required)** - example: `2026-03-10`, Start date (YYYY-MM-DD)
- `endDate` (`string`) *(optional)* - example: `2027-03-10`, End date (YYYY-MM-DD)
- `trialEndDate` (`string`) *(optional)* - example: `2026-04-10`, Trial end date (YYYY-MM-DD)
- `maxBillingCycles` (`number`) *(optional)* - example: `12`, Maximum billing cycles
- `taxRate` (`number`) *(optional)* - example: `8.5`, Tax rate (percentage)
- `notes` (`string`) *(optional)* - example: `Special notes`, Notes
- `serviceId` (`string`) *(optional)* - example: `uuid`, Service ID

---

### `GET /api/v1/billing/subscriptions/{subscriptionId}`

**Summary:** Get subscription details

**Parameters:**

- `subscriptionId` in `path` (`string`) **(required)** - Subscription UUID

---

### `PUT /api/v1/billing/subscriptions/{subscriptionId}`

**Summary:** Update subscription

**Parameters:**

- `subscriptionId` in `path` (`string`) **(required)** - Subscription UUID

**Request Body (`application/json`):**

- `status` (`string`) *(optional)* - enum: `["ACTIVE", "PAUSED", "CANCELLED", "EXPIRED", "TRIAL"]`, Subscription status
- `endDate` (`string`) *(optional)* - example: `2027-03-10`, End date (YYYY-MM-DD)
- `notes` (`string`) *(optional)* - example: `Updated notes`, Notes

---

### `POST /api/v1/billing/subscriptions/{subscriptionId}/cancel`

**Summary:** Cancel subscription

**Parameters:**

- `subscriptionId` in `path` (`string`) **(required)** - Subscription UUID

**Request Body (`application/json`):**

- `cancellationReason` (`string`) *(optional)* - example: `Customer requested cancellation`, Reason for cancellation

---

### `POST /api/v1/billing/subscriptions/{subscriptionId}/pause`

**Summary:** Pause subscription

**Parameters:**

- `subscriptionId` in `path` (`string`) **(required)** - Subscription UUID

---

### `POST /api/v1/billing/subscriptions/{subscriptionId}/resume`

**Summary:** Resume subscription

**Parameters:**

- `subscriptionId` in `path` (`string`) **(required)** - Subscription UUID

---

## Bookings

*Total Endpoints: 10*

### `GET /api/v1/bookings`

**Summary:** List bookings with filters and pagination

**Parameters:**

- `branchId` in `query` (`string`) *(optional)* - Filter by branch ID
- `staffId` in `query` (`string`) *(optional)* - Filter by staff ID
- `customerId` in `query` (`string`) *(optional)* - Filter by customer ID
- `status` in `query` (`string`) *(optional)* - Filter by booking status
- `dateFrom` in `query` (`string`) *(optional)* - Start date filter (ISO 8601)
- `dateTo` in `query` (`string`) *(optional)* - End date filter (ISO 8601)
- `page` in `query` (`number`) *(optional)* - Page number
- `limit` in `query` (`number`) *(optional)* - Items per page

---

### `POST /api/v1/bookings`

**Summary:** Create a new booking from slot reservation

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Tenant ID
- `reservationId` (`string`) *(optional)* - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Reservation ID from slot reservation. Optional when creating booking directly from availability inputs.
- `customerId` (`string`) **(required)** - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Customer ID
- `serviceId` (`string`) **(required)** - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Service ID
- `branchId` (`string`) **(required)** - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Branch ID
- `staffId` (`string`) *(optional)* - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Staff ID
- `date` (`string`) **(required)** - example: `2026-05-01`, Booking date (YYYY-MM-DD)
- `startTime` (`string`) **(required)** - example: `10:00:00`, Start time (HH:MM:SS)
- `endTime` (`string`) *(optional)* - example: `10:45:00`, End time in HH:MM:SS format. Optional; if omitted, calculated from service duration.
- `resourceIds` (`Array<string>`) *(optional)* - Resource IDs to hold while creating draft booking directly from availability.
- `addons` (`Array<BookingAddonDto>`) *(optional)* - Array of addon services
- `notes` (`string`) *(optional)* - example: `Customer prefers quiet room`, Customer notes or special requests

---

### `GET /api/v1/bookings/{bookingId}`

**Summary:** Get booking details by ID

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

---

### `POST /api/v1/bookings/{bookingId}/cancel`

**Summary:** Cancel a booking

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `reason` (`string`) **(required)** - example: `Customer requested cancellation`, Reason for cancellation

---

### `POST /api/v1/bookings/{bookingId}/checkin`

**Summary:** Check-in a customer for their booking

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `staffId` (`string`) *(optional)* - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Assign or override staff at check-in
- `resourceIds` (`Array<string>`) *(optional)* - Assign resources at check-in

---

### `POST /api/v1/bookings/{bookingId}/complete`

**Summary:** Mark a booking as completed

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

---

### `POST /api/v1/bookings/{bookingId}/confirm`

**Summary:** Confirm a draft booking and finalize booking financial amounts

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `vatAmount` (`number`) *(optional)* - example: `7.5`, VAT/Tax amount to add
- `tipAmount` (`number`) *(optional)* - example: `10`, Tip amount to add
- `discountAmount` (`number`) *(optional)* - example: `2`, Discount amount to subtract
- `note` (`string`) *(optional)* - example: `Confirmed at front desk`, Optional confirmation note

---

### `POST /api/v1/bookings/{bookingId}/invoice-draft`

**Summary:** Create a draft invoice from booking + booking price breakdown items

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `issueDate` (`string`) *(optional)* - example: `2026-04-29`, Issue date (YYYY-MM-DD). Defaults to today.
- `dueDate` (`string`) *(optional)* - example: `2026-04-29`, Due date (YYYY-MM-DD). Defaults to issueDate.
- `notes` (`string`) *(optional)* - example: `Collected at reception`, Invoice notes
- `terms` (`string`) *(optional)* - example: `Payment due immediately`, Invoice terms
- `currency` (`string`) *(optional)* - example: `BDT`, Currency code (ISO 4217)
- `taxRate` (`number`) *(optional)* - example: `10`, Invoice-level tax rate percentage. Used when booking has no explicit TAX breakdown amount.
- `tipAmount` (`number`) *(optional)* - example: `50`, Tip amount to include in draft invoice
- `consumableAmount` (`number`) *(optional)* - example: `30`, Consumable amount to include in draft invoice
- `otherAmount` (`number`) *(optional)* - example: `20`, Other amount to include in draft invoice
- `discountAmount` (`number`) *(optional)* - example: `10`, Discount amount to include in draft invoice

---

### `POST /api/v1/bookings/{bookingId}/no-show`

**Summary:** Mark booking as no-show and generate no-show note

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `reason` (`string`) *(optional)* - example: `Customer did not arrive`, Optional reason for no-show

---

### `POST /api/v1/bookings/{bookingId}/reschedule`

**Summary:** Reschedule a booking to a new time slot

**Parameters:**

- `bookingId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `newReservationId` (`string`) *(optional)* - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, New reservation ID from slot reservation. Optional when rescheduling directly with date/time.
- `date` (`string`) **(required)** - example: `2026-05-15`, New booking date (YYYY-MM-DD)
- `startTime` (`string`) **(required)** - example: `14:00:00`, New start time (HH:MM:SS)
- `endTime` (`string`) *(optional)* - example: `14:45:00`, New end time in HH:MM:SS format. Optional; if omitted, calculated from service duration.

---

## Branches

*Total Endpoints: 5*

### `GET /api/v1/branches`

**Summary:** List branches

**Details:** Get all branches for a tenant

**Parameters:**

- `tenantId` in `query` (`string`) **(required)** - Tenant UUID

---

### `POST /api/v1/branches`

**Summary:** Create a new branch

**Details:** Create a new branch for a tenant

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Tenant ID
- `branchName` (`string`) **(required)** - example: `Branch A`, Branch name
- `branchCode` (`string`) **(required)** - example: `branch-a`, Unique branch code/slug
- `addressLine1` (`string`) *(optional)* - example: `123 Street`, Address line 1
- `addressLine2` (`string`) *(optional)* - Address line 2
- `city` (`string`) *(optional)* - example: `Dhaka`, City
- `state` (`string`) *(optional)* - example: `Dhaka`, State
- `zipCode` (`string`) *(optional)* - example: `1212`, ZIP code
- `country` (`string`) *(optional)* - example: `BD`, Country ISO code
- `latitude` (`number`) *(optional)* - example: `23.8103`, Latitude
- `longitude` (`number`) *(optional)* - example: `90.4125`, Longitude
- `contactPhone` (`string`) *(optional)* - example: `+8801xxxx`, Contact phone
- `contactEmail` (`string`) *(optional)* - example: `branch@tenant.com`, Contact email
- `status` (`string`) *(optional)* - enum: `["ACTIVE", "INACTIVE", "DELETED"]`, example: `ACTIVE`, Branch status

---

### `DELETE /api/v1/branches/{branchId}`

**Summary:** Delete branch

**Details:** Soft delete a branch

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch UUID

---

### `GET /api/v1/branches/{branchId}`

**Summary:** Get branch details

**Details:** Retrieve branch information with working hours and holidays

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch UUID

---

### `PATCH /api/v1/branches/{branchId}`

**Summary:** Update branch

**Details:** Update branch information

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch UUID

**Request Body (`application/json`):**

- `branchName` (`string`) *(optional)* - example: `Branch A Updated`, Branch name
- `addressLine1` (`string`) *(optional)* - example: `123 Street`, Address line 1
- `addressLine2` (`string`) *(optional)* - Address line 2
- `city` (`string`) *(optional)* - City
- `state` (`string`) *(optional)* - State
- `zipCode` (`string`) *(optional)* - ZIP code
- `country` (`string`) *(optional)* - Country ISO code
- `latitude` (`number`) *(optional)* - Latitude
- `longitude` (`number`) *(optional)* - Longitude
- `contactPhone` (`string`) *(optional)* - example: `+8801yyyy`, Contact phone
- `contactEmail` (`string`) *(optional)* - Contact email
- `status` (`string`) *(optional)* - enum: `["ACTIVE", "INACTIVE", "DELETED"]`, example: `INACTIVE`, Branch status

---

## Customers

*Total Endpoints: 19*

### `POST /api/v1/customers`

**Summary:** Create a new customer

**Request Body (`application/json`):**

- `userId` (`string`) *(optional)* - User ID from auth service (optional for self-registration)
- `fullName` (`string`) **(required)** - example: `Rahim Uddin`, Full name of the customer
- `contacts` (`Array<CreateContactDto>`) **(required)** - example: `[{'type': 'PHONE', 'value': '+8801712345678', 'isPrimary': True}, {'type': 'EMAIL', 'value': 'rahim@example.com', 'isPrimary': False}]`, Customer contact methods (phone, email)
- `tenantProfile` (`string`) *(optional)* - Optional tenant profile to link this customer in one call
- `dateOfBirth` (`string`) *(optional)* - example: `1995-05-10`, Date of birth in ISO format
- `gender` (`string`) *(optional)* - enum: `["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]`, example: `MALE`, Gender of the customer
- `profilePhotoUrl` (`string`) *(optional)* - example: `https://example.com/photos/customer.jpg`, Profile photo URL

---

### `GET /api/v1/customers/me`

**Summary:** Get my customer profile

---

### `PUT /api/v1/customers/me`

**Summary:** Update my customer profile

**Request Body (`application/json`):**

- `fullName` (`string`) *(optional)* - example: `John Doe Updated`
- `gender` (`string`) *(optional)* - enum: `["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]`, example: `MALE`
- `dateOfBirth` (`string`) *(optional)* - example: `1990-05-15`
- `profilePhotoUrl` (`string`) *(optional)* - example: `https://example.com/photo.jpg`

---

### `DELETE /api/v1/customers/me/addresses/{addressId}`

**Summary:** Delete an address

**Parameters:**

- `addressId` in `path` (`string`) **(required)**

---

### `PUT /api/v1/customers/me/addresses/{addressId}`

**Summary:** Update an address

**Parameters:**

- `addressId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `label` (`string`) *(optional)* - enum: `["HOME", "WORK", "OTHER"]`
- `isDefault` (`boolean`) *(optional)* - example: `False`
- `addressLine1` (`string`) *(optional)* - example: `123 Main Street`
- `addressLine2` (`string`) *(optional)* - example: `Apt 4B`
- `city` (`string`) *(optional)* - example: `Dhaka`
- `state` (`string`) *(optional)* - example: `Dhaka Division`
- `postalCode` (`string`) *(optional)* - example: `1200`
- `country` (`string`) *(optional)* - example: `Bangladesh`
- `latitude` (`number`) *(optional)* - example: `23.8103`
- `longitude` (`number`) *(optional)* - example: `90.4125`

---

### `PATCH /api/v1/customers/me/addresses/{addressId}/set-default`

**Summary:** Set address as default

**Parameters:**

- `addressId` in `path` (`string`) **(required)**

---

### `POST /api/v1/customers/self`

**Summary:** Create my customer profile

**Request Body (`application/json`):**

- `userId` (`string`) *(optional)* - User ID from auth service (optional for self-registration)
- `fullName` (`string`) **(required)** - example: `Rahim Uddin`, Full name of the customer
- `contacts` (`Array<CreateContactDto>`) **(required)** - example: `[{'type': 'PHONE', 'value': '+8801712345678', 'isPrimary': True}, {'type': 'EMAIL', 'value': 'rahim@example.com', 'isPrimary': False}]`, Customer contact methods (phone, email)
- `tenantProfile` (`string`) *(optional)* - Optional tenant profile to link this customer in one call
- `dateOfBirth` (`string`) *(optional)* - example: `1995-05-10`, Date of birth in ISO format
- `gender` (`string`) *(optional)* - enum: `["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]`, example: `MALE`, Gender of the customer
- `profilePhotoUrl` (`string`) *(optional)* - example: `https://example.com/photos/customer.jpg`, Profile photo URL

---

### `GET /api/v1/customers/{customerId}`

**Summary:** Get customer by ID

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

---

### `PATCH /api/v1/customers/{customerId}`

**Summary:** Update customer profile

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `fullName` (`string`) *(optional)* - example: `John Doe Updated`
- `gender` (`string`) *(optional)* - enum: `["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]`, example: `MALE`
- `dateOfBirth` (`string`) *(optional)* - example: `1990-05-15`
- `profilePhotoUrl` (`string`) *(optional)* - example: `https://example.com/photo.jpg`

---

### `GET /api/v1/customers/{customerId}/addresses`

**Summary:** Get all addresses for a customer

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

---

### `POST /api/v1/customers/{customerId}/addresses`

**Summary:** Create a new address for customer

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `label` (`string`) *(optional)* - enum: `["HOME", "WORK", "OTHER"]`
- `isDefault` (`boolean`) *(optional)* - example: `False`
- `addressLine1` (`string`) **(required)** - example: `123 Main Street`
- `addressLine2` (`string`) *(optional)* - example: `Apt 4B`
- `city` (`string`) *(optional)* - example: `Dhaka`
- `state` (`string`) *(optional)* - example: `Dhaka Division`
- `postalCode` (`string`) *(optional)* - example: `1200`
- `country` (`string`) *(optional)* - example: `Bangladesh`
- `latitude` (`number`) *(optional)* - example: `23.8103`
- `longitude` (`number`) *(optional)* - example: `90.4125`

---

### `GET /api/v1/customers/{customerId}/bookings`

**Summary:** Get customer booking history

**Parameters:**

- `customerId` in `path` (`string`) **(required)**
- `status` in `query` (`string`) *(optional)* - Filter by booking status
- `dateFrom` in `query` (`string`) *(optional)* - Start date filter (ISO 8601)
- `dateTo` in `query` (`string`) *(optional)* - End date filter (ISO 8601)
- `page` in `query` (`number`) *(optional)*
- `limit` in `query` (`number`) *(optional)*

---

### `GET /api/v1/customers/{customerId}/contacts`

**Summary:** Get all contacts for a customer

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

---

### `POST /api/v1/customers/{customerId}/contacts`

**Summary:** Add a new contact to customer

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `type` (`string`) **(required)** - enum: `["EMAIL", "PHONE"]`, example: `PHONE`, Type of contact
- `value` (`string`) **(required)** - example: `+8801712345678`, Contact value (email or phone)
- `isPrimary` (`boolean`) *(optional)* - example: `True`, Whether this is the primary contact

---

### `DELETE /api/v1/customers/{customerId}/contacts/{contactId}`

**Summary:** Delete a contact

**Parameters:**

- `customerId` in `path` (`string`) **(required)**
- `contactId` in `path` (`string`) **(required)**

---

### `PATCH /api/v1/customers/{customerId}/contacts/{contactId}/set-primary`

**Summary:** Set contact as primary

**Parameters:**

- `customerId` in `path` (`string`) **(required)**
- `contactId` in `path` (`string`) **(required)**

---

### `PATCH /api/v1/customers/{customerId}/contacts/{contactId}/verify`

**Summary:** Verify a contact

**Parameters:**

- `contactId` in `path` (`string`) **(required)**
- `customerId` in `path` (`string`) **(required)**

---

### `GET /api/v1/customers/{customerId}/preferences`

**Summary:** Get customer preferences

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

---

### `PATCH /api/v1/customers/{customerId}/preferences`

**Summary:** Update customer preferences

**Parameters:**

- `customerId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `preferredLanguage` (`string`) *(optional)* - example: `en`
- `preferredBranchId` (`string`) *(optional)* - example: `branch-uuid`
- `marketingOptIn` (`boolean`) *(optional)* - example: `True`
- `smsOptIn` (`boolean`) *(optional)* - example: `True`
- `emailOptIn` (`boolean`) *(optional)* - example: `True`
- `notes` (`string`) *(optional)* - example: `Customer prefers quiet environment`
- `preferredStaffIds` (`Array<string>`) *(optional)* - example: `['staff-uuid-1']`
- `blockedStaffIds` (`Array<string>`) *(optional)* - example: `[]`
- `favoriteServices` (`Array<string>`) *(optional)* - example: `['service-uuid-1']`
- `reminderBeforeHours` (`number`) *(optional)* - example: `24`
- `preferredContactMethod` (`string`) *(optional)* - enum: `["EMAIL", "SMS", "BOTH"]`, example: `EMAIL`
- `typicalBookingTime` (`string`) *(optional)* - enum: `["MORNING", "AFTERNOON", "EVENING"]`, example: `MORNING`
- `preferredDays` (`Array<string>`) *(optional)* - example: `['MONDAY', 'WEDNESDAY', 'FRIDAY']`

---

## Expenses

*Total Endpoints: 13*

### `GET /api/v1/expenses`

**Summary:** List expenses

**Parameters:**

- `staffId` in `query` (`string`) *(optional)* - Filter by staff UUID
- `categoryId` in `query` (`string`) *(optional)* - Filter by category UUID
- `status` in `query` (`string`) *(optional)*
- `from` in `query` (`string`) *(optional)* - Start date (YYYY-MM-DD)
- `to` in `query` (`string`) *(optional)* - End date (YYYY-MM-DD)

---

### `POST /api/v1/expenses`

**Summary:** Create expense

**Request Body (`application/json`):**

- `staffId` (`string`) **(required)** - example: `uuid`, Staff member UUID
- `categoryId` (`string`) **(required)** - example: `uuid`, Expense category UUID
- `description` (`string`) **(required)** - example: `Taxi fare to client meeting`, Expense description
- `amount` (`number`) **(required)** - example: `35.5`, Expense amount
- `currency` (`string`) *(optional)* - example: `USD`, Currency code
- `expenseDate` (`string`) **(required)** - example: `2026-03-10`, Expense date (YYYY-MM-DD)
- `paymentMethod` (`string`) **(required)** - enum: `["CASH", "PERSONAL_CARD", "COMPANY_CARD", "BANK_TRANSFER"]`, Payment method
- `receiptNumber` (`string`) *(optional)* - example: `RCPT-12345`, Receipt number
- `receiptUrl` (`string`) *(optional)* - example: `https://storage.example.com/receipts/image.jpg`, Receipt URL
- `notes` (`string`) *(optional)* - example: `Additional notes`, Notes

---

### `GET /api/v1/expenses/categories`

**Summary:** List expense categories

---

### `POST /api/v1/expenses/categories`

**Summary:** Create expense category

**Request Body (`application/json`):**

- `categoryName` (`string`) **(required)** - example: `Office Supplies`, Category name
- `description` (`string`) *(optional)* - example: `Expenses for office supplies and equipment`, Category description
- `accountId` (`string`) *(optional)* - example: `uuid`, GL Account ID for this category
- `requiresReceipt` (`boolean`) *(optional)* - example: `True`, Whether receipt is required

---

### `DELETE /api/v1/expenses/categories/{categoryId}`

**Summary:** Delete expense category

**Parameters:**

- `categoryId` in `path` (`string`) **(required)** - Category UUID

---

### `GET /api/v1/expenses/categories/{categoryId}`

**Summary:** Get expense category by ID

**Parameters:**

- `categoryId` in `path` (`string`) **(required)** - Category UUID

---

### `PUT /api/v1/expenses/categories/{categoryId}`

**Summary:** Update expense category

**Parameters:**

- `categoryId` in `path` (`string`) **(required)** - Category UUID

**Request Body (`application/json`):**

- `categoryName` (`string`) *(optional)* - example: `Office Supplies`
- `description` (`string`) *(optional)* - example: `General office supplies and materials`
- `accountId` (`string`) *(optional)* - example: `550e8400-e29b-41d4-a716-446655440000`, Associated GL account ID
- `requiresReceipt` (`boolean`) *(optional)* - example: `True`, Whether receipt is required

---

### `GET /api/v1/expenses/{expenseId}`

**Summary:** Get expense details

**Parameters:**

- `expenseId` in `path` (`string`) **(required)** - Expense UUID

---

### `PUT /api/v1/expenses/{expenseId}`

**Summary:** Update expense

**Parameters:**

- `expenseId` in `path` (`string`) **(required)** - Expense UUID

**Request Body (`application/json`):**

- `description` (`string`) *(optional)* - example: `Updated description`, Expense description
- `amount` (`number`) *(optional)* - example: `40`, Expense amount
- `expenseDate` (`string`) *(optional)* - example: `2026-03-10`, Expense date (YYYY-MM-DD)
- `receiptUrl` (`string`) *(optional)* - example: `https://storage.example.com/receipts/image.jpg`, Receipt URL
- `notes` (`string`) *(optional)* - example: `Updated notes`, Notes

---

### `POST /api/v1/expenses/{expenseId}/approve`

**Summary:** Approve expense

**Parameters:**

- `expenseId` in `path` (`string`) **(required)** - Expense UUID

---

### `POST /api/v1/expenses/{expenseId}/process-payment`

**Summary:** Process expense payment

**Parameters:**

- `expenseId` in `path` (`string`) **(required)** - Expense UUID

---

### `POST /api/v1/expenses/{expenseId}/reject`

**Summary:** Reject expense

**Parameters:**

- `expenseId` in `path` (`string`) **(required)** - Expense UUID

**Request Body (`application/json`):**

- `rejectionReason` (`string`) **(required)** - example: `Missing receipt or invalid expense`, Reason for rejection

---

### `POST /api/v1/expenses/{expenseId}/submit`

**Summary:** Submit expense for approval

**Parameters:**

- `expenseId` in `path` (`string`) **(required)** - Expense UUID

---

## Expertise

*Total Endpoints: 5*

### `GET /api/v1/expertise`

**Summary:** Get all expertise

**Parameters:**

- `includeInactive` in `query` (`boolean`) *(optional)* - Include inactive expertise

---

### `POST /api/v1/expertise`

**Summary:** Create expertise

**Request Body (`application/json`):**

- `name` (`string`) **(required)** - example: `Hair Coloring`, Expertise name
- `description` (`string`) *(optional)* - example: `Advanced hair coloring techniques including balayage and highlights`, Expertise description

---

### `DELETE /api/v1/expertise/{expertiseId}`

**Summary:** Delete expertise (soft delete)

**Parameters:**

- `expertiseId` in `path` (`string`) **(required)** - Expertise UUID

---

### `GET /api/v1/expertise/{expertiseId}`

**Summary:** Get expertise by ID

**Parameters:**

- `expertiseId` in `path` (`string`) **(required)** - Expertise UUID

---

### `PUT /api/v1/expertise/{expertiseId}`

**Summary:** Update expertise

**Parameters:**

- `expertiseId` in `path` (`string`) **(required)** - Expertise UUID

**Request Body (`application/json`):**

- `name` (`string`) *(optional)* - example: `Hair Coloring`, Expertise name
- `description` (`string`) *(optional)* - example: `Advanced hair coloring techniques including balayage and highlights`, Expertise description
- `isActive` (`boolean`) *(optional)* - example: `True`, Whether the expertise is active

---

## File Upload

*Total Endpoints: 6*

### `POST /api/v1/upload/customer-image`

**Summary:** Upload customer profile image

**Parameters:**

- `customerId` in `query` (`string`) *(optional)* - Customer ID for folder organization

**Request Body (`multipart/form-data`):**

- `file` (`string`) *(optional)*

---

### `POST /api/v1/upload/image`

**Summary:** Upload a single image

**Parameters:**

- `bucket` in `query` (`string`) *(optional)* - Target bucket for upload
- `folder` in `query` (`string`) *(optional)* - Optional folder path within bucket

**Request Body (`multipart/form-data`):**

- `file` (`string`) *(optional)*

---

### `POST /api/v1/upload/images`

**Summary:** Upload multiple images

**Parameters:**

- `bucket` in `query` (`string`) *(optional)* - Target bucket for upload
- `folder` in `query` (`string`) *(optional)* - Optional folder path within bucket

**Request Body (`multipart/form-data`):**

- `files` (`Array<string>`) *(optional)*

---

### `POST /api/v1/upload/receipt`

**Summary:** Upload expense receipt

**Parameters:**

- `expenseId` in `query` (`string`) *(optional)* - Expense ID for folder organization

**Request Body (`multipart/form-data`):**

- `file` (`string`) *(optional)*

---

### `POST /api/v1/upload/service-image`

**Summary:** Upload service image

**Parameters:**

- `serviceId` in `query` (`string`) *(optional)* - Service ID for folder organization

**Request Body (`multipart/form-data`):**

- `file` (`string`) *(optional)*

---

### `POST /api/v1/upload/staff-image`

**Summary:** Upload staff profile image

**Parameters:**

- `staffId` in `query` (`string`) *(optional)* - Staff ID for folder organization

**Request Body (`multipart/form-data`):**

- `file` (`string`) *(optional)*

---

## Overbooking

*Total Endpoints: 6*

### `GET /api/v1/overbooking-rules`

**Summary:** Get all overbooking rules

**Parameters:**

- `branchId` in `query` (`string`) *(optional)* - Filter by branch ID
- `serviceId` in `query` (`string`) *(optional)* - Filter by service ID
- `isActive` in `query` (`boolean`) *(optional)* - Filter by active status

---

### `POST /api/v1/overbooking-rules`

**Summary:** Create overbooking rule

**Details:** Define overbooking strategy for a branch or specific service

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - Tenant ID
- `branchId` (`string`) **(required)** - Branch ID
- `serviceId` (`string`) *(optional)* - Service ID (null = all services)
- `maxOverbookLimit` (`number`) **(required)** - example: `2`, Maximum overbooking limit
- `strategy` (`string`) **(required)** - enum: `["PERCENTAGE", "FIXED"]`, example: `FIXED`, Overbooking strategy
- `allowedPercentage` (`number`) *(optional)* - example: `10`, Allowed percentage (when strategy=PERCENTAGE)
- `isActive` (`boolean`) *(optional)* - Is rule active?
- `description` (`string`) *(optional)* - Rule description

---

### `GET /api/v1/overbooking-rules/branch/{branchId}`

**Summary:** Get overbooking rules for branch

**Details:** Get all overbooking rules applicable to a branch

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch ID

---

### `DELETE /api/v1/overbooking-rules/{ruleId}`

**Summary:** Delete overbooking rule

**Parameters:**

- `ruleId` in `path` (`string`) **(required)** - Overbooking rule ID

---

### `GET /api/v1/overbooking-rules/{ruleId}`

**Summary:** Get overbooking rule by ID

**Parameters:**

- `ruleId` in `path` (`string`) **(required)** - Overbooking rule ID

---

### `PATCH /api/v1/overbooking-rules/{ruleId}`

**Summary:** Update overbooking rule

**Parameters:**

- `ruleId` in `path` (`string`) **(required)** - Overbooking rule ID

**Request Body (`application/json`):**

- `tenantId` (`string`) *(optional)* - Tenant ID
- `branchId` (`string`) *(optional)* - Branch ID
- `serviceId` (`string`) *(optional)* - Service ID (null = all services)
- `maxOverbookLimit` (`number`) *(optional)* - example: `2`, Maximum overbooking limit
- `strategy` (`string`) *(optional)* - enum: `["PERCENTAGE", "FIXED"]`, example: `FIXED`, Overbooking strategy
- `allowedPercentage` (`number`) *(optional)* - example: `10`, Allowed percentage (when strategy=PERCENTAGE)
- `isActive` (`boolean`) *(optional)* - Is rule active?
- `description` (`string`) *(optional)* - Rule description

---

## Payments

*Total Endpoints: 4*

### `GET /api/v1/payments`

**Summary:** List payments

**Parameters:**

- `customerId` in `query` (`string`) *(optional)* - Filter by customer UUID
- `invoiceId` in `query` (`string`) *(optional)* - Filter by invoice UUID
- `status` in `query` (`string`) *(optional)*
- `paymentMethod` in `query` (`string`) *(optional)*
- `from` in `query` (`string`) *(optional)* - Start date (YYYY-MM-DD)
- `to` in `query` (`string`) *(optional)* - End date (YYYY-MM-DD)

---

### `POST /api/v1/payments`

**Summary:** Record payment

**Request Body (`application/json`):**

- `customerId` (`string`) **(required)** - example: `uuid`, Customer UUID
- `invoiceId` (`string`) *(optional)* - example: `uuid`, Invoice UUID (optional)
- `amount` (`number`) **(required)** - example: `100`, Payment amount
- `currency` (`string`) *(optional)* - example: `USD`, Currency code
- `paymentMethod` (`string`) **(required)** - enum: `["CASH", "CHECK", "BANK_TRANSFER"]`, Payment method
- `paymentDate` (`string`) **(required)** - example: `2026-03-10`, Payment date (YYYY-MM-DD)
- `referenceNumber` (`string`) *(optional)* - example: `CHK-12345`, Reference number (check number, etc.)
- `notes` (`string`) *(optional)* - example: `Payment notes`, Notes
- `idempotencyKey` (`string`) **(required)** - example: `unique-payment-key-123`, Idempotency key to prevent duplicates

---

### `GET /api/v1/payments/{paymentId}`

**Summary:** Get payment details

**Parameters:**

- `paymentId` in `path` (`string`) **(required)** - Payment UUID

---

### `POST /api/v1/payments/{paymentId}/refund`

**Summary:** Refund payment

**Parameters:**

- `paymentId` in `path` (`string`) **(required)** - Payment UUID

**Request Body (`application/json`):**

- `amount` (`number`) **(required)** - example: `50`, Refund amount
- `reason` (`string`) *(optional)* - example: `Customer requested refund`, Reason
- `idempotencyKey` (`string`) **(required)** - example: `unique-refund-key-123`, Idempotency key to prevent duplicates

---

## Payroll

*Total Endpoints: 7*

### `GET /api/v1/payroll`

**Summary:** List payroll records

**Parameters:**

- `staffId` in `query` (`string`) *(optional)*
- `status` in `query` (`string`) *(optional)*
- `from` in `query` (`string`) *(optional)*
- `to` in `query` (`string`) *(optional)*

---

### `POST /api/v1/payroll`

**Summary:** Create payroll

**Request Body (`application/json`):**

- `staffId` (`string`) **(required)** - example: `uuid`, Staff UUID
- `periodStart` (`string`) **(required)** - example: `2026-03-01`
- `periodEnd` (`string`) **(required)** - example: `2026-03-31`
- `baseSalary` (`number`) **(required)** - example: `20000`
- `bonus` (`number`) *(optional)* - example: `1500`
- `deductions` (`number`) *(optional)* - example: `700`
- `notes` (`string`) *(optional)* - example: `March payroll`

---

### `DELETE /api/v1/payroll/{payrollId}`

**Summary:** Delete payroll

**Parameters:**

- `payrollId` in `path` (`string`) **(required)**

---

### `GET /api/v1/payroll/{payrollId}`

**Summary:** Get payroll

**Parameters:**

- `payrollId` in `path` (`string`) **(required)** - Payroll UUID

---

### `PUT /api/v1/payroll/{payrollId}`

**Summary:** Update payroll

**Parameters:**

- `payrollId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `periodStart` (`string`) *(optional)* - example: `2026-03-01`
- `periodEnd` (`string`) *(optional)* - example: `2026-03-31`
- `baseSalary` (`number`) *(optional)* - example: `20000`
- `bonus` (`number`) *(optional)* - example: `1500`
- `deductions` (`number`) *(optional)* - example: `700`
- `notes` (`string`) *(optional)* - example: `Adjusted payroll`

---

### `POST /api/v1/payroll/{payrollId}/pay`

**Summary:** Pay payroll

**Parameters:**

- `payrollId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `paymentAccountId` (`string`) **(required)** - example: `uuid`, Bank/Cash account UUID

---

### `POST /api/v1/payroll/{payrollId}/reverse`

**Summary:** Reverse payroll payment

**Parameters:**

- `payrollId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `reason` (`string`) *(optional)* - example: `Correction entry`

---

## Resource Types

*Total Endpoints: 5*

### `POST /api/v1/resource-types`

**Summary:** Create a new resource type

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - Tenant ID
- `name` (`string`) **(required)** - example: `Chair`, Resource type name
- `category` (`string`) **(required)** - example: `Furniture`, Resource category
- `requiresStaff` (`boolean`) *(optional)* - Requires staff
- `isSchedulable` (`boolean`) *(optional)* - Is schedulable

---

### `GET /api/v1/resource-types/tenants/{tenantId}`

**Summary:** List resource types by tenant

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant ID

---

### `DELETE /api/v1/resource-types/{resourceTypeId}`

**Summary:** Delete resource type

**Parameters:**

- `resourceTypeId` in `path` (`string`) **(required)** - Resource Type ID

---

### `GET /api/v1/resource-types/{resourceTypeId}`

**Summary:** Get resource type details

**Parameters:**

- `resourceTypeId` in `path` (`string`) **(required)** - Resource Type ID

---

### `PATCH /api/v1/resource-types/{resourceTypeId}`

**Summary:** Update resource type

**Parameters:**

- `resourceTypeId` in `path` (`string`) **(required)** - Resource Type ID

**Request Body (`application/json`):**

- `name` (`string`) *(optional)* - Resource type name
- `category` (`string`) *(optional)* - Resource category
- `requiresStaff` (`boolean`) *(optional)* - Requires staff
- `isSchedulable` (`boolean`) *(optional)* - Is schedulable

---

## Resources

*Total Endpoints: 8*

### `GET /api/v1/resources`

**Summary:** List or search resources

**Parameters:**

- `tenantId` in `query` (`string`) *(optional)* - Tenant ID
- `branchId` in `query` (`string`) *(optional)* - Branch ID
- `resourceTypeId` in `query` (`string`) *(optional)* - Resource Type ID
- `status` in `query` (`string`) *(optional)*
- `maintenanceStatus` in `query` (`string`) *(optional)*
- `isBookable` in `query` (`boolean`) *(optional)* - Only bookable resources
- `search` in `query` (`string`) *(optional)* - Search by name
- `page` in `query` (`number`) *(optional)*
- `limit` in `query` (`number`) *(optional)*

---

### `POST /api/v1/resources`

**Summary:** Create a new resource

**Request Body (`application/json`):**

- `branchId` (`string`) **(required)** - example: `uuid`, Branch ID
- `resourceTypeId` (`string`) **(required)** - example: `uuid`, Resource Type ID
- `name` (`string`) **(required)** - example: `Chair 01`, Resource name
- `capacity` (`number`) *(optional)* - example: `1`, Resource capacity
- `description` (`string`) *(optional)* - example: `Description`, Resource description
- `price` (`number`) *(optional)* - example: `0`, Resource rental/usage price
- `purchaseCost` (`number`) *(optional)* - example: `500`, Resource purchase cost
- `purchasedAt` (`string`) *(optional)* - example: `2026-04-01`, Purchase date (YYYY-MM-DD)
- `isBookable` (`boolean`) *(optional)* - example: `True`, Whether the resource can be booked by customers

---

### `DELETE /api/v1/resources/{resourceId}`

**Summary:** Permanently delete a resource

**Details:** WARNING: This is a hard delete and cannot be undone. The resource must not have any active schedules, availability overrides, bookings, or service assignments. Consider using archive instead for soft delete.

**Parameters:**

- `resourceId` in `path` (`string`) **(required)** - Resource ID

---

### `GET /api/v1/resources/{resourceId}`

**Summary:** Get resource details

**Parameters:**

- `resourceId` in `path` (`string`) **(required)** - Resource ID

---

### `PATCH /api/v1/resources/{resourceId}`

**Summary:** Update resource

**Parameters:**

- `resourceId` in `path` (`string`) **(required)** - Resource ID

**Request Body (`application/json`):**

- `name` (`string`) *(optional)* - example: `Chair A`, Resource name
- `maintenanceStatus` (`string`) *(optional)* - enum: `["AVAILABLE", "UNDER_MAINTENANCE"]`, example: `AVAILABLE`, Maintenance status
- `description` (`string`) *(optional)* - example: `Updated description`
- `capacity` (`number`) *(optional)* - example: `1`, Resource capacity
- `status` (`string`) *(optional)* - enum: `["ACTIVE", "INACTIVE", "ARCHIVED"]`, example: `ACTIVE`, Resource status
- `price` (`number`) *(optional)* - example: `100`, Resource rental/usage price
- `purchaseCost` (`number`) *(optional)* - example: `500`, Resource purchase cost
- `purchasedAt` (`string`) *(optional)* - example: `2026-04-01`, Purchase date (YYYY-MM-DD)
- `isBookable` (`boolean`) *(optional)* - example: `True`, Whether the resource can be booked by customers

---

### `POST /api/v1/resources/{resourceId}/archive`

**Summary:** Archive a resource

**Parameters:**

- `resourceId` in `path` (`string`) **(required)** - Resource ID

**Request Body (`application/json`):**

- `reason` (`string`) **(required)** - example: `Removed`, Reason for archiving

---

### `POST /api/v1/resources/{resourceId}/reactivate`

**Summary:** Reactivate an archived resource

**Parameters:**

- `resourceId` in `path` (`string`) **(required)** - Resource ID

---

### `POST /api/v1/resources/{resourceId}/services`

**Summary:** Assign resource type to service

**Parameters:**

- `resourceId` in `path` (`string`) **(required)** - Resource ID

**Request Body (`application/json`):**

- `serviceId` (`string`) **(required)** - example: `uuid`, Service ID
- `isRequired` (`boolean`) **(required)** - example: `True`, Whether resource is required for service

---

## Service Categories

*Total Endpoints: 6*

### `POST /api/v1/service-categories`

**Summary:** Create a new service category

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - example: `uuid`
- `branchId` (`string`) **(required)** - example: `uuid`
- `name` (`string`) **(required)** - example: `Hair`
- `description` (`string`) *(optional)* - example: `All hair services`
- `parentCategoryId` (`string`) *(optional)*
- `displayOrder` (`number`) *(optional)* - example: `1`

---

### `GET /api/v1/service-categories/branches/{branchId}`

**Summary:** List categories in tree format for a branch

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch ID

---

### `DELETE /api/v1/service-categories/{categoryId}`

**Summary:** Delete a category

**Parameters:**

- `categoryId` in `path` (`string`) **(required)** - Category ID

---

### `GET /api/v1/service-categories/{categoryId}`

**Summary:** Get category details

**Parameters:**

- `categoryId` in `path` (`string`) **(required)** - Category ID

---

### `PATCH /api/v1/service-categories/{categoryId}`

**Summary:** Update category

**Parameters:**

- `categoryId` in `path` (`string`) **(required)** - Category ID

**Request Body (`application/json`):**

- `tenantId` (`string`) *(optional)* - example: `uuid`
- `branchId` (`string`) *(optional)* - example: `uuid`
- `name` (`string`) *(optional)* - example: `Hair`
- `description` (`string`) *(optional)* - example: `All hair services`
- `parentCategoryId` (`string`) *(optional)*
- `displayOrder` (`number`) *(optional)* - example: `1`

---

### `POST /api/v1/service-categories/{categoryId}/archive`

**Summary:** Archive a category

**Parameters:**

- `categoryId` in `path` (`string`) **(required)** - Category ID

---

## Services

*Total Endpoints: 33*

### `POST /api/v1/services`

**Summary:** Create a new service

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - example: `uuid`
- `branchId` (`string`) **(required)** - example: `uuid`
- `categoryId` (`string`) *(optional)* - example: `uuid`
- `name` (`string`) **(required)** - example: `Haircut`
- `description` (`string`) *(optional)* - example: `Standard haircut`
- `imageUrl` (`string`) *(optional)* - example: `https://example.com/images/haircut.jpg`
- `baseDurationMinutes` (`number`) **(required)** - example: `30`
- `bufferBeforeMinutes` (`number`) *(optional)* - example: `0`
- `bufferAfterMinutes` (`number`) *(optional)* - example: `0`
- `basePrice` (`number`) **(required)** - example: `20`
- `priceVisible` (`boolean`) *(optional)* - example: `True`
- `currency` (`string`) *(optional)* - example: `USD`
- `bookingType` (`string`) *(optional)* - enum: `["APPOINTMENT", "WALKIN", "GROUP"]`
- `isOnlineBookable` (`boolean`) *(optional)* - example: `True`
- `requiresStaff` (`boolean`) *(optional)* - example: `True`
- `requiresResource` (`boolean`) *(optional)* - example: `False`
- `maxCapacity` (`number`) *(optional)* - example: `1`

---

### `GET /api/v1/services/branches/{branchId}`

**Summary:** List services by branch

**Parameters:**

- `branchId` in `path` (`string`) **(required)** - Branch ID

---

### `DELETE /api/v1/services/{serviceId}`

**Summary:** Delete service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `GET /api/v1/services/{serviceId}`

**Summary:** Get service details

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `PATCH /api/v1/services/{serviceId}`

**Summary:** Update service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

**Request Body (`application/json`):**

- `tenantId` (`string`) *(optional)* - example: `uuid`
- `branchId` (`string`) *(optional)* - example: `uuid`
- `categoryId` (`string`) *(optional)* - example: `uuid`
- `name` (`string`) *(optional)* - example: `Haircut`
- `description` (`string`) *(optional)* - example: `Standard haircut`
- `imageUrl` (`string`) *(optional)* - example: `https://example.com/images/haircut.jpg`
- `baseDurationMinutes` (`number`) *(optional)* - example: `30`
- `bufferBeforeMinutes` (`number`) *(optional)* - example: `0`
- `bufferAfterMinutes` (`number`) *(optional)* - example: `0`
- `basePrice` (`number`) *(optional)* - example: `20`
- `priceVisible` (`boolean`) *(optional)* - example: `True`
- `currency` (`string`) *(optional)* - example: `USD`
- `bookingType` (`string`) *(optional)* - enum: `["APPOINTMENT", "WALKIN", "GROUP"]`
- `isOnlineBookable` (`boolean`) *(optional)* - example: `True`
- `requiresStaff` (`boolean`) *(optional)* - example: `True`
- `requiresResource` (`boolean`) *(optional)* - example: `False`
- `maxCapacity` (`number`) *(optional)* - example: `1`

---

### `POST /api/v1/services/{serviceId}/activate`

**Summary:** Activate a service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `GET /api/v1/services/{serviceId}/addons`

**Summary:** Get service addons

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `POST /api/v1/services/{serviceId}/addons`

**Summary:** Add an addon to service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

**Request Body (`application/json`):**

- `name` (`string`) **(required)** - example: `Beard Trim`
- `additionalDuration` (`number`) **(required)** - example: `10`
- `additionalPrice` (`number`) **(required)** - example: `5`
- `isOptional` (`boolean`) *(optional)* - example: `True`

---

### `DELETE /api/v1/services/{serviceId}/addons/{addonId}`

**Summary:** Delete an addon

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `addonId` in `path` (`string`) **(required)** - Addon ID

---

### `PATCH /api/v1/services/{serviceId}/addons/{addonId}`

**Summary:** Update an addon

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `addonId` in `path` (`string`) **(required)** - Addon ID

**Request Body (`application/json`):**

- `name` (`string`) *(optional)* - example: `Beard Trim`
- `additionalDuration` (`number`) *(optional)* - example: `10`
- `additionalPrice` (`number`) *(optional)* - example: `5`
- `isOptional` (`boolean`) *(optional)* - example: `True`

---

### `POST /api/v1/services/{serviceId}/archive`

**Summary:** Archive a service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `GET /api/v1/services/{serviceId}/details`

**Summary:** Get complete service details with all related data

**Details:** Returns service with all related data including steps, pricing rules, expertise requirements, resource requirements, addons, and images

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `GET /api/v1/services/{serviceId}/expertise`

**Summary:** Get service expertise requirements

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `POST /api/v1/services/{serviceId}/expertise`

**Summary:** Assign required expertise to service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

**Request Body (`application/json`):**

- `expertiseId` (`string`) **(required)** - example: `uuid`
- `requiredLevel` (`string`) **(required)** - enum: `["BEGINNER", "ADVANCED", "EXPERT"]`, example: `ADVANCED`

---

### `DELETE /api/v1/services/{serviceId}/expertise/{expertiseRequirementId}`

**Summary:** Delete an expertise requirement

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `expertiseRequirementId` in `path` (`string`) **(required)** - Expertise requirement relation ID

---

### `PATCH /api/v1/services/{serviceId}/expertise/{expertiseRequirementId}`

**Summary:** Update an expertise requirement

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `expertiseRequirementId` in `path` (`string`) **(required)** - Expertise requirement relation ID

**Request Body (`application/json`):**

- `expertiseId` (`string`) *(optional)* - example: `uuid`
- `requiredLevel` (`string`) *(optional)* - enum: `["BEGINNER", "ADVANCED", "EXPERT"]`, example: `ADVANCED`

---

### `GET /api/v1/services/{serviceId}/images`

**Summary:** Get service images

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `POST /api/v1/services/{serviceId}/images`

**Summary:** Add an image to service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

**Request Body (`multipart/form-data`):**

- `file` (`string`) *(optional)*
- `imageUrl` (`string`) *(optional)*
- `caption` (`string`) *(optional)*
- `displayOrder` (`integer`) *(optional)*
- `isPrimary` (`boolean`) *(optional)*

---

### `DELETE /api/v1/services/{serviceId}/images/{imageId}`

**Summary:** Delete a service image

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `imageId` in `path` (`string`) **(required)** - Image ID

---

### `PATCH /api/v1/services/{serviceId}/images/{imageId}`

**Summary:** Update a service image

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `imageId` in `path` (`string`) **(required)** - Image ID

**Request Body (`application/json`):**

- `imageUrl` (`string`) *(optional)* - example: `https://example.com/images/service1-updated.jpg`
- `caption` (`string`) *(optional)* - example: `Updated caption`
- `displayOrder` (`number`) *(optional)* - example: `1`
- `isPrimary` (`boolean`) *(optional)* - example: `True`

---

### `GET /api/v1/services/{serviceId}/overbooking-status`

**Summary:** Get overbooking status for service

**Details:** Check overbooking capacity and current utilization for a service on a specific date

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `date` in `query` (`string`) **(required)** - Date to check (YYYY-MM-DD)
- `branchId` in `query` (`string`) **(required)** - Branch ID
- `baseCapacity` in `query` (`number`) **(required)** - Base capacity for the service
- `currentBookings` in `query` (`number`) **(required)** - Current number of bookings

---

### `GET /api/v1/services/{serviceId}/pricing`

**Summary:** Get service pricing rules

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `POST /api/v1/services/{serviceId}/pricing`

**Summary:** Add a pricing rule to service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

**Request Body (`application/json`):**

- `priceType` (`string`) **(required)** - enum: `["FIXED", "HOURLY", "TIERED"]`, example: `FIXED`
- `price` (`number`) **(required)** - example: `25`
- `validFrom` (`string`) *(optional)* - example: `2026-01-01`
- `validTo` (`string`) *(optional)* - example: `2026-12-31`
- `dayOfWeek` (`number`) *(optional)* - example: `1`, 1=Monday, 7=Sunday
- `timeStart` (`string`) *(optional)* - example: `09:00`
- `timeEnd` (`string`) *(optional)* - example: `17:00`

---

### `DELETE /api/v1/services/{serviceId}/pricing/{pricingId}`

**Summary:** Delete a pricing rule

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `pricingId` in `path` (`string`) **(required)** - Pricing rule ID

---

### `PATCH /api/v1/services/{serviceId}/pricing/{pricingId}`

**Summary:** Update a pricing rule

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `pricingId` in `path` (`string`) **(required)** - Pricing rule ID

**Request Body (`application/json`):**

- `priceType` (`string`) *(optional)* - enum: `["FIXED", "HOURLY", "TIERED"]`, example: `FIXED`
- `price` (`number`) *(optional)* - example: `25`
- `validFrom` (`string`) *(optional)* - example: `2026-01-01`
- `validTo` (`string`) *(optional)* - example: `2026-12-31`
- `dayOfWeek` (`number`) *(optional)* - example: `1`, 1=Monday, 7=Sunday
- `timeStart` (`string`) *(optional)* - example: `09:00`
- `timeEnd` (`string`) *(optional)* - example: `17:00`

---

### `GET /api/v1/services/{serviceId}/resources`

**Summary:** Get service resource requirements

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `POST /api/v1/services/{serviceId}/resources`

**Summary:** Assign required resource to service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

**Request Body (`application/json`):**

- `resourceTypeId` (`string`) **(required)** - example: `uuid`
- `quantityRequired` (`number`) **(required)** - example: `1`

---

### `DELETE /api/v1/services/{serviceId}/resources/{resourceRequirementId}`

**Summary:** Delete a resource requirement

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `resourceRequirementId` in `path` (`string`) **(required)** - Resource requirement relation ID

---

### `PATCH /api/v1/services/{serviceId}/resources/{resourceRequirementId}`

**Summary:** Update a resource requirement

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `resourceRequirementId` in `path` (`string`) **(required)** - Resource requirement relation ID

**Request Body (`application/json`):**

- `resourceTypeId` (`string`) *(optional)* - example: `uuid`
- `quantityRequired` (`number`) *(optional)* - example: `1`

---

### `GET /api/v1/services/{serviceId}/steps`

**Summary:** Get service steps

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

---

### `POST /api/v1/services/{serviceId}/steps`

**Summary:** Add a step to service

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID

**Request Body (`application/json`):**

- `name` (`string`) **(required)** - example: `Wash`
- `durationMinutes` (`number`) **(required)** - example: `10`
- `requiresStaff` (`boolean`) *(optional)* - example: `True`
- `requiresResource` (`boolean`) *(optional)* - example: `True`
- `stepOrder` (`number`) **(required)** - example: `1`

---

### `DELETE /api/v1/services/{serviceId}/steps/{stepId}`

**Summary:** Delete a service step

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `stepId` in `path` (`string`) **(required)** - Service step ID

---

### `PATCH /api/v1/services/{serviceId}/steps/{stepId}`

**Summary:** Update a service step

**Parameters:**

- `serviceId` in `path` (`string`) **(required)** - Service ID
- `stepId` in `path` (`string`) **(required)** - Service step ID

**Request Body (`application/json`):**

- `name` (`string`) *(optional)* - example: `Wash`
- `durationMinutes` (`number`) *(optional)* - example: `10`
- `requiresStaff` (`boolean`) *(optional)* - example: `True`
- `requiresResource` (`boolean`) *(optional)* - example: `True`
- `stepOrder` (`number`) *(optional)* - example: `1`

---

## Staff

*Total Endpoints: 14*

### `GET /api/v1/staff`

**Summary:** Search and filter staff members

**Parameters:**

- `tenantId` in `query` (`string`) *(optional)* - Filter by tenant ID
- `branchId` in `query` (`string`) *(optional)* - Filter by branch ID
- `search` in `query` (`string`) *(optional)* - Search by name or email
- `page` in `query` (`number`) *(optional)* - Page number
- `limit` in `query` (`number`) *(optional)* - Items per page

---

### `POST /api/v1/staff`

**Summary:** Create a new staff member

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440000`, Tenant ID
- `userId` (`string`) *(optional)* - example: `550e8400-e29b-41d4-a716-446655440001`, User ID (if staff has a user account)
- `createUser` (`boolean`) *(optional)* - Create a login user for this staff member
- `password` (`string`) *(optional)* - Password for the staff login user (required if createUser=true)
- `fullName` (`string`) **(required)** - example: `Rahim`, Full name of the staff member
- `email` (`string`) **(required)** - example: `rahim@mail.com`, Email address
- `roleTitle` (`string`) *(optional)* - example: `Stylist`, Role/job title
- `employmentType` (`string`) *(optional)* - enum: `["FULL_TIME", "PART_TIME", "CONTRACT"]`, example: `FULL_TIME`, Type of employment
- `phone` (`string`) *(optional)* - example: `+8801712345678`, Phone number
- `hireDate` (`string`) *(optional)* - example: `2026-03-01`, Hire date (YYYY-MM-DD)
- `notes` (`string`) *(optional)* - example: `Notes about the staff member`, Internal notes

---

### `GET /api/v1/staff/{staffId}`

**Summary:** Get staff member by ID

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

---

### `PATCH /api/v1/staff/{staffId}`

**Summary:** Update staff member

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `fullName` (`string`) *(optional)* - example: `Rahim Updated`, Full name
- `roleTitle` (`string`) *(optional)* - example: `Senior Stylist`, Role/job title
- `email` (`string`) *(optional)* - example: `rahim.new@mail.com`, Email address
- `phone` (`string`) *(optional)* - example: `+8801712345678`, Phone number
- `employmentType` (`string`) *(optional)* - enum: `["FULL_TIME", "PART_TIME", "CONTRACT"]`, example: `PART_TIME`, Type of employment
- `profilePhotoUrl` (`string`) *(optional)* - example: `https://example.com/photos/staff.jpg`, Profile photo URL
- `notes` (`string`) *(optional)* - example: `Additional notes about the staff member`, Internal notes
- `hireDate` (`string`) *(optional)* - example: `2026-03-01`, Hire date (YYYY-MM-DD)

---

### `POST /api/v1/staff/{staffId}/archive`

**Summary:** Archive/terminate staff member

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `reason` (`string`) **(required)** - example: `Left company`, Reason for archiving/terminating

---

### `GET /api/v1/staff/{staffId}/branches`

**Summary:** Get all branches for staff member

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

---

### `POST /api/v1/staff/{staffId}/branches`

**Summary:** Assign staff to a branch

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `branchId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440000`, Branch ID
- `isPrimary` (`boolean`) *(optional)* - example: `True`, Whether this is the primary branch

---

### `DELETE /api/v1/staff/{staffId}/branches/{branchId}`

**Summary:** Remove staff from branch

**Parameters:**

- `staffId` in `path` (`string`) **(required)**
- `branchId` in `path` (`string`) **(required)**

---

### `PATCH /api/v1/staff/{staffId}/branches/{branchId}/primary`

**Summary:** Update primary branch for staff

**Parameters:**

- `staffId` in `path` (`string`) **(required)**
- `branchId` in `path` (`string`) **(required)**

---

### `GET /api/v1/staff/{staffId}/expertise`

**Summary:** Get all expertise for staff member

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

---

### `POST /api/v1/staff/{staffId}/expertise`

**Summary:** Assign expertise to staff member

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `expertiseId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440000`, Expertise ID
- `proficiencyLevel` (`string`) **(required)** - enum: `["BEGINNER", "ADVANCED", "EXPERT"]`, example: `ADVANCED`, Proficiency level
- `certifiedDate` (`string`) *(optional)* - example: `2024-01-15`, Date when certified
- `expiryDate` (`string`) *(optional)* - example: `2026-01-15`, Certification expiry date
- `certificationNumber` (`string`) *(optional)* - example: `CERT-12345`, Certification number
- `notes` (`string`) *(optional)* - example: `Completed advanced training course`, Additional notes

---

### `DELETE /api/v1/staff/{staffId}/expertise/{staffExpertiseId}`

**Summary:** Remove expertise from staff member

**Parameters:**

- `staffId` in `path` (`string`) **(required)**
- `staffExpertiseId` in `path` (`string`) **(required)** - Staff expertise relation ID

---

### `PATCH /api/v1/staff/{staffId}/expertise/{staffExpertiseId}`

**Summary:** Update staff expertise assignment

**Parameters:**

- `staffId` in `path` (`string`) **(required)**
- `staffExpertiseId` in `path` (`string`) **(required)** - Staff expertise relation ID

**Request Body (`application/json`):**

- `proficiencyLevel` (`string`) *(optional)* - enum: `["BEGINNER", "ADVANCED", "EXPERT"]`, example: `EXPERT`, Proficiency level
- `certifiedDate` (`string`) *(optional)* - example: `2024-01-15`, Date when certified
- `expiryDate` (`string`) *(optional)* - example: `2026-01-15`, Certification expiry date
- `certificationNumber` (`string`) *(optional)* - example: `CERT-12345`, Certification number
- `notes` (`string`) *(optional)* - example: `Updated certification level`, Additional notes

---

### `POST /api/v1/staff/{staffId}/restore`

**Summary:** Restore archived staff member

**Parameters:**

- `staffId` in `path` (`string`) **(required)**

---

## Tenant Customers

*Total Endpoints: 7*

### `GET /api/v1/tenants/{tenantId}/customers`

**Summary:** Search tenant customers

**Parameters:**

- `tenantId` in `path` (`string`) **(required)**
- `search` in `query` (`string`) *(optional)* - Search by name, email, or phone
- `tag` in `query` (`string`) *(optional)* - Filter by tag
- `page` in `query` (`number`) *(optional)* - Page number
- `limit` in `query` (`number`) *(optional)* - Items per page

---

### `POST /api/v1/tenants/{tenantId}/customers`

**Summary:** Link customer to tenant

**Parameters:**

- `tenantId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `customerId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440000`, Customer ID to link
- `preferredBranchId` (`string`) *(optional)* - example: `550e8400-e29b-41d4-a716-446655440001`, Preferred branch ID

---

### `GET /api/v1/tenants/{tenantId}/customers/{tenantCustomerId}`

**Summary:** Get tenant customer profile

**Parameters:**

- `tenantId` in `path` (`string`) **(required)**
- `tenantCustomerId` in `path` (`string`) **(required)**

---

### `POST /api/v1/tenants/{tenantId}/customers/{tenantCustomerId}/archive`

**Summary:** Archive customer

**Parameters:**

- `tenantId` in `path` (`string`) **(required)**
- `tenantCustomerId` in `path` (`string`) **(required)**

---

### `GET /api/v1/tenants/{tenantId}/customers/{tenantCustomerId}/notes`

**Summary:** Get customer notes

**Parameters:**

- `tenantCustomerId` in `path` (`string`) **(required)**
- `page` in `query` (`number`) *(optional)*
- `limit` in `query` (`number`) *(optional)*
- `tenantId` in `path` (`string`) **(required)**

---

### `POST /api/v1/tenants/{tenantId}/customers/{tenantCustomerId}/notes`

**Summary:** Add note to customer

**Parameters:**

- `tenantCustomerId` in `path` (`string`) **(required)**
- `tenantId` in `path` (`string`) **(required)**

**Request Body (`application/json`):**

- `content` (`string`) **(required)** - example: `Customer prefers morning appointments`
- `isPrivate` (`boolean`) *(optional)* - example: `False`

---

### `POST /api/v1/tenants/{tenantId}/customers/{tenantCustomerId}/tags`

**Summary:** Add tag to customer

**Parameters:**

- `tenantId` in `path` (`string`) **(required)**
- `tenantCustomerId` in `path` (`string`) **(required)**

---

## Tenants

*Total Endpoints: 15*

### `POST /api/v1/tenants`

**Summary:** Create a new tenant (Signup)

**Details:** Register a new tenant organization with owner account

**Request Body (`application/json`):**

- `tenantName` (`string`) **(required)** - example: `Appointask Salon`, Tenant name (company name)
- `businessType` (`string`) **(required)** - enum: `["SALON", "HOTEL", "PETCARE", "DRIVING", "HORSE", "PARKING", "COWORKING", "MULTI"]`, example: `SALON`, Business type
- `timezone` (`string`) **(required)** - example: `Asia/Dhaka`, Timezone
- `currency` (`string`) **(required)** - example: `BDT`, Currency code
- `owner` (`string`) **(required)** - Owner user details
- `legalName` (`string`) *(optional)* - Legal name
- `country` (`string`) *(optional)* - example: `BD`, Country ISO code
- `language` (`string`) *(optional)* - example: `en`, Language code
- `brandPrimaryColor` (`string`) *(optional)* - example: `#FF5733`, Brand primary color
- `brandSecondaryColor` (`string`) *(optional)* - example: `#33A1FF`, Brand secondary color
- `brandBorderRadius` (`string`) *(optional)* - example: `8px`, Brand border radius (e.g., 4px, 0.5rem, 50%)

---

### `POST /api/v1/tenants/invites/accept`

**Summary:** Accept invite

**Details:** Accept a tenant invitation and create user account

**Request Body (`application/json`):**

- `inviteCode` (`string`) **(required)** - example: `INV-123456-ABCDEF`, Invitation code received via email or SMS
- `fullName` (`string`) **(required)** - example: `Jane Smith`, Full name of the user accepting the invite
- `password` (`string`) **(required)** - example: `SecurePass123!`, Password for the new user account (minimum 8 characters)

---

### `GET /api/v1/tenants/{tenantId}`

**Summary:** Get tenant details

**Details:** Retrieve tenant information by ID

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

---

### `PATCH /api/v1/tenants/{tenantId}`

**Summary:** Update tenant profile

**Details:** Update tenant information

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

**Request Body (`application/json`):**

- `tenantName` (`string`) *(optional)* - example: `Updated Salon Name`, Tenant name
- `legalName` (`string`) *(optional)* - Legal name
- `primaryEmail` (`string`) *(optional)* - example: `info@salon.com`, Primary email
- `primaryPhone` (`string`) *(optional)* - example: `+8801712345678`, Primary phone
- `websiteUrl` (`string`) *(optional)* - example: `https://salon.com`, Website URL
- `logoUrl` (`string`) *(optional)* - example: `https://cdn.example.com/logo.png`, Logo URL
- `brandPrimaryColor` (`string`) *(optional)* - example: `#FF5733`, Brand primary color
- `brandSecondaryColor` (`string`) *(optional)* - example: `#33A1FF`, Brand secondary color
- `brandBorderRadius` (`string`) *(optional)* - example: `8px`, Brand border radius (e.g., 4px, 0.5rem, 50%)
- `addressLine1` (`string`) *(optional)* - Address line 1
- `addressLine2` (`string`) *(optional)* - Address line 2
- `city` (`string`) *(optional)* - City
- `state` (`string`) *(optional)* - State
- `zipCode` (`string`) *(optional)* - ZIP code
- `country` (`string`) *(optional)* - example: `BD`, Country ISO code
- `timezone` (`string`) *(optional)* - example: `Asia/Dhaka`, Timezone
- `currency` (`string`) *(optional)* - example: `BDT`, Currency
- `language` (`string`) *(optional)* - example: `en`, Language

---

### `GET /api/v1/tenants/{tenantId}/features`

**Summary:** Get tenant features

**Details:** Retrieve enabled features for the tenant

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

---

### `POST /api/v1/tenants/{tenantId}/invites`

**Summary:** Create tenant invite

**Details:** Invite a new team member to the tenant

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

**Request Body (`application/json`):**

- `emailOrPhone` (`string`) **(required)** - example: `user@example.com`, Email or phone number of the user to invite
- `roleId` (`string`) **(required)** - example: `123e4567-e89b-12d3-a456-426614174000`, Role ID to assign to the invited user
- `branchId` (`string`) *(optional)* - example: `123e4567-e89b-12d3-a456-426614174001`, Branch ID to assign the user to (optional)

---

### `GET /api/v1/tenants/{tenantId}/members`

**Summary:** Get tenant members

**Details:** Retrieve paginated list of tenant members

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID
- `page` in `query` (`number`) *(optional)* - Page number (default: 1)
- `limit` in `query` (`number`) *(optional)* - Items per page (default: 20)

---

### `DELETE /api/v1/tenants/{tenantId}/members/{userId}`

**Summary:** Remove tenant member

**Details:** Remove a member from the tenant

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID
- `userId` in `path` (`string`) **(required)** - User UUID

---

### `GET /api/v1/tenants/{tenantId}/settings`

**Summary:** Get tenant settings

**Details:** Retrieve tenant configuration settings

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

---

### `PATCH /api/v1/tenants/{tenantId}/settings`

**Summary:** Update tenant settings

**Details:** Update tenant configuration settings

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

**Request Body (`application/json`):**

- `bookingApprovalRequired` (`boolean`) *(optional)* - example: `False`, Require booking approval
- `allowGuestBooking` (`boolean`) *(optional)* - example: `True`, Allow guest booking
- `defaultBookingStatus` (`string`) *(optional)* - enum: `["PENDING", "CONFIRMED"]`, example: `CONFIRMED`, Default booking status
- `enableMultiBranch` (`boolean`) *(optional)* - example: `True`, Enable multi-branch
- `enableOnlinePayments` (`boolean`) *(optional)* - example: `True`, Enable online payments
- `enablePartialPayments` (`boolean`) *(optional)* - example: `True`, Enable partial payments
- `invoicePrefix` (`string`) *(optional)* - example: `INV`, Invoice prefix
- `receiptFooterText` (`string`) *(optional)* - example: `Thank you for your business!`, Receipt footer text
- `dataRetentionDays` (`number`) *(optional)* - example: `365`, Data retention days

---

### `GET /api/v1/tenants/{tenantId}/subscription`

**Summary:** Get tenant subscription

**Details:** Retrieve current subscription and plan details

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

---

### `POST /api/v1/tenants/{tenantId}/subscription/cancel`

**Summary:** Cancel subscription

**Details:** Cancel tenant subscription

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

**Request Body (`application/json`):**

- `cancellationReason` (`string`) *(optional)* - example: `Customer requested cancellation`, Reason for cancellation

---

### `POST /api/v1/tenants/{tenantId}/subscription/change-plan`

**Summary:** Change subscription plan

**Details:** Upgrade or downgrade tenant subscription plan

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

**Request Body (`application/json`):**

- `newPlanId` (`string`) **(required)** - example: `123e4567-e89b-12d3-a456-426614174000`, ID of the new subscription plan
- `billingCycle` (`string`) **(required)** - enum: `["MONTHLY", "YEARLY"]`, example: `MONTHLY`, Billing cycle for the new plan

---

### `POST /api/v1/tenants/{tenantId}/subscription/resume`

**Summary:** Resume subscription

**Details:** Resume a cancelled subscription

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

---

### `POST /api/v1/tenants/{tenantId}/transfer-ownership`

**Summary:** Transfer tenant ownership

**Details:** Transfer ownership to another active member

**Parameters:**

- `tenantId` in `path` (`string`) **(required)** - Tenant UUID

**Request Body (`application/json`):**

- `newOwnerUserId` (`string`) **(required)** - example: `123e4567-e89b-12d3-a456-426614174000`, User ID of the new owner

---

## Waitlist

*Total Endpoints: 7*

### `GET /api/v1/waitlist`

**Summary:** Get all waitlist entries

**Parameters:**

- `branchId` in `query` (`string`) *(optional)* - Filter by branch ID
- `serviceId` in `query` (`string`) *(optional)* - Filter by service ID
- `status` in `query` (`string`) *(optional)* - Filter by status

---

### `POST /api/v1/waitlist`

**Summary:** Create waitlist entry

**Details:** Add a customer to the waitlist when the desired slot is fully booked

**Request Body (`application/json`):**

- `tenantId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440000`, Tenant ID
- `branchId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440002`, Branch ID
- `serviceId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440010`, Service ID
- `customerId` (`string`) **(required)** - example: `550e8400-e29b-41d4-a716-446655440020`, Customer ID
- `requestedDate` (`string`) **(required)** - example: `2026-03-10`, Requested date
- `requestedTime` (`string`) **(required)** - example: `14:00`, Requested time
- `depositRequired` (`boolean`) *(optional)* - Is deposit required?
- `depositAmount` (`number`) *(optional)* - example: `20`, Deposit amount
- `notes` (`string`) *(optional)* - Customer notes

---

### `GET /api/v1/waitlist/{waitlistId}`

**Summary:** Get waitlist entry by ID

**Parameters:**

- `waitlistId` in `path` (`string`) **(required)** - Waitlist ID

---

### `PATCH /api/v1/waitlist/{waitlistId}`

**Summary:** Update waitlist entry

**Details:** Update priority or notes

**Parameters:**

- `waitlistId` in `path` (`string`) **(required)** - Waitlist ID

**Request Body (`application/json`):**

- `priority` (`number`) *(optional)* - example: `1`, Priority (higher = more important)
- `notes` (`string`) *(optional)* - Customer notes

---

### `POST /api/v1/waitlist/{waitlistId}/cancel`

**Summary:** Cancel waitlist entry

**Parameters:**

- `waitlistId` in `path` (`string`) **(required)** - Waitlist ID

**Request Body (`application/json`):**

- `reason` (`string`) *(optional)* - Reason for cancellation

---

### `POST /api/v1/waitlist/{waitlistId}/confirm`

**Summary:** Confirm waitlist offer

**Details:** Convert waitlist entry to booking when slot is offered

**Parameters:**

- `waitlistId` in `path` (`string`) **(required)** - Waitlist ID

**Request Body (`application/json`):**

- `lockId` (`string`) **(required)** - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Slot reservation ID (lockId) from slot reservation
- `staffId` (`string`) **(required)** - example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, Staff ID assigned to the booking
- `startTime` (`string`) **(required)** - example: `2026-02-20T10:00:00Z`, Start time in ISO 8601 format
- `notes` (`string`) *(optional)* - Customer notes or special requests

---

### `POST /api/v1/waitlist/{waitlistId}/expire`

**Summary:** Expire waitlist entry

**Details:** Mark waitlist entry as expired (admin use)

**Parameters:**

- `waitlistId` in `path` (`string`) **(required)** - Waitlist ID

---

