/**
 * The job record and its two state machines.
 *
 * Pure — no I/O, no clock reads except where a transition is explicitly
 * timestamped by its caller. `store.ts` owns persistence; this file owns what
 * a job *is* and what a transition *means*, so the rules can be unit-tested
 * and so dispatch and the crew app produce identical results when the
 * purchased platform starts driving them (README.md, "Status machine").
 */

import {
  CONFIG,
  type CrewSize,
  type Floor,
  type HomeSize,
  type ItemCounts,
  invoiceFor,
  type InvoiceLine,
} from "./pricing";
import { money, place } from "./format";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

/** Where the work is. Driven by the crew app and the dispatch board alike. */
export type JobStatus =
  | "lead"
  | "unassigned"
  | "scheduled"
  | "enroute"
  | "onsite"
  | "complete";

/** Where the *sale* is. Separate from status, and cycled by the office. */
export type PipelineStage =
  | "New"
  | "Survey set"
  | "Quoted"
  | "Booked"
  | "Complete";

export const STAGES: PipelineStage[] = [
  "New",
  "Survey set",
  "Quoted",
  "Booked",
  "Complete",
];

/** Rank, for "has the job reached at least this state" questions. */
export const STATUS_RANK: Record<JobStatus, number> = {
  lead: 0,
  unassigned: 1,
  scheduled: 2,
  enroute: 3,
  onsite: 4,
  complete: 5,
};

export const NEXT_STATUS: Record<JobStatus, JobStatus> = {
  lead: "unassigned",
  unassigned: "enroute",
  scheduled: "enroute",
  enroute: "onsite",
  onsite: "complete",
  complete: "complete",
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  lead: "Lead",
  unassigned: "Unassigned",
  scheduled: "Scheduled",
  enroute: "En route",
  onsite: "Loading",
  complete: "Complete",
};

export type InventoryLine = { name: string; handling: string; done: boolean };
export type CustomerTask = { label: string; note: string; done: boolean };
export type Message = {
  who: string;
  text: string;
  /** True when the customer wrote it. Alignment mirrors between the two apps. */
  mine: boolean;
  at: number;
};

export type Job = {
  /** `FM-8848`. Shown to the customer and quoted back on the phone. */
  id: string;
  customer: string;
  phone: string;
  email: string;
  /** The home size chosen in the estimator, or `Office` for commercial work. */
  size: HomeSize | "Office";
  from: string;
  to: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `8:00–8:30 AM`, or `Not set` on a lead. */
  window: string;
  movers: CrewSize;
  crew: string | null;
  status: JobStatus;
  stage: PipelineStage;
  /** The quoted range, locked at booking. */
  low: number;
  high: number;
  /** The priced inventory, kept so the invoice can be rebuilt from source. */
  counts: ItemCounts;
  fromFloor: Floor;
  toFloor: Floor;
  elevator: boolean;
  packing: boolean;
  /** Epoch ms of arrival on site. Null unless the clock is running. */
  clockIn: number | null;
  /** Billed hours, set when the job closes out. */
  hours: number | null;
  photos: number;
  paid: boolean;
  reviewed: boolean;
  /** Minutes behind the arrival window, when dispatch has flagged it. */
  late: number | null;
  cardLast4: string | null;
  items: InventoryLine[];
  tasks: CustomerTask[];
  messages: Message[];
  createdAt: number;
};

export type Review = {
  id: string;
  who: string;
  where: string;
  stars: number;
  text: string;
  /** `YYYY-MM-DD` of the move, which is what the card's month tag shows. */
  date: string;
  crew: string;
};

export type Crew = { name: string; roster: string; size: CrewSize };

/* ═══════════════════════════════════════════════════════════════════════════
   Derived views
   ═══════════════════════════════════════════════════════════════════════════ */

export function loadedCount(job: Job): number {
  return job.items.filter((i) => i.done).length;
}

/** Percentage of the inventory aboard the truck. Zero on an empty inventory. */
export function loadedPercent(job: Job): number {
  return job.items.length
    ? Math.round((loadedCount(job) / job.items.length) * 100)
    : 0;
}

export function isLive(job: Job): boolean {
  return job.status === "enroute" || job.status === "onsite";
}

/** Seconds on the clock right now. `now` is passed so callers stay testable. */
export function elapsedSeconds(job: Job, now: number): number {
  return job.clockIn ? Math.max(0, Math.floor((now - job.clockIn) / 1000)) : 0;
}

