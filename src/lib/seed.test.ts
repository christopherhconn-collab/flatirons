/**
 * The seed is demo data that runs against production.
 *
 * `db:seed` is part of nothing automatic, but the rows it writes are the rows
 * the live app reads, and the daily review-request cron does not know or care
 * that a job was seeded. The morning Twilio was configured, that cron texted a
 * seeded customer at a 555 number outside the reserved block — a number that
 * may belong to someone.
 *
 * So the constraint is not "looks fake", it is "cannot ring".
 */

import { describe, expect, it } from "vitest";

import { SPECS } from "./seed";

/** 555-0100 through 555-0199: the only NANP range held back for fiction. */
const RESERVED = /^\d{3}\.555\.01\d{2}$/;

describe("seeded phone numbers", () => {
  it("are all inside the reserved fictional range", () => {
    const outside = SPECS.map((spec) => spec.phone).filter(
      (phone) => !RESERVED.test(phone),
    );
    expect(outside).toEqual([]);
  });

  it("are distinct, so one opt-out cannot silence several", () => {
    const phones = SPECS.map((spec) => spec.phone);
    expect(new Set(phones).size).toBe(phones.length);
  });
});
