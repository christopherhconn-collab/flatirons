import { describe, expect, it } from "vitest";
import { CONFIG, PRESETS, quote, type PricingConfig } from "./pricing";
import {
  KNOBS,
  parseItems,
  parseJobsCsv,
  impliedThroughput,
  recommend,
  scoreJobs,
  splitCsvLine,
  sweep,
  syntheticJob,
  type HistoricalJob,
} from "./tuning";

const cfg = (over: Partial<PricingConfig> = {}): PricingConfig => ({
  ...CONFIG,
  ...over,
});

describe("CSV splitting", () => {
  it("splits plain cells", () => {
    expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quotes — item names contain them", () => {
    expect(splitCsvLine('FM-1,"Sofa, 3-seat:1; Dresser:2",900')).toEqual([
      "FM-1",
      "Sofa, 3-seat:1; Dresser:2",
      "900",
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(splitCsvLine('a,"say ""hi""",b')).toEqual(["a", 'say "hi"', "b"]);
  });

  it("preserves empty trailing cells", () => {
    expect(splitCsvLine("a,,")).toEqual(["a", "", ""]);
  });
});

describe("inventory cells", () => {
  it("parses name:qty pairs separated by semicolons", () => {
    const { counts, unknown } = parseItems("Sofa, 3-seat:1; Medium boxes:20");
    expect(counts).toEqual({ "Sofa, 3-seat": 1, "Medium boxes": 20 });
    expect(unknown).toEqual([]);
  });

  it("splits on the last colon, so names may contain one", () => {
    const { counts } = parseItems("Bed, queen:2");
    expect(counts).toEqual({ "Bed, queen": 2 });
  });

  it("reports unknown items rather than pricing them as zero", () => {
    const { counts, unknown } = parseItems("Hot tub:1; Dresser:1");
    expect(counts).toEqual({ Dresser: 1 });
    expect(unknown).toEqual(["Hot tub"]);
  });

  it("rejects a negative or non-numeric quantity", () => {
    const { unknown } = parseItems("Dresser:-2; Bike:many");
    expect(unknown).toEqual(["Dresser", "Bike"]);
  });

  it("sums a repeated item", () => {
    expect(parseItems("Bike:1; Bike:2").counts).toEqual({ Bike: 3 });
  });
});

describe("parsing a jobs CSV", () => {
  it("seeds the inventory from a size and defaults the crew", () => {
    const { jobs, issues } = parseJobsCsv(
      ["id,size,invoice", "FM-1,2 bed,940"].join("\n"),
    );
    expect(issues).toEqual([]);
    expect(jobs[0].counts).toEqual(PRESETS["2 bed"]);
    expect(jobs[0].movers).toBe(3); // DEFAULT_CREW["2 bed"]
    expect(jobs[0].invoice).toBe(940);
  });

  it("merges an items column over the size preset", () => {
    const { jobs } = parseJobsCsv(
      ["size,items,invoice", 'Studio,"Upright piano:1",900'].join("\n"),
    );
    expect(jobs[0].counts["Upright piano"]).toBe(1);
    expect(jobs[0].counts["Bed, queen"]).toBe(1); // preset survives
  });

  it("accepts header spellings with spaces, underscores and case", () => {
    const { jobs } = parseJobsCsv(
      ["ID,Size,Actual Hours,Final Invoice", "FM-9,1 bed,4.5,700"].join("\n"),
    );
    expect(jobs[0].id).toBe("FM-9");
    expect(jobs[0].actualHours).toBe(4.5);
    expect(jobs[0].invoice).toBe(700);
  });

  it("strips currency formatting from the invoice", () => {
    const { jobs } = parseJobsCsv(
      ["size,invoice", '3+ bed,"$1,540.00"'].join("\n"),
    );
    expect(jobs[0].invoice).toBe(1540);
  });

  it("reads access and packing flags", () => {
    const { jobs } = parseJobsCsv(
      [
        "size,movers,invoice,from_floor,to_floor,elevator,packing",
        "2 bed,3,1000,3rd,Ground,no,yes",
      ].join("\n"),
    );
    expect(jobs[0].fromFloor).toBe("3rd");
    expect(jobs[0].toFloor).toBe("Ground");
    expect(jobs[0].elevator).toBe(false);
    expect(jobs[0].packing).toBe(true);
  });

  it("skips unusable rows but keeps the good ones", () => {
    const { jobs, issues } = parseJobsCsv(
      [
        "id,size,movers,invoice",
        "FM-1,2 bed,3,940",
        "FM-2,,,500", // no inventory
        "FM-3,1 bed,2,notanumber", // bad invoice
        "FM-4,Studio,2,410",
      ].join("\n"),
    );
    expect(jobs.map((j) => j.id)).toEqual(["FM-1", "FM-4"]);
    expect(issues).toHaveLength(2);
    expect(issues[0].row).toBe(3);
  });

  it("fails loudly when there is no invoice column", () => {
    const { jobs, issues } = parseJobsCsv("id,size\nFM-1,2 bed");
    expect(jobs).toEqual([]);
    expect(issues[0].message).toMatch(/invoice/i);
  });

  it("returns nothing for an empty file", () => {
    expect(parseJobsCsv("")).toEqual({ jobs: [], issues: [] });
  });
});

describe("scoring", () => {
  const band = quote({ counts: PRESETS["2 bed"], movers: 3 });
  const mid = (band.low + band.high) / 2;
  const job = (id: string, invoice: number): HistoricalJob => ({
    id,
    counts: PRESETS["2 bed"],
    movers: 3,
    invoice,
  });

  it("counts an invoice inside the range as a hit, with zero error", () => {
    const a = scoreJobs([job("in", mid)]);
    expect(a.inside).toBe(1);
    expect(a.insidePct).toBe(1);
    expect(a.scores[0].error).toBe(0);
  });

  it("measures distance outside the range, not from the midpoint", () => {
    const a = scoreJobs([job("over", band.high + 100)]);
    expect(a.above).toBe(1);
    expect(a.scores[0].error).toBe(100);
  });

  it("signs an over-quote negative and an under-quote positive", () => {
    const a = scoreJobs([job("under", band.low - 50), job("over", band.high + 50)]);
    expect(a.scores[0].error).toBe(-50);
    expect(a.scores[1].error).toBe(50);
    expect(a.below).toBe(1);
    expect(a.above).toBe(1);
    expect(a.meanError).toBe(0); // they cancel — which is why abs error matters too
    expect(a.meanAbsError).toBe(50);
  });

  it("reports hours error only where actual hours were supplied", () => {
    const withHours = scoreJobs([
      { ...job("a", 1000), actualHours: 4 },
      job("b", 1000),
    ]);
    expect(withHours.meanHoursError).toBeCloseTo(band.hours - 4, 6);

    expect(scoreJobs([job("b", 1000)]).meanHoursError).toBeUndefined();
  });

  it("handles an empty job list without dividing by zero", () => {
    const a = scoreJobs([]);
    expect(a.n).toBe(0);
    expect(a.insidePct).toBe(0);
    expect(a.meanError).toBe(0);
  });
});

describe("sweeps", () => {
  /**
   * The load-bearing test: generate jobs from a known throughput, then check
   * the sweep moves toward it.
   *
   * It asserts the plateau, not an exact value. A job whose true throughput is
   * T prices inside the range for every candidate in [0.9T, 1.15T], because the
   * range is 0.9×–1.15× of the point estimate — so hit-rate cannot identify
   * throughput more precisely than that. Asserting `best === TRUE` would be
   * asserting something the measure does not determine.
   */
  it("recovers a throughput within the band hit-rate can identify", () => {
    const TRUE = 7;
    const jobs = (["Studio", "1 bed", "2 bed", "3+ bed"] as const).flatMap(
      (size, i) => {
        const base = syntheticJob(`${size}-a`, size, TRUE);
        // A little spread, so the answer is not trivially exact.
        const spread = i % 2 ? 1.03 : 0.97;
        return [
          base,
          { ...base, id: `${size}-b`, invoice: Math.round(base.invoice * spread) },
        ];
      },
    );

    const result = sweep(jobs, KNOBS.find((k) => k.key === "throughput")!);
    expect(result.best).toBeGreaterThanOrEqual(TRUE * 0.9);
    expect(result.best).toBeLessThanOrEqual(TRUE * 1.15);
    expect(result.bestInsidePct).toBeGreaterThan(result.currentInsidePct);
    // And it moved down from 9, in the direction of the truth.
    expect(result.best).toBeLessThan(CONFIG.throughput);
  });

  it("resolves throughput exactly from recorded hours, where the sweep cannot", () => {
    const TRUE = 7;
    const jobs = (["1 bed", "2 bed", "3+ bed"] as const).map((s) =>
      syntheticJob(s, s, TRUE),
    );
    const implied = impliedThroughput(jobs)!;
    expect(implied.median).toBeCloseTo(TRUE, 6);
    expect(implied.mean).toBeCloseTo(TRUE, 6);
  });

  it("excludes minimum-billed jobs from the implied throughput", () => {
    // A Studio at 2 movers clamps to the three-hour minimum, so its billed
    // hours describe the floor, not the crew's pace.
    const studio = syntheticJob("studio", "Studio", 7);
    expect(studio.actualHours).toBe(CONFIG.minHours);
    expect(impliedThroughput([studio])).toBeUndefined();
  });

  it("returns undefined when no job carries recorded hours", () => {
    const jobs: HistoricalJob[] = [
      { id: "a", counts: PRESETS["2 bed"], movers: 3, invoice: 900 },
    ];
    expect(impliedThroughput(jobs)).toBeUndefined();
  });

  it("leaves a knob alone when the data already fits", () => {
    // Jobs generated at the live throughput: no move should beat standing still.
    const jobs = (["Studio", "1 bed", "2 bed"] as const).map((s) =>
      syntheticJob(s, s, CONFIG.throughput),
    );
    const result = sweep(jobs, KNOBS.find((k) => k.key === "throughput")!);
    expect(result.currentInsidePct).toBe(1);
    expect(result.gain).toBe(0);
    expect(result.best).toBe(CONFIG.throughput);
  });

  it("never reports a negative gain — standing still is always available", () => {
    const jobs = (["Studio", "2 bed"] as const).map((s) =>
      syntheticJob(s, s, 6),
    );
    for (const r of recommend(jobs)) expect(r.gain).toBeGreaterThanOrEqual(0);
  });

  it("ranks the knobs by gain, best first", () => {
    const jobs = (["Studio", "1 bed", "2 bed", "3+ bed"] as const).map((s) =>
      syntheticJob(s, s, 6),
    );
    const gains = recommend(jobs).map((r) => r.gain);
    expect(gains).toEqual([...gains].sort((a, b) => b - a));
  });

  it("sweeps against a supplied config rather than the live one", () => {
    const jobs = (["Studio", "2 bed"] as const).map((s) =>
      syntheticJob(s, s, 12, cfg({ throughput: 12 })),
    );
    const result = sweep(
      jobs,
      KNOBS.find((k) => k.key === "throughput")!,
      cfg({ throughput: 12 }),
    );
    expect(result.current).toBe(12);
  });

  it("produces candidate values free of floating-point drift", () => {
    for (const knob of KNOBS) {
      for (const v of knob.candidates(CONFIG)) {
        expect(v).toBe(Number(v.toFixed(4)));
      }
    }
  });

  it("includes the current value among each knob's candidates", () => {
    // Otherwise "no change" could not win, and the harness would always
    // recommend moving something.
    for (const knob of KNOBS) {
      expect(knob.candidates(CONFIG)).toContain(knob.current(CONFIG));
    }
  });
});

describe("config isolation", () => {
  it("does not mutate the live CONFIG while sweeping", () => {
    const before = JSON.stringify(CONFIG);
    recommend([syntheticJob("s", "2 bed", 6)]);
    expect(JSON.stringify(CONFIG)).toBe(before);
  });

  it("prices identically when handed an explicit copy of CONFIG", () => {
    const counts = PRESETS["3+ bed"];
    const a = quote({ counts, movers: 4 });
    const b = quote({ counts, movers: 4 }, { config: cfg() });
    expect(b).toEqual(a);
  });
});
