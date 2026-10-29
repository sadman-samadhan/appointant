# Delivery Plan: B Diamond Barbershop

Goal: ship booking and simple accounting that a barber with little tech experience can use.
Source of the issues: the "Prop-IT Share Doc.pdf" test report, plus a review of the code and the live backend.

## Root causes found

| # | Issue (PDF) | Root cause |
|---|---|---|
| S1.1 | Services menu empty ("Our menu is being updated") | Deployment has no `CATALOG_*` / `BOOKING_AGENT_*` env vars, so the server can't read the 11 active services. |
| S1.2 | Wrong phone number | Hard-coded in `src/lib/business.ts`. Now (506) 230-7560. |
| S1.3 | "Reviews" link does nothing | The reviews section only renders when the Setmore page loads; otherwise the anchor has no target. |
| S1.4 | Same slot can be booked many times (critical) | Slots came from the backend availability engine, which counts capacity per service (default 3). It doesn't count other services, and the admin form had no check at all. The 9:30 AM Oct 26 slot has 4 bookings. |
| S1.5 | Any phone text accepted | Strict checks were behind `BOOKING_STRICT_CHECKS` (off). |
| S1.6 | "Visit" button not useful | Remove it. |
| S1.7 | Forgot password sends no email | **Backend bug**: `POST /auth/forgot-password` returns HTTP 500 for real accounts (mail sending fails). The frontend can only show a clear message. |
| S1.8 | Login asks for "User ID / Email / Phone" | Label only; change to Email. |
| S2.1 | Bookings don't show in "My account" | The customer page called a staff-only API and matched bookings on phone, while the booking list has no email. |
| S2.2 | After booking, button says "Back to home" | Signed-in users should see "Back to account". |
| S2.3 | Can't update account info | Missing feature. |
| S2.4 | Password modal keeps old input; errors hidden | State never reset; toasts render under the modal (z-index). |
| S3.1 | Tax must be automatic (15%) | Confirm modal asked for manual tax/tip/discount. |
| S3.2–3.4 | Wrong actions for "Arrived", icon-only buttons, filter | Rework actions per status, with text labels. |
| S3.5 | Walk-in doesn't appear in list (critical) | Walk-in pre-filled the shop's own phone, so it reused an existing customer ("James") and showed under that name. The list also fetched only the first 20 bookings. |
| S3.6 | "Cash In" button confusing | Replace with a walk-in form that takes the amount and records income in one step. |
| S3.7 | "New Booking" button doesn't work (critical) | The query param was read only on first load, so it did nothing on the appointments page. |
| S3.8–3.9 | Too many money tabs (Payments, Money Book, Expenses, Payroll) | Collapse into one simple **Accounting** tab: money in, money out, profit. |

## Work items

1. **Booking engine**: one shared slot calculator using shop hours, service length and existing bookings across all services. Capacity is 2 chairs (2 barbers; env `NEXT_PUBLIC_SHOP_CAPACITY`). It's used by online booking, admin booking and the server-side re-check before saving.
2. **Public site**: catalog falls back to the booking-agent account, Reviews section always present, Visit removed, phone validation in the format `(123)-456-7890`.
3. **Customer account**: server route that checks the customer's token and returns their own bookings. Bookings by signed-in users are linked to their account. Add a "My details" editor (name, phone), a "Back to account" button and a clean password modal.
4. **Login**: Email-only label; clear forgot-password error.
5. **Admin, simpler**: short sidebar (Today, Appointments, Accounting, Customers, Services, Settings) plus a mobile bottom bar. Working New Booking / Walk-in buttons. Status-based actions with text labels. 15% tax applied automatically. One-tap "Finish & take payment". Walk-in sale records the cash straight into income.
6. **Accounting tab**: Money In / Money Out / Profit per month, with appointment payments included automatically.
7. Build, then test end-to-end in the browser.

