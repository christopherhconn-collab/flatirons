/**
 * Tests for the job record's two state machines and its money.
 *
 * README.md: "Transitions are triggered from either the crew app's advance
 * button or the dispatch card's action button; both must produce identical
 * results." These functions are that shared implementation, and closing out a
 * job is what turns elapsed time into an invoice — so it is money, and it is
 * tested.
 */

import { describe, expect, it } from "vitest";

import { CONFIG, PRESETS, inventoryFor } from "./pricing";
import {
  type Job,
  advanceStage,
  advanceStatus,
  arrivalInstant,
  assignCrew,
  cancelJob,
  cancellationFor,
  initialsOf,
  invoiceOf,
  loadedPercent,
  referralCode,
  timelineFor,
} from "./jobs";

const NOW = 1_800_000_000_000;

function job(overrides: Partial<Job> = {}): Job {
  const counts = { ...PRESETS["2 bed"] };
  return {
    id: "FM-8848",
    customer: "Doyle, D.",
    phone: "303.555.0186",
    email: "d@example.com",
    size: "2 bed",
    from: "1420 Tennyson St, Denver",
    to: "Golden, CO",
    date: "2026-08-22",
    window: "8:00–8:30 AM",
    movers: 3,
    crew: null,
    status: "unassigned",
    stage: "Booked",
    low: 860,
    high: 1100,
    counts,
    fromFloor: "Ground",
    toFloor: "Ground",
    elevator: false,
    packing: false,
    laborOnly: false,
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
    tasks: [],
    messages: [],
    createdAt: NOW,
    ...overrides,
  };
}

describe("advanceStatus", () => {
  it("walks the documented sequence", () => {
    let j = job({ status: "unassigned", crew: "Crew A" });
    j = advanceStatus(j, NOW);
    expect(j.status).toBe("enroute");
    j = advanceStatus(j, NOW);
    expect(j.status).toBe("onsite");
    j = advanceStatus(j, NOW);
    expect(j.status).toBe("complete");
  });

  it("stamps the clock on arrival", () => {
    const j = advanceStatus(job({ status: "enroute" }), NOW);
    expect(j.status).toBe("onsite");
    expect(j.clockIn).toBe(NOW);
  });

  it("converts elapsed time to billed hours on close-out", () => {
    const onsite = job({ status: "onsite", clockIn: NOW - 4.5 * 3_600_000 });
    const closed = advanceStatus(onsite, NOW);
    expect(closed.hours).toBeCloseTo(4.5, 5);
    expect(closed.clockIn).toBeNull();
  });

  it("never bills less than an hour", () => {
    const onsite = job({ status: "onsite", clockIn: NOW - 10 * 60_000 });
    expect(advanceStatus(onsite, NOW).hours).toBe(1);
  });

  it("marks every item loaded and closes the pipeline stage", () => {
    const onsite = job({ status: "onsite", clockIn: NOW - 3_600_000 });
    const closed = advanceStatus(onsite, NOW);
    expect(closed.items.every((i) => i.done)).toBe(true);
    expect(closed.stage).toBe("Complete");
    expect(loadedPercent(closed)).toBe(100);
  });

  it("is a no-op once complete", () => {
    const done = job({ status: "complete", hours: 4 });
    expect(advanceStatus(done, NOW)).toBe(done);
  });

  it("does not mutate its argument", () => {
    const before = job({ status: "enroute" });
    advanceStatus(before, NOW);
    expect(before.status).toBe("enroute");
    expect(before.clockIn).toBeNull();
  });
});

describe("assignCrew", () => {
  it("schedules an unassigned job", () => {
    const j = assignCrew(job({ status: "unassigned" }), "Crew B");
    expect(j.crew).toBe("Crew B");
    expect(j.status).toBe("scheduled");
  });

  it("leaves a job that is already under way where it is", () => {
    const j = assignCrew(job({ status: "onsite" }), "Crew B");
    expect(j.status).toBe("onsite");
  });
});

describe("advanceStage", () => {
  it("cycles the pipeline and wraps", () => {
    let j = job({ stage: "New", status: "lead" });
    j = advanceStage(j);
    expect(j.stage).toBe("Survey set");
    j = advanceStage(j);
    expect(j.stage).toBe("Quoted");
    j = advanceStage(j);
    expect(j.stage).toBe("Booked");
    j = advanceStage(j);
    expect(j.stage).toBe("Complete");
    j = advanceStage(j);
    expect(j.stage).toBe("New");
  });

  it("puts a lead on the dispatch board when it reaches Booked", () => {
    const j = advanceStage(job({ stage: "Quoted", status: "lead" }));
    expect(j.stage).toBe("Booked");
    expect(j.status).toBe("unassigned");
  });
});

