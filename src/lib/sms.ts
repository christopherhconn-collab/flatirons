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

import { type Job, priceRange } from "./jobs";

/**
 * The three Twilio values, trimmed.
 *
 * The trim is not cosmetic — see the same note in `stripe.ts`. The SID and
 * token are base64'd into an `Authorization` header, and a trailing newline
 * picked up while pasting into a hosting dashboard makes Node reject the
 * request outright with `ERR_INVALID_CHAR`, which surfaces nowhere near the
 * cause.
 */
function twilio(): { sid: string; token: string; from: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM?.trim();
  return sid && token && from ? { sid, token, from } : null;
}

export function smsEnabled(): boolean {
  return twilio() !== null;
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

/**
 * Two rules bind every message body below, and both cost real money when
 * broken.
 *
 * GSM-7 ONLY. The 7-bit alphabet carriers use has no em dash, en dash, curly
 * quote or ellipsis. One such character switches the whole message to UCS-2,
 * which drops the segment size from 153 characters to 67 — so a single
 * typographic dash in a 200-character message costs an extra segment on every
 * send, forever. Use `-` and `'`. `isGsm7()` is tested against both bodies.
 *
 * OPT-OUT IN EVERY MESSAGE. "Reply STOP to opt out" is what the A2P 10DLC
 * campaign registration promises the carriers, and the registered sample
 * messages are compared against live traffic. Dropping it risks the campaign,
 * and campaign-level filtering means the messages simply stop arriving with
 * no error we can see.
 */

/**
 * The compliance tail every message carries.
 *
 * Five elements are expected on a message that confirms an opt-in: the brand,
 * what the recipient signed up for, that rates apply, how to get help, and
 * how to stop. The first two are the body of each message; these are the
 * other three, and they are one constant because a message that carries some
 * of them is the one a carrier flags.
 *
 * `Msg&data` rather than `Message and data` is not shorthand for its own
 * sake: the phrase is carrier-conventional and it keeps both bodies inside
 * two segments, where spelling it out would push the review request into a
 * third on every send.
 *
 * `/privacy` and `/terms` both tell customers they may reply HELP. We run no
 * inbound webhook, so that promise is kept by Twilio's opt-out management —
 * which must have HELP enabled for it to be true.
 */
const COMPLIANCE_TAIL =
  "Msg&data rates may apply. Reply HELP for help, STOP to opt out.";

/** The booking confirmation. Short enough for one SMS segment matters less
 * than saying the three things that stop the "did it work?" callback: the
 * reference, the date, the link. */
export function bookingConfirmationText(job: Job, origin: string): string {
  return toGsm7(
    `Flatirons Movers: you're booked - ${job.id}, ${job.date}, ` +
    `arrival ${job.window}. Track your move and put a card on file at ` +
    `${origin}/move/${job.id}. No deposit; we bill after the move. ${COMPLIANCE_TAIL}`
  );
}

/**
 * The quote the office sent after a phone enquiry.
 *
 * Transactional, like the other two: the reply to something the customer just
 * asked for on the phone. It states a price, a day and a link — no incentive,
 * no urgency, nothing that would make this a marketing message on a campaign
 * registered as transactional.
 *
 * It says the day is not held, because that is the single thing a customer is
 * most likely to get wrong about a quote, and a text is what they will still
 * have on the phone in their hand a week later.
 */
export function quoteText(job: Job, origin: string): string {
  return toGsm7(
    `Flatirons Movers: your estimate for ${job.date} is ${priceRange(job)}. ` +
    `The day is not held until you accept: ${origin}/quote/${job.id}. ` +
    `${COMPLIANCE_TAIL}`
  );
}

/**
 * The morning-after review request.
 *
 * NO REFERRAL OFFER, DELIBERATELY. Step 10 specified the referral code here,
 * and a carrier rejected the sample for it: "$50 off" is promotional content,
 * and this campaign is registered as transactional — a booking confirmation
 * and one post-move follow-up. An incentive inside a transactional message is
 * a use-case mismatch, and the fix is to take the incentive out rather than
 * re-register the campaign as marketing, which carries heavier vetting and
 * stricter consent for no benefit to a two-message-per-move sender.
 *
 * Nothing is lost. The link lands on the portal, and the portal has a
 * referral section with the code and a copy button a few inches below the
 * review form — so the customer still gets it, on a page where an offer
 * belongs.
 *
 * `job.crew` is the one unbounded field here, which is why the copy is
 * tighter than it reads: it has to stay inside two segments for a crew name
 * longer than "Crew A".
 */
export function reviewRequestText(job: Job, origin: string): string {
  return toGsm7(
    `Flatirons Movers: thanks for moving with us${job.crew ? ` and ${job.crew}` : ""}. ` +
    `A quick review helps more than you'd think: ` +
    `${origin}/move/${job.id}#review ${COMPLIANCE_TAIL}`
  );
}

/**
 * The GSM-7 basic alphabet plus its extension table — what a carrier can
 * send at 153 characters per segment instead of 67.
 */
const GSM7 =
  "@\u00a3$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9" +
  " !\"#\u00a4%&'()*+,-./0123456789:;<=>?" +
  "\u00a1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00d1\u00dc\u00a7" +
  "\u00bfabcdefghijklmnopqrstuvwxyz\u00e4\u00f6\u00f1\u00fc\u00e0" +
  "^{}\\[~]|\u20ac";

/**
 * Whether `text` survives GSM-7 encoding — i.e. whether it bills at 153
 * characters per segment rather than 67.
 *
 * Exported for the tests rather than used at runtime: a message that fails
 * this still sends, just at roughly double the cost, so the place to catch it
 * is CI, not production.
 */
export function isGsm7(text: string): boolean {
  return [...text].every((c) => GSM7.includes(c));
}

/**
 * Fold the typographic characters the rest of the app uses into their GSM-7
 * equivalents.
 *
 * Sanitising beats forbidding. `job.window` is `8:00\u20138:30 AM` because
 * `arrivalWindow()` typesets a range with an en dash, which is right on a web
 * page and wrong in an SMS — and customer names and crew names reach these
 * bodies too. Asking every upstream caller to know about GSM-7 would fail the
 * first time somebody added a field; normalising here cannot.
 *
 * Anything still outside the alphabet after this is dropped rather than sent:
 * a missing character costs nothing, and one stray glyph doubles the price of
 * every message.
 */
export function toGsm7(text: string): string {
  const folded = text
    .replace(/[\u2010-\u2015]/g, "-") // hyphens, en dash, em dash, bar
    .replace(/[\u2018\u2019\u201b]/g, "'") // curly single quotes
    .replace(/[\u201c\u201d]/g, '"') // curly double quotes
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ") // non-breaking space
    .replace(/[\u2022\u00b7]/g, "-"); // bullets, used in our own copy
  return [...folded].filter((c) => GSM7.includes(c)).join("");
}

/**
 * Send one SMS. Returns true on acceptance, false on any failure — callers
 * treat false as "log and continue", never as an error to surface to the
 * person mid-booking.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const config = twilio();
  if (!config) return false;
  const phone = toE164(to);
  if (!phone) return false;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${config.sid}:${config.token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: config.from,
          Body: body,
        }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
