import { describe, expect, it } from "vitest";

import type { Crew, Job } from "./jobs";
import {
  assignedToday,
  billedToday,
  busyCrews,
  dispatchStats,
  nextAction,
  officeStats,
  weekCapacity,
} from "./staff";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-08-17T18:00:00Z");

function job(overrides: Partial<Job>): Job {
  return {
    id: "FM-0000",
    customer: "Test, T.",
    phone: "303.555.0000",
    email: "t@example.com",
    size: "2 bed",
    from: "Denver",
    to: "Golden",
    date: "2026-08-17",
    window: "8:00–8:30 AM",
    movers: 3,
    crew: null,
    status: "scheduled",
    stage: "Booked",
    low: 1000,
    high: 1200,
    counts: {},
    fromFloor: "Ground",
    toFloor: "Ground",
    elevator: false,
    packing: false,
    clockIn: null,
    hours: null,
    photos: 0,
    paid: false,
    reviewed: false,
    late: null,
    cardLast4: null,
    items: [],
    tasks: [],
    messages: [],
    createdAt: NOW - 24 * HOUR,
    ...overrides,
  } as Job;
}

const CREWS: Crew[] = [
  { name: "Crew A", roster: "x", size: 3 },
  { name: "Crew B", roster: "y", size: 2 },
];

describe("busyCrews", () => {
  it("counts only crews whose truck is out", () => {
    const busy = busyCrews([
      job({ crew: "Crew A", status: "onsite" }),
      job({ crew: "Crew B", status: "scheduled" }),
    ]);
    expect(busy.has("Crew A")).toBe(true);
    expect(busy.has("Crew B")).toBe(false);
  });
});

describe("nextAction", () => {
  it("prefers the oldest New lead, with its age", () => {
    const action = nextAction(
      [
        job({ id: "L2", stage: "New", status: "lead", createdAt: NOW - 2 * HOUR }),
        job({ id: "L1", stage: "New", status: "lead", createdAt: NOW - 6 * HOUR }),
        job({ id: "U1", status: "unassigned" }),
      ],
      NOW,
    );
    expect(action.kind).toBe("call");
    if (action.kind === "call") {
      expect(action.job.id).toBe("L1");
      expect(Math.round(action.ageHours)).toBe(6);
    }
  });

  it("falls back to the oldest unassigned job, then to a clean board", () => {
    const assign = nextAction([job({ id: "U1", status: "unassigned" })], NOW);
    expect(assign.kind).toBe("assign");
    expect(nextAction([job({ status: "complete" })], NOW).kind).toBe("clear");
  });
});

describe("dispatchStats", () => {
  it("scopes in-progress, hours and lateness to the day", () => {
    const stats = dispatchStats(
      [
        job({ status: "unassigned", date: "2026-08-20" }),
        job({ status: "onsite" }),
        job({ status: "complete", hours: 3.5 }),
        job({ status: "enroute", late: 45 }),
        job({ status: "complete", late: 45 }), // finished — no longer "running" late
      ],
      "2026-08-17",
    );
    expect(stats).toEqual({
      unassigned: 1,
      inProgress: 2,
      hoursBilled: 3.5,
      late: 1,
    });
  });
});

describe("officeStats", () => {
  it("computes close rate from decided leads, not raw leads", () => {
    const stats = officeStats(
      [
        job({ stage: "New", status: "lead" }),
        job({ stage: "Quoted", status: "lead" }),
        job({ stage: "Booked" }),
        job({ stage: "Complete", low: 500, high: 700 }),
      ],
      "2026-08",
    );
    expect(stats.leads).toBe(4);
    expect(stats.booked).toBe(2);
    // 2 won of 3 that got past New.
    expect(stats.closeRate).toBe(67);
    expect(stats.averageValue).toBe(850); // mean of 1100 and 600
  });
});

describe("weekCapacity", () => {
  it("gives seven days from today, leads excluded", () => {
    const week = weekCapacity(
      [
        job({ date: "2026-08-17" }),
        job({ date: "2026-08-17", status: "lead", stage: "New" }),
        job({ date: "2026-08-19" }),
      ],
      CREWS,
      "2026-08-17",
    );
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ date: "2026-08-17", booked: 1, slots: 2 });
    expect(week[2]).toMatchObject({ date: "2026-08-19", booked: 1 });
    expect(week[6].date).toBe("2026-08-23");
  });
});

describe("billedToday and assignedToday", () => {
  it("bills only today's completed jobs", () => {
    const total = billedToday(
      [
        job({ status: "complete", hours: 2, movers: 2 }),
        job({ status: "complete", hours: 2, movers: 2, date: "2026-08-10" }),
      ],
      "2026-08-17",
    );
    expect(total).toBeGreaterThan(0);
  });

  it("maps each crew to its live customer, completed jobs released", () => {
    const roster = assignedToday(
      [
        job({ crew: "Crew A", status: "onsite", customer: "Doyle, D." }),
        job({ crew: "Crew B", status: "complete", customer: "Done, D." }),
      ],
      CREWS,
      "2026-08-17",
    );
    expect(roster).toEqual([
      { crew: "Crew A", customer: "Doyle, D.", status: "onsite" },
      { crew: "Crew B", customer: null, status: null },
    ]);
  });
});