export type TimelineStage = {
  label: string;
  note: string;
  done: boolean;
};

/**
 * The portal's five-stage timeline. Each stage carries a live sub-line, so the
 * customer reads state rather than a set of ticks — the locked range, the item
 * count, the crew and truck, the loading count, the billed hours.
 */
export function timelineFor(job: Job): TimelineStage[] {
  const rank = STATUS_RANK[job.status] || 1;
  const loaded = loadedCount(job);
  return [
    {
      label: "Estimate accepted",
      note: `${money(job.low)}–${money(job.high)} range locked`,
      at: 1,
    },
    {
      label: "Inventory confirmed",
      note: `${job.items.length} items on the list`,
      at: 1,
    },
    {
      label: "Crew assigned",
      note: job.crew ? `${job.crew} · truck 26′` : "Posted 48 hours before",
      at: 2,
    },
    {
      label: "Move day",
      note:
        rank >= 4
          ? `Loading now — ${loaded} of ${job.items.length} aboard`
          : "Live crew location on the day",
      at: 4,
    },
    {
      label: "Delivered & signed",
      note: job.hours
        ? `${job.hours.toFixed(1)} hrs billed`
        : "Digital bill of lading",
      at: 5,
    },
  ].map((stage) => ({
    label: stage.label,
    note: stage.note,
    done: rank >= stage.at,
  }));
}

export function routeLabel(job: Job): string {
  return `${place(job.from)} → ${place(job.to)}`;
}

export function initialsOf(name: string): string {
  const parts = name.split(/[,\s]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "F";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "M";
  return (first + second).toUpperCase();
}

/** `FLAT-8848` — the referral code on the portal's dashed card. */
export function referralCode(job: Job): string {
  return "FLAT-" + job.id.replace("FM-", "");
}

/* ═══════════════════════════════════════════════════════════════════════════
   Invoicing
   ═══════════════════════════════════════════════════════════════════════════ */

export type Invoice = {
  hours: number;
  rate: number;
  lines: InvoiceLine[];
  total: number;
};

/**
 * The bill of lading's figures.
 *
 * Hours come from the crew's recorded work when the job has closed out. Before
 * that there is nothing to bill, so the bottom of the quoted range stands in —
 * that is a preview, and the portal only shows this card once the job is
 * complete.
 */
export function invoiceOf(job: Job): Invoice {
  const rate = CONFIG.rates[job.movers];
  const hours = job.hours ?? (job.low ? job.low / rate : CONFIG.minHours);
  const { lines, total } = invoiceFor({
    hours,
    movers: job.movers,
    counts: job.counts,
  });
  return { hours, rate, lines, total };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Transitions

   README.md, "Status machine": transitions are triggered from either the crew
   app's advance button or the dispatch card's action button, and both must
   produce identical results. That is why they live here rather than in either
   caller. Stage 1–3 of the build plan buys the platform that drives these; the
   functions are the contract its webhooks land on.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Advance a job one step along `lead → unassigned → scheduled → enroute →
 * onsite → complete`.
 *
 * Entering `onsite` timestamps the clock-in. Entering `complete` converts
 * elapsed time into billed hours, marks every inventory item loaded and sets
 * the pipeline stage to Complete.
 */
export function advanceStatus(job: Job, now: number): Job {
  const next = NEXT_STATUS[job.status];
  if (next === job.status) return job;

  const advanced: Job = { ...job, status: next };

  if (next === "onsite") advanced.clockIn = now;

  if (next === "complete") {
    advanced.hours = job.clockIn
      ? Math.max(1, (now - job.clockIn) / 3_600_000)
      : (job.hours ?? 4);
    advanced.clockIn = null;
    advanced.stage = "Complete";
    advanced.items = job.items.map((i) => ({ ...i, done: true }));
  }

  return advanced;
}

/** Assign a crew, which moves an unassigned job onto the schedule. */
export function assignCrew(job: Job, crew: string): Job {
  return {
    ...job,
    crew,
    status: job.status === "unassigned" ? "scheduled" : job.status,
  };
}

/**
 * Cycle the pipeline stage. Advancing a lead to Booked promotes its status to
 * `unassigned` so it appears on the dispatch board.
 */
export function advanceStage(job: Job): Job {
  const stage = STAGES[(STAGES.indexOf(job.stage) + 1) % STAGES.length];
  return {
    ...job,
    stage,
    status: stage === "Booked" && job.status === "lead" ? "unassigned" : job.status,
  };
}
