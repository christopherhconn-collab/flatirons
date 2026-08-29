import { describe, expect, it } from "vitest";

import type { Job } from "./jobs";
import { bookingConfirmationText, reviewRequestText, toE164 } from "./sms";

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
    expect(text).toContain("7:00–7:30 AM");
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
