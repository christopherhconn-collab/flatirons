/**
 * The data store.
 *
 * SERVER ONLY. Never import this from a client component.
 *
 * Step 3 of the build plan. This was a JSON file standing in for a database;
 * it is now Postgres behind Prisma, and the function signatures did not change
 * — which was the point of routing every caller through here in the first
 * place. Pages and actions still say `getJob`, `updateJob`, `bookedOutDates`
 * and know nothing about where rows live.
 *
 * The domain types in `jobs.ts` remain the currency. Prisma's row shapes stay
 * inside this file: `toJob` maps one way, the write helpers map the other, so
 * a column rename never escapes into the app.
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import type {
  Crew,
  CustomerTask,
  InventoryLine,
  Job,
  JobStatus,
  Message,
  PipelineStage,
  Review,
} from "./jobs";
import type { CrewSize, Floor, ItemCounts } from "./pricing";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

export type QuoteDraft = {
  id: string;
  /** `FM-8848`, reserved when the draft is created and used at booking. */
  ref: string;
  from: string;
  to: string;
  fromFloor: Floor;
  toFloor: Floor;
  elevator: boolean;
  size: Exclude<Job["size"], "Office">;
  /** `YYYY-MM-DD`, or empty until the customer picks a day. */
  date: string;
  movers: CrewSize;
  packing: boolean;
  counts: ItemCounts;
  name: string;
  email: string;
  phone: string;
  step: 1 | 2 | 3 | 4;
  room: string;
  updatedAt: number;
};

/** The relations every read of a job needs, in the order the UI renders them. */
const JOB_INCLUDE = {
  crew: true,
  items: { orderBy: { position: "asc" } },
  tasks: { orderBy: { position: "asc" } },
  messages: { orderBy: { at: "asc" } },
} satisfies Prisma.JobInclude;

type JobRow = Prisma.JobGetPayload<{ include: typeof JOB_INCLUDE }>;

/* ═══════════════════════════════════════════════════════════════════════════
   Row → domain
   ═══════════════════════════════════════════════════════════════════════════ */

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    customer: row.customer,
    phone: row.phone,
    email: row.email,
    size: row.size as Job["size"],
    from: row.fromAddress,
    to: row.toAddress,
    date: row.date,
    window: row.window,
    movers: row.movers as CrewSize,
    crew: row.crew?.name ?? null,
    status: row.status as JobStatus,
    stage: STAGE_FROM_DB[row.stage],
    low: row.low,
    high: row.high,
    counts: (row.counts ?? {}) as ItemCounts,
    fromFloor: row.fromFloor as Floor,
    toFloor: row.toFloor as Floor,
    elevator: row.elevator,
    packing: row.packing,
    clockIn: row.clockIn ? row.clockIn.getTime() : null,
    hours: row.hours,
    photos: row.photos,
    paid: row.paid,
    reviewed: row.reviewed,
    late: row.late,
    cardLast4: row.cardLast4,
    items: row.items.map((i) => ({
      name: i.name,
      handling: i.handling,
      done: i.done,
    })),
    tasks: row.tasks.map((t) => ({
      label: t.label,
      note: t.note,
      done: t.done,
    })),
    messages: row.messages.map((m) => ({
      who: m.who,
      text: m.text,
      mine: m.mine,
      at: m.at.getTime(),
    })),
    createdAt: row.createdAt.getTime(),
  };
}

/**
 * The pipeline stage is spelled "Survey set" in the product and `SurveySet` in
 * the enum, so the two names are mapped explicitly rather than by coincidence.
 */
const STAGE_TO_DB = {
  New: "New",
  "Survey set": "SurveySet",
  Quoted: "Quoted",
  Booked: "Booked",
  Complete: "Complete",
} as const satisfies Record<PipelineStage, string>;

const STAGE_FROM_DB: Record<string, PipelineStage> = {
  New: "New",
  SurveySet: "Survey set",
  Quoted: "Quoted",
  Booked: "Booked",
  Complete: "Complete",
};

/* ═══════════════════════════════════════════════════════════════════════════
   Jobs
   ═══════════════════════════════════════════════════════════════════════════ */

export async function listJobs(): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    include: JOB_INCLUDE,
    orderBy: [{ date: "asc" }, { window: "asc" }],
  });
  return rows.map(toJob);
}

export async function getJob(id: string): Promise<Job | null> {
  const row = await prisma.job.findUnique({
    where: { id },
    include: JOB_INCLUDE,
  });
  return row ? toJob(row) : null;
}

/** Resolve a crew name to its row id, for the `crewId` foreign key. */
async function crewIdFor(name: string | null): Promise<number | null> {
  if (!name) return null;
  const crew = await prisma.crew.findUnique({ where: { name } });
  return crew?.id ?? null;
}

