/**
 * Stripe's callback — the only thing that marks an invoice paid when Stripe
 * is on.
 *
 * The signature check is the security model: `constructEvent` verifies the
 * payload against `STRIPE_WEBHOOK_SECRET`, so a POST that did not come from
 * Stripe cannot flip a job to paid. That is why the success URL the browser
 * returns on says "pending" and this handler says "paid".
 *
 * The raw body must reach the verifier byte-for-byte — `request.text()`,
 * never a parsed JSON re-serialized.
 */

import { type NextRequest, NextResponse } from "next/server";

import type Stripe from "stripe";

import { updateJob } from "@/lib/store";
import { stripe, stripeEnabled } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeEnabled() || !secret) {
    // Configured half-way: reachable but unusable. 503 so Stripe retries
    // rather than marking the endpoint dead while the secret is being set.
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const jobId = session.metadata?.jobId;

    if (jobId && session.payment_status === "paid") {
      // The last four are a nicety on the receipt line; fetch them from the
      // charge, and shrug if the shape ever changes — the flip to paid must
      // not depend on it.
      let last4: string | null = null;
      try {
        if (typeof session.payment_intent === "string") {
          const intent = await stripe().paymentIntents.retrieve(
            session.payment_intent,
            { expand: ["latest_charge"] },
          );
          const charge = intent.latest_charge as Stripe.Charge | null;
          last4 = charge?.payment_method_details?.card?.last4 ?? null;
        }
      } catch {
        last4 = null;
      }

      await updateJob(jobId, (job) =>
        job.paid
          ? job // Stripe retries deliveries; the second one must be a no-op.
          : {
              ...job,
              paid: true,
              cardLast4: last4 ?? job.cardLast4,
              messages: [
                ...job.messages,
                {
                  who: "Flatirons",
                  text: "Payment received — Stripe has emailed your receipt.",
                  mine: false,
                  at: Date.now(),
                },
              ],
            },
      );
    }
  }

  // Every verified event is acknowledged, handled or not — an unhandled type
  // is not an error, and a non-2xx would make Stripe retry it forever.
  return NextResponse.json({ received: true });
}
