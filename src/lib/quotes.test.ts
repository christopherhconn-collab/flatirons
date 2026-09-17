import { describe, expect, it } from "vitest";

import { arrivalWindow } from "./format";
import { type Job, priceRange } from "./jobs";
import {
  CONFIG,
  MAX_STATED_HOURS,
  PRESETS,
  clampStatedHours,
  quote,
} from "./pricing";
import {
  DEFAULT_WINDOW_HOUR,
  type OfficeRequest,
  WINDOW_HOURS,
  acceptQuote,
  isOpenQuote,
  officeJob,
  quoteFacts,
  resendableNotice,
  windowHour,
} from "./quotes";

const CALL: OfficeRequest = {
  customer: "  Dana Doyle  ",
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
  windowHour: 9,
  note: "",
};

const NOW = Date.UTC(2026, 8, 17, 18, 0, 0);

function call(over: Partial<OfficeRequest> = {}): OfficeRequest {
  return { ...CALL, ...over };
}

describe("officeJob — the two endings", () => {
  it("a quote holds nothing", () => {
    const job = officeJob(call(), "quote", "FM-1", NOW);

    expect(job.status).toBe("lead");
    expect(job.stage).toBe("Quoted");
    // The whole point: a day that is not reserved has no arrival time to
    // promise, and no checklist, because every deadline on it is relative to
    // a day nobody has agreed to.
    expect(job.window).toBe("Not set");
    expect(job.tasks).toEqual([]);
    expect(isOpenQuote(job)).toBe(true);
  });

  it("a booking is indistinguishable from a self-service one", () => {
    const job = officeJob(call(), "book", "FM-2", NOW);

    expect(job.status).toBe("unassigned");
    expect(job.stage).toBe("Booked");
    expect(job.window).toBe(arrivalWindow(9));
    expect(job.tasks.length).toBeGreaterThan(0);
    expect(isOpenQuote(job)).toBe(false);
    // No crew yet either way — dispatch assigns 48 hours out.
    expect(job.crew).toBeNull();
  });

  it("prices both endings identically", () => {
    const quoted = officeJob(call(), "quote", "FM-3", NOW);
    const booked = officeJob(call(), "book", "FM-4", NOW);

    // The number a customer accepted has to be the number they are billed
    // against. If these ever diverge, the quote is a lie.
    expect([quoted.low, quoted.high]).toEqual([booked.low, booked.high]);
    expect(quoted.counts).toEqual(booked.counts);
  });

  it("agrees with the published bands for the same home size", () => {
    const job = officeJob(call({ size: "3+ bed", movers: 4 }), "quote", "FM-5", NOW);
    const direct = quote({
      counts: PRESETS["3+ bed"],
      movers: 4,
      fromFloor: "Ground",
      toFloor: "Ground",
      elevator: false,
      packing: false,
      service: "full",
    });

    expect([job.low, job.high]).toEqual([direct.low, direct.high]);
  });

  it("trims what the office typed", () => {
    const job = officeJob(call(), "quote", "FM-6", NOW);
    expect(job.customer).toBe("Dana Doyle");
  });

  it("keeps the note as a message the crew will see", () => {
    const job = officeJob(call({ note: "  Gate code 4417  " }), "quote", "FM-7", NOW);
    expect(job.messages.map((m) => m.text)).toContain("Gate code 4417");
  });

  it("does not invent a message for an empty note", () => {
    expect(officeJob(call(), "quote", "FM-8", NOW).messages).toHaveLength(1);
  });
});

describe("officeJob — labour only", () => {
  it("fixes the crew at two whatever was posted", () => {
    // The form does not offer a crew choice for labour only; a hand-posted
    // form must not buy four movers at the two-mover rate.
    const job = officeJob(
      call({ service: "loading", movers: 4 }),
      "quote",
      "FM-9",
      NOW,
    );
    expect(job.movers).toBe(CONFIG.laborOnly.movers);
  });

  it("takes stated hours as the price, with no range", () => {
    const job = officeJob(
      call({ service: "unloading", hours: 3 }),
      "quote",
      "FM-10",
      NOW,
    );

    expect(job.quotedHours).toBe(3);
    expect(job.low).toBe(job.high);
    expect(job.low).toBe(3 * CONFIG.laborOnly.ratePerHour);
    expect(priceRange(job)).not.toContain("–");
  });

  it("clamps a typo rather than rejecting it", () => {
    const tiny = officeJob(call({ service: "loading", hours: 0.5 }), "quote", "FM-11", NOW);
    const huge = officeJob(call({ service: "loading", hours: 99 }), "quote", "FM-12", NOW);

    expect(tiny.quotedHours).toBe(CONFIG.laborOnly.minHours);
    expect(huge.quotedHours).toBe(MAX_STATED_HOURS);
    // The same rule the estimator applies, from the same function.
    expect(tiny.quotedHours).toBe(clampStatedHours(0.5));
  });

  it("ignores stated hours on a full move", () => {
    // A move we have not seen is priced from what is in it. Letting a caller
    // name the hours for one would be letting them name the price.
    const job = officeJob(call({ service: "full", hours: 2 }), "quote", "FM-13", NOW);

    expect(job.quotedHours).toBeNull();
    expect(job.low).toBeLessThan(job.high);
  });

  it("drops the address the service does not have", () => {
    const unload = officeJob(call({ service: "unloading" }), "quote", "FM-14", NOW);
    const load = officeJob(call({ service: "loading" }), "quote", "FM-15", NOW);

    // Carrying a pickup address on an unload would send a crew to a door
    // nobody agreed on.
    expect(unload.from).toBe("Denver");
    expect(unload.to).toBe("Golden, CO 80401");
    expect(load.to).toBe("Denver");
    expect(load.from).toBe("1420 Tennyson St, Denver");
  });
});

