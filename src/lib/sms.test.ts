import { describe, expect, it } from "vitest";

import { arrivalWindow } from "./format";
import type { Job } from "./jobs";
import {
  bookingConfirmationText,
  isGsm7,
  reviewRequestText,
  toE164,
} from "./sms";

const job = {
  id: "FM-8839",
  customer: "Brenner, D.",
  phone: "303.555.7719",
  date: "2026-08-16",
  window: "7:00–7:30 AM",
  crew: "Crew D",
} as Job;

describe("toE164", () => {
  it("normalizes the formats a US booking form produces", () => {
    expect(toE164("303.555.7719")).toBe("+13035557719");
    expect(toE164("(303) 555-7719")).toBe("+13035557719");
    expect(toE164("1 303 555 7719")).toBe("+13035557719");
    expect(toE164("+13035557719")).toBe("+13035557719");
  });

  it("returns null rather than guessing a country", () => {
    expect(toE164("555-7719")).toBeNull();
    expect(toE164("")).toBeNull();
    expect(toE164("+12")).toBeNull();
  });
});

describe("message templates", () => {
  it("confirmation carries reference, date, window and the tracking link", () => {
    const text = bookingConfirmationText(job, "https://flatirons.example");
    expect(text).toContain("FM-8839");
    expect(text).toContain("2026-08-16");
    // The window arrives as `7:00–7:30 AM` and goes out with a plain hyphen:
    // `toGsm7` folds it so the message bills at 153 characters per segment
    // rather than 67. The time itself must survive that fold.
    expect(text).toContain("7:00-7:30 AM");
    expect(text).toContain("https://flatirons.example/move/FM-8839");
    // The marketing promise, restated where it calms the most nerves.
    expect(text).toContain("No deposit");
  });

  it("review request carries the portal link and the referral code", () => {
    const text = reviewRequestText(job, "https://flatirons.example");
    expect(text).toContain("https://flatirons.example/move/FM-8839#review");
    expect(text).toContain("FLAT-8839");
    expect(text).toContain("Crew D");
  });

  it("review request survives a crewless job", () => {
    const text = reviewRequestText({ ...job, crew: null } as Job, "https://x.example");
    expect(text).not.toContain("null");
  });
});

describe("SMS compliance and cost", () => {
  /**
   * Both of these are regressions waiting to happen, and neither shows up in
   * production as an error — one arrives as a larger Twilio invoice, the
   * other as messages that silently stop being delivered.
   */
  const job = {
    id: "FM-8848",
    date: "2026-10-04",
    // From the real formatter, not hand-typed: `arrivalWindow` typesets the
    // range with an en dash, and a fixture that quietly used a hyphen would
    // let the GSM-7 assertion below pass on a message that ships as UCS-2.
    window: arrivalWindow(8),
    customer: "O\u2019Doyle, D.",
    crew: "Crew A",
  } as Job;
  const bodies = {
    "booking confirmation": bookingConfirmationText(job, "https://x.example"),
    "review request": reviewRequestText(job, "https://x.example"),
  };

  for (const [name, body] of Object.entries(bodies)) {
    it(`${name} stays in the GSM-7 alphabet`, () => {
      // An em dash, curly quote or ellipsis here forces UCS-2 and cuts the
      // segment size from 153 characters to 67 — roughly doubling the cost of
      // every send. The failure message names the offending character.
      const offenders = [...body].filter((c) => !isGsm7(c));
      expect(
        offenders.map((c) => `${c} (U+${c.codePointAt(0)!.toString(16)})`),
      ).toEqual([]);
      expect(isGsm7(body)).toBe(true);
    });

    it(`${name} tells the recipient how to opt out`, () => {
      // Promised to the carriers in the A2P 10DLC campaign registration, and
      // compared against live traffic. Dropping it risks the campaign.
      expect(body).toContain("Reply STOP to opt out.");
    });
  }

  it("keeps both messages inside two segments", () => {
    // Not a correctness bound, a cost one: every customer gets both, so a
    // third segment is a 50% rise in the per-customer cost of texting.
    for (const body of Object.values(bodies)) {
      expect(body.length).toBeLessThanOrEqual(306);
    }
  });
});
