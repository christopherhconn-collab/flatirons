/**
 * Telling the customer — by both channels, at once, and never fatally.
 *
 * SERVER ONLY.
 *
 * Four places now send a customer the same two messages: the estimator when a
 * move is booked, the office when it enters one by hand, the quote page when
 * a customer accepts, and the office again when it re-sends one that never
 * arrived. They were about to be four copies of the same `Promise.all`, each
 * free to drift into disagreeing about what a booking confirmation says.
 *
 * Two rules hold everywhere and are the reason this is a module rather than a
 * line of code:
 *
 *   A send never fails the thing it announces. `sendSms` and `sendEmail`
 *   return false rather than throwing, and both are awaited together rather
 *   than in sequence — they are independent, and a customer waiting on a
 *   booking redirect should not wait out two round trips back to back.
 *
 *   What actually went out is reported back. With Twilio or Resend
 *   unconfigured, with no mobile number on the record, or with a provider
 *   refusing the send, the office needs to see that the customer was not told
 *   — silence is the failure mode that costs a job.
 */

import { bookingConfirmationEmail, quoteEmail, sendEmail } from "./email";
import type { Job } from "./jobs";
import type { Notice } from "./quotes";
import { bookingConfirmationText, quoteText, sendSms } from "./sms";

/** A way we reached the customer. */
export type Channel = "email" | "text";

export type { Notice };

/**
 * Send one notice by both channels.
 *
 * Returns the channels that landed, in a fixed order so the caller can put it
 * in a URL and the page can render it without sorting.
 */
export async function notify(
  job: Job,
  notice: Notice,
  origin: string,
): Promise<Channel[]> {
  const email =
    notice === "quote"
      ? quoteEmail(job, origin)
      : bookingConfirmationEmail(job, origin);
  const text =
    notice === "quote"
      ? quoteText(job, origin)
      : bookingConfirmationText(job, origin);

  const [mailed, texted] = await Promise.all([
    job.email ? sendEmail(job.email, email) : Promise.resolve(false),
    // No mobile number is the ordinary case on an office-entered job, not an
    // error: plenty of customers give an email and a landline.
    job.phone ? sendSms(job.phone, text) : Promise.resolve(false),
  ]);

  const sent: Channel[] = [];
  if (mailed) sent.push("email");
  if (texted) sent.push("text");
  return sent;
}

/** `email,text` — the shape the staff pages carry in a query string. */
export function channelParam(sent: Channel[]): string {
  return sent.join(",");
}

/** "emailed and texted", for a banner. Null when nothing went out. */
export function channelLabel(sent: Channel[]): string | null {
  const parts = sent.map((c) => (c === "email" ? "emailed" : "texted"));
  if (parts.length === 0) return null;
  return parts.join(" and ");
}
