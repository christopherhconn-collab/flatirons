/**
 * Accuracy harness for the pricing engine.
 *
 * The engine's constants came from the prototype, not from data. This module
 * runs real completed jobs through it, reports how many landed inside the
 * quoted range, and sweeps each tunable to find the single change that would
 * improve accuracy most.
 *
 * The target from the build plan is 85–90% of jobs inside the range. Aiming for
 * 100% is the wrong goal: the range would widen until it stopped being useful
 * to the customer, and the promise on the pricing page is that overage above
 * the top of the range is absorbed — so a range nobody can miss is a range that
 * costs nothing to honour and tells nobody anything.
 *
 * Pure and dependency-free, like the engine. `scripts/tune.ts` does the I/O.
 */

import {
  CATALOG_ITEMS,
  CONFIG,
  DEFAULT_CREW,
  PRESETS,
  catalogItem,
  quote,
  type CrewSize,
  type Floor,
  type HomeSize,
  type ItemCounts,
  type PricingConfig,
} from "./pricing";

/* ═══════════════════════════════════════════════════════════════════════════
   Historical jobs
   ═══════════════════════════════════════════════════════════════════════════ */

export type HistoricalJob = {
  /** Whatever you use to identify the job. Free text; only used in reports. */
  id: string;
  counts: ItemCounts;
  movers: CrewSize;
  /** What the crew actually billed, in hours. Optional. */
  actualHours?: number;
  /** What the customer was actually charged, in dollars. Required. */
  invoice: number;
  fromFloor?: Floor;
  toFloor?: Floor;
  elevator?: boolean;
  packing?: boolean;
};

const HOME_SIZE_ALIASES: Record<string, HomeSize> = {
  studio: "Studio",
  "0": "Studio",
  "1 bed": "1 bed",
  "1bed": "1 bed",
  "1": "1 bed",
  "2 bed": "2 bed",
  "2bed": "2 bed",
  "2": "2 bed",
  "3+ bed": "3+ bed",
  "3+bed": "3+ bed",
  "3 bed": "3+ bed",
  "3": "3+ bed",
  "4": "3+ bed",
};

export type ParseIssue = { row: number; message: string };
export type ParseResult = { jobs: HistoricalJob[]; issues: ParseIssue[] };

/** Split one CSV line, honouring double quotes and doubled-quote escapes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseMoney(raw: string): number {
  return Number(raw.replace(/[$,\s]/g, ""));
}

function truthy(raw: string): boolean {
  return /^(y|yes|true|1)$/i.test(raw.trim());
}

/**
 * Parse an inventory cell of the form `Sofa, 3-seat:1; Medium boxes:20`.
 *
 * Item names contain commas, so the cell must be quoted in the CSV and the
 * pairs separated by semicolons. Unknown names are reported, not dropped
 * silently — a typo that quietly prices as zero units is exactly the failure
 * this harness exists to catch.
 */
export function parseItems(cell: string): {
  counts: ItemCounts;
  unknown: string[];
} {
  const counts: ItemCounts = {};
  const unknown: string[] = [];
  for (const pair of cell.split(";")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const idx = trimmed.lastIndexOf(":");
    if (idx === -1) {
      unknown.push(trimmed);
      continue;
    }
    const name = trimmed.slice(0, idx).trim();
    const qty = Number(trimmed.slice(idx + 1).trim());
    if (!catalogItem(name)) {
      unknown.push(name);
      continue;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      unknown.push(name);
      continue;
    }
    counts[name] = (counts[name] || 0) + qty;
  }
  return { counts, unknown };
}

/**
 * Read a jobs CSV.
 *
 * Recognised columns (header names are lower-cased and stripped of spaces and
 * underscores, so `Actual Hours`, `actual_hours` and `actualhours` are the same
 * column):
 *
 *   id            optional, free text
 *   size          optional, seeds the inventory from that room preset
 *   items         optional, `Name:qty; Name:qty`, merged over the preset
 *   movers        crew size, 2–4; defaults from `size` when absent
 *   actualhours   optional, what the crew billed
 *   invoice       required, what the customer was charged
 *   fromfloor     optional, Ground / 2nd / 3rd / 4th+
 *   tofloor       optional
 *   elevator      optional, y/yes/true/1
 *   packing       optional, y/yes/true/1
 *
 * A row needs an inventory (from `size`, `items`, or both) and an invoice.
 * Anything short of that is reported as an issue and skipped, so a partly
 * broken export still yields a usable score from the rows that are intact.
 */
