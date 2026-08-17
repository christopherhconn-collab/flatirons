import { describe, expect, it } from "vitest";

import type { Job } from "./jobs";
import { invoiceOf } from "./jobs";
import { checkoutParamsFor, toCents } from "./stripe";

const job = {
  id: "FM-8839",
  customer: "Brenner, D.",
  phone: "303.555.7719",
  email: "d.brenner@example.com",
  size: "1 bed",
  from: "Denver",
  to: "Commerce City",
  date: "2026-08-16",
  window: "7:00–7:30 AM",
  movers: 2,
  crew: "Crew D",
  status: "complete",
  stage: "Complete",
  low: 570,
  high: 720,
  counts: { Dresser: 1 },
  fromFloor: "Ground",
  toFloor: "Ground",
  elevator: false,
  packing: false,
  clockIn: null,
  hours: 4,
  photos: 4,
  paid: false,
  reviewed: false,
  late: null,
  cardLast4: null,
  items: [],
  tasks: [],
  messages: [],
  createdAt: 0,
} as unknown as Job;

describe("toCents", () => {
  it("converts dollars without floating-point drift", () => {
    // 19.99 * 100 is 1998.9999… in IEEE754; a truncation would undercharge.
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(1090)).toBe(109000);
    expect(toCents(0)).toBe(0);
  });
});

describe("checkoutParamsFor", () => {
  const invoice = invoiceOf(job);
  const params = checkoutParamsFor(job, invoice, "https://flatirons.example");

  it("charges exactly the invoice total, in cents", () => {
    expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(
      toCents(invoice.total),
    );
    expect(params.line_items?.[0]?.price_data?.currency).toBe("usd");
  });

  it("carries the job id in metadata — the webhook trusts this, not the URL", () => {
    expect(params.metadata?.jobId).toBe("FM-8839");
  });

  it("returns to the move page, marked pending until the webhook lands", () => {
    expect(params.success_url).toBe(
      "https://flatirons.example/move/FM-8839?paid=pending",
    );
    expect(params.cancel_url).toBe("https://flatirons.example/move/FM-8839");
  });

  it("pre-fills the customer's email for the receipt", () => {
    expect(params.customer_email).toBe("d.brenner@example.com");
  });
});
