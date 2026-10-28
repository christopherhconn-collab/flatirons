/**
 * Irrigation — the audit side of the business, and the 4343 Holly case study.
 *
 * The readings below are the real catch-cup volumes from the August 2026
 * field audit at 4343 S Holly St (`field_readings.json` in the
 * holly-irrigation-audit export), copied cup for cup. Every number the page
 * shows — precipitation rate, lower-quarter DU, pass/fail — is computed here
 * from those readings, never pasted from a report: the audit's own rule is
 * "always recalculate from raw readings".
 *
 * The export also carries a rev-F report dataset (A-1…B-5 zones, a 42.5%
 * savings headline). Its catch volumes are modeled placeholders, not field
 * data, so none of it appears here.
 */

export const IRRIGATION_HOST = "irrigation.flatironsmoves.com";
export const IRRIGATION_ORIGIN = `https://${IRRIGATION_HOST}`;

/** Conical catch cup, 4.5" opening. */
export const CUP_DIAMETER_IN = 4.5;
/** Every audited zone ran for ten minutes. */
export const RUNTIME_MIN = 10;
/** The lower-quarter distribution uniformity a zone has to reach to pass. */
export const DU_TARGET = 0.7;

const ML_TO_IN3 = 0.0610237;

export const cupArea = (diameterIn: number) => Math.PI * (diameterIn / 2) ** 2;

/** Inches of water per hour, from the mean catch of a timed run. */
export function precipRate(avgMl: number, areaIn2 = cupArea(CUP_DIAMETER_IN), runtimeMin = RUNTIME_MIN) {
  return ((avgMl * ML_TO_IN3) / areaIn2) * (60 / runtimeMin);
}

/** Lower-quarter DU: the mean of the driest quarter of cups over the mean of all of them. */
export function duLowQuarter(cups: readonly number[]) {
  const sorted = [...cups].sort((a, b) => a - b);
  const lowQuarter = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 4)));
  return mean(lowQuarter) / mean(sorted);
}

export type Verdict = "Pass" | "Marginal fail" | "Fail" | "Severe fail";

export function verdict(du: number): Verdict {
  if (du >= DU_TARGET) return "Pass";
  if (du >= 0.65) return "Marginal fail";
  if (du < 0.45) return "Severe fail";
  return "Fail";
}

