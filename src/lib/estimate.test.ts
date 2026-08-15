/**
 * Tests for the estimator's server-side view model.
 *
 * The handoff's advice is "test the money; don't test the markup", so this
 * covers exactly the parts that decide a price or gate a booking: the patch
 * validator (which is the trust boundary — these fields arrive over a POST
 * anyone can craft), the date arithmetic behind the calendar, and the rule
 * that stops an unbookable draft.
 */

import { describe, expect, it } from "vitest";

import {
  applyPatch,
  buildView,
  emptyDraft,
  firstOpenDate,
  LEAD_DAYS,
} from "./estimate";
import { CONFIG, PRESETS, quote } from "./pricing";

const TODAY = "2026-08-15";

function draft() {
  return emptyDraft("draft-1", "FM-8848");
}

function view(d = draft(), bookedOut: string[] = []) {
  return buildView(d, { bookedOut, today: TODAY });
}

describe("applyPatch", () => {
  it("keeps well-formed changes", () => {
    const next = applyPatch(draft(), {
      from: "1420 Tennyson St",
      fromFloor: "3rd",
      elevator: true,
      movers: 4,
      step: 3,
      room: "Kitchen",
    });
    expect(next.from).toBe("1420 Tennyson St");
    expect(next.fromFloor).toBe("3rd");
    expect(next.elevator).toBe(true);
    expect(next.movers).toBe(4);
    expect(next.step).toBe(3);
    expect(next.room).toBe("Kitchen");
  });

  it("drops values that are not in the domain", () => {
    const before = draft();
    const next = applyPatch(before, {
      fromFloor: "basement",
      toFloor: "",
      size: "5 bed",
      movers: 7,
      room: "Attic",
      step: 99,
      date: "next tuesday",
    });
    expect(next.fromFloor).toBe(before.fromFloor);
    expect(next.toFloor).toBe(before.toFloor);
    expect(next.size).toBe(before.size);
    expect(next.movers).toBe(before.movers);
    expect(next.room).toBe(before.room);
    expect(next.step).toBe(before.step);
    expect(next.date).toBe(before.date);
  });

  it("ignores an item that is not in the catalogue", () => {
    const next = applyPatch(draft(), { bump: { name: "Hot tub", delta: 3 } });
    expect(next.counts["Hot tub"]).toBeUndefined();
    expect(next.counts).toEqual(PRESETS["2 bed"]);
  });

  it("never lets a count go below zero, and clears the key at zero", () => {
    let next = applyPatch(draft(), { bump: { name: "Armchair", delta: -5 } });
    expect(next.counts.Armchair).toBeUndefined();

    next = applyPatch(next, { bump: { name: "Armchair", delta: 2 } });
    expect(next.counts.Armchair).toBe(2);

    next = applyPatch(next, { bump: { name: "Armchair", delta: -2 } });
    expect(next.counts.Armchair).toBeUndefined();
  });

  it("truncates fractional bumps rather than storing a fraction of a sofa", () => {
    const next = applyPatch(draft(), { bump: { name: "Armchair", delta: 1.9 } });
    expect(next.counts.Armchair).toBe(1);
  });

  it("replaces the inventory and the crew when the home size changes", () => {
    const next = applyPatch(draft(), { size: "Studio" });
    expect(next.counts).toEqual(PRESETS.Studio);
    expect(next.movers).toBe(2);
  });

  it("honours an explicit crew size sent alongside a home size", () => {
    const next = applyPatch(draft(), { size: "Studio", movers: 4 });
    expect(next.counts).toEqual(PRESETS.Studio);
    expect(next.movers).toBe(4);
  });

  it("caps free text so a POST cannot stuff the store", () => {
    const next = applyPatch(draft(), { from: "x".repeat(5000) });
    expect(next.from).toHaveLength(200);
  });

  it("strips everything but digits and spaces from a card number", () => {
    const next = applyPatch(draft(), { cardNumber: "4242-abc 4242" });
    expect(next.cardNumber).toBe("4242 4242");
  });
});

describe("firstOpenDate", () => {
  it("offers the first day a full lead time out", () => {
    expect(firstOpenDate(TODAY, [])).toBe("2026-08-22");
    expect(LEAD_DAYS).toBe(7);
  });

  it("skips days with no crew left", () => {
    expect(firstOpenDate(TODAY, ["2026-08-22", "2026-08-23"])).toBe(
      "2026-08-24",
    );
  });

  it("crosses a month boundary", () => {
    // 22–31 August full, and 1 September too.
    const booked = Array.from({ length: 10 }, (_, i) => `2026-08-${22 + i}`);
    booked.push("2026-09-01");
    expect(firstOpenDate(TODAY, booked)).toBe("2026-09-02");
  });
});