describe("timelineFor", () => {
  it("opens with two stages done and the rest ahead", () => {
    const stages = timelineFor(job({ status: "unassigned" }));
    expect(stages.map((s) => s.done)).toEqual([true, true, false, false, false]);
    expect(stages[0].note).toBe("$860–$1,100 range locked");
    expect(stages[2].note).toBe("Posted 48 hours before");
  });

  it("reports live loading once the crew is on site", () => {
    const j = job({ status: "onsite", crew: "Crew A" });
    j.items = j.items.map((item, i) => ({ ...item, done: i < 3 }));
    const stages = timelineFor(j);
    expect(stages[2].note).toBe("Crew A · truck 26′");
    expect(stages[3].note).toBe(`Loading now — 3 of ${j.items.length} aboard`);
  });

  it("reports billed hours once delivered", () => {
    const stages = timelineFor(job({ status: "complete", hours: 4.25 }));
    expect(stages.every((s) => s.done)).toBe(true);
    expect(stages[4].note).toBe("4.3 hrs billed");
  });
});

describe("invoiceOf", () => {
  it("bills the recorded hours, the surcharges present and materials", () => {
    const j = job({ status: "complete", hours: 4, movers: 3 });
    const invoice = invoiceOf(j);
    // The 2-bed preset carries one TV, so one crate.
    expect(invoice.lines.map((l) => l.label)).toEqual([
      "4.00 hrs × 3 movers @ $199/hr",
      "TV crate",
      "Materials",
    ]);
    expect(invoice.total).toBe(4 * 199 + 40 + CONFIG.materials);
  });

  it("falls back to the bottom of the range before the crew has recorded time", () => {
    const invoice = invoiceOf(job({ hours: null, low: 860, movers: 3 }));
    expect(invoice.hours).toBeCloseTo(860 / 199, 5);
  });
});

describe("small formatters", () => {
  it("builds initials from a filed name", () => {
    expect(initialsOf("Doyle, D.")).toBe("DD");
    expect(initialsOf("Reyes Design")).toBe("RD");
    expect(initialsOf("Cher")).toBe("CH");
  });

  it("derives the referral code from the job reference", () => {
    expect(referralCode(job())).toBe("FLAT-8848");
  });
});

describe("arrivalInstant", () => {
  it("resolves the arrival window in Denver time, not UTC", () => {
    // 8am on Aug 22 in Denver is MDT (UTC-6) — 14:00Z. Read as UTC it would
    // be 08:00Z, which is six hours early and would close the cancellation
    // window while the customer still had notice to give.
    const at = arrivalInstant(job({ date: "2026-08-22", window: "8:00–8:30 AM" }));
    expect(new Date(at).toISOString()).toBe("2026-08-22T14:00:00.000Z");
  });

  it("handles afternoon windows and standard time", () => {
    // 1pm MST (UTC-7) in January.
    const at = arrivalInstant(job({ date: "2027-01-14", window: "1:00–1:30 PM" }));
    expect(new Date(at).toISOString()).toBe("2027-01-14T20:00:00.000Z");
  });

  it("assumes the earliest window when none is set", () => {
    // A lead has "Not set". Assuming 8am makes the free window *longer*, so
    // nobody is charged for a slot that was never promised.
    const at = arrivalInstant(job({ date: "2026-08-22", window: "Not set" }));
    expect(new Date(at).toISOString()).toBe("2026-08-22T14:00:00.000Z");
  });
});

describe("cancellationFor", () => {
  const j = job({ date: "2026-08-22", window: "8:00–8:30 AM" });
  const arrival = arrivalInstant(j);
  const windowMs = CONFIG.cancellation.windowHours * 3_600_000;

  it("is free outside the notice window", () => {
    expect(cancellationFor(j, arrival - windowMs - 60_000)).toEqual({
      late: false,
      feeCents: 0,
    });
  });

  it("charges the flat fee inside it", () => {
    expect(cancellationFor(j, arrival - windowMs + 60_000)).toEqual({
      late: true,
      feeCents: CONFIG.cancellation.feeDollars * 100,
    });
  });

  it("treats the boundary itself as late", () => {
    // Exactly 48 hours out is inside the window. Either choice is defensible;
    // this one is stated so a change to it is deliberate.
    expect(cancellationFor(j, arrival - windowMs).late).toBe(true);
  });
});

describe("cancelJob", () => {
  it("releases the day and records what was charged", () => {
    const j = cancelJob(job({ status: "scheduled", crew: "Crew A" }), NOW, 15000);
    expect(j.status).toBe("cancelled");
    expect(j.crew).toBeNull();
    expect(j.cancelledAt).toBe(NOW);
    expect(j.cancellationFeeCents).toBe(15000);
    expect(j.messages.at(-1)?.text).toContain("$150");
  });

  it("says so plainly when nothing was charged", () => {
    const j = cancelJob(job({ status: "scheduled" }), NOW, 0);
    expect(j.cancellationFeeCents).toBe(0);
    expect(j.messages.at(-1)?.text).toContain("Nothing has been charged");
  });

  it("is a no-op on a completed or already-cancelled job", () => {
    // A double-submitted form must not charge a second fee.
    const done = job({ status: "complete" });
    expect(cancelJob(done, NOW, 15000)).toBe(done);
    const once = cancelJob(job({ status: "scheduled" }), NOW, 15000);
    expect(cancelJob(once, NOW + 1000, 15000)).toBe(once);
  });

  it("cannot be advanced back onto the board", () => {
    const j = cancelJob(job({ status: "scheduled" }), NOW, 0);
    expect(advanceStatus(j, NOW + 1000)).toBe(j);
  });
});