export async function createJob(job: Job): Promise<Job> {
  const row = await prisma.job.create({
    data: {
      id: job.id,
      customer: job.customer,
      phone: job.phone,
      email: job.email,
      size: job.size,
      fromAddress: job.from,
      toAddress: job.to,
      date: job.date,
      window: job.window,
      movers: job.movers,
      crewId: await crewIdFor(job.crew),
      status: job.status,
      stage: STAGE_TO_DB[job.stage],
      low: job.low,
      high: job.high,
      counts: job.counts as Prisma.InputJsonValue,
      fromFloor: job.fromFloor,
      toFloor: job.toFloor,
      elevator: job.elevator,
      packing: job.packing,
      clockIn: job.clockIn ? new Date(job.clockIn) : null,
      hours: job.hours,
      photos: job.photos,
      paid: job.paid,
      reviewed: job.reviewed,
      late: job.late,
      cardLast4: job.cardLast4,
      createdAt: new Date(job.createdAt),
      items: {
        create: job.items.map((item, position) => ({ ...item, position })),
      },
      tasks: {
        create: job.tasks.map((task, position) => ({ ...task, position })),
      },
      messages: {
        create: job.messages.map((m) => ({
          who: m.who,
          text: m.text,
          mine: m.mine,
          at: new Date(m.at),
        })),
      },
    },
    include: JOB_INCLUDE,
  });
  return toJob(row);
}

/**
 * Apply a change to one job.
 *
 * The updater is handed the domain object and returns the next one; this
 * diffs nothing and simply writes what comes back. The whole thing runs in a
 * transaction, because a status change that also rewrites the inventory (a
 * close-out marks every item loaded) must not be observable half-applied.
 *
 * Returns null when the id is unknown.
 */
export async function updateJob(
  id: string,
  updater: (job: Job) => Job,
): Promise<Job | null> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.job.findUnique({
      where: { id },
      include: JOB_INCLUDE,
    });
    if (!current) return null;

    const before = toJob(current);
    const next = updater({ ...before });

    const crewId =
      next.crew === before.crew
        ? current.crewId
        : next.crew
          ? ((await tx.crew.findUnique({ where: { name: next.crew } }))?.id ??
            null)
          : null;

    // Child rows are replaced wholesale rather than diffed. The lists are a
    // dozen rows at most and always rewritten as a unit, so a diff would be
    // more code and more ways to be wrong.
    await tx.inventoryItem.deleteMany({ where: { jobId: id } });
    await tx.customerTask.deleteMany({ where: { jobId: id } });
    await tx.message.deleteMany({ where: { jobId: id } });

    const row = await tx.job.update({
      where: { id },
      data: {
        customer: next.customer,
        phone: next.phone,
        email: next.email,
        size: next.size,
        fromAddress: next.from,
        toAddress: next.to,
        date: next.date,
        window: next.window,
        movers: next.movers,
        crewId,
        status: next.status,
        stage: STAGE_TO_DB[next.stage],
        low: next.low,
        high: next.high,
        counts: next.counts as Prisma.InputJsonValue,
        fromFloor: next.fromFloor,
        toFloor: next.toFloor,
        elevator: next.elevator,
        packing: next.packing,
        clockIn: next.clockIn ? new Date(next.clockIn) : null,
        hours: next.hours,
        photos: next.photos,
        paid: next.paid,
        reviewed: next.reviewed,
        late: next.late,
        cardLast4: next.cardLast4,
        items: {
          create: next.items.map((item: InventoryLine, position: number) => ({
            ...item,
            position,
          })),
        },
        tasks: {
          create: next.tasks.map((task: CustomerTask, position: number) => ({
            ...task,
            position,
          })),
        },
        messages: {
          create: next.messages.map((m: Message) => ({
            who: m.who,
            text: m.text,
            mine: m.mine,
            at: new Date(m.at),
          })),
        },
      },
      include: JOB_INCLUDE,
    });

    return toJob(row);
  });
}

/**
 * Reserve the next `FM-XXXX` reference.
 *
 * An atomic increment, so two bookings racing cannot be handed the same one.
 */
export async function nextReference(): Promise<string> {
  const counter = await prisma.counter.update({
    where: { name: "quote_ref" },
    data: { value: { increment: 1 } },
  });
  // `update` returns the row after the increment, so the value just handed out
  // is the one before it.
  return "FM-" + (counter.value - 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reviews
   ═══════════════════════════════════════════════════════════════════════════ */

export async function listReviews(): Promise<Review[]> {
  const rows = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    who: r.who,
    where: r.place,
    stars: r.stars,
    text: r.text,
    date: r.date,
    crew: r.crew,
  }));
}

