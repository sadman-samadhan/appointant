import 'server-only';
import { BUSINESS, FULL_ADDRESS } from '@/lib/business';
import { formatMoney, SHOP_TIME_ZONE, wallClockTime } from '@/lib/format';
import { mailFrom, sendMail } from './mailer';

// Emails to the customer when they book, move or cancel online. Each carries a calendar
// invite: the same UID for the same booking, so a mail app updates or removes the event.

export interface BookingMailInfo {
  /** Stable per booking (booking number or id). */
  key: string;
  to: string;
  customerName: string;
  service: string;
  barber?: string | null;
  /** YYYY-MM-DD and HH:MM:SS, the shop's wall-clock time. */
  date: string;
  startTime: string;
  durationMinutes: number;
  price?: number;
  bookingNumber?: string | null;
}

const pretty = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

/** "20261110T100000" from a date and time, plus minutes. */
function stamp(date: string, time: string, plusMinutes = 0): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + plusMinutes));
  return t.toISOString().replace(/[-:]/g, '').slice(0, 15);
}

const esc = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

// Atlantic time (Fredericton), so calendars show the shop's time wherever the customer is.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${SHOP_TIME_ZONE}`,
  'BEGIN:STANDARD',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'TZOFFSETFROM:-0300',
  'TZOFFSETTO:-0400',
  'TZNAME:AST',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0300',
  'TZNAME:ADT',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
];

export function bookingIcs(info: BookingMailInfo, method: 'REQUEST' | 'CANCEL'): string {
  // Just the address of "Name <address>".
  const from = mailFrom().match(/<([^>]+)>/)?.[1] || mailFrom();
  const title = `${info.service}${info.barber ? ` with ${info.barber}` : ''} at ${BUSINESS.name}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//B Diamond Barbershop//Booking//EN',
    `METHOD:${method}`,
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:booking-${info.key}@bdiamond`,
    // A later SEQUENCE replaces an earlier one (a move or a cancel).
    `SEQUENCE:${Math.floor(Date.now() / 1000)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=${SHOP_TIME_ZONE}:${stamp(info.date, info.startTime)}`,
    `DTEND;TZID=${SHOP_TIME_ZONE}:${stamp(info.date, info.startTime, info.durationMinutes)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(FULL_ADDRESS)}`,
    `DESCRIPTION:${esc(`${info.service}${info.bookingNumber ? ` · Booking ${info.bookingNumber}` : ''}\nQuestions? Call ${BUSINESS.phoneDisplay}.`)}`,
    ...(from ? [`ORGANIZER;CN=${esc(BUSINESS.name)}:mailto:${from}`] : []),
    `ATTENDEE;CN=${esc(info.customerName)};RSVP=FALSE:mailto:${info.to}`,
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

/** "Add to Google Calendar" link (for mail apps that don't show the invite). */
function googleCalendarLink(info: BookingMailInfo): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${info.service} at ${BUSINESS.name}`,
    dates: `${stamp(info.date, info.startTime)}/${stamp(info.date, info.startTime, info.durationMinutes)}`,
    ctz: SHOP_TIME_ZONE,
    location: FULL_ADDRESS,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function layout(heading: string, rows: string[], footer: string, button?: { href: string; label: string }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2b2320">
<h2 style="margin:0 0 12px">${heading}</h2>
${rows.map((r) => `<p style="margin:4px 0">${r}</p>`).join('\n')}
${button ? `<p style="margin:20px 0"><a href="${button.href}" style="background:#7a2e2e;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">${button.label}</a></p>` : ''}
<p style="margin-top:20px;color:#7a6f6a;font-size:13px">${footer}</p>
</div>`;
  const text = [heading, '', ...rows.map((r) => r.replace(/<[^>]+>/g, '')), '', ...(button ? [`${button.label}: ${button.href}`, ''] : []), footer.replace(/<[^>]+>/g, '')].join('\n');
  return { html, text };
}

function details(info: BookingMailInfo) {
  return [
    `<strong>${info.service}</strong>${info.barber ? ` with ${info.barber}` : ''}`,
    `${pretty(info.date)} at ${wallClockTime(info.startTime)}`,
    ...(info.price !== undefined ? [`$${formatMoney(info.price)} ${BUSINESS.currency} + ${BUSINESS.taxLabel}, pay at the shop`] : []),
    FULL_ADDRESS,
    ...(info.bookingNumber ? [`Booking number: ${info.bookingNumber}`] : []),
  ];
}

const FOOTER = `Need to change it? Reschedule or cancel from your account up to 24 hours before, or call us at ${BUSINESS.phoneDisplay}.`;

export function sendBookingConfirmation(info: BookingMailInfo) {
  const { html, text } = layout(`You're booked, ${info.customerName.split(' ')[0]}!`, details(info), FOOTER, {
    href: googleCalendarLink(info),
    label: 'Add to Google Calendar',
  });
  return sendMail({ to: info.to, subject: `Booked: ${info.service}, ${pretty(info.date)} at ${wallClockTime(info.startTime)}`, html, text, ics: { content: bookingIcs(info, 'REQUEST'), method: 'REQUEST' } });
}

export function sendBookingMoved(oldInfo: BookingMailInfo, info: BookingMailInfo) {
  const { html, text } = layout('Your appointment has moved', details(info), FOOTER, { href: googleCalendarLink(info), label: 'Add to Google Calendar' });
  // The old booking's event is removed (a move may give the booking a new number).
  const cancelOld = oldInfo.key !== info.key ? sendMail({ ...cancelMail(oldInfo), subject: `Moved: ${oldInfo.service}` }) : Promise.resolve(true);
  return Promise.all([
    cancelOld,
    sendMail({ to: info.to, subject: `Moved: ${info.service}, now ${pretty(info.date)} at ${wallClockTime(info.startTime)}`, html, text, ics: { content: bookingIcs(info, 'REQUEST'), method: 'REQUEST' } }),
  ]);
}

function cancelMail(info: BookingMailInfo) {
  const { html, text } = layout('Your appointment is cancelled', details(info), `Book again any time, or call us at ${BUSINESS.phoneDisplay}.`);
  return { to: info.to, subject: `Cancelled: ${info.service}, ${pretty(info.date)}`, html, text, ics: { content: bookingIcs(info, 'CANCEL'), method: 'CANCEL' as const } };
}

export function sendBookingCancelled(info: BookingMailInfo) {
  return sendMail(cancelMail(info));
}
