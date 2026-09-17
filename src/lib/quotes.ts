/**
 * Staff-written quotes — the other way a job enters the system.
 *
 * The estimator is self-service: a customer prices their own move and books it
 * in one pass, and the job is created already `Booked`. That left the pipeline
 * with three stages nothing could reach. `New`, `Survey set` and `Quoted` were
 * on the office board and in the schema, and in production no row ever sat in
 * them, because the only code path that created a job went straight past them.
 *
 * A phone enquiry is the case they were for. Someone calls, the office prices
 * it from the home size and the access, and sends it — and the customer thinks
 * about it. That is a lead at `Quoted`: priced, dated, and holding nothing.
 * Accepting it promotes it to `Booked` on the path the estimator already uses,
 * so from the crew's side there is one kind of booked job, however it arrived.
 *
 * Pure. `store.ts` persists, the actions send the mail.
 */

import { arrivalWindow } from "./format";
import type { CustomerTask, Job } from "./jobs";
import {
  type CrewSize,
  type Floor,
  type HomeSize,
  type ItemCounts,
  PRESETS,
  inventoryFor,
  quote,
} from "./pricing";

/** What the office types. Deliberately less than the estimator collects: a
 * phone call yields a home size and the doors at both ends, not a room-by-room
 * inventory, and pretending otherwise would put invented precision on a
 * customer's quote. */
export type QuoteRequest = {
  customer: string;
  phone: string;
  email: string;
  size: HomeSize;
  from: string;
  to: string;
  /** `YYYY-MM-DD`. The day being offered, which the customer accepts or not. */
  date: string;
  movers: CrewSize;
  fromFloor: Floor;
  toFloor: Floor;
  elevator: boolean;
  packing: boolean;
  /** Free text from the call, kept on the thread so the crew sees it. */
  note: string;
};

/**
 * Price a request and build the lead.
 *
 * `status: "lead"` and `stage: "Quoted"` together mean: on the office board,
 * not on the dispatch board, holding no crew and no truck. `id` and `now` are
 * parameters because both are I/O and this function is not.
 */
export function quoteToLead(request: QuoteRequest, id: string, now: number): Job {
  const counts: ItemCounts = { ...PRESETS[request.size] };
  const priced = quote({
    counts,
    movers: request.movers,
    fromFloor: request.fromFloor,
    toFloor: request.toFloor,
    elevator: request.elevator,
    packing: request.packing,
  });

  const messages = [
    {
      who: "Flatirons",
      text:
        `Quoted $${priced.low.toLocaleString("en-US")}–$${priced.high.toLocaleString("en-US")} ` +
        `for ${request.date}. Nothing is held until the quote is accepted.`,
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
    from: request.from.trim() || "Denver",
    to: request.to.trim() || "Denver",
    date: request.date,
    // The day is offered, not reserved, so there is no arrival window yet.
    // Dispatch sets one when the quote is accepted and the job is scheduled.
    window: "Not set",
    movers: request.movers,
    crew: null,
    status: "lead",
    stage: "Quoted",
    low: priced.low,
    high: priced.high,
    counts,
    fromFloor: request.fromFloor,
    toFloor: request.toFloor,
    elevator: request.elevator,
    packing: request.packing,
    clockIn: null,
    hours: null,
    photos: 0,
    paid: false,
    reviewed: false,
    late: null,
    cardLast4: null,
    stripeCustomerId: null,
    stripePaymentMethodId: null,
    cardOnFileAt: null,
    cancelledAt: null,
    cancellationFeeCents: null,
    items: inventoryFor(counts),
    // A quote holds no date, so none of the checklist's deadlines mean
    // anything yet. Tasks arrive with the booking.
    tasks: [],
    messages,
    createdAt: now,
  };
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
 *
 * The result is indistinguishable from a job booked through the estimator:
 * `unassigned` and `Booked`, with the 8am window the estimator also assumes
 * until dispatch sets a real one.
 */
export function acceptQuote(job: Job, now: number, tasks: CustomerTask[] = []): Job {
  if (!isOpenQuote(job)) return job;
  return {
    ...job,
    status: "unassigned",
    stage: "Booked",
    window: arrivalWindow(8),
    tasks: job.tasks.length ? job.tasks : tasks,
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
