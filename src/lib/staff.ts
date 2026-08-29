/**
 * The computed cells of the staff surfaces — everything the dispatch board
 * and the office pipeline derive from the job list. Pure and tested; the
 * pages feed these `listJobs()` and render what comes back.
 */

import type { Crew, Job } from "./jobs";
import { invoiceOf } from "./jobs";

/** Crews that cannot take another job right now — one is on their truck. */
export function busyCrews(jobs: Job[]): ReadonlySet<string> {
  return new Set(
    jobs
      .filter((j) => j.status === "enroute" || j.status === "onsite")
      .map((j) => j.crew)
      .filter((c): c is string => Boolean(c)),
  );
}

/** The dispatch board's four stat cells. */
export function dispatchStats(jobs: Job[], todayISO: string) {
  const today = jobs.filter((j) => j.date === todayISO);
  return {
    unassigned: jobs.filter((j) => j.status === "unassigned").length,
    inProgress: today.filter(
      (j) => j.status === "enroute" || j.status === "onsite",
    ).length,
    hoursBilled: today
      .filter((j) => j.status === "complete")
      .reduce((sum, j) => sum + (j.hours ?? 0), 0),
    late: today.filter((j) => (j.late ?? 0) > 0 && j.status !== "complete")
      .length,
  };
}

/** Revenue recorded today — the rail's "Billed today" figure. */
export function billedToday(jobs: Job[], todayISO: string): number {
  return jobs
    .filter((j) => j.date === todayISO && j.status === "complete")
    .reduce((sum, j) => sum + invoiceOf(j).total, 0);
}

/** The office table's four stat cells, for the month `YYYY-MM`. */
export function officeStats(jobs: Job[], monthPrefix: string) {
  const thisMonth = jobs.filter((j) =>
    new Date(j.createdAt).toISOString().startsWith(monthPrefix),
  );
  const booked = thisMonth.filter((j) => j.stage !== "New");
  const won = thisMonth.filter(
    (j) => j.stage === "Booked" || j.stage === "Complete",
  );
  const values = won.map((j) => (j.low + j.high) / 2).filter((v) => v > 0);
  return {
    leads: thisMonth.length,
    booked: won.length,
    closeRate: booked.length ? Math.round((won.length / booked.length) * 100) : 0,
    averageValue: values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0,
  };
}

export type NextAction =
  | { kind: "call"; job: Job; ageHours: number }
  | { kind: "assign"; job: Job }
  | { kind: "clear" };

/**
 * The office's "Next action" card, with the handoff's three-level fallback:
 * the oldest uncalled `New` lead (with its age — leads called inside four
 * hours book three times more often), else the oldest unassigned job, else a
 * clean board.
 */
export function nextAction(jobs: Job[], now: number = Date.now()): NextAction {
  const oldest = (list: Job[]) =>
    [...list].sort((a, b) => a.createdAt - b.createdAt)[0];

  const newLead = oldest(jobs.filter((j) => j.stage === "New"));
  if (newLead) {
    return {
      kind: "call",
      job: newLead,
      ageHours: Math.max(0, (now - newLead.createdAt) / 3_600_000),
    };
  }

  const unassigned = oldest(jobs.filter((j) => j.status === "unassigned"));
  if (unassigned) return { kind: "assign", job: unassigned };

  return { kind: "clear" };
}

/** One row of the week capacity strip. */
export type CapacityDay = {
  date: string;
  label: string;
  booked: number;
  slots: number;
};

/**
 * Seven days of capacity from `todayISO`, one slot per crew. Counts every job
 * scheduled on the day that occupies a truck — leads don't, completed one-day
 * history does, because the day is spent either way.
 */
export function weekCapacity(
  jobs: Job[],
  crews: Crew[],
  todayISO: string,
): CapacityDay[] {
  const days: CapacityDay[] = [];
  const start = new Date(`${todayISO}T12:00:00Z`);
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + offset);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      label: d.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }),
      booked: jobs.filter((j) => j.date === iso && j.status !== "lead").length,
      slots: crews.length,
    });
  }
  return days;
}

/** The rail's "Assigned today" list — each crew and its current customer. */
export function assignedToday(
  jobs: Job[],
  crews: Crew[],
  todayISO: string,
): { crew: string; customer: string | null; status: Job["status"] | null }[] {
  return crews.map((crew) => {
    const job = jobs.find(
      (j) =>
        j.crew === crew.name && j.date === todayISO && j.status !== "complete",
    );
    return {
      crew: crew.name,
      customer: job?.customer ?? null,
      status: job?.status ?? null,
    };
  });
}