describe("windowHour", () => {
  it("accepts the offered starts", () => {
    for (const hour of WINDOW_HOURS) expect(windowHour(hour)).toBe(hour);
  });

  it("falls back for anything else", () => {
    // Posted by hand, or by a form we did not write.
    expect(windowHour(3)).toBe(DEFAULT_WINDOW_HOUR);
    expect(windowHour(23)).toBe(DEFAULT_WINDOW_HOUR);
    expect(windowHour(Number.NaN)).toBe(DEFAULT_WINDOW_HOUR);
  });

  it("is applied to a booking, not trusted from the request", () => {
    const job = officeJob(call({ windowHour: 3 }), "book", "FM-16", NOW);
    expect(job.window).toBe(arrivalWindow(DEFAULT_WINDOW_HOUR));
  });
});

describe("acceptQuote", () => {
  const quoted = officeJob(call(), "quote", "FM-20", NOW);

  it("books it, seeding the checklist a quote never had", () => {
    const booked = acceptQuote(quoted, NOW + 1000);

    expect(booked.status).toBe("unassigned");
    expect(booked.stage).toBe("Booked");
    expect(booked.window).toBe(arrivalWindow(DEFAULT_WINDOW_HOUR));
    expect(booked.tasks.length).toBeGreaterThan(0);
    expect(booked.messages.at(-1)?.text).toContain("Quote accepted");
  });

  it("does not re-price on acceptance", () => {
    // The customer accepted a number. Recomputing it here would let a config
    // change between the quote and the click move the price.
    const booked = acceptQuote(quoted, NOW + 1000);
    expect([booked.low, booked.high]).toEqual([quoted.low, quoted.high]);
  });

  it("is a no-op on a second click", () => {
    const once = acceptQuote(quoted, NOW + 1000);
    const twice = acceptQuote(once, NOW + 2000);

    // Identity, not equality: the action reads exactly this to decide whether
    // to send a confirmation.
    expect(twice).toBe(once);
    expect(twice.messages).toHaveLength(once.messages.length);
  });

  it("leaves a job the office already booked alone", () => {
    const booked = officeJob(call(), "book", "FM-21", NOW);
    expect(acceptQuote(booked, NOW + 1000)).toBe(booked);
  });

  it("cannot resurrect a cancelled job", () => {
    const cancelled: Job = { ...quoted, status: "cancelled", cancelledAt: NOW };
    expect(acceptQuote(cancelled, NOW + 1000)).toBe(cancelled);
  });

  it("keeps a checklist the job already had", () => {
    const withTasks: Job = {
      ...quoted,
      tasks: [{ label: "Find the cat", note: "", done: false }],
    };
    expect(acceptQuote(withTasks, NOW + 1000).tasks).toEqual(withTasks.tasks);
  });
});

describe("quoteFacts", () => {
  it("lists only the address the service has", () => {
    const labels = (job: Job) => quoteFacts(job).map(([label]) => label);

    expect(labels(officeJob(call(), "quote", "FM-30", NOW))).toEqual(
      expect.arrayContaining(["From", "To"]),
    );
    expect(labels(officeJob(call({ service: "unloading" }), "quote", "FM-31", NOW)))
      .not.toContain("From");
    expect(labels(officeJob(call({ service: "loading" }), "quote", "FM-32", NOW)))
      .not.toContain("To");
  });

  it("shows the hours only when they were stated", () => {
    const stated = officeJob(call({ service: "loading", hours: 4 }), "quote", "FM-33", NOW);
    const derived = officeJob(call({ service: "loading" }), "quote", "FM-34", NOW);

    expect(quoteFacts(stated)).toContainEqual(["Hours", "4.0 hrs"]);
    expect(quoteFacts(derived).map(([label]) => label)).not.toContain("Hours");
  });

  it("does not state a home size for labour only", () => {
    // Nobody is being asked how big their house is to have a container
    // unloaded, and printing "2 bed" on that quote is stating something the
    // customer never said.
    const job = officeJob(call({ service: "unloading" }), "quote", "FM-35", NOW);
    expect(quoteFacts(job).map(([label]) => label)).not.toContain("Home size");
  });
});

describe("resendableNotice", () => {
  it("re-sends the quote while it is open", () => {
    expect(resendableNotice(officeJob(call(), "quote", "FM-40", NOW))).toBe("quote");
  });

  it("re-sends the confirmation once booked", () => {
    expect(resendableNotice(officeJob(call(), "book", "FM-41", NOW))).toBe("booking");
  });

  it("follows the job rather than what was sent first", () => {
    // A quote accepted in between must re-send as a confirmation. Remembering
    // "this one was a quote" would send the customer their old estimate for a
    // move that is already on the board.
    const accepted = acceptQuote(officeJob(call(), "quote", "FM-42", NOW), NOW + 1);
    expect(resendableNotice(accepted)).toBe("booking");
  });

  it("sends nothing for a move that is over", () => {
    const job = officeJob(call(), "book", "FM-43", NOW);
    expect(resendableNotice({ ...job, status: "complete" })).toBeNull();
    expect(resendableNotice({ ...job, status: "cancelled" })).toBeNull();
  });
});
