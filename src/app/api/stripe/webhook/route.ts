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
  // Trimmed for the same reason as the secret key: a newline picked up
  // when pasting into a dashboard would fail every signature check, and
  // "bad signature" reads like an attack rather than a stray character.
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
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

    if (jobId && session.mode === "setup") {
      await saveCardOnFile(jobId, session);
    } else if (jobId && session.payment_status === "paid") {
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

/**
 * Record the card a customer saved from their booking confirmation.
 *
 * The Customer and the PaymentMethod together are what let the office charge
 * the final bill weeks later without the customer present, so both are
 * required: a half-written pair would fail at close-out, on the evening of
 * the move, with no way to recover it. Either both land or neither does.
 */
async function saveCardOnFile(
  jobId: string,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const setupIntentId =
    typeof session.setup_intent === "string"
      ? session.setup_intent
      : session.setup_intent?.id;
  if (!setupIntentId) return;

  const intent = await stripe().setupIntents.retrieve(setupIntentId, {
    expand: ["payment_method"],
  });

  const method = intent.payment_method;
  const methodId = typeof method === "string" ? method : method?.id;
  const customerId =
    typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
  if (!methodId || !customerId) return;

  const last4 =
    method && typeof method !== "string" ? (method.card?.last4 ?? null) : null;

  await updateJob(jobId, (job) =>
    // Stripe retries deliveries, and a customer may legitimately replace their
    // card — so this is written every time, but only announced once.
    job.cardOnFileAt
      ? {
          ...job,
          stripeCustomerId: customerId,
          stripePaymentMethodId: methodId,
          cardLast4: last4 ?? job.cardLast4,
        }
      : {
          ...job,
          stripeCustomerId: customerId,
          stripePaymentMethodId: methodId,
          cardLast4: last4 ?? job.cardLast4,
          cardOnFileAt: Date.now(),
          messages: [
            ...job.messages,
            {
              who: "Flatirons",
              text: last4
                ? `Card ending ${last4} saved. Nothing has been charged — we bill after your move.`
                : "Card saved. Nothing has been charged — we bill after your move.",
              mine: false,
              at: Date.now(),
            },
          ],
        },
  );
}
