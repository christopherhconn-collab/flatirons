/**
 * The SMS consent disclosure is registered wording.
 *
 * An A2P 10DLC campaign is approved against what the opt-in page says and
 * what the form shows. If those two drift apart, the campaign is registered
 * on a promise the site no longer makes — and the failure mode is not an
 * error but messages silently ceasing to be delivered.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { SMS_CONSENT } from "./site";

const read = (path: string) =>
  readFileSync(resolve(import.meta.dirname, "../..", path), "utf8");

describe("SMS_CONSENT", () => {
  it("says the four things a carrier checks for", () => {
    // Message content and frequency, that rates apply, and how to stop.
    expect(SMS_CONSENT).toMatch(/booking confirmation/i);
    expect(SMS_CONSENT).toMatch(/two messages/i);
    expect(SMS_CONSENT).toMatch(/no marketing/i);
    expect(SMS_CONSENT).toMatch(/rates may apply/i);
    expect(SMS_CONSENT).toMatch(/Reply STOP to opt out/);
  });

  for (const surface of [
    "src/app/estimate/estimator.tsx",
    "src/app/(site)/sms-opt-in/page.tsx",
  ]) {
    it(`${surface} renders the constant rather than its own copy`, () => {
      expect(read(surface)).toContain("SMS_CONSENT");
    });
  }

  it("the opt-in proof page shows real message bodies, not prose", () => {
    // A sample typed by hand is a sample that stops matching what we send.
    const page = read("src/app/(site)/sms-opt-in/page.tsx");
    expect(page).toContain("bookingConfirmationText");
    expect(page).toContain("reviewRequestText");
  });
});