describe("buildView", () => {
  it("prices through the engine, not through anything the browser sent", () => {
    const v = view();
    const priced = quote({ counts: PRESETS["2 bed"], movers: 3 });
    // The published 2-bed band is $820–$1,050; the preset's TV adds a $40
    // crate at both ends, which the estimator includes and the band does not.
    expect(v.priceRange).toBe("$860–$1,090");
    expect(v.priceRange).toContain(priced.low.toLocaleString("en-US"));
    expect(v.priceBasis).toBe("Based on 4.6 hrs, 3 movers, one truck.");
  });

  it("shows the empty state rather than a three-hour minimum for no items", () => {
    const empty = applyPatch(draft(), {});
    empty.counts = {};
    const v = buildView(empty, { bookedOut: [], today: TODAY });
    expect(v.hasItems).toBe(false);
    expect(v.priceRange).toBe("Add items");
    expect(v.inventorySummary).toBe("Nothing counted yet.");
  });

  it("quotes each crew option through the same engine as the rail", () => {
    const stairs = applyPatch(draft(), { fromFloor: "3rd" });
    const v = buildView(stairs, { bookedOut: [], today: TODAY });
    const three = v.moverOptions.find((o) => o.movers === 3)!;
    const priced = quote({
      counts: PRESETS["2 bed"],
      movers: 3,
      fromFloor: "3rd",
    });
    // The stair premium is in both, so the card and the rail agree.
    expect(three.estimate).toBe(`≈ ${priced.hours.toFixed(1)} hrs`);
    expect(v.priceBasis).toContain(priced.hours.toFixed(1));
  });

  it("marks past, booked and selected days in the calendar", () => {
    const v = view(draft(), ["2026-08-25"]);
    const cell = (date: string) =>
      v.calendar.cells.find((c) => c.date === date)!;

    expect(cell("2026-08-14").state).toBe("past");
    expect(cell("2026-08-25").state).toBe("booked");
    expect(cell("2026-08-22").state).toBe("selected"); // the default target
    expect(cell("2026-08-26").state).toBe("open");
  });

  it("pads the calendar so the 1st lands on its weekday", () => {
    const v = view();
    // 1 August 2026 is a Saturday, so six blanks precede it.
    expect(v.calendar.cells.filter((c) => c.state === "blank")).toHaveLength(6);
    expect(v.calendar.cells[6].label).toBe("1");
    expect(v.calendar.title).toBe("August 2026");
  });

  it("will not page back before the current month", () => {
    expect(view().calendar.canGoBack).toBe(false);
    expect(
      buildView(draft(), {
        bookedOut: [],
        today: TODAY,
        month: { year: 2026, month: 9 },
      }).calendar.canGoBack,
    ).toBe(true);
  });
});

describe("the travel exclusion", () => {
  // The engine prices labour plus item surcharges; travel is billed on top and
  // cannot be quoted until step 6 resolves real mileage. Every place the range
  // is shown has to say so, or the customer commits to a number that is not
  // the bill.
  it("names travel in the rail, quoting the published rates", () => {
    const v = view();
    expect(v.travelNote).toBe(
      `Crew and truck only. Travel is added on the day — $${CONFIG.travel.flat} metro, or $${CONFIG.travel.perLoadedMile}/loaded mile.`,
    );
  });

  it("lists travel among the rail's line items", () => {
    const line = view().priceLines.find((l) => l.label === "Travel");
    expect(line).toBeDefined();
    expect(line!.value).toBe("Added on the day");
  });

  it("names travel on the confirm table, between the estimate and the total due", () => {
    const labels = view().confirmRows.map((r) => r.label);
    expect(labels).toEqual([
      "Move date",
      "Route",
      "Access",
      "Crew",
      "Inventory",
      "Estimate",
      "Travel",
      "Due today",
    ]);
    const travel = view().confirmRows.find((r) => r.label === "Travel")!;
    expect(travel.value).toContain(`$${CONFIG.travel.flat}`);
    expect(travel.value).toContain(`$${CONFIG.travel.perLoadedMile}`);
  });

  it("says it even when there is nothing to price yet", () => {
    const empty = draft();
    empty.counts = {};
    const v = buildView(empty, { bookedOut: [], today: TODAY });
    expect(v.travelNote).toContain("Travel is added");
  });

  it("still leaves travel out of the range the estimator shows", () => {
    // `quote()` can price travel, but only when it is handed `miles`. The
    // estimator has no mileage source until Distance Matrix lands at step 6,
    // so it never supplies one and the range stays labour-only — which is what
    // makes the disclosure true.
    const withoutMiles = quote({ counts: PRESETS["2 bed"], movers: 3 });
    expect(withoutMiles.extras.some((e) => e.label === "Travel")).toBe(false);

    // The tripwire: once miles start flowing, travel lands in the range and
    // this fails, forcing the copy out rather than leaving it quietly false.
    const withMiles = quote({ counts: PRESETS["2 bed"], movers: 3, miles: 40 });
    expect(withMiles.extras.some((e) => e.label === "Travel")).toBe(true);
    expect(withMiles.low).toBeGreaterThan(withoutMiles.low);
  });

  it("does not hand the engine any mileage", () => {
    // The guarantee above only holds while nothing in the estimator's path
    // supplies `miles`. If that changes, the disclosure has to change with it.
    const v = view();
    expect(v.priceLines.find((l) => l.label === "Travel")!.value).toBe(
      "Added on the day",
    );
    expect(v.priceLines.filter((l) => /travel/i.test(l.label))).toHaveLength(1);
  });
});

describe("the booking gate", () => {
  it("refuses an empty inventory", () => {
    const empty = draft();
    empty.counts = {};
    expect(buildView(empty, { bookedOut: [], today: TODAY }).blockedReason).toBe(
      "Add a few items first — step 2.",
    );
  });

  it("asks for each contact field in turn", () => {
    let d = draft();
    expect(view(d).blockedReason).toMatch(/name/);
    d = applyPatch(d, { name: "Doyle, D." });
    expect(view(d).blockedReason).toMatch(/mobile/i);
    d = applyPatch(d, { phone: "303.555.0186" });
    expect(view(d).blockedReason).toMatch(/email/);
    d = applyPatch(d, { email: "d@example.com" });
    expect(view(d).blockedReason).toBeNull();
  });

  it("refuses a day that filled up while the customer was deciding", () => {
    let d = applyPatch(draft(), {
      name: "Doyle, D.",
      phone: "303.555.0186",
      email: "d@example.com",
    });
    d = applyPatch(d, { date: "2026-08-22" });
    expect(view(d, ["2026-08-22"]).blockedReason).toMatch(/filled up/);
  });
});