8. **Accounting for the accountant** (added 2026-10-28): "Add income" / "Add expense" with categories and sub-categories (e.g. Equipment › Clippers & trimmers), an "Amount includes HST" box, and HST kept apart from income (account 2100, not revenue). **Categories are editable** (Accounting › Categories): each category is a ledger account the app makes, and each sub-category is a child account. Owners can add, rename and remove them; removing disables the account, so past entries and reports keep the name. Starter categories (15, with sub-categories) are made once on first use, and a removed one is never re-made. The backend's built-in accounts are not used as categories, because they can't be renamed once used. Tips (4200) can be renamed but not removed (checkout uses it). Equipment goes to the Equipment asset (1500) and is kept out of profit. **Report for accountant** (`/admin/accounting/report`): profit and loss before HST, HST summary (GST/HST return lines 105/108/109), equipment bought, money received/paid, every entry; save as PDF (print), summary and all entries as Excel (CSV).
9. Error pages (404 and "something went wrong").

## Status (2026-10-28)

All work items are done. The build passes, and these were tested in the browser against the live dev backend:
- Online booking: services load, Sunday hidden, bad phones rejected, booked time disappears for **every** service, and a direct second booking for the same time is refused.
- Admin: New booking / Walk-in buttons work (including repeat clicks), only free times are offered, Confirm adds 15% HST once, Change time, Arrived, Finish & take payment (with tip), walk-in appears in the list and in Accounting.
- Customer account API: token check, own bookings, details. Password modal: inline errors, cleared on close.

Not tested end-to-end: a booking made while **signed in as a customer**, and editing details as a customer. No customer test account was available.

## Backend bugs found (frontend works around them; the backend team should fix)
1. **Forgot password**: `POST /auth/forgot-password` returns 500 for real accounts, so no email is sent.
2. **Time zone**: the backend stores shop wall-clock times with a `Z` (UTC) suffix and rejects any time earlier than its UTC clock. Same-day times in the next 3–4 hours can't be booked. *Workaround:* those times aren't offered, and walk-ins are recorded as income instead of as bookings.
3. **Bills leave out tax**: `invoice-draft` records the tax but doesn't add it to the total. *Workaround:* the customer is charged the full booking total, and the missing tax is recorded as "Sales tax" income.
4. **Voided bills**: voiding doesn't reverse the bill's income, and `complete` still counts a voided bill as unpaid. *Workaround:* the app never voids bills, and Accounting skips income from voided bills.
5. **Arrived is final**: `CHECKED_IN` can't be cancelled or marked no-show. Arrived only offers "Finish & take payment".
6. **Default tax**: the tenant setting `taxRate` is 10%. The app applies 15% on confirm. Setting it to 15 in tenant settings would make new online bookings show 15% from the start.
7. No endpoint to change a user's sign-in email. Customers can edit their name and phone; email is read-only.

## Test data left in the dev backend
- Booking SAL-2026-000016 "TEST Claude QA 3": paid $28.75 but stuck as Arrived because of bug 4 (a voided test bill). SAL-000015 and SAL-000017 are cancelled.
- Disabled test account 5399 "TEST Claude sub 2" and category "TEST Laundry 2" (removed; its test entry reversed).
- Booking "TEST Claude Highlight" (Oct 31, Beard Trim): paid $27.30 incl. $2 tip on Oct 29 while testing; an arrived booking can't be cancelled. "TEST Mo Claude" / "TEST Mo Online" bookings are cancelled.
- Customers "TEST Claude QA", "TEST Claude QA 3", "TEST Claude Walk-in". The test walk-in income was reversed.

## PDF check (2026-10-28)
Every item is fixed in the frontend except:
- S1.1 services menu: needs the `BOOKING_AGENT_*` env vars on Vercel.
- S1.7 forgot password: backend bug (500).
- S2.3 change email: no backend endpoint; name and phone can be changed.
- S3.4 Cancel / No-show for an *Arrived* customer: the backend refuses it, so Arrived offers only "Finish & take payment".
- S1.4 note: with 2 barbers, the same time can now be booked **twice** (once per chair), a third time is refused. Tell the tester.

## Needs from the client / backend team
- HST registration number for the report header (`hstNumber` in `src/lib/business.ts`).
- Vercel env vars: `BOOKING_AGENT_USERID`, `BOOKING_AGENT_PASSWORD` (the owner account) and `BOOKING_STRICT_CHECKS=true`.
- Backend: fix `/auth/forgot-password` (500, no email sent). Add an endpoint to change a user's sign-in email if that's required.
