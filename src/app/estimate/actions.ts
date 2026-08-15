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

import {
  type EstimatePatch,
  type EstimateView,
  applyPatch,
  buildView,
  firstOpenDate,
} from "@/lib/estimate";
import { arrivalWindow, place } from "@/lib/format";
import type { CustomerTask, Job } from "@/lib/jobs";
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
function seedTasks(draft: {
  elevator: boolean;
  packing: boolean;
  counts: Record<string, number>;
}): CustomerTask[] {
  const tasks: CustomerTask[] = [
    {
      label: "Confirm parking for a 26-foot truck",
      note: "Both ends — permits take a day",
      done: false,
    },
    {
      label: "Set aside anything you’re taking yourself",
      note: "Meds, documents, valuables",
      done: false,
    },
  ];
  if (draft.elevator) {
    tasks.unshift({
      label: "Reserve the freight elevator",
      note: "Most buildings need a two-hour window booked in advance",
      done: false,
    });
  }
  if (draft.counts["Filing cabinet"]) {
    tasks.push({
      label: "Empty the filing cabinet",
      note: "We can’t move loaded cabinets safely",
      done: false,
    });
  }
  if (draft.packing) {
    tasks.push({
      label: "Leave the cupboards packed as they are",
      note: "The packing crew works the day before — don’t start without us",
      done: false,
    });
  }
  return tasks;
}

/**
 * Book the move.
 *
 * Writes the job with its priced inventory and seeded checklist, drops the
 * draft, and routes to the portal. Steps 6 and 9 of the build plan add the
 * confirmation email and SMS, the office alert, and the Stripe authorisation —
 * none of those services are wired up yet, and this deliberately does not
 * pretend otherwise.
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
    clockIn: null,
    hours: null,
    photos: 0,
    paid: false,
    reviewed: false,
    late: null,
    cardLast4: draft.cardNumber.replace(/\D/g, "").slice(-4) || null,
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

  redirect(`/move/${job.id}`);
}
