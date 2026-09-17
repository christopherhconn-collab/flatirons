/**
 * Tests for the booking confirmation.
 *
 * It is the one message that goes to a customer before we hold any of their
 * money, and it is where the cancellation terms are stated — so what it says
 * is a commitment, and the escaping is a security boundary: the customer's
 * own name and addresses are interpolated into HTML.
 */

import { describe, expect, it } from "vitest";

import { bookingConfirmationEmail } from "./email";
import type { Job } from "./jobs";
import { CONFIG } from "./pricing";

const job = {
  id: "FM-8848",
  customer: "Doyle, D.",
  phone: "303.555.0186",
  email: "d@example.com",
  size: "2 bed",
  from: "1420 Tennyson St, Denver",
  to: "Golden, CO",
  date: "2026-08-22",
  window: "8:00–8:30 AM",
  movers: 3,
  low: 860,
  high: 1100,
} as unknown as Job;

const ORIGIN = "https://flatirons.example";

describe("bookingConfirmationEmail", () => {
  const email = bookingConfirmationEmail(job, ORIGIN);

  it("leads with the reference and the date", () => {
    expect(email.subject).toBe("You're booked — FM-8848, 2026-08-22");
  });

  it("links the card page, not a Stripe session", () => {
    // Checkout Sessions expire in 24 hours; a move can be six weeks out.
    expect(email.text).toContain(`${ORIGIN}/move/FM-8848#card`);
    expect(email.html).toContain(`${ORIGIN}/move/FM-8848#card`);
    expect(email.text).not.toContain("checkout.stripe.com");
  });

  it("states the cancellation terms in both bodies", () => {
    for (const body of [email.text, email.html]) {
      expect(body).toContain(`${CONFIG.cancellation.windowHours} hours`);
      expect(body).toContain(`$${CONFIG.cancellation.feeDollars}`);
    }
  });

  it("promises no charge before the move, in both bodies", () => {
    expect(email.text).toContain("after your move");
    expect(email.html).toContain("after your move");
  });

  it("carries the same facts in the plain-text part", () => {
    // The text part is an alternative, not a stub: a client that refuses
    // HTML must still get everything.
    for (const fact of [
      "FM-8848",
      "2026-08-22",
      "8:00–8:30 AM",
      "1420 Tennyson St, Denver",
      "Golden, CO",
      "3 movers",
      "$860–$1,100",
      `${ORIGIN}/move/FM-8848`,
    ]) {
      expect(email.text).toContain(fact);
    }
  });

  it("escapes customer-supplied values in the HTML", () => {
    const hostile = bookingConfirmationEmail(
      { ...job, to: '"><script>alert(1)</script>' } as Job,
      ORIGIN,
    );
    expect(hostile.html).not.toContain("<script>");
    expect(hostile.html).toContain("&lt;script&gt;");
  });
});
