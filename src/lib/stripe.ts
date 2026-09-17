/**
 * Stripe, behind the same kind of switch as auth.
 *
 * SERVER ONLY.
 *
 * With `STRIPE_SECRET_KEY` unset, `stripeEnabled()` is false and "Pay now"
 * keeps its prototype behavior — a bookkeeping flip, no money moved. Set, the
 * button becomes a redirect to Stripe Checkout and the webhook is what marks
 * the job paid. The card is typed on Stripe's page and never touches ours,
 * which is the whole design: after step 9 there is no code path in this
 * repository through which a card number can travel.
 *
 * Checkout over an embedded Payment Element deliberately: the payer is a
 * homeowner on a phone the evening after their move, and Stripe's hosted
 * page brings Apple Pay, Google Pay, Link and receipt emails without any of
 * that being our code to maintain.
 */

import Stripe from "stripe";

import type { Invoice, Job } from "./jobs";

/**
 * The secret key, trimmed.
 *
 * The trim is not cosmetic. A key pasted into a hosting dashboard very often
 * carries a trailing newline, and the SDK puts the value straight into an
 * `Authorization` header — where Node rejects the newline outright with
 * `ERR_INVALID_CHAR`. That surfaces as a `StripeConnectionError` ("an error
 * occurred with our connection to Stripe") several frames from the cause,
 * and the customer just sees a page that will not load. Whitespace around a
 * key is never meaningful, so take it off before it reaches a header.
 */
function secretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

export function stripeEnabled(): boolean {
  return Boolean(secretKey());
}

let client: Stripe | undefined;

/** The SDK client, constructed on first use — same rationale as db.ts. */
export function stripe(): Stripe {
  const key = secretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set — see .env.example.");
  }
  return (client ??= new Stripe(key));
}

/** Dollars to integer cents without floating-point drift. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * The Checkout Session for one invoice, as data.
 *
 * Pure and unit-tested; `payInvoice` passes it to the API verbatim. One line
 * item at the invoice total rather than a line per invoice row: the itemised
 * bill lives on the move page the customer just came from, and Stripe's line
 * items cannot carry the "first 2 hrs × 3 movers" phrasing ours do.
 */
export function checkoutParamsFor(
  job: Job,
  invoice: Invoice,
  origin: string,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: toCents(invoice.total),
          product_data: {
            name: `Flatirons Movers — move ${job.id}`,
            description: `Final invoice · ${invoice.hours.toFixed(1)} hrs, ${job.movers} movers`,
          },
        },
      },
    ],
    customer_email: job.email,
    // The webhook trusts this, not the URL the browser comes back on.
    metadata: { jobId: job.id },
    success_url: `${origin}/move/${job.id}?paid=pending`,
    cancel_url: `${origin}/move/${job.id}`,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card on file

   Saving a card and charging it later are two different Stripe objects. The
   booking confirmation links to a *setup*-mode Checkout Session, which takes
   no money and stores a payment method against a Customer. Weeks later the
   office charges that payment method off-session — the customer is not at a
   browser, so there is nothing to redirect and the charge either succeeds or
   comes back needing them.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * The setup-mode Checkout Session for one job, as data.
 *
 * `mode: "setup"` means Stripe creates the Customer itself and attaches the
 * card to it; the webhook reads both back off the completed session. The
 * amount is deliberately absent — nothing is authorised here, which is what
 * makes it safe to send in an email the moment a move is booked.
 */
export function setupParamsFor(
  job: Job,
  origin: string,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "setup",
    currency: "usd",
    customer_email: job.email,
    // Same contract as the payment session: the webhook trusts this metadata
    // and nothing in the return URL.
    metadata: { jobId: job.id },
    setup_intent_data: { metadata: { jobId: job.id } },
    success_url: `${origin}/move/${job.id}?card=pending`,
    cancel_url: `${origin}/move/${job.id}`,
  };
}

/**
 * The off-session PaymentIntent for a saved card, as data.
 *
 * `off_session: true` tells Stripe the customer is not present, which both
 * exempts the charge from 3-D Secure where the original setup authorised it
 * and — where it does not — fails fast with `authentication_required` rather
 * than hanging on an authentication nobody is there to complete.
 */
export function offSessionParamsFor(
  job: Job,
  amountCents: number,
  description: string,
): Stripe.PaymentIntentCreateParams {
  return {
    amount: amountCents,
    currency: "usd",
    customer: job.stripeCustomerId ?? undefined,
    payment_method: job.stripePaymentMethodId ?? undefined,
    off_session: true,
    confirm: true,
    description,
    metadata: { jobId: job.id },
  };
}

export type ChargeResult =
  | { ok: true; paymentIntentId: string; last4: string | null }
  | { ok: false; reason: ChargeFailure; message: string };

export type ChargeFailure =
  /** No card was ever saved for this job. */
  | "no_card"
  /** The bank wants the customer present. They must pay from the portal. */
  | "authentication_required"
  /** Declined, expired, insufficient funds — anything the bank refused. */
  | "declined"
  /** Stripe itself was unreachable or unhappy. Safe to retry. */
  | "error";

/**
 * Charge the card saved at booking.
 *
 * Returns a result rather than throwing: every caller is a form action whose
 * job is to tell the office what happened, and three of the four failures are
 * ordinary business outcomes rather than bugs. In particular
 * `authentication_required` is not an error — it is Stripe saying the bank
 * wants the cardholder, and the answer is to send them the pay link, not to
 * retry.
 */
export async function chargeCardOnFile(
  job: Job,
  amountCents: number,
  description: string,
): Promise<ChargeResult> {
  if (!job.stripeCustomerId || !job.stripePaymentMethodId) {
    return { ok: false, reason: "no_card", message: "No card on file." };
  }
  if (amountCents <= 0) {
    return { ok: false, reason: "error", message: "Nothing to charge." };
  }

  try {
    const intent = await stripe().paymentIntents.create(
      offSessionParamsFor(job, amountCents, description),
      // Two clicks on one button must not be two charges. The key is the job
      // and the amount, so a genuine second charge of a *different* amount
      // still goes through.
      { idempotencyKey: `${job.id}:${amountCents}:${description}` },
    );
    const charge = intent.latest_charge as Stripe.Charge | string | null;
    const last4 =
      charge && typeof charge !== "string"
        ? (charge.payment_method_details?.card?.last4 ?? null)
        : null;
    return { ok: true, paymentIntentId: intent.id, last4 };
  } catch (error) {
    return { ok: false, ...describeChargeError(error) };
  }
}

/** Sort a thrown Stripe error into something the office can act on. */
function describeChargeError(error: unknown): {
  reason: ChargeFailure;
  message: string;
} {
  const err = error as Stripe.errors.StripeError;
  if (err?.type === "StripeCardError") {
    if (err.code === "authentication_required") {
      return {
        reason: "authentication_required",
        message:
          "The bank needs the customer to confirm this payment. Send them the pay link.",
      };
    }
    return {
      reason: "declined",
      message: err.message ?? "The card was declined.",
    };
  }
  return {
    reason: "error",
    message: err?.message ?? "Stripe could not be reached. Try again.",
  };
}
