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
Re-checked against the live backend on 2026-10-30 (evening). ✅ fixed · ⚠️ partly fixed · ❌ not fixed · ❔ not re-tested.

1. ❌ **Forgot password**: `POST /auth/forgot-password` now answers 503 "Could not send the password reset email" (was 500). Still no email. It also answers 404 "User not found" for unknown emails, which tells anyone which emails have accounts.
2. ✅ **Time zone**: same-day times later today can be booked; earlier times today are refused. (Times are still stored with a `Z` suffix, but compared correctly.)
3. ✅ **Bills leave out tax**: the bill total now includes the tax. **New problem (17 below).**
4. ✅ **Voided bills**: voiding reverses the bill's income, and a new bill can be made after a void.
5. ✅ **Arrived is final**: an arrived booking can now be marked no-show. (The app still offers only "Finish & take payment" for Arrived.)
6. ⚠️ **Default tax**: `taxRate` can now be set in tenant settings, but it is still 10%. Set it to 15.
7. ❔ No endpoint to change a user's sign-in email (none in the Core API; the Auth API docs need a login to read).
8. ✅ **Search hides contacts**: searching by name or phone now returns every contact.
9. ✅ **Only confirmed bookings can be moved**: drafts can be rescheduled, and `reschedule` takes a `staffId` to change the barber.
10. ❔ **Barbers can't bill**: not re-tested (needs a barber sign-in). The app's server route still works either way.
11. ✅ **Staff login**: the staff update now takes `createUser` + `password` (or `userId`) for staff with no login (from the API description; not tried, as it creates a real login).
12. ✅ **Confirm overwrites notes**: confirm's note is now added below the booking's notes.
13. ❌ **No $0 bills**: a 100% discount still fails ("A journal line must have either debit or credit amount").
14. ⚠️ **Refunds**: a cash payment is now refunded from Cash, but the whole amount still comes off service income and the HST is not reversed. The app still records refunds itself.
15. ❌ **No card payment method**: payments still take only CASH, CHECK or BANK_TRANSFER.
16. ✅ **Proxies and 204**: fixed in the frontend.
17. ❌ **New: bill tax ignores discounts and upgrades**: the bill copies the booking's HST as booked ($3.30 on a $22 trim) even when the bill has a discount or an extra charge. $22 − $5 discount gave a $20.30 total instead of $19.55. *Workaround (app):* the extra HST is added to the bill's discount so the customer pays the right total, and a "Sales tax" correction moves it from HST back to income. Upgrades already add the missing HST. A "free" service now costs the booked HST plus $0.01 (e.g. $3.31), since the bill can't go lower; this needs 13 and 17 fixed.

## Test data left in the dev backend
- Booking SAL-2026-000016 "TEST Claude QA 3": paid $28.75 but stuck as Arrived because of bug 4 (a voided test bill). SAL-000015 and SAL-000017 are cancelled.
- Disabled test account 5399 "TEST Claude sub 2" and category "TEST Laundry 2" (removed; its test entry reversed).
- Booking "TEST Claude Highlight" (Oct 31, Beard Trim): paid $27.30 incl. $2 tip on Oct 29 while testing; an arrived booking can't be cancelled. "TEST Mo Claude" / "TEST Mo Online" bookings are cancelled.
- Customers "TEST Claude QA", "TEST Claude QA 3", "TEST Claude Walk-in". The test walk-in income was reversed.
- 2026-10-29 customer-side work: customer "TEST Phone Renamed" with cancelled test bookings, and SAL-2026-000041 (Nov 3, 3:00 PM, with Munim2), paid by Munim2 while testing barber payments: $26.00 incl. $3 tip, recorded on Oct 29. Archived staff "TEST Barber Claude".
- Discount tests (Oct 29): SAL-2026-000044 (Nov 5) paid $17.25 after a $5 discount, SAL-2026-000045 (Nov 6) paid $23.00 after a $3 discount, both "TEST Phone Renamed". The test walk-in "TEST Claude Walkin B" was reversed.
- Barber schedule / auto-assign / email tests (Oct 29): SAL-2026-000043, 000046, 000047, 000048, 000049 cancelled; test schedules removed (no schedules are set).
- QA run (Oct 30): test bookings SAL-2026-000053–000063 cancelled; SAL-2026-000056 paid $0.01 (free-service test) and SAL-2026-000064 paid $25.00 by Munim2, both "TEST Phone Renamed".
- Six-fixes test (Oct 30): SAL-2026-000005 "TEST USER" (Oct 26) paid $23.00 then refunded in full; SAL-2026-000065 paid $25.00 by card (Munim2) with $5.00 refunded by card; SAL-2026-000066 paid $43.70 and refunded in full; SAL-2026-000067 paid $43.70 by card after an upgrade to Haircut & Beard Trim Combo. Test walk-ins C–F reversed; test days off removed.
- Backend re-check (Oct 30 evening): SAL-2026-000068, 000070 and 000071 marked no-show; SAL-2026-000069 paid $25.30 cash and refunded through the backend (shows in Accounting as a -$25.30 refund); SAL-2026-000072 paid $19.55 after a $5 discount (the fix for 17). Voided test bills INV-20261030-BE6F57, -C3E1A7 and two on SAL-000071.
- Ankon Ghosh's booking SAL-2026-000027 (Nov 4, 12:30) was cancelled by mistake during testing and re-booked as SAL-2026-000035 (same time, service and status).
- Staff "Munim" (no login, the email already had an account) and "Munim2" (barber login) were added by the client while testing.

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
- Vercel env vars for customer emails: `SMTP_HOST=premium180.web-hosting.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (see `.env.example`). Until they are set, no email is sent.
- Backend (Auth Service): password reset and sign-up codes are sent by the Auth Service, not the website. Its `/auth/forgot-password` returns 500 (probably no mail server set up there). Give it the same mail server settings, and add an email code step to `/auth/register` if sign-up codes are wanted.
- Backend: fix `/auth/forgot-password` (500, no email sent). Add an endpoint to change a user's sign-in email if that's required.
