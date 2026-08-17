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

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | undefined;

/** The SDK client, constructed on first use — same rationale as db.ts. */
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set — see .env.example.");
  }
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
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
