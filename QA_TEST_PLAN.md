# QA test plan: client review items

Run on 2026-10-30. **41 cases: 40 pass, 1 blocked by the backend. 5 bugs found and fixed.**

Each case is one check, with its edge cases. Result: PASS / FAIL (with what was fixed) / BLOCKED (why).
How: **L** = logic run in a script, **API** = called against the dev server and backend, **UI** = clicked through in the browser.

## 1. Customer: Edit my details
| ID | Case | How | Result |
|---|---|---|---|
| C1 | Phone accepted in any format: `5068971234`, `506 897 1234`, `506.897.1234`, `(506) 897-1234`, `+1 506 897 1234`, `1-506-897-1234` → saved as `(506)-897-1234` | L, UI || PASS |
| C2 | Phone rejected: 9 digits, 11 digits not starting with 1, letters only | L, API || PASS |
| C3 | After an error, fixing the field and pressing Save works without closing the form | UI || PASS |
| C4 | Changing the phone saves, shows the new number, removes the old one; saving the same number again works | API, UI || PASS |
| C5 | Name can be changed without touching the phone (empty phone keeps the one on file) | API || PASS |
| C6 | Name shorter than 2 characters is refused with a message | API || PASS |
| C7 | Eye button on Current password shows/hides it; not on the new-password fields | UI || PASS |

## 2. Customer: Booking
| ID | Case | How | Result |
|---|---|---|---|
| B1 | Signed in: "Booking as" shows the account's name, phone, email; they can't be typed over; "Change" opens Edit details | UI || PASS |
| B2 | Signed in: a request with another name/phone/email is booked with the account's details | API || PASS |
| B3 | "We'll only use your number…" line is gone | UI || PASS |
| B4 | After an error (bad phone as a guest, or time just taken) the form still works | UI, API || PASS (form error clears; "time just taken" returns 409 with a message) |
| B5 | Guest phone in any format is accepted; invalid is refused | API || PASS |
| B6 | Reschedule ≥ 24 h ahead works; the old time is freed; the barber is kept | API, UI || PASS |
| B7 | Reschedule / cancel < 24 h ahead is refused (server) and the buttons are hidden | API, UI || PASS |
| B8 | Reschedule to a taken time, to a past date, or someone else's booking is refused | API || PASS |
| B9 | Cancel ≥ 24 h ahead works | API, UI || PASS |
| B10 | Barber: after a time, "Auto assign" and only the barbers free then are offered | API, UI || PASS |
| B11 | Barber: choosing a barber who is busy / off / archived is refused | API || PASS |
| B12 | Auto assign gives the booking to the free barber with fewest bookings that day | L, API || PASS |

## 3. Public: Reviews
| ID | Case | How | Result |
|---|---|---|---|
| R1 | Landing page shows the rating, count and recent reviews | UI || PASS |
| R2 | "More on Google" and "Facebook" links go to the right pages | UI || PASS |
| R3 | If reviews can't be loaded, the section still shows the two links | L || PASS (links-only fallback kept) |

## 4. Admin
| ID | Case | How | Result |
|---|---|---|---|
| A1 | Walk-in: tip; price lowered = discount; total = price + HST + tip | L, UI || PASS |
| A2 | Walk-in date: today by default; a past date is saved on that day; future refused; 0 price refused | UI || PASS (a future date is blocked by the date box itself) |
| A3 | Staff tab in owner menu; each card shows its schedule | UI || PASS |
| A4 | Schedule: no schedule = all shop hours; day off = not offered; short shift = only inside it | L || PASS |
| A5 | X barbers free at a time → X choices + Auto assign (customer and owner) | L, UI || PASS |
| A6 | No Confirm button; online bookings arrive Confirmed | API, UI || PASS — FIXED: confirming replaced the booking note (e.g. the customer's "Low fade") with "HST 15% added"; confirm no longer sends a note |
| A7 | Owner can change time / barber on online bookings | UI || PASS |
| A8 | Past booking not done: only Remove. Past arrived: Take payment. Today: Arrived/No-show. Future: no Arrived | UI || PASS |
| A9 | "All" tab hidden | UI || PASS |
| A10 | "Not finished" filter gone | UI || PASS |
| A11 | Owner New booking: service → day → time → barber → customer; missing name / bad phone / no time give messages | UI || PASS — FIXED: checks ran name-first though the name is now at the bottom; now service, time, name, phone |
| A12 | Accounting: pick a date; Income and Expenses category filters with totals; switching tabs resets the filter | UI || PASS |
| A13 | Discount on a booked payment: total and HST drop; a discount bigger than the price is capped; an existing bill keeps its discount | L, UI || PASS — FIXED: a discount equal to the price made a $0 bill the backend refuses, leaving the booking stuck; now capped one cent below (free = $0.01) |
| A14 | Change calculator: more cash → give back; exact → $0.00; less → still owed; empty → hint | UI || PASS |
| A15 | Email: booking sends confirmation + calendar invite; move updates; cancel removes; no email when no address; a mail failure doesn't fail the booking | L, API || PASS — FIXED: names with "," or ";" broke the invite; real emails received at hemel@astlbd.com and rihhemel@gmail.com |
| A16 | Password reset / sign-up code | API || BLOCKED — backend: /auth/forgot-password returns 500 for real accounts; the site's reset screens are ready |

## 5. Earlier work, checked again (regressions)
| ID | Case | How | Result |
|---|---|---|---|
| X1 | Barber sign-in sees only own appointments; can take payment for own booking; recorded "Taken by" | UI || PASS — FIXED: when a barber changed the day in "Change time", the booking was re-assigned to another barber; it now always stays theirs |
| X2 | Accounting: one entry per appointment; "Money taken by" totals | UI || PASS |
| X3 | Production build passes | build || PASS |
