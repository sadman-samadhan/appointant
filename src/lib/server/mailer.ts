import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

// Sends the shop's emails (booking confirmations with calendar invites). Settings are
// server-only env vars; without them nothing is sent and the site works as before.
//   SMTP_HOST, SMTP_PORT (587 = STARTTLS, 465 = SSL), SMTP_USER, SMTP_PASS, MAIL_FROM
let transporter: Transporter | null = null;

export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export function mailFrom(): string {
  // `docker run --env-file` keeps quotes around a value, so drop them.
  const from = (process.env.MAIL_FROM || '').trim().replace(/^(["'])(.*)\1$/, '$2').trim();
  const user = process.env.SMTP_USER || '';
  if (from.includes('@')) return from;
  // A name without an address ("B Diamond Barbershop"): send from the login's address under that name.
  return from && user ? `"${from.replace(/"/g, '')}" <${user}>` : user;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** A calendar invite (iCalendar text) the mail app offers to add to the calendar. */
  ics?: { content: string; method: 'REQUEST' | 'CANCEL' };
}

/** Sends a mail; never throws (a failed email must not fail the booking). Returns whether it was sent. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailConfigured() || !mail.to) return false;
  try {
    await getTransporter().sendMail({
      from: mailFrom(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ...(mail.ics
        ? {
            icalEvent: { method: mail.ics.method, content: mail.ics.content, filename: 'appointment.ics' },
          }
        : {}),
    });
    return true;
  } catch (err) {
    console.error('[mail] send failed', err instanceof Error ? err.message : err);
    return false;
  }
}
