import { afterEach, describe, expect, it } from "vitest";

import type { Job } from "./jobs";
import { invoiceOf } from "./jobs";
import {
  chargeCardOnFile,
  checkoutParamsFor,
  offSessionParamsFor,
  setupParamsFor,
  stripeConfigProblem,
  stripeEnabled,
  toCents,
} from "./stripe";

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

describe("setupParamsFor", () => {
  const params = setupParamsFor(job, "https://flatirons.example");

  it("takes no money", () => {
    expect(params.mode).toBe("setup");
    // The whole point: a link that can be emailed at booking because opening
    // it cannot charge anybody.
    expect(params).not.toHaveProperty("line_items");
    expect(params).not.toHaveProperty("amount");
  });

  it("carries the job id where the webhook reads it", () => {
    expect(params.metadata?.jobId).toBe("FM-8839");
    expect(params.setup_intent_data?.metadata?.jobId).toBe("FM-8839");
  });

  it("returns to the portal marked pending, not saved", () => {
    // Same contract as payment: the browser says "pending", the webhook says
    // "saved".
    expect(params.success_url).toBe(
      "https://flatirons.example/move/FM-8839?card=pending",
    );
    expect(params.cancel_url).toBe("https://flatirons.example/move/FM-8839");
  });
});

describe("offSessionParamsFor", () => {
  const withCard = {
    ...job,
    stripeCustomerId: "cus_123",
    stripePaymentMethodId: "pm_456",
  } as Job;

  it("charges the saved card without the customer present", () => {
    const params = offSessionParamsFor(withCard, 109000, "Final invoice");
    expect(params.customer).toBe("cus_123");
    expect(params.payment_method).toBe("pm_456");
    expect(params.off_session).toBe(true);
    expect(params.confirm).toBe(true);
    expect(params.amount).toBe(109000);
    expect(params.metadata?.jobId).toBe("FM-8839");
  });
});

describe("chargeCardOnFile", () => {
  it("refuses a job with no card rather than calling Stripe", async () => {
    // No key is set in tests, so reaching the SDK would throw — returning
    // `no_card` is what proves the guard runs first.
    const result = await chargeCardOnFile(job, 109000, "Final invoice");
    expect(result).toEqual({
      ok: false,
      reason: "no_card",
      message: "No card on file.",
    });
  });

  it("refuses a zero or negative amount", async () => {
    const withCard = {
      ...job,
      stripeCustomerId: "cus_123",
      stripePaymentMethodId: "pm_456",
    } as Job;
    expect((await chargeCardOnFile(withCard, 0, "x")).ok).toBe(false);
    expect((await chargeCardOnFile(withCard, -100, "x")).ok).toBe(false);
  });
});

describe("the key gate", () => {
  const original = process.env.STRIPE_SECRET_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = original;
  });

  it("accepts a secret key", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    expect(stripeEnabled()).toBe(true);
    expect(stripeConfigProblem()).toBeNull();
  });

  it("accepts a restricted key", () => {
    // Narrower than a secret key and perfectly usable server-side; an office
    // that scopes its key down must not find the feature switched off.
    process.env.STRIPE_SECRET_KEY = "rk_live_abc123";
    expect(stripeEnabled()).toBe(true);
    expect(stripeConfigProblem()).toBeNull();
  });

  it("refuses a publishable key", () => {
    // This happened in production. The two keys sit side by side in Stripe's
    // dashboard and the publishable one is the one that is safe to copy, so
    // it is the one that gets copied. Stripe answers `secret_key_required`,
    // which the customer sees as a 500 on "Add a card".
    //
    // Reading it as "not configured" is the point: the portal then renders no
    // card section at all, rather than a button that cannot work.
    process.env.STRIPE_SECRET_KEY = "pk_live_abc123";
    expect(stripeEnabled()).toBe(false);
    expect(stripeConfigProblem()).toContain("publishable");
  });

  it("says which of the two problems it is", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripeEnabled()).toBe(false);
    expect(stripeConfigProblem()).toContain("not set");
  });

  it("tolerates the newline a dashboard paste leaves behind", () => {
    process.env.STRIPE_SECRET_KEY = "  sk_test_abc123\n";
    expect(stripeEnabled()).toBe(true);
  });
});