export function parseJobsCsv(csv: string): ParseResult {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  const jobs: HistoricalJob[] = [];
  const issues: ParseIssue[] = [];
  if (lines.length === 0) return { jobs, issues };

  const header = splitCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[\s_]/g, ""),
  );
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const iId = col("id", "job", "jobid", "ref");
  const iSize = col("size", "homesize");
  const iItems = col("items", "inventory");
  const iMovers = col("movers", "crew", "crewsize");
  const iHours = col("actualhours", "hours", "billedhours");
  const iInvoice = col("invoice", "finalinvoice", "total", "charged");
  const iFrom = col("fromfloor", "pickupfloor");
  const iTo = col("tofloor", "dropofffloor");
  const iElev = col("elevator");
  const iPack = col("packing", "packingcrew");

  if (iInvoice === -1) {
    issues.push({
      row: 1,
      message:
        "No invoice column. Expected one of: invoice, final_invoice, total, charged.",
    });
    return { jobs, issues };
  }

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const at = (i: number) => (i === -1 ? "" : (cells[i] ?? ""));
    const row = r + 1; // 1-based, counting the header

    const id = at(iId) || `row ${row}`;

    let counts: ItemCounts = {};
    let size: HomeSize | undefined;
    const sizeCell = at(iSize).toLowerCase();
    if (sizeCell) {
      size = HOME_SIZE_ALIASES[sizeCell];
      if (!size) {
        issues.push({ row, message: `Unrecognised size "${at(iSize)}".` });
      } else {
        counts = { ...PRESETS[size] };
      }
    }

    const itemsCell = at(iItems);
    if (itemsCell) {
      const { counts: parsed, unknown } = parseItems(itemsCell);
      if (unknown.length) {
        issues.push({
          row,
          message: `Not in the catalogue, ignored: ${unknown.join(", ")}.`,
        });
      }
      counts = { ...counts, ...parsed };
    }

    if (Object.keys(counts).length === 0) {
      issues.push({ row, message: "No inventory — needs a size or items." });
      continue;
    }

    const moversRaw = Number(at(iMovers));
    const movers = (
      moversRaw === 2 || moversRaw === 3 || moversRaw === 4
        ? moversRaw
        : size
          ? DEFAULT_CREW[size]
          : undefined
    ) as CrewSize | undefined;
    if (!movers) {
      issues.push({ row, message: "No usable crew size (expected 2, 3 or 4)." });
      continue;
    }

    const invoice = parseMoney(at(iInvoice));
    if (!Number.isFinite(invoice) || invoice <= 0) {
      issues.push({ row, message: `Unusable invoice "${at(iInvoice)}".` });
      continue;
    }

    const hoursRaw = Number(at(iHours));

    jobs.push({
      id,
      counts,
      movers,
      invoice,
      actualHours:
        Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : undefined,
      fromFloor: (at(iFrom) || undefined) as Floor | undefined,
      toFloor: (at(iTo) || undefined) as Floor | undefined,
      elevator: iElev === -1 ? undefined : truthy(at(iElev)),
      packing: iPack === -1 ? undefined : truthy(at(iPack)),
    });
  }

  return { jobs, issues };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Scoring
   ═══════════════════════════════════════════════════════════════════════════ */

export type JobScore = {
  id: string;
  invoice: number;
  low: number;
  high: number;
  /** Midpoint of the quoted range. */
  mid: number;
  inside: boolean;
  /** Negative when we over-quoted, positive when the job ran over the top. */
  error: number;
  /** `error` as a share of the invoice. */
  errorPct: number;
  quotedHours: number;
  actualHours?: number;
  hoursError?: number;
};

