/**
 * The data store.
 *
 * SERVER ONLY. Never import this from a client component.
 *
 * ─── What this is, and what it is not ──────────────────────────────────────
 *
 * Step 3 of the build plan ("Database and schema") sets up Postgres behind
 * Prisma. That step is not done, and the booking, estimating and tracking
 * surfaces cannot be built without somewhere to put a job. So this module is
 * the seam: a small repository over a JSON file, with the same shape the
 * Prisma client will have — `getJob`, `updateJob`, `createJob`, `listJobs`,
 * `listReviews`, `addReview`.
 *
 * Every caller goes through these functions and none of them knows where the
 * data lives, so step 3 is a rewrite of this file and nothing else.
 *
 * The file lives at `.data/flatirons.json` (gitignored). Writes serialise
 * through a promise chain so two concurrent server actions cannot interleave a
 * read-modify-write. If the filesystem is read-only — a serverless deployment,
 * for instance — the store degrades to memory-only for the life of the
 * process and says so once in the log. That is a development convenience, not
 * a production posture: do not deploy this to more than one instance.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { Crew, Job, Review } from "./jobs";
import { seedData } from "./seed";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "flatirons.json");

type Snapshot = {
  version: 1;
  jobs: Job[];
  reviews: Review[];
  crews: Crew[];
  sequence: number;
  drafts: Record<string, QuoteDraft>;
};

/**
 * An in-progress estimate. Kept server-side and keyed by an opaque id in a
 * cookie so a refresh does not lose the customer's work, and — more
 * importantly — so the price the customer sees is never a number the browser
 * was trusted to compute.
 */
export type QuoteDraft = {
  id: string;
  /** `FM-8848`, reserved when the draft is created and used at booking. */
  ref: string;
  from: string;
  to: string;
  fromFloor: Job["fromFloor"];
  toFloor: Job["toFloor"];
  elevator: boolean;
  size: Exclude<Job["size"], "Office">;
  /** `YYYY-MM-DD`, or empty until the customer picks a day. */
  date: string;
  movers: Job["movers"];
  packing: boolean;
  counts: Job["counts"];
  name: string;
  email: string;
  phone: string;
  cardNumber: string;
  cardExpiry: string;
  step: 1 | 2 | 3 | 4;
  room: string;
  updatedAt: number;
};

/* ═══════════════════════════════════════════════════════════════════════════
   Loading and saving
   ═══════════════════════════════════════════════════════════════════════════ */

let cache: Snapshot | null = null;
let writable = true;
/** Serialises writes; every mutation appends to this chain. */
let queue: Promise<unknown> = Promise.resolve();
let tmpSeq = 0;

function freshSnapshot(): Snapshot {
  const seed = seedData();
  return {
    version: 1,
    jobs: seed.jobs,
    reviews: seed.reviews,
    crews: seed.crews,
    sequence: seed.sequence,
    drafts: {},
  };
}

async function load(): Promise<Snapshot> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Snapshot;
    if (parsed?.version === 1 && Array.isArray(parsed.jobs)) {
      cache = { ...parsed, drafts: parsed.drafts ?? {} };
      return cache;
    }
  } catch {
    // No file yet, or an unreadable one. Either way we seed.
  }
  cache = freshSnapshot();
  await persist(cache);
  return cache;
}

async function persist(snapshot: Snapshot): Promise<void> {
  if (!writable) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Write-then-rename so a crash mid-write cannot leave a half-written file
    // where the next read expects JSON. The temp name carries the pid and a
    // counter because `next build` seeds from several workers at once, and a
    // shared temp path lets one worker rename the file out from under another.
    const tmp = `${DATA_FILE}.${process.pid}.${tmpSeq++}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf8");
    await fs.rename(tmp, DATA_FILE);
  } catch (error) {
    writable = false;
    console.warn(
      "[store] filesystem is not writable; continuing in memory only.",
      error,
    );
  }
}

/** Read-modify-write, serialised. The callback may mutate the snapshot. */
async function mutate<T>(fn: (snapshot: Snapshot) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const snapshot = await load();
    const result = await fn(snapshot);
    await persist(snapshot);
    return result;
  });
  // Keep the chain alive even when a caller's mutation throws.
  queue = run.catch(() => undefined);
  return run;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Jobs
   ═══════════════════════════════════════════════════════════════════════════ */

export async function listJobs(): Promise<Job[]> {
  return (await load()).jobs;
}

export async function getJob(id: string): Promise<Job | null> {
  const jobs = await listJobs();
  return jobs.find((j) => j.id === id) ?? null;
}

export async function createJob(job: Job): Promise<Job> {
  return mutate((snapshot) => {
    snapshot.jobs.push(job);
    return job;
  });
}

/**
 * Apply a change to one job. The updater is handed a copy and must return the
 * next value; returning the same object is fine but the store persists either
 * way. Returns null when the id is unknown.
 */
export async function updateJob(
  id: string,
  updater: (job: Job) => Job,
): Promise<Job | null> {
  return mutate((snapshot) => {
    const index = snapshot.jobs.findIndex((j) => j.id === id);
    if (index === -1) return null;
    const next = updater({ ...snapshot.jobs[index] });
    snapshot.jobs[index] = next;
    return next;
  });
}

/** Reserve the next `FM-XXXX` reference. */
export async function nextReference(): Promise<string> {
  return mutate((snapshot) => "FM-" + snapshot.sequence++);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reviews
   ═══════════════════════════════════════════════════════════════════════════ */

export async function listReviews(): Promise<Review[]> {
  return (await load()).reviews;
}

/** New reviews appear at the top of the public list. */
export async function addReview(review: Review): Promise<Review> {
  return mutate((snapshot) => {
    snapshot.reviews.unshift(review);
    return review;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Crews and capacity
   ═══════════════════════════════════════════════════════════════════════════ */

export async function listCrews(): Promise<Crew[]> {
  return (await load()).crews;
}

/**
 * Days with no capacity left, as `YYYY-MM-DD`.
 *
 * README.md is explicit that booked-out dates must not be a hard-coded array:
 * a day is closed when every crew is committed. Leads do not consume a crew,
 * so they do not count.
 */
export async function bookedOutDates(): Promise<string[]> {
  const snapshot = await load();
  const perDay = new Map<string, number>();
  for (const job of snapshot.jobs) {
    if (job.status === "lead") continue;
    perDay.set(job.date, (perDay.get(job.date) ?? 0) + 1);
  }
  const capacity = snapshot.crews.length;
  return [...perDay.entries()]
    .filter(([, count]) => count >= capacity)
    .map(([date]) => date)
    .sort();
}

/* ═══════════════════════════════════════════════════════════════════════════
   Quote drafts
   ═══════════════════════════════════════════════════════════════════════════ */

export async function getDraft(id: string): Promise<QuoteDraft | null> {
  return (await load()).drafts[id] ?? null;
}

export async function saveDraft(draft: QuoteDraft): Promise<QuoteDraft> {
  return mutate((snapshot) => {
    const next = { ...draft, updatedAt: Date.now() };
    snapshot.drafts[draft.id] = next;
    return next;
  });
}

export async function deleteDraft(id: string): Promise<void> {
  await mutate((snapshot) => {
    delete snapshot.drafts[id];
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Testing
   ═══════════════════════════════════════════════════════════════════════════ */

/** Drop the in-memory cache. Used by tests; harmless in production. */
export function resetCache(): void {
  cache = null;
}
