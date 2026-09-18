/**
 * Transactional email, through Resend, behind the same kind of switch as
 * auth, Stripe and SMS.
 *
 * SERVER ONLY.
 *
 * With `RESEND_API_KEY` unset, `emailEnabled()` is false and nothing sends —
 * booking behaves exactly as it did, and the portal still says everything the
 * email would have. Set, the booking confirmation goes out alongside the SMS:
 * the text is what the customer reads in the moment, the email is what they
 * search for three weeks later when they want the reference number.
 *
 * A failed send never fails the thing that triggered it, for the same reason
 * it doesn't in `sms.ts`: a booking without a confirmation is a booking; a
 * booking lost because Resend hiccuped is a lost customer.
 *
 * Called over plain REST rather than through the SDK — one POST, JSON, bearer
 * auth. A dependency is not worth one endpoint.
 */

import { money } from "./format";
import { type Job, priceRange } from "./jobs";
import { CONFIG } from "./pricing";
import { quoteFacts } from "./quotes";
import { ADDRESS, PHONE } from "./site";
import { CANONICAL_ORIGIN } from "./site-url";

/**
 * The API key, trimmed — see the note in `stripe.ts`. A key pasted into a
 * hosting dashboard often carries a trailing newline, and Node rejects that
 * outright when it reaches an `Authorization` header.
 */
function apiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

/**
 * The From address. Must be on a domain verified in Resend → Domains, or
 * every send is rejected — which is why it is configurable rather than
 * hard-coded.
 *
 * The fallback is derived from `CANONICAL_ORIGIN` rather than written out,
 * because it was written out once and it was wrong: `flatironsmovers.com`,
 * with an r, against a company that owns `flatironsmoves.com`. Nobody would
 * have noticed from the code — the send simply returns false and the customer
 * hears nothing. Deriving it means the day the domain changes, this changes
 * with it, and `email.test.ts` fails if the two ever come apart again.
 */
export function fromAddress(): string {
  return (
    process.env.RESEND_FROM?.trim() || `Flatirons Movers <bookings@${MAIL_DOMAIN}>`
  );
}

/** The bare domain — `www.` is for browsers, not mailboxes. */
const MAIL_DOMAIN = new URL(CANONICAL_ORIGIN).hostname.replace(/^www\./, "");

export function emailEnabled(): boolean {
  return Boolean(apiKey());
}

export type Email = { subject: string; text: string; html: string };

/**
 * Send one email. Returns true on acceptance, false on any failure — callers
 * treat false as "log and continue", never as an error to surface to the
 * person mid-booking.
 */
