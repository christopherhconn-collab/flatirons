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
