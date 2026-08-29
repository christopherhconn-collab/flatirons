/**
 * SMS, through Twilio, behind the same kind of switch as auth and Stripe.
 *
 * SERVER ONLY.
 *
 * With the three `TWILIO_*` variables unset, `smsEnabled()` is false and
 * nothing sends — booking and close-out behave exactly as before. Set, two
 * messages exist, both specified by the handoff:
 *
 *   - a booking confirmation with the tracking link, sent from the booking
 *     action, and
 *   - the review request the morning after completion, with the portal link
 *     and the referral code, sent by the daily cron
 *     (`/api/cron/review-requests`, scheduled in vercel.json).
 *
 * A failed send never fails the thing that triggered it: a booking without
 * a text is a booking; a booking that failed because Twilio hiccuped would
 * be a lost customer. Callers log and move on.
 *
 * Twilio is called over plain REST rather than through its SDK — one POST,
 * form-encoded, basic auth. A dependency is not worth one endpoint.
 */

import type { Job } from "./jobs";
import { referralCode } from "./jobs";

export function smsEnabled(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM,
  );
}

/**
 * `303.555.0186` → `+13035550186`. Ten US digits get +1; eleven starting
 * with 1 get +; anything already E.164 passes through; anything else is
 * unusable and returns null rather than guessing a country.
 */
export function toE164(raw: string): string | null {
  if (raw.startsWith("+")) return /^\+\d{8,15}$/.test(raw) ? raw : null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** The booking confirmation. Short enough for one SMS segment matters less
 * than saying the three things that stop the "did it work?" callback: the
 * reference, the date, the link. */
export function bookingConfirmationText(job: Job, origin: string): string {
  return (
    `Flatirons Movers: you're booked — ${job.id}, ${job.date}, ` +
    `arrival ${job.window}. Track your move and manage your checklist at ` +
    `${origin}/move/${job.id}. No deposit; pay after the move.`
  );
}

/** The morning-after review request, with the referral code, per step 10. */
export function reviewRequestText(job: Job, origin: string): string {
  return (
    `Flatirons Movers: thanks for moving with us${job.crew ? ` and ${job.crew}` : ""}. ` +
    `Two minutes to leave a review helps more than you'd think: ` +
    `${origin}/move/${job.id}#review — and code ${referralCode(job)} gives ` +
    `a friend $50 off their move.`
  );
}

/**
 * Send one SMS. Returns true on acceptance, false on any failure — callers
 * treat false as "log and continue", never as an error to surface to the
 * person mid-booking.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!smsEnabled()) return false;
  const phone = toE164(to);
  if (!phone) return false;

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString(
              "base64",
            ),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: process.env.TWILIO_FROM!,
          Body: body,
        }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
