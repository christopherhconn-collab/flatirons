/**
 * Jobs the office enters by hand — the other way work gets into the system.
 *
 * The estimator is self-service: a customer prices their own move and books it
 * in one pass, and the job is created already `Booked`. That left the pipeline
 * with three stages nothing could reach. `New`, `Survey set` and `Quoted` were
 * on the office board and in the schema, and in production no row ever sat in
 * one, because the only code path that created a job went straight past them.
 *
 * A phone enquiry is the case they were for, and it has two endings:
 *
 *   A quote — someone calls, the office prices it, sends it, and the customer
 *   thinks about it. That is a lead at `Quoted`: priced, dated, and holding
 *   nothing. Accepting it promotes it along the path the estimator already
 *   uses, so from the crew's side there is one kind of booked job however it
 *   arrived.
 *
 *   A reservation — the customer says yes on the call. Nothing is gained by
 *   emailing them a quote so they can click accept while still on the phone,
 *   so the office books it outright and the confirmation goes out instead.
 *
 * The same request produces both; `OfficeIntent` picks the ending. That is
 * deliberate — a quote and the reservation it becomes must be priced by
 * identical code, or the number the customer accepted is not the number they
 * are billed against.
 *
 * Pure. `store.ts` persists, the actions send the mail.
 */

import { arrivalWindow, dateLabel } from "./format";
import { type CustomerTask, type Job, priceRange, seedTasks } from "./jobs";
import {
  CONFIG,
  type CrewSize,
  type Floor,
  type HomeSize,
  type ItemCounts,
  PRESETS,
  SERVICE_LABEL,
  type ServiceType,
  clampStatedHours,
  hasDestination,
  hasOrigin,
  inventoryFor,
  isLaborOnly,
  quote,
} from "./pricing";

/** Which ending the office chose. */
export type OfficeIntent = "quote" | "book";

/** One of the two messages a customer gets about their job. Lives here rather
 * than beside the senders so that `resendableNotice` — which is a question
 * about the job, not about email — can stay in the pure module. */
export type Notice = "quote" | "booking";

/**
 * What the office types.
 *
 * Deliberately less than the estimator collects: a phone call yields a home
 * size and the doors at both ends, not a room-by-room inventory, and
 * pretending otherwise would put invented precision on a customer's quote.
 */
export type OfficeRequest = {
  customer: string;
  phone: string;
  email: string;
  size: HomeSize;
  /** What we are being hired to do — full move, or labour at one end. */
  service: ServiceType;
  from: string;
  to: string;
  /** `YYYY-MM-DD`. The day offered, or the day reserved. */
  date: string;
  movers: CrewSize;
  fromFloor: Floor;
  toFloor: Floor;
  elevator: boolean;
  packing: boolean;
  /**
   * Hours the caller named, on a labour-only job. Null prices the size preset
   * instead. Ignored on a full move, for the same reason the estimator
   * ignores it there: a move we have not seen is priced from what is in it.
   */
  hours: number | null;
  /** Arrival window start, 24-hour. Read only when booking. */
  windowHour: number;
  /** Free text from the call, kept on the thread so the crew sees it. */
  note: string;
};

/** The reserved window every self-service booking gets, and the office's
 * default — dispatch narrows it when the crew is assigned. */
export const DEFAULT_WINDOW_HOUR = 8;

/** The starts the office may offer. A crew that has not left the yard by two
 * is not finishing a house move the same day. */
export const WINDOW_HOURS = [7, 8, 9, 10, 11, 12, 13, 14];

/**
 * Price a request and build the job.
 *
 * `id` and `now` are parameters because both are I/O and this function is not.
 *
 * On `quote`: `status: "lead"` and `stage: "Quoted"` together mean on the
 * office board, not on the dispatch board, holding no crew and no truck — and
 * `window: "Not set"`, because a day that is not reserved has no arrival time
 * to promise.
 *
 * On `book`: identical to what the estimator writes, down to the seeded
 * checklist, so dispatch and the crew app cannot tell the two apart.
 */
