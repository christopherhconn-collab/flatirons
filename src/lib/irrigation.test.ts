import { describe, expect, it } from "vitest";

import { HOLLY_RESULTS, duLowQuarter, seasonOf, verdict } from "./irrigation";

/**
 * The audit's own computed results (`zone_results.csv`, which matches the
 * 2026-08-13 Master Irrigation Audit Report). If a reading is mistyped here,
 * the zone's numbers stop matching the report.
 */
const REPORT = [
  ["CB1", 1, "retrofitted", 9, 0.882, 91.3, "Pass"],
  ["CB1", 3, "as-found", 9, 1.023, 67.5, "Marginal fail"],
  ["CB1", 4, "as-found", 20, 0.692, 53.2, "Fail"],
  ["CB2", 1, "as-found", 17, 0.887, 74.6, "Pass"],
  ["CB2", 2, "as-found", 27, 0.325, 18.9, "Severe fail"],
  ["CB2", 2, "retrofitted", 25, 0.557, 55.1, "Fail"],
  ["CB2", 3, "as-found", 18, 0.627, 41.3, "Severe fail"],
  ["CB2", 4, "as-found", 17, 0.712, 52.5, "Fail"],
  ["CB2", 5, "as-found", 9, 0.294, 78.3, "Pass"],
  ["CB2", 6, "as-found", 18, 0.267, 51.7, "Fail"],
] as const;

describe("4343 Holly results", () => {
  it("recomputes every zone of the audit report from the raw readings", () => {
    expect(HOLLY_RESULTS).toHaveLength(REPORT.length);
    HOLLY_RESULTS.forEach((result, i) => {
      const [controller, zone, status, cups, pr, du, label] = REPORT[i];
      expect([result.controller, result.zone, result.status]).toEqual([controller, zone, status]);
      expect(result.cups).toHaveLength(cups);
      expect(result.prInHr).toBeCloseTo(pr, 3);
      expect(result.du * 100).toBeCloseTo(du, 1);
      expect(result.verdict).toBe(label);
    });
  });
});

describe("duLowQuarter", () => {
  it("is 1 for a perfectly even zone", () => {
    expect(duLowQuarter([20, 20, 20, 20])).toBe(1);
  });

  it("uses at least one cup for the lower quarter", () => {
    expect(duLowQuarter([10, 30, 20])).toBeCloseTo(0.5);
  });
});

describe("verdict", () => {
  it("passes at exactly 70%", () => {
    expect(verdict(0.7)).toBe("Pass");
    expect(verdict(0.69)).toBe("Marginal fail");
    expect(verdict(0.5)).toBe("Fail");
    expect(verdict(0.44)).toBe("Severe fail");
  });
});

describe("seasonOf", () => {
  it("follows the Denver irrigation calendar", () => {
    expect(seasonOf(new Date(2026, 2, 1))).toBe("spring");
    expect(seasonOf(new Date(2026, 5, 15))).toBe("summer");
    expect(seasonOf(new Date(2026, 9, 28))).toBe("fall");
    expect(seasonOf(new Date(2026, 11, 31))).toBe("winter");
    expect(seasonOf(new Date(2027, 1, 28))).toBe("winter");
  });
});