const mean = (values: readonly number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

export type Controller = { id: string; location: string; zonesTotal: number; zonesFunctional: number };

export const CONTROLLERS: readonly Controller[] = [
  { id: "CB1", location: "Southwest corner of the property", zonesTotal: 8, zonesFunctional: 4 },
  { id: "CB2", location: "Southeast corner of the house", zonesTotal: 11, zonesFunctional: 10 },
];

export type ZoneTest = {
  controller: string;
  zone: number;
  status: "as-found" | "retrofitted";
  label?: string;
  note?: string;
  /** mL per cup, grouped by the head the cups were set around. */
  heads: readonly (readonly number[])[];
};

export const HOLLY_TESTS: readonly ZoneTest[] = [
  {
    controller: "CB1",
    zone: 1,
    status: "retrofitted",
    note: "Already on Hunter PRS-40 bodies and MP3000 nozzles when tested — no before reading.",
    heads: [
      [40, 40, 35],
      [40, 40, 35],
      [40, 40, 35],
    ],
  },
  {
    controller: "CB1",
    zone: 3,
    status: "as-found",
    heads: [
      [35, 65, 40],
      [45, 55, 40],
      [25, 50, 45],
    ],
  },
  {
    controller: "CB1",
    zone: 4,
    status: "as-found",
    heads: [
      [15, 21, 25, 25],
      [40, 50, 50, 35, 25],
      [10, 25, 25, 20, 20],
      [45, 50, 45],
      [25, 15, 35],
    ],
  },
  {
    controller: "CB2",
    zone: 1,
    status: "as-found",
    heads: [
      [25, 45, 45, 50],
      [35, 50, 35, 50, 35],
      [35, 40, 40, 35],
      [40, 40, 35, 20],
    ],
  },
  {
    controller: "CB2",
    zone: 2,
    status: "as-found",
    label: "Driveway / portico",
    note: "Three head types on one valve: Rain Bird 1800 sprays, a Rain Bird 5000 rotor and an unmarked rotor.",
    heads: [
      [50, 46, 20, 15, 5],
      [5, 5, 3, 10, 27, 3, 3],
      [30, 3, 3, 7, 20],
      [5, 3, 1, 50, 30],
      [15, 7, 5, 3, 7],
    ],
  },
  {
    controller: "CB2",
    zone: 2,
    status: "retrofitted",
    label: "Driveway / portico",
    note: "Hunter PRS-40 bodies (40 PSI, check valve) and MP3000 nozzles; two heads relocated behind the tree off the portico.",
    heads: [
      [15, 15, 20, 50, 25],
      [50, 15, 15, 15, 15],
      [50, 10, 10, 15, 50],
      [50, 25, 15, 15, 15],
      [15, 25, 20, 25, 30],
    ],
  },
  {
    controller: "CB2",
    zone: 3,
    status: "as-found",
    heads: [
      [25, 5, 10, 25, 20, 30],
      [25, 15, 20, 25, 20, 15],
      [25, 35, 40, 40, 60, 55],
    ],
  },
  {
    controller: "CB2",
    zone: 4,
    status: "as-found",
    heads: [
      [15, 21, 25, 25],
      [40, 50, 50, 35, 25],
      [10, 25, 25, 20, 20],
      [45, 50, 45],
    ],
  },
  { controller: "CB2", zone: 5, status: "as-found", heads: [[10, 10, 10, 10, 10, 15, 15, 15, 20]] },
  {
    controller: "CB2",
    zone: 6,
    status: "as-found",
    heads: [
      [7, 10, 15, 20, 15, 15, 7, 5, 5],
      [10, 10, 15, 10, 10, 15, 20, 10, 10],
    ],
  },
];

export type ZoneResult = ZoneTest & {
  cups: readonly number[];
  avgMl: number;
  prInHr: number;
  du: number;
  verdict: Verdict;
};

export function zoneResult(test: ZoneTest): ZoneResult {
  const cups = test.heads.flat();
  const avgMl = mean(cups);
  const du = duLowQuarter(cups);
  return { ...test, cups, avgMl, prInHr: precipRate(avgMl), du, verdict: verdict(du) };
}

export const HOLLY_RESULTS = HOLLY_TESTS.map(zoneResult);

/** Published rates. `data/business.md` in the audit export is the source. */
export const IRRIGATION_RATES = [
  {
    id: "audit",
    kicker: "Phase 1",
    title: "Precipitation-rate audit",
    body: "A walk of the whole system, a catch-cup test on every zone, and a written report that shows where each zone over- and under-waters and why.",
    rows: [
      { label: "Site walk", value: "$350" },
      { label: "Catch-cup DU test", value: "$30 / zone" },
      { label: "Data analysis & report", value: "$400" },
      { label: "Controller reprogramming", value: "$75" },
      { label: "Travel", value: "$0" },
    ],
  },
  {
    id: "diagnostics",
    kicker: "Phase 2",
    title: "Dead-zone diagnostics",
    body: "For zones that won’t come on: continuity on every station, then a ground-fault locator on the wire until the break is found.",
    rows: [
      { label: "Continuity check", value: "$30 / zone" },
      { label: "Wire fault tracing", value: "$175 / hr" },
      { label: "Findings report", value: "$300" },
    ],
  },
  {
    id: "retrofit",
    kicker: "Retrofit",
    title: "Head retrofit",
    body: "Hunter PRS-40 pressure-regulated bodies with MP Rotator nozzles — one body, one nozzle family, every head at 40 PSI.",
    rows: [
      { label: "Existing head swap", value: "$55 / head" },
      { label: "New head install", value: "$110 / head" },
      { label: "Head relocation (retrofit included)", value: "$110 / head" },
    ],
  },
] as const;

/**
 * What the irrigation side sells. Grounded in the work already quoted and
 * invoiced: the Huber audit and retrofit rates above, the backflow and
 * master-valve quote (FS-2026-005), the seasonal visits in the Estate Care
 * build-out, and line and head repairs. A price appears only where one has
 * been set; everything else is quoted on site.
 */
export const IRRIGATION_SERVICES = [
  {
    id: "audit",
    title: "Audits & calibration",
    body: "Catch-cup testing on every zone, precipitation rate and uniformity worked out per head, and a controller schedule set from the numbers instead of a guess.",
    price: "$30 / zone tested",
  },
  {
    id: "retrofit",
    title: "Head retrofits",
    body: "Hunter PRS-40 pressure-regulated bodies with MP Rotator nozzles. One body, one nozzle family, every head at 40 PSI — no fogging, no mismatched throw.",
    price: "$55 / head",
  },
  {
    id: "repair",
    title: "Repairs",
    body: "Broken lines, cracked fittings, buried or tilted heads, and the damage other trades leave behind. Fixed, flushed and run before we leave.",
    price: "Quoted on site",
  },
  {
    id: "diagnostics",
    title: "Dead zones & wiring",
    body: "Zones that won’t come on: continuity on every station, then a ground-fault locator on the field wire until the break is found and repaired.",
    price: "$175 / hr tracing",
  },
  {
    id: "backflow",
    title: "Backflow & master valves",
    body: "Pressure vacuum breaker replacement, copper supply runs, and master valve swaps — wired to your controller and pressure-tested. Certification test available.",
    price: "Itemised quote",
  },
  {
    id: "controller",
    title: "Controllers",
    body: "Reprogramming from measured run times, and controller upgrades sized to the property — residential and commercial, with sensors that actually serve each zone.",
    price: "$75 reprogramming",
  },
  {
    id: "seasonal",
    title: "Start-ups & blowouts",
    body: "Spring start-up, a mid-season check, and a fall blowout that clears every zone before the first hard freeze.",
    price: "Quoted per system",
  },
] as const;

export type Season = "spring" | "summer" | "fall" | "winter";

export const SEASONS: readonly { id: Season; label: string; months: string; work: string; cta: string }[] = [
  {
    id: "spring",
    label: "Spring",
    months: "Mar – May",
    work: "Start-up: charge the system slowly, check the backflow, run every zone and fix what the winter broke.",
    cta: "Book a spring start-up",
  },
  {
    id: "summer",
    label: "Summer",
    months: "Jun – Aug",
    work: "Audit season. Zones are running and the lawn shows the pattern — the right time to measure and retrofit.",
    cta: "Book a summer audit",
  },
  {
    id: "fall",
    label: "Fall",
    months: "Sep – Nov",
    work: "Blowout before the first hard freeze. Backflow and valve work goes first, so new parts winterise with the rest.",
    cta: "Book a fall blowout",
  },
  {
    id: "winter",
    label: "Winter",
    months: "Dec – Feb",
    work: "Plan the spring: retrofit quotes, controller upgrades, and a place on the start-up list before it fills.",
    cta: "Plan next season",
  },
];

/** The Denver irrigation calendar, by month. */
export function seasonOf(date: Date): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export const IRRIGATION_PROCESS = [
  { title: "Call", body: "Tell us what you’re seeing — brown spots, a zone that won’t run, a water bill that jumped." },
  { title: "Walk the system", body: "Controller, backflow, valve boxes and every zone, with the problems marked as we go." },
  { title: "Measure", body: "Catch cups where uniformity is the question; continuity and wire tracing where a zone is dead." },
  { title: "Quote", body: "An itemised quote, valid 30 days. Anything found beyond it is quoted before any work — nothing you haven’t approved." },
  { title: "Fix & re-test", body: "The work, then the same test again, so the result is a number and not a promise." },
] as const;

export const IRRIGATION_FAQ = [
  {
    q: "Why not just run the sprinklers longer?",
    a: "Because a dry spot is usually a uniformity problem. Running longer to rescue the driest quarter of a zone overwaters the rest of it — and on clay soil, a lot of that runs off. Fix the coverage and the run time can come down.",
  },
  {
    q: "What does a DU of 70% mean?",
    a: "Distribution uniformity compares the driest quarter of the catch cups to the zone average. At 70% or better the zone waters evenly enough to schedule properly; below it, the schedule is being set by the dry spots.",
  },
  {
    q: "Why Hunter PRS-40 bodies and MP Rotators?",
    a: "Most poor uniformity we measure is mixed hardware: different body series, different nozzles, heads off level, all on one valve. A pressure-regulated body holds every nozzle at 40 PSI, and MP Rotators put water down slowly enough for compacted Front Range soil to take it.",
  },
  {
    q: "Will you do work I haven’t approved?",
    a: "No. Every job starts from a written, itemised quote. If testing turns up a valve, head or wiring fault outside it, we report it and quote it separately before touching it.",
  },
  {
    q: "Do you subcontract the work?",
    a: "No. The audit, the report and the repairs are done by the same licensed contractor who quotes them.",
  },
  {
    q: "Does a new backflow preventer need testing?",
    a: "Many water providers require a certification test on any new pressure vacuum breaker. We can test it after install, and we schedule backflow work before the fall blowout so the new parts are winterised properly.",
  },
  {
    q: "How is a job billed?",
    a: "Audits by the zone, retrofits by the head, everything else by itemised quote. 50% deposit on acceptance, balance on completion.",
  },
] as const;