export type Accuracy = {
  n: number;
  inside: number;
  insidePct: number;
  /** Quoted too high — the invoice came in under the bottom of the range. */
  below: number;
  /** Quoted too low — the invoice ran over the top. This is the expensive one. */
  above: number;
  meanError: number;
  medianError: number;
  meanAbsError: number;
  medianAbsError: number;
  /** Mean signed error in hours, where actual hours were supplied. */
  meanHoursError?: number;
  scores: JobScore[];
};

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Price every job against `config` and measure the result. */
export function scoreJobs(
  jobs: HistoricalJob[],
  config: PricingConfig = CONFIG,
): Accuracy {
  const scores: JobScore[] = jobs.map((job) => {
    const q = quote(
      {
        counts: job.counts,
        movers: job.movers,
        fromFloor: job.fromFloor,
        toFloor: job.toFloor,
        elevator: job.elevator,
        packing: job.packing,
      },
      { config },
    );
    const mid = (q.low + q.high) / 2;
    // Distance outside the range: 0 when the invoice landed inside it.
    const error =
      job.invoice > q.high
        ? job.invoice - q.high
        : job.invoice < q.low
          ? job.invoice - q.low
          : 0;
    return {
      id: job.id,
      invoice: job.invoice,
      low: q.low,
      high: q.high,
      mid,
      inside: job.invoice >= q.low && job.invoice <= q.high,
      error,
      errorPct: job.invoice ? error / job.invoice : 0,
      quotedHours: q.hours,
      actualHours: job.actualHours,
      hoursError:
        job.actualHours === undefined ? undefined : q.hours - job.actualHours,
    };
  });

  const errors = scores.map((s) => s.error);
  const absErrors = errors.map(Math.abs);
  const hoursErrors = scores
    .map((s) => s.hoursError)
    .filter((h): h is number => h !== undefined);

  const inside = scores.filter((s) => s.inside).length;

  return {
    n: scores.length,
    inside,
    insidePct: scores.length ? inside / scores.length : 0,
    below: scores.filter((s) => s.invoice < s.low).length,
    above: scores.filter((s) => s.invoice > s.high).length,
    meanError: mean(errors),
    medianError: median(errors),
    meanAbsError: mean(absErrors),
    medianAbsError: median(absErrors),
    meanHoursError: hoursErrors.length ? mean(hoursErrors) : undefined,
    scores,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Throughput implied by recorded hours

   The sweep below optimises the share of jobs landing inside the range, and
   that measure cannot pin throughput down precisely: a job whose true
   throughput is T prices inside the range for every candidate in
   [0.9T, 1.15T], because the range is 0.9×–1.15× of the point estimate. The
   plateau is about 28% wide, so hit-rate alone will happily accept a
   throughput a quarter off.

   Where the crew's real hours were recorded, throughput can be read straight
   off them — units / (movers × hours) — with no plateau at all. When both are
   available, this is the number to trust and the sweep is the sanity check.
   ═══════════════════════════════════════════════════════════════════════════ */

export type ImpliedThroughput = {
  /** Jobs that carried recorded hours and cleared the minimum. */
  n: number;
  median: number;
  mean: number;
  /** Middle 80% of the per-job values, as a sense of spread. */
  p10: number;
  p90: number;
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi
    ? sorted[lo]
    : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Estimate throughput directly from recorded hours.
 *
 * Jobs that hit the three-hour minimum are excluded: their billed hours reflect
 * the floor rather than the work, so including them biases throughput downward.
 * Returns `undefined` when no job qualifies.
 */
export function impliedThroughput(
  jobs: HistoricalJob[],
  config: PricingConfig = CONFIG,
): ImpliedThroughput | undefined {
  const values: number[] = [];
  for (const job of jobs) {
    if (job.actualHours === undefined || job.actualHours <= 0) continue;
    // A job billed at (or under) the minimum tells us nothing about pace.
    if (job.actualHours <= config.minHours) continue;
    let units = 0;
    for (const item of CATALOG_ITEMS) {
      units += item.volumeUnits * (job.counts[item.name] || 0);
    }
    if (units <= 0) continue;
    values.push(units / (job.movers * job.actualHours));
  }
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: values.length,
    median: quantile(sorted, 0.5),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    p10: quantile(sorted, 0.1),
    p90: quantile(sorted, 0.9),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sweeps
   ═══════════════════════════════════════════════════════════════════════════ */

/** A single tunable the harness knows how to vary. */
export type Knob = {
  key: string;
  label: string;
  current: (c: PricingConfig) => number;
  apply: (c: PricingConfig, value: number) => PricingConfig;
  /** Candidate values to try, given the current configuration. */
  candidates: (c: PricingConfig) => number[];
};

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  // Accumulate in integer steps to avoid float drift producing 8.999999998.
  const decimals = Math.max(0, (String(step).split(".")[1] ?? "").length);
  const round = (x: number) => Number(x.toFixed(decimals));
  for (let v = from; v <= to + step / 2; v += step) out.push(round(v));
  return out;
}

export const KNOBS: Knob[] = [
  {
    key: "throughput",
    label: "CONFIG.throughput (volume units per mover per hour)",
    current: (c) => c.throughput,
    apply: (c, v) => ({ ...c, throughput: v }),
    candidates: () => range(5, 15, 0.25),
  },
  {
    key: "range.low",
    label: "CONFIG.range.low (bottom of the quoted range)",
    current: (c) => c.range.low,
    apply: (c, v) => ({ ...c, range: { ...c.range, low: v } }),
    candidates: () => range(0.7, 1, 0.01),
  },
  {
    key: "range.high",
    label: "CONFIG.range.high (top of the quoted range)",
    current: (c) => c.range.high,
    apply: (c, v) => ({ ...c, range: { ...c.range, high: v } }),
    candidates: () => range(1, 1.5, 0.01),
  },
  {
    key: "minHours",
    label: "CONFIG.minHours (published minimum)",
    current: (c) => c.minHours,
    apply: (c, v) => ({ ...c, minHours: v }),
    candidates: () => range(2, 5, 0.25),
  },
  {
    key: "stairsPickup",
    label: "CONFIG.stairsPickup (stair premium at the pickup)",
    current: (c) => c.stairsPickup,
    apply: (c, v) => ({ ...c, stairsPickup: v }),
    candidates: () => range(1, 1.4, 0.01),
  },
  {
    key: "stairsDropoff",
    label: "CONFIG.stairsDropoff (stair premium at the drop-off)",
    current: (c) => c.stairsDropoff,
    apply: (c, v) => ({ ...c, stairsDropoff: v }),
    candidates: () => range(1, 1.4, 0.01),
  },
];

export type SweepPoint = { value: number; insidePct: number; meanAbsError: number };

export type SweepResult = {
  key: string;
  label: string;
  current: number;
  best: number;
  currentInsidePct: number;
  bestInsidePct: number;
  /** Percentage points gained by moving to `best`. */
  gain: number;
  points: SweepPoint[];
};

/**
 * Vary one knob across its candidates, holding everything else at `config`.
 *
 * Ties on inside-percentage break toward the smaller mean absolute error, then
 * toward the value closest to the current one — a change worth making should
 * have to earn its distance from the status quo.
 */
export function sweep(
  jobs: HistoricalJob[],
  knob: Knob,
  config: PricingConfig = CONFIG,
): SweepResult {
  const current = knob.current(config);
  const points: SweepPoint[] = knob.candidates(config).map((value) => {
    const a = scoreJobs(jobs, knob.apply(config, value));
    return { value, insidePct: a.insidePct, meanAbsError: a.meanAbsError };
  });

  const currentInsidePct = scoreJobs(jobs, config).insidePct;

  let best = points[0];
  for (const p of points) {
    if (
      p.insidePct > best.insidePct ||
      (p.insidePct === best.insidePct && p.meanAbsError < best.meanAbsError) ||
      (p.insidePct === best.insidePct &&
        p.meanAbsError === best.meanAbsError &&
        Math.abs(p.value - current) < Math.abs(best.value - current))
    ) {
      best = p;
    }
  }

  return {
    key: knob.key,
    label: knob.label,
    current,
    best: best.value,
    currentInsidePct,
    bestInsidePct: best.insidePct,
    gain: best.insidePct - currentInsidePct,
    points,
  };
}

/**
 * Sweep every knob and rank them by how much each one alone would improve
 * accuracy. The build plan asks for a single value to change; this is how that
 * recommendation is chosen.
 *
 * One caveat the report should always carry: these are one-at-a-time sweeps.
 * They find the best single move from where you stand, not the best pair.
 */
export function recommend(
  jobs: HistoricalJob[],
  config: PricingConfig = CONFIG,
): SweepResult[] {
  return KNOBS.map((k) => sweep(jobs, k, config)).sort(
    (a, b) => b.gain - a.gain || a.key.localeCompare(b.key),
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Synthetic jobs — for testing the harness itself
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build a job whose invoice is exactly what a crew working at `trueThroughput`
 * would have billed. Used by the tests to check that a sweep recovers a
 * throughput the data was generated from.
 */
export function syntheticJob(
  id: string,
  size: HomeSize,
  trueThroughput: number,
  config: PricingConfig = CONFIG,
): HistoricalJob {
  const counts = { ...PRESETS[size] };
  const movers = DEFAULT_CREW[size];
  let units = 0;
  for (const item of CATALOG_ITEMS) {
    units += item.volumeUnits * (counts[item.name] || 0);
  }
  const hours = Math.max(config.minHours, units / (movers * trueThroughput));
  return {
    id,
    counts,
    movers,
    actualHours: hours,
    invoice: Math.round(hours * config.rates[movers]),
  };
}