export function officeJob(
  request: OfficeRequest,
  intent: OfficeIntent,
  id: string,
  now: number,
): Job {
  const laborOnly = isLaborOnly(request.service);
  // Labour only fixes the crew at two: it is the size the rate is quoted for,
  // and the form does not offer a choice. Enforced here rather than trusted
  // from the request, so a hand-posted form cannot buy a four-man crew at the
  // two-man rate.
  const movers: CrewSize = laborOnly ? CONFIG.laborOnly.movers : request.movers;
  const hours =
    laborOnly && request.hours !== null && request.hours > 0
      ? clampStatedHours(request.hours)
      : null;

  const counts: ItemCounts = { ...PRESETS[request.size] };
  const priced = quote({
    counts,
    movers,
    fromFloor: request.fromFloor,
    toFloor: request.toFloor,
    elevator: request.elevator,
    packing: request.packing,
    service: request.service,
    ...(hours !== null ? { manualHours: hours } : {}),
  });

  // The address that does not exist for this service is dropped rather than
  // stored: an unloading job has no pickup, and carrying one on the record
  // would send a crew to a door nobody agreed on.
  const from = hasOrigin(request.service) ? request.from.trim() : "";
  const to = hasDestination(request.service) ? request.to.trim() : "";

  const booking = intent === "book";
  const range = priceRange(priced);

  const messages = [
    {
      who: "Flatirons",
      text: booking
        ? `Booked for ${request.date}. Estimate ${range}; you're billed for the hours the crew actually works.`
        : `Quoted ${range} for ${request.date}. Nothing is held until the quote is accepted.`,
      mine: false,
      at: now,
    },
  ];
  if (request.note.trim()) {
    messages.push({
      who: "Flatirons",
      text: request.note.trim(),
      mine: false,
      at: now,
    });
  }

  return {
    id,
    customer: request.customer.trim(),
    phone: request.phone.trim(),
    email: request.email.trim(),
    size: request.size,
    from: from || "Denver",
    to: to || "Denver",
    date: request.date,
    window: booking ? arrivalWindow(windowHour(request.windowHour)) : "Not set",
    movers,
    crew: null,
    status: booking ? "unassigned" : "lead",
    stage: booking ? "Booked" : "Quoted",
    low: priced.low,
    high: priced.high,
    counts,
    fromFloor: request.fromFloor,
    toFloor: request.toFloor,
    elevator: request.elevator,
    packing: request.packing,
    service: request.service,
    quotedHours: hours,
    clockIn: null,
    hours: null,
    photos: 0,
    paid: false,
    reviewed: false,
    late: null,
    cardLast4: null,
    // No card at either ending. The booking confirmation invites the customer
    // to save one and the Stripe webhook writes these when they do.
    stripeCustomerId: null,
    stripePaymentMethodId: null,
    cardOnFileAt: null,
    cancelledAt: null,
    cancellationFeeCents: null,
    items: inventoryFor(counts),
    // A quote holds no day, so none of the checklist's deadlines mean anything
    // yet. The tasks arrive with the booking, here or on acceptance.
    tasks: booking
      ? seedTasks({
          elevator: request.elevator,
          packing: request.packing,
          counts,
        })
      : [],
    messages,
    createdAt: now,
  };
}

/** A window start we are willing to promise, whatever was posted. */
export function windowHour(hour: number): number {
  return WINDOW_HOURS.includes(hour) ? hour : DEFAULT_WINDOW_HOUR;
}

/** Whether this job is a quote a customer may still accept. */
export function isOpenQuote(job: Job): boolean {
  return job.status === "lead" && job.stage === "Quoted";
}

/**
 * Accept a quote.
 *
 * Idempotent, and narrow on purpose: anything that is not an open quote comes
 * back untouched, so a link opened twice — or opened after the office booked
 * it by phone — cannot double-book a day or reset a job that has moved on.
 * The caller compares the result by identity to tell an acceptance from a
 * second click, and only sends a confirmation for the former.
 *
 * The result is indistinguishable from a job booked through the estimator:
 * `unassigned` and `Booked`, carrying the checklist and the same 8am window
 * the estimator assumes until dispatch sets a real one.
 */
export function acceptQuote(job: Job, now: number): Job {
  if (!isOpenQuote(job)) return job;
  const tasks: CustomerTask[] = job.tasks.length
    ? job.tasks
    : seedTasks({
        elevator: job.elevator,
        packing: job.packing,
        counts: job.counts,
      });
  return {
    ...job,
    status: "unassigned",
    stage: "Booked",
    window: arrivalWindow(DEFAULT_WINDOW_HOUR),
    tasks,
    messages: [
      ...job.messages,
      {
        who: "Flatirons",
        text: "Quote accepted — you're booked. A dispatcher assigns your crew 48 hours out.",
        mine: false,
        at: now,
      },
    ],
  };
}

/**
 * The quote, as label/value pairs.
 *
 * One list, read by the email and by the page the email links to, so the two
 * cannot come to describe the same quote differently. Addresses appear only
 * where the service has one — an unloading quote listing a pickup of "Denver"
 * would be stating a fact nobody gave us.
 */
export function quoteFacts(job: Job): [string, string][] {
  const rows: [string, string][] = [
    ["Reference", job.id],
    ["Date offered", dateLabel(job.date)],
    ["Service", SERVICE_LABEL[job.service]],
  ];
  if (hasOrigin(job.service)) rows.push(["From", job.from]);
  if (hasDestination(job.service)) rows.push(["To", job.to]);
  if (!isLaborOnly(job.service)) rows.push(["Home size", job.size]);
  rows.push(["Crew", `${job.movers} movers`]);
  if (job.quotedHours) rows.push(["Hours", `${job.quotedHours.toFixed(1)} hrs`]);
  rows.push(["Estimate", priceRange(job)]);
  return rows;
}


/**
 * Which message a customer should have about this job, if any.
 *
 * The office re-sends when a customer says they never got it — which happens,
 * and which is worse than it sounds, because the office is meanwhile sitting
 * on a quote it thinks is being considered. What to re-send is decided from
 * the job's own state rather than remembered from what was sent first: a
 * quote that has since been accepted must re-send as a confirmation, not as
 * the quote it used to be.
 *
 * Null for the jobs where neither message is true any more — a completed
 * move, a cancelled one, a lead that has not been priced. Re-sending "you're
 * booked" for a move that happened last week is worse than sending nothing.
 */
export function resendableNotice(job: Job): Notice | null {
  if (isOpenQuote(job)) return "quote";
  if (job.status === "complete" || job.status === "cancelled") return null;
  return job.stage === "Booked" ? "booking" : null;
}