export async function sendEmail(to: string, email: Email): Promise<boolean> {
  const key = apiKey();
  if (!key || !to.includes("@")) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   The booking confirmation

   Both bodies are built from the same facts in the same order, so the plain
   text is a real alternative rather than a degraded one. Every mail client
   that refuses HTML — and every screen reader reading the text part — gets
   the reference, the date, the window, the range, the card link and the
   cancellation terms.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Where the customer manages their card. The portal, not a Stripe URL: a
 * Checkout Session expires in 24 hours and a move can be booked six weeks
 * out, so the email links to the page that mints a fresh one on demand. */
function cardLink(job: Job, origin: string): string {
  return `${origin}/move/${job.id}#card`;
}

export function bookingConfirmationEmail(job: Job, origin: string): Email {
  const portal = `${origin}/move/${job.id}`;
  const card = cardLink(job, origin);
  const { feeDollars, windowHours } = CONFIG.cancellation;

  const terms =
    `We charge the card after your move, once the hours are known — ` +
    `never before. Cancelling within ${windowHours} hours of your arrival ` +
    `window is ${money(feeDollars)}; before that it's free.`;

  const text = [
    `You're booked with Flatirons Movers.`,
    ``,
    `Reference: ${job.id}`,
    `Date: ${job.date}`,
    `Arrival window: ${job.window}`,
    `From: ${job.from}`,
    `To: ${job.to}`,
    `Crew: ${job.movers} movers`,
    `Estimate: ${priceRange(job)}`,
    ``,
    `Put a card on file (nothing is charged now):`,
    card,
    ``,
    terms,
    ``,
    `Track your move, tick off your checklist and message the crew:`,
    portal,
    ``,
    `Questions? Call ${PHONE}.`,
    `Flatirons Movers · ${ADDRESS} · PUC 00412`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1efe9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16283f">
  <div style="max-width:520px;margin:0 auto;background:#fbfaf7;border:1px solid rgba(22,40,63,0.12)">
    <div style="background:#16283f;color:#fbfaf7;padding:22px">
      <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#c9d6b4">Flatirons Movers</p>
      <h1 style="margin:10px 0 0;font-size:26px;line-height:1.1;font-weight:600">You're booked.</h1>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#d8d5cc">Reference ${escapeHtml(job.id)} — quote this if you call.</p>
    </div>
    <div style="padding:22px">
      <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5">
        ${[
          ["Date", job.date],
          ["Arrival window", job.window],
          ["From", job.from],
          ["To", job.to],
          ["Crew", `${job.movers} movers`],
          ["Estimate", priceRange(job)],
        ]
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 0;color:rgba(22,40,63,0.6)">${escapeHtml(String(label))}</td><td style="padding:6px 0;text-align:right;font-weight:600">${escapeHtml(String(value))}</td></tr>`,
          )
          .join("")}
      </table>

      <a href="${escapeHtml(card)}" style="display:block;margin:22px 0 10px;padding:14px;background:#16283f;color:#fbfaf7;text-align:center;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase">Put a card on file</a>
      <p style="margin:0;font-size:12.5px;line-height:1.5;color:rgba(22,40,63,0.6)">${escapeHtml(terms)}</p>

      <a href="${escapeHtml(portal)}" style="display:block;margin:18px 0 0;padding:13px;border:1px solid rgba(22,40,63,0.3);color:#16283f;text-align:center;text-decoration:none;font-size:12.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase">Track my move</a>
    </div>
    <div style="border-top:1px solid rgba(22,40,63,0.12);padding:16px 22px;font-size:11.5px;line-height:1.5;color:rgba(22,40,63,0.6)">
      Questions? Call ${escapeHtml(PHONE)}.<br>Flatirons Movers · ${escapeHtml(ADDRESS)} · PUC 00412
    </div>
  </div>
</body></html>`;

  return {
    subject: `You're booked — ${job.id}, ${job.date}`,
    text,
    html,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   The quote

   Sent when the office prices a phone enquiry and the customer wants to think
   about it. Says what it is, what it costs, which day it is for, and — twice,
   because it is the thing most often misunderstood about a quote — that
   nothing is held until they accept.
   ═══════════════════════════════════════════════════════════════════════════ */

export function quoteEmail(job: Job, origin: string): Email {
  const link = `${origin}/quote/${job.id}`;
  const price = priceRange(job);
  const rows = quoteFacts(job);
  const held =
    "This is an estimate, not a booking. The day is not held until you " +
    "accept, and nothing is charged today.";

  const text = [
    `Your estimate from Flatirons Movers.`,
    ``,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ``,
    held,
    ``,
    `See the full estimate and accept it:`,
    link,
    ``,
    `Questions? Call ${PHONE}.`,
    `Flatirons Movers · ${ADDRESS} · PUC 00412`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1efe9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16283f">
  <div style="max-width:520px;margin:0 auto;background:#fbfaf7;border:1px solid rgba(22,40,63,0.12)">
    <div style="background:#16283f;color:#fbfaf7;padding:22px">
      <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#c9d6b4">Flatirons Movers</p>
      <h1 style="margin:10px 0 0;font-size:26px;line-height:1.1;font-weight:600">Your estimate</h1>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#d8d5cc">${escapeHtml(price)} — reference ${escapeHtml(job.id)}</p>
    </div>
    <div style="padding:22px">
      <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 0;color:rgba(22,40,63,0.6)">${escapeHtml(label)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${escapeHtml(value)}</td></tr>`,
          )
          .join("")}
      </table>

      <a href="${escapeHtml(link)}" style="display:block;margin:22px 0 10px;padding:14px;background:#16283f;color:#fbfaf7;text-align:center;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase">See the estimate</a>
      <p style="margin:0;font-size:12.5px;line-height:1.5;color:rgba(22,40,63,0.6)">${escapeHtml(held)}</p>
    </div>
    <div style="border-top:1px solid rgba(22,40,63,0.12);padding:16px 22px;font-size:11.5px;line-height:1.5;color:rgba(22,40,63,0.6)">
      Questions? Call ${escapeHtml(PHONE)}.<br>Flatirons Movers · ${escapeHtml(ADDRESS)} · PUC 00412
    </div>
  </div>
</body></html>`;

  return { subject: `Your estimate — ${price}, ${job.date}`, text, html };
}

/**
 * Escape for HTML text and for double-quoted attributes alike.
 *
 * Customer names and addresses go into this email, and they are typed by the
 * customer. Nothing here is a trusted string.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