/** New reviews appear at the top of the public list. */
export async function addReview(
  review: Review & { jobId?: string },
): Promise<Review> {
  await prisma.review.create({
    data: {
      id: review.id,
      who: review.who,
      place: review.where,
      stars: review.stars,
      text: review.text,
      date: review.date,
      crew: review.crew,
      jobId: review.jobId ?? null,
    },
  });
  return review;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Crews and capacity
   ═══════════════════════════════════════════════════════════════════════════ */

export async function listCrews(): Promise<Crew[]> {
  const rows = await prisma.crew.findMany({ orderBy: { name: "asc" } });
  return rows.map((c) => ({
    name: c.name,
    roster: c.roster,
    size: c.size as CrewSize,
  }));
}

/**
 * Days with no capacity left, as `YYYY-MM-DD`.
 *
 * README.md is explicit that booked-out dates must not be a hard-coded array:
 * a day is closed when every crew is committed. Leads do not consume a crew,
 * so they do not count.
 *
 * Grouped in the database rather than by loading every job — this runs on the
 * home page and on every estimator keystroke.
 */
export async function bookedOutDates(): Promise<string[]> {
  const capacity = await prisma.crew.count();
  if (!capacity) return [];

  const perDay = await prisma.job.groupBy({
    by: ["date"],
    where: { status: { not: "lead" } },
    _count: { _all: true },
    orderBy: { date: "asc" },
  });

  return perDay
    .filter((day) => day._count._all >= capacity)
    .map((day) => day.date);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Quote drafts
   ═══════════════════════════════════════════════════════════════════════════ */

type DraftRow = Prisma.QuoteDraftGetPayload<object>;

function toDraft(row: DraftRow): QuoteDraft {
  return {
    id: row.id,
    ref: row.ref,
    from: row.fromAddress,
    to: row.toAddress,
    fromFloor: row.fromFloor as Floor,
    toFloor: row.toFloor as Floor,
    elevator: row.elevator,
    size: row.size as QuoteDraft["size"],
    date: row.date,
    movers: row.movers as CrewSize,
    packing: row.packing,
    counts: (row.counts ?? {}) as ItemCounts,
    name: row.name,
    email: row.email,
    phone: row.phone,
    step: row.step as QuoteDraft["step"],
    room: row.room,
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function getDraft(id: string): Promise<QuoteDraft | null> {
  const row = await prisma.quoteDraft.findUnique({ where: { id } });
  return row ? toDraft(row) : null;
}

export async function saveDraft(draft: QuoteDraft): Promise<QuoteDraft> {
  const data = {
    ref: draft.ref,
    fromAddress: draft.from,
    toAddress: draft.to,
    fromFloor: draft.fromFloor,
    toFloor: draft.toFloor,
    elevator: draft.elevator,
    size: draft.size,
    date: draft.date,
    movers: draft.movers,
    packing: draft.packing,
    counts: draft.counts as Prisma.InputJsonValue,
    name: draft.name,
    email: draft.email,
    phone: draft.phone,
    step: draft.step,
    room: draft.room,
  };

  const row = await prisma.quoteDraft.upsert({
    where: { id: draft.id },
    create: { id: draft.id, ...data },
    update: data,
  });
  return toDraft(row);
}

export async function deleteDraft(id: string): Promise<void> {
  await prisma.quoteDraft.deleteMany({ where: { id } });
}

/**
 * Drop drafts nobody has touched in a while.
 *
 * Not called from anywhere yet — wire it to a cron once the app is deployed.
 * An abandoned estimate is a row and a reserved reference, and the estimator
 * creates one for every cold visit to `/estimate`.
 */
export async function sweepStaleDrafts(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
  const { count } = await prisma.quoteDraft.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  });
  return count;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Review requests

   The daily cron's two queries. `reviewAskedAt` deliberately stays out of
   the domain `Job` — nothing renders it; it exists so "send once" is a
   database fact rather than a race.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Jobs whose customers should get the morning-after review text: completed
 * before today, never reviewed, never asked.
 */
export async function jobsAwaitingReviewRequest(
  todayISO: string,
): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    where: {
      status: "complete",
      reviewed: false,
      reviewAskedAt: null,
      date: { lt: todayISO },
    },
    include: JOB_INCLUDE,
  });
  return rows.map(toJob);
}

/** Stamp a job as asked, so tomorrow's cron skips it. */
export async function markReviewAsked(id: string): Promise<void> {
  await prisma.job.update({
    where: { id },
    data: { reviewAskedAt: new Date() },
  });
}
