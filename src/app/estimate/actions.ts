"use server";

/**
 * The estimator's Server Functions.
 *
 * Every price the customer sees is produced here and shipped as a finished
 * string. `updateEstimate` is the single write path for the in-progress quote:
 * the browser sends what changed, the server re-prices, and the new view comes
 * back in the same roundtrip.
 *
 * These are reachable by direct POST, not only through our UI, so every field
 * is re-validated in `applyPatch` and nothing is trusted from the wire.
 */

import { redirect } from "next/navigation";

import { siteOrigin } from "@/lib/site-url";
import { notify } from "@/lib/notify";

import {
  type EstimatePatch,
  type EstimateView,
  applyPatch,
  buildView,
  firstOpenDate,
} from "@/lib/estimate";
import { arrivalWindow, place } from "@/lib/format";
import { type Job, seedTasks } from "@/lib/jobs";
import { inventoryFor, quote } from "@/lib/pricing";
import {
  bookedOutDates,
  createJob,
  deleteDraft,
  saveDraft,
} from "@/lib/store";
import {
  clearDraftCookie,
  ensureDraft,
  rememberMove,
  todayISO,
} from "@/lib/session";

/** Which month the calendar is showing. UI state, echoed back in the view. */
export type CalendarMonth = { year: number; month: number };

/**
 * Apply a change and return the re-priced view.
 *
 * Called for every interaction in the estimator — a keystroke in an address
 * field, a stepper tap, a crew choice. The draft is persisted on each call, so
 * a refresh resumes exactly where the customer was.
 */
export async function updateEstimate(
  patch: EstimatePatch,
  month?: CalendarMonth,
): Promise<EstimateView> {
  const draft = await ensureDraft();
  const next = applyPatch(draft, patch);
  await saveDraft(next);

  return buildView(next, {
    bookedOut: await bookedOutDates(),
    today: todayISO(),
    month,
  });
}

/**
 * The home page's hero form and the "build my estimate" buttons.
 *
 * Carries what the customer already told us into the flow and skips step 1
 * when they gave us an origin, matching the prototype.
 */
export async function startEstimate(formData: FormData): Promise<void> {
  const draft = await ensureDraft();
  const from = String(formData.get("from") ?? "");
  const next = applyPatch(draft, {
    from,
    to: String(formData.get("to") ?? ""),
    size: String(formData.get("size") ?? draft.size),
    step: from.trim() ? 2 : 1,
  });
  await saveDraft(next);
  redirect("/estimate");
}

/* ═══════════════════════════════════════════════════════════════════════════
   Booking
   ═══════════════════════════════════════════════════════════════════════════ */

/** The checklist a new booking seeds, from the move's own shape. */
/**
 * Book the move.
 *
 * Writes the job with its priced inventory and seeded checklist, drops the
 * draft, texts the confirmation when Twilio is configured, and routes to the
 * portal. Still not wired, deliberately and visibly: the confirmation email
 * (needs Resend) and the office alert.
 *
 * Returns an error string when the draft is not bookable; otherwise redirects.
 */
export async function bookMove(): Promise<{ error: string } | never> {
  const draft = await ensureDraft();
  const bookedOut = await bookedOutDates();
  const today = todayISO();
  const view = buildView(draft, { bookedOut, today });

  if (view.blockedReason) return { error: view.blockedReason };

  const date = draft.date || firstOpenDate(today, bookedOut);
  const priced = quote({
    counts: draft.counts,
    movers: draft.movers,
    fromFloor: draft.fromFloor,
    toFloor: draft.toFloor,
    elevator: draft.elevator,
    packing: draft.packing,
    service: draft.service,
  });
  const now = Date.now();

  const job: Job = {
    id: draft.ref,
    customer: draft.name.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    size: draft.size,
    from: draft.from.trim() || "Denver",
    to: draft.to.trim() || "Denver",
    date,
    window: arrivalWindow(8),
    movers: draft.movers,
    crew: null,
    status: "unassigned",
    stage: "Booked",
    low: priced.low,
    high: priced.high,
    counts: { ...draft.counts },
    fromFloor: draft.fromFloor,
    toFloor: draft.toFloor,
    elevator: draft.elevator,
    packing: draft.packing,
    service: draft.service,
    quotedHours:
      draft.hoursMode === "hours" ? draft.quotedHours : null,
    clockIn: null,
    hours: null,
    photos: 0,
    paid: false,
    reviewed: false,
    late: null,
    // Written by the Stripe webhook when the invoice is paid; nothing about a
    // card exists before then.
    cardLast4: null,
    // No card is saved at booking either — the confirmation invites the
    // customer to add one, and the webhook writes these when they do.
    stripeCustomerId: null,
    stripePaymentMethodId: null,
    cardOnFileAt: null,
    // Not cancelled, obviously; the fee stays null until one is charged.
    cancelledAt: null,
    cancellationFeeCents: null,
    items: inventoryFor(draft.counts),
    tasks: seedTasks(draft),
    messages: [
      {
        who: "Flatirons",
        text: `Booked — ${place(draft.from) || "your move"} on ${view.dateText}. A dispatcher assigns your crew 48 hours out.`,
        mine: false,
        at: now,
      },
    ],
    createdAt: now,
  };

  await createJob(job);
  await deleteDraft(draft.id);
  await clearDraftCookie();
  await rememberMove(job.id);

  // The confirmation, by both channels the customer gave us. Neither send can
  // fail the booking — see `notify` — and the customer lands on their portal
  // regardless, which says everything the confirmation would have.
  await notify(job, "booking", siteOrigin());

  redirect(`/move/${job.id}`);
}
