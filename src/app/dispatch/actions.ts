"use server";

/**
 * The staff Server Functions — shared by the dispatch board and the office
 * pipeline, because the handoff requires the crew app's advance button and
 * the dispatch card's to "produce identical results", and one function each
 * is how that stays true.
 *
 * Every one starts with `requireStaffAccess`: reachable by direct POST, same
 * argument as the portal's actions. The transition logic itself lives in
 * `src/lib/jobs.ts`, pure and already tested — these functions only decide
 * who may call it and which paths to refresh.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaffAccess } from "@/lib/auth";
import { money } from "@/lib/format";
import {
  advanceStage,
  advanceStatus,
  assignCrew,
  cancelJob,
  cancellationFor,
  invoiceOf,
} from "@/lib/jobs";
import { getJob, updateJob } from "@/lib/store";
import { chargeCardOnFile, stripeEnabled, toCents } from "@/lib/stripe";

function refresh(id: string) {
  revalidatePath("/dispatch");
  revalidatePath("/office");
  revalidatePath(`/move/${id}`);
}

/** The dispatch card's action button — one step along the status machine. */
export async function advanceJobStatus(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateJob(id, (job) => advanceStatus(job, Date.now()));
  refresh(id);
}

/** An unassigned card's crew chip. */
export async function assignJobCrew(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  const crew = String(formData.get("crew") ?? "");
  if (!id || !crew) return;

  await updateJob(id, (job) => assignCrew(job, crew));
  refresh(id);
}

/** The office table's stage chip — New → Survey set → Quoted → Booked → Complete. */
export async function advanceJobStage(formData: FormData): Promise<void> {
  await requireStaffAccess("/office");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateJob(id, (job) => advanceStage(job));
  refresh(id);
}

/**
 * Record a payment taken outside Stripe — the check handed to the crew, the
 * card read over the phone into the terminal. The rail's invoice list only
 * offers this for completed jobs; Stripe payments arrive through the webhook
 * and never need it.
 */
export async function recordPayment(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateJob(id, (job) =>
    job.status === "complete" ? { ...job, paid: !job.paid } : job,
  );
  refresh(id);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card on file

   Both of these move real money without the customer present, so both report
   what happened by redirecting back with an outcome in the query string. A
   silent failure here is an uncollected bill nobody knows about.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Bill the final invoice to the card saved at booking.
 *
 * Only for a completed, unpaid job — the same guard the customer's own "Pay
 * now" uses, because the amount is computed from hours that do not exist
 * until close-out. On success the job is marked paid here rather than by the
 * webhook: this charge has no Checkout Session and so produces no
 * `checkout.session.completed`, and the PaymentIntent's own result is already
 * in hand.
 */
export async function chargeSavedCard(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const job = await getJob(id);
  if (!job || job.paid || job.status !== "complete") return;
  if (!stripeEnabled()) return redirect(outcomeUrl("charge", id, "error"));

  const invoice = invoiceOf(job);
  const result = await chargeCardOnFile(
    job,
    toCents(invoice.total),
    `Flatirons Movers — move ${job.id}`,
  );

  if (result.ok) {
    await updateJob(id, (current) =>
      current.paid
        ? current
        : {
            ...current,
            paid: true,
            cardLast4: result.last4 ?? current.cardLast4,
            messages: [
              ...current.messages,
              {
                who: "Flatirons",
                text: `${money(invoice.total)} charged to the card on file — Stripe has emailed your receipt.`,
                mine: false,
                at: Date.now(),
              },
            ],
          },
    );
  }

  refresh(id);
  redirect(outcomeUrl("charge", id, result.ok ? "ok" : result.reason));
}

/**
 * Call a job off.
 *
 * The day is released either way — a cancellation the office could not
 * collect on is still a cancellation, and holding a truck for it would cost
 * more than the fee. So the charge is attempted first and the job records
 * only what actually cleared; an uncollected fee comes back as an outcome for
 * the office to chase, not as a number on the board pretending to be revenue.
 */
export async function cancelJobAndCharge(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const job = await getJob(id);
  if (!job || job.status === "cancelled" || job.status === "complete") return;

  const now = Date.now();
  const { late, feeCents } = cancellationFor(job, now);

  let charged = 0;
  let outcome = "ok";
  if (late && feeCents > 0) {
    if (!stripeEnabled()) {
      outcome = "uncollected";
    } else {
      const result = await chargeCardOnFile(
        job,
        feeCents,
        `Flatirons Movers — late cancellation ${job.id}`,
      );
      if (result.ok) charged = feeCents;
      else outcome = result.reason;
    }
  }

  await updateJob(id, (current) => cancelJob(current, now, charged));

  refresh(id);
  redirect(outcomeUrl("cancel", id, outcome));
}

/** Where a money action sends the board back to, carrying its result. */
function outcomeUrl(action: string, id: string, outcome: string): string {
  return `/dispatch?${action}=${encodeURIComponent(outcome)}&job=${encodeURIComponent(id)}`;
}
