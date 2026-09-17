import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import {
  CATALOG_ITEMS,
  CONFIG,
  MAX_STATED_HOURS,
  DEFAULT_CREW,
  HOME_SIZES,
  PRESETS,
  catalogItem,
  clampStatedHours,
  inventoryFor,
  invoiceFor,
  quote,
  travelCharge,
  typicalBand,
  typicalBands,
  unitsOf,
  type CrewSize,
  type HomeSize,
  type ItemCounts,
} from "./pricing";

/** Price a preset the way the estimator does, at its default crew size. */
function quotePreset(size: HomeSize, over: ItemCounts = {}) {
  return quote({
    counts: { ...PRESETS[size], ...over },
    movers: DEFAULT_CREW[size],
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Room presets — the published bands

   These are the numbers on the pricing page. If one of them moves, the
   advertised price moved. Each is asserted against the value the ported engine
   produces from the prototype's constants, so a CONFIG change that shifts a
   published band fails loudly rather than quietly.
   ═══════════════════════════════════════════════════════════════════════════ */

describe("typical move bands", () => {
  const expected: Record<HomeSize, { units: number; low: number; high: number }> =
    {
      Studio: { units: 39, low: 400, high: 510 },
      "1 bed": { units: 74, low: 550, high: 700 },
      "2 bed": { units: 124, low: 820, high: 1050 },
      "3+ bed": { units: 225, low: 1400, high: 1790 },
    };

  it.each(HOME_SIZES)("%s prices in its published band", (size) => {
    const band = typicalBand(size);
    expect(unitsOf(PRESETS[size])).toBe(expected[size].units);
    expect(band.low).toBe(expected[size].low);
    expect(band.high).toBe(expected[size].high);
  });

  it("assigns the documented default crew size to each home size", () => {
    expect(typicalBands().map((b) => b.movers)).toEqual([2, 2, 3, 4]);
  });

  it("orders the bands so price rises with home size", () => {
    const lows = typicalBands().map((b) => b.low);
    expect(lows).toEqual([...lows].sort((a, b) => a - b));
  });

  it("keeps every band's low below its high", () => {
    for (const band of typicalBands()) expect(band.low).toBeLessThan(band.high);
  });

  /**
   * Documents a known discrepancy rather than endorsing it. `typicalBand`
   * reproduces the prototype's `bandFor()`, which ignores per-item surcharges,
   * so the advertised 2-bed band sits one TV crate below what the estimator
   * quotes for the identical inventory. See QuoteOptions.includeSurcharges.
   */
  it("publishes bands excluding surcharges, unlike the estimator", () => {
    const published = typicalBand("2 bed");
    const quoted = quotePreset("2 bed");
    expect(quoted.low - published.low).toBe(40);
    expect(quoted.high - published.high).toBe(40);

    const threeBed = quotePreset("3+ bed").low - typicalBand("3+ bed").low;
    expect(threeBed).toBe(80); // two TVs
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   Edge cases
   ═══════════════════════════════════════════════════════════════════════════ */

describe("empty inventory", () => {
  it("prices at zero rather than at the three-hour minimum", () => {
    const q = quote({ counts: {}, movers: 3 });
    expect(q.units).toBe(0);
    expect(q.hours).toBe(0);
    expect(q.low).toBe(0);
    expect(q.high).toBe(0);
    expect(q.itemCount).toBe(0);
  });

  it("treats an all-zero counts map as empty", () => {
    const q = quote({ counts: { "Sofa, 3-seat": 0, Dresser: 0 }, movers: 2 });
    expect(q.units).toBe(0);
    expect(q.low).toBe(0);
  });

  it("stays at zero even with stairs and a packing crew selected", () => {
    const q = quote({
      counts: {},
      movers: 2,
      fromFloor: "4th+",
      toFloor: "3rd",
      packing: true,
    });
    expect(q.low).toBe(0);
    expect(q.high).toBe(0);
    // The packing line is computed off zero hours, so it costs nothing.
    expect(q.extrasTotal).toBe(0);
  });

  it("ignores item names that are not in the catalogue", () => {
    const q = quote({ counts: { "Grand piano": 3, Yacht: 1 }, movers: 2 });
    expect(q.units).toBe(0);
    expect(q.low).toBe(0);
  });
});

describe("three-hour minimum", () => {
  it("clamps a small inventory up to the minimum", () => {
    // One nightstand: 3 units, 3 / (2 × 9) = 0.17 hrs before the clamp.
    const q = quote({ counts: { Nightstand: 1 }, movers: 2 });
    expect(q.units).toBe(3);
    expect(q.hours).toBe(CONFIG.minHours);
    expect(q.low).toBe(400); // round(3 × 0.90 × 149 / 10) × 10
    expect(q.high).toBe(510); // round(3 × 1.15 × 149 / 10) × 10
  });

  it("does not clamp an inventory that already exceeds the minimum", () => {
    // 124 units at 3 movers = 4.59 hrs.
    const q = quotePreset("2 bed");
    expect(q.hours).toBeGreaterThan(CONFIG.minHours);
    expect(q.hours).toBeCloseTo(124 / (3 * CONFIG.throughput), 10);
  });

  it("prices every home size at or above the minimum", () => {
    for (const size of HOME_SIZES) {
      expect(quotePreset(size).hours).toBeGreaterThanOrEqual(CONFIG.minHours);
    }
  });

  it("applies the minimum after the stair premium, not before", () => {
    // 3 units × 1.12 is still far below 3 hours, so the premium is absorbed by
    // the clamp and the customer pays exactly the minimum.
    const flat = quote({ counts: { Nightstand: 1 }, movers: 2 });
    const upstairs = quote({
      counts: { Nightstand: 1 },
      movers: 2,
      fromFloor: "3rd",
    });
    expect(upstairs.hours).toBe(flat.hours);
    expect(upstairs.low).toBe(flat.low);
  });
});

describe("stairs and elevators", () => {
  const counts = PRESETS["2 bed"];
  const base = quote({ counts, movers: 3 });

  it("adds 12% when the pickup is above ground", () => {
    const q = quote({ counts, movers: 3, fromFloor: "2nd" });
    expect(q.hours).toBeCloseTo(base.hours * CONFIG.stairsPickup, 10);
    expect(q.low).toBeGreaterThan(base.low);
  });

  it("adds 8% when the drop-off is above ground", () => {
    const q = quote({ counts, movers: 3, toFloor: "4th+" });
    expect(q.hours).toBeCloseTo(base.hours * CONFIG.stairsDropoff, 10);
  });

  it("compounds both premiums when both ends have stairs", () => {
    const q = quote({ counts, movers: 3, fromFloor: "2nd", toFloor: "3rd" });
    expect(q.hours).toBeCloseTo(
      base.hours * CONFIG.stairsPickup * CONFIG.stairsDropoff,
      10,
    );
  });

  it("cancels both premiums when a service elevator is reserved", () => {
    const q = quote({
      counts,
      movers: 3,
      fromFloor: "4th+",
      toFloor: "4th+",
      elevator: true,
    });
    expect(q.hours).toBeCloseTo(base.hours, 10);
    expect(q.low).toBe(base.low);
    expect(q.high).toBe(base.high);
  });

  it("charges nothing extra when both ends are on the ground", () => {
    const q = quote({ counts, movers: 3, fromFloor: "Ground", toFloor: "Ground" });
    expect(q.low).toBe(base.low);
  });

  it("does not scale the premium with height — 2nd and 4th+ cost the same", () => {
    // Documents the ported behaviour. A height-scaled premium is a plausible
    // tuning change; this test is the tripwire for making it deliberately.
    const second = quote({ counts, movers: 3, fromFloor: "2nd" });
    const fourth = quote({ counts, movers: 3, fromFloor: "4th+" });
    expect(fourth.hours).toBe(second.hours);
  });
});

describe("packing crew", () => {
  it("bills hours × 0.6 at $65/hr when selected", () => {
    const q = quote({ counts: PRESETS["2 bed"], movers: 3, packing: true });
    const expected = Math.round(
      q.hours * CONFIG.packing.hoursFactor * CONFIG.packing.ratePerHour,
    );
    const line = q.extras.find((e) => e.label === "Packing crew");
    expect(line?.amount).toBe(expected);
    expect(expected).toBe(179); // 4.593 × 0.6 × 65
  });

  it("adds a flat amount to both ends of the range", () => {
    const without = quote({ counts: PRESETS["1 bed"], movers: 2 });
    const withPacking = quote({
      counts: PRESETS["1 bed"],
      movers: 2,
      packing: true,
    });
    expect(withPacking.low).toBeGreaterThan(without.low);
    expect(withPacking.high - without.high).toBe(
      withPacking.low - without.low, // same surcharge, same rounding increment
    );
  });

  it("bills the packing crew off post-clamp hours", () => {
    // A tiny inventory clamps to 3 hours, so packing costs 3 × 0.6 × 65 = 117.
    const q = quote({ counts: { Nightstand: 1 }, movers: 2, packing: true });
    expect(q.extras.find((e) => e.label === "Packing crew")?.amount).toBe(117);
  });

  it("prices the packing crew off the stair-inflated hours", () => {
    const flat = quote({ counts: PRESETS["3+ bed"], movers: 4, packing: true });
    const upstairs = quote({
      counts: PRESETS["3+ bed"],
      movers: 4,
      fromFloor: "3rd",
      packing: true,
    });
    const amountOf = (q: typeof flat) =>
      q.extras.find((e) => e.label === "Packing crew")!.amount;
    expect(amountOf(upstairs)).toBeGreaterThan(amountOf(flat));
  });
});

describe("travel", () => {
  const counts = PRESETS["2 bed"];

  it("adds nothing at all when miles are unknown", () => {
    // The prototype omitted travel, and the published bands stay labour-only.
    const q = quote({ counts, movers: 3 });
    expect(q.extras.some((e) => e.label === "Travel")).toBe(false);
  });

  it("charges the flat metro rate inside the metro radius", () => {
    expect(travelCharge(0)).toBe(CONFIG.travel.flat);
    expect(travelCharge(CONFIG.travel.metroMiles)).toBe(CONFIG.travel.flat);
  });

  it("charges per loaded mile beyond the metro radius", () => {
    const beyond = 100;
    expect(travelCharge(CONFIG.travel.metroMiles + beyond)).toBe(
      Math.round(CONFIG.travel.flat + CONFIG.travel.perLoadedMile * beyond),
    );
  });

  it("never charges less than the flat rate", () => {
    for (const m of [0, 1, 10, 25, 26, 500]) {
      expect(travelCharge(m)).toBeGreaterThanOrEqual(CONFIG.travel.flat);
    }
  });

  it("puts travel on the quote as its own line once miles are known", () => {
    const q = quote({ counts, movers: 3, miles: 12 });
    expect(q.extras.find((e) => e.label === "Travel")?.amount).toBe(45);
  });

  it("raises both ends of the range by the travel charge", () => {
    const without = quote({ counts, movers: 3 });
    const withTravel = quote({ counts, movers: 3, miles: 12 });
    expect(withTravel.low).toBeGreaterThan(without.low);
    expect(withTravel.extrasTotal - without.extrasTotal).toBe(45);
  });

  it("charges no travel on an empty inventory", () => {
    const q = quote({ counts: {}, movers: 3, miles: 500 });
    expect(q.extrasTotal).toBe(0);
    expect(q.low).toBe(0);
  });

  it("treats zero miles as known, not missing", () => {
    const q = quote({ counts, movers: 3, miles: 0 });
    expect(q.extras.find((e) => e.label === "Travel")?.amount).toBe(45);
  });
});

describe("item surcharges", () => {
  it("charges $180 per upright piano", () => {
    const q = quote({ counts: { "Upright piano": 1 }, movers: 3 });
    expect(q.extras).toEqual([{ label: "Piano handling × 1", amount: 180 }]);
    expect(q.extrasTotal).toBe(180);
  });

  it("charges $40 per TV crate", () => {
    const q = quote({ counts: { "TV, 55 inch": 1 }, movers: 2 });
    expect(q.extras).toEqual([{ label: "TV crate × 1", amount: 40 }]);
  });

  it("multiplies the surcharge by the quantity", () => {
    const q = quote({ counts: { "TV, 55 inch": 3, "Upright piano": 2 }, movers: 4 });
    expect(q.extrasTotal).toBe(3 * 40 + 2 * 180);
    expect(q.extras.map((e) => e.label)).toEqual([
      "TV crate × 3",
      "Piano handling × 2",
    ]);
  });

  it("adds the surcharge on top of labour, not inside it", () => {
    // A piano is 26 units of work AND $180 of specialty handling.
    const withPiano = quote({
      counts: { ...PRESETS["2 bed"], "Upright piano": 1 },
      movers: 3,
    });
    const withoutPiano = quotePreset("2 bed");
    expect(withPiano.units - withoutPiano.units).toBe(26);
    expect(withPiano.low - withoutPiano.low).toBeGreaterThan(180);
  });

  it("raises no surcharge for items that carry none", () => {
    const q = quote({ counts: { "Sofa, 3-seat": 2, Dresser: 4 }, movers: 3 });
    expect(q.extras).toEqual([]);
    expect(q.extrasTotal).toBe(0);
  });

  it("lists exactly two surchargeable items in the catalogue", () => {
    const surcharged = CATALOG_ITEMS.filter((i) => i.surcharge);
    expect(surcharged.map((i) => i.name)).toEqual([
      "TV, 55 inch",
      "Upright piano",
    ]);
    // Every surcharge carries a label for the price rail.
    for (const item of surcharged) expect(item.surchargeLabel).toBeTruthy();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   Engine invariants
   ═══════════════════════════════════════════════════════════════════════════ */

describe("crew size", () => {
  it("clears the same work in fewer hours with more movers", () => {
    const counts = PRESETS["3+ bed"];
    const two = quote({ counts, movers: 2 });
    const three = quote({ counts, movers: 3 });
    const four = quote({ counts, movers: 4 });
    expect(two.hours).toBeGreaterThan(three.hours);
    expect(three.hours).toBeGreaterThan(four.hours);
  });

  it("prices at the documented rate for each crew size", () => {
    expect(quote({ counts: PRESETS.Studio, movers: 2 }).rate).toBe(149);
    expect(quote({ counts: PRESETS.Studio, movers: 3 }).rate).toBe(199);
    expect(quote({ counts: PRESETS.Studio, movers: 4 }).rate).toBe(249);
  });
});

describe("the quoted range", () => {
  it("rounds both ends to the nearest $10", () => {
    for (const size of HOME_SIZES) {
      const q = quotePreset(size);
      expect(q.low % CONFIG.roundTo).toBe(0);
      expect(q.high % CONFIG.roundTo).toBe(0);
    }
  });

  it("never inverts", () => {
    for (const size of HOME_SIZES) {
      for (const movers of [2, 3, 4] as const) {
        const q = quote({ counts: PRESETS[size], movers });
        expect(q.high).toBeGreaterThanOrEqual(q.low);
      }
    }
  });

  it("brackets the point estimate", () => {
    const q = quotePreset("2 bed");
    const point = q.hours * q.rate + q.extrasTotal;
    expect(q.low).toBeLessThanOrEqual(point);
    expect(q.high).toBeGreaterThanOrEqual(point);
  });

  it("counts items, not volume units", () => {
    const q = quotePreset("Studio");
    expect(q.itemCount).toBe(12); // 1 bed + 1 dresser + 10 boxes
    expect(q.units).toBe(39);
  });
});

describe("catalogue integrity", () => {
  it("gives every item a positive volume and a handling note", () => {
    for (const item of CATALOG_ITEMS) {
      expect(item.volumeUnits).toBeGreaterThan(0);
      expect(item.handling).toBeTruthy();
    }
  });

  it("uses unique item names, since names are the counts-map key", () => {
    const names = CATALOG_ITEMS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("references only real catalogue items from every preset", () => {
    for (const size of HOME_SIZES) {
      for (const name of Object.keys(PRESETS[size])) {
        expect(catalogItem(name), `${size} references "${name}"`).toBeDefined();
      }
    }
  });
});

describe("inventory list", () => {
  it("folds quantities above one into the name, in room order", () => {
    const list = inventoryFor({ "Medium boxes": 10, "Sofa, 3-seat": 1 });
    expect(list).toEqual([
      { name: "Sofa, 3-seat", handling: "Blanket wrap", done: false },
      { name: "Medium boxes ×10", handling: "Standard", done: false },
    ]);
  });

  it("omits zero-count items", () => {
    expect(inventoryFor({ Bike: 0, Grill: 2 })).toHaveLength(1);
  });
});

describe("invoicing", () => {
  it("bills recorded hours at the crew rate plus surcharges and materials", () => {
    const { lines, total } = invoiceFor({
      hours: 4.5,
      movers: 3,
      counts: { "TV, 55 inch": 1, "Upright piano": 1, "Sofa, 3-seat": 2 },
    });
    expect(total).toBe(Math.round(4.5 * 199) + 40 + 180 + CONFIG.materials);
    expect(lines.at(-1)).toEqual({ label: "Materials", amount: 28 });
  });

  it("charges surcharges per unit, matching the quote the customer saw", () => {
    const quoted = quote({ counts: { "TV, 55 inch": 2 }, movers: 2 });
    const billed = invoiceFor({ hours: 3, movers: 2, counts: { "TV, 55 inch": 2 } });
    const tvLine = billed.lines.find((l) => l.label.startsWith("TV crate"));
    expect(tvLine?.amount).toBe(quoted.extrasTotal);
    expect(tvLine?.amount).toBe(80);
  });
});

describe("the published cancellation policy", () => {
  /**
   * Every page that tells a customer what cancelling costs must read the two
   * numbers from `CONFIG.cancellation`, never restate them.
   *
   * This is a regression test for a shipped bug, not a style rule. `/terms`
   * once said a late cancellation was "billed at the minimum" ($447–$747)
   * while the booking email and the portal said $150 — two live,
   * customer-facing documents disagreeing about the same charge by a factor
   * of five, on a PUC-regulated carrier where the published terms bind.
   *
   * Asserting on the source is the only way to catch it: the numbers are
   * interpolated into JSX prose, so a value test would pass on a page that
   * had quietly hard-coded them.
   */
  const SURFACES = [
    "src/app/(site)/terms/page.tsx",
    "src/app/(site)/pricing/page.tsx",
    "src/app/move/[id]/page.tsx",
    "src/lib/email.ts",
    "src/app/dispatch/page.tsx",
  ];

  for (const surface of SURFACES) {
    it(`${surface} states the policy from CONFIG`, () => {
      const source = readFileSync(resolve(import.meta.dirname, "../..", surface), "utf8");
      expect(source).toMatch(/CONFIG\.cancellation|cancellationFor/);
    });
  }

  it("has a fee and a window that are actually usable", () => {
    // A zero or negative fee would make `chargeCardOnFile` refuse, and the
    // dispatch button would offer to charge nothing. A zero window would make
    // every cancellation late.
    expect(CONFIG.cancellation.feeDollars).toBeGreaterThan(0);
    expect(CONFIG.cancellation.windowHours).toBeGreaterThan(0);
    // Whole dollars: `money()` rounds, and a rounded fee on the terms page
    // that differs from the cents actually charged is the same class of bug
    // this block exists to prevent.
    expect(CONFIG.cancellation.feeDollars % 1).toBe(0);
  });
});

describe("labour only", () => {
  const counts = { "Sofa, 3-seat": 1, "Bookcase, tall": 2 };

  it("fixes the crew and the rate whatever movers is asked for", () => {
    // It is one service at one price, not a modifier on the three crew sizes,
    // so a stale `movers: 4` from the estimator must not buy a bigger crew.
    for (const movers of [2, 3, 4] as CrewSize[]) {
      const q = quote({ counts, movers, service: "unloading" });
      expect(q.movers).toBe(CONFIG.laborOnly.movers);
      expect(q.rate).toBe(CONFIG.laborOnly.ratePerHour);
    }
  });

  it("uses the two-hour minimum, not the three-hour one", () => {
    // The shorter minimum is the point of the service: loading a POD is often
    // under three hours, and a three-hour floor prices it out of that job.
    const small = { "Coffee table": 1 };
    expect(quote({ counts: small, movers: 2, service: "unloading" }).hours).toBe(
      CONFIG.laborOnly.minHours,
    );
    expect(quote({ counts: small, movers: 2 }).hours).toBe(CONFIG.minHours);
  });

  it("still applies the stair premiums", () => {
    // Carrying a sofa up two flights is the same work whoever owns the truck.
    //
    // The load has to be big enough to clear the two-hour floor or the
    // premium is invisible: it multiplies the raw hours and the clamp happens
    // after, so a small job is two hours up stairs or not. That is the same
    // order full service uses, and it is why this asserts on a 2-bed rather
    // than on the couple of items the other cases use.
    const big = PRESETS["2 bed"];
    const flat = quote({ counts: big, movers: 2, service: "unloading" });
    const stairs = quote({
      counts: big,
      movers: 2,
      service: "unloading",
      fromFloor: "3rd",
    });
    expect(flat.hours).toBeGreaterThan(CONFIG.laborOnly.minHours);
    expect(stairs.hours).toBeCloseTo(flat.hours * CONFIG.stairsPickup, 5);
  });

  it("charges flat metro travel and never per loaded mile", () => {
    // The customer's vehicle drives the distance; we bill no mileage on it.
    const near = quote({ counts, movers: 2, service: "unloading", miles: 5 });
    const far = quote({ counts, movers: 2, service: "unloading", miles: 200 });
    const travel = (q: ReturnType<typeof quote>) =>
      q.extras.find((e) => e.label === "Travel")?.amount;
    expect(travel(near)).toBe(CONFIG.travel.flat);
    expect(travel(far)).toBe(CONFIG.travel.flat);
    // The full-service quote does scale with distance, which is the contrast.
    expect(travel(quote({ counts, movers: 2, miles: 200 }))).toBeGreaterThan(
      CONFIG.travel.flat,
    );
  });

  it("leaves the full-service quote untouched", () => {
    const before = quote({ counts, movers: 3, miles: 12 });
    expect(before.movers).toBe(3);
    expect(before.rate).toBe(CONFIG.rates[3]);
    expect(before.hours).toBeGreaterThanOrEqual(CONFIG.minHours);
  });
});

describe("clampStatedHours", () => {
  it("bills in quarter hours", () => {
    expect(clampStatedHours(3.1)).toBe(3);
    expect(clampStatedHours(3.2)).toBe(3.25);
    expect(clampStatedHours(3.9)).toBe(4);
  });

  it("clamps typos at both ends rather than rejecting them", () => {
    // A number input a customer types into, and the office after them. `0.5`
    // and `99` are mistakes, not attacks.
    expect(clampStatedHours(0.5)).toBe(CONFIG.laborOnly.minHours);
    expect(clampStatedHours(-4)).toBe(CONFIG.laborOnly.minHours);
    expect(clampStatedHours(99)).toBe(MAX_STATED_HOURS);
  });

  it("treats garbage as the minimum, not the maximum", () => {
    // `Number("")` is NaN and `Number("1e999")` is Infinity — both reachable
    // from a text field. Neither is a number of hours anyone meant, so both
    // land on the cheapest defensible answer rather than on a twelve-hour
    // day nobody asked for.
    expect(clampStatedHours(Number.NaN)).toBe(CONFIG.laborOnly.minHours);
    expect(clampStatedHours(Number.POSITIVE_INFINITY)).toBe(
      CONFIG.laborOnly.minHours,
    );
  });

  it("is the one rule both entry points use", () => {
    // The estimator and the office form both clamp through this function. If
    // one grows its own copy, a customer can be quoted an hour count the
    // other would have refused — same job, two prices.
    const sources = [
      readFileSync("src/lib/estimate.ts", "utf8"),
      readFileSync("src/lib/quotes.ts", "utf8"),
    ];
    for (const source of sources) {
      expect(source).toContain("clampStatedHours");
    }
  });
});
