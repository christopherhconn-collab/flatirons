/**
 * Tests for the one place that decides which message a customer gets.
 *
 * The senders are mocked, so these are about routing and reporting rather
 * than about Twilio or Resend: which body goes out for which notice, who is
 * skipped, and what the office is told came back. Sending the wrong one of
 * two plausible messages is the failure that would never look like a bug —
 * the send succeeds, the office sees "emailed", and the customer gets the
 * estimate for a move they have already booked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Job } from "./jobs";
import { channelLabel, channelParam, notify } from "./notify";
import { officeJob, type OfficeRequest } from "./quotes";

vi.mock("./email", async (original) => ({
  ...(await original<typeof import("./email")>()),
  sendEmail: vi.fn(async () => true),
}));
vi.mock("./sms", async (original) => ({
  ...(await original<typeof import("./sms")>()),
  sendSms: vi.fn(async () => true),
}));

const { sendEmail } = await import("./email");
const { sendSms } = await import("./sms");

const CALL: OfficeRequest = {
  customer: "Dana Doyle",
  phone: "303.555.0186",
  email: "dana@example.com",
  size: "2 bed",
  service: "full",
  from: "1420 Tennyson St, Denver",
  to: "Golden, CO 80401",
  date: "2026-10-04",
  movers: 3,
  fromFloor: "Ground",
  toFloor: "Ground",
  elevator: false,
  packing: false,
  hours: null,
  windowHour: 8,
  note: "",
};

const ORIGIN = "https://flatirons.example";
const quoted = officeJob(CALL, "quote", "FM-8848", Date.UTC(2026, 8, 1));
const booked = officeJob(CALL, "book", "FM-8849", Date.UTC(2026, 8, 1));

beforeEach(() => {
  vi.mocked(sendEmail).mockClear().mockResolvedValue(true);
  vi.mocked(sendSms).mockClear().mockResolvedValue(true);
});

describe("notify", () => {
  it("sends the quote for a quote", async () => {
    await notify(quoted, "quote", ORIGIN);

    expect(vi.mocked(sendEmail).mock.calls[0][1].subject).toContain(
      "Your estimate",
    );
    expect(vi.mocked(sendSms).mock.calls[0][1]).toContain("/quote/FM-8848");
  });

  it("sends the confirmation for a booking", async () => {
    await notify(booked, "booking", ORIGIN);

    expect(vi.mocked(sendEmail).mock.calls[0][1].subject).toContain(
      "You're booked",
    );
    expect(vi.mocked(sendSms).mock.calls[0][1]).toContain("/move/FM-8849");
  });

  it("reports both channels when both land", async () => {
    expect(await notify(booked, "booking", ORIGIN)).toEqual(["email", "text"]);
  });

  it("reports only what landed", async () => {
    vi.mocked(sendSms).mockResolvedValue(false);
    expect(await notify(booked, "booking", ORIGIN)).toEqual(["email"]);
  });

  it("reports nothing when nothing landed", async () => {
    // The case the office banner exists for. Silence here is what costs a job.
    vi.mocked(sendEmail).mockResolvedValue(false);
    vi.mocked(sendSms).mockResolvedValue(false);
    expect(await notify(booked, "booking", ORIGIN)).toEqual([]);
  });

  it("skips the text when no mobile was given", async () => {
    // The ordinary case on an office-entered job, not an error: plenty of
    // customers give an email address and a landline.
    const noPhone: Job = { ...booked, phone: "" };
    expect(await notify(noPhone, "booking", ORIGIN)).toEqual(["email"]);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("skips the email when no address was given", async () => {
    const noEmail: Job = { ...booked, email: "" };
    expect(await notify(noEmail, "booking", ORIGIN)).toEqual(["text"]);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("reporting back to the office", () => {
  it("renders what went out", () => {
    expect(channelLabel(["email", "text"])).toBe("emailed and texted");
    expect(channelLabel(["email"])).toBe("emailed");
    expect(channelLabel(["text"])).toBe("texted");
  });

  it("returns null for nothing, so the banner can say so instead", () => {
    expect(channelLabel([])).toBeNull();
  });

  it("round-trips through a query string", () => {
    expect(channelParam(["email", "text"])).toBe("email,text");
    expect(channelParam([])).toBe("");
  });
});
