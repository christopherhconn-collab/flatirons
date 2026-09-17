/**
 * Tests for the one function that decides what domain a customer sees.
 *
 * Its output goes into the tracking link in every booking text, so a wrong
 * answer is not a broken page — it is a text message sent to a real person
 * pointing at somewhere that is not the business.
 */

import { afterEach, describe, expect, it } from "vitest";

import { CANONICAL_ORIGIN, siteOrigin } from "./site-url";

const original = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = original;
});

const set = (value: string | undefined) => {
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = value;
};

describe("siteOrigin", () => {
  it("defaults to the business's own domain", () => {
    set(undefined);
    expect(siteOrigin()).toBe(CANONICAL_ORIGIN);
    expect(CANONICAL_ORIGIN).toBe("https://www.flatironsmoves.com");
  });

  it("ignores a deployment address, however it got configured", () => {
    // This is the bug that prompted the rule: production had this value, and
    // every booking confirmation would have linked customers to the host.
    for (const deployment of [
      "https://flatirons-flatirons.vercel.app",
      "https://flatirons-git-main-flatirons.vercel.app",
      "https://flatirons.vercel.app",
      "https://flatirons-1y27fx19z-flatirons.vercel.app/",
    ]) {
      set(deployment);
      expect(siteOrigin()).toBe(CANONICAL_ORIGIN);
    }
  });

  it("honours a real override, so local and staging still work", () => {
    set("http://localhost:3000");
    expect(siteOrigin()).toBe("http://localhost:3000");
    set("https://staging.flatironsmoves.com");
    expect(siteOrigin()).toBe("https://staging.flatironsmoves.com");
  });

  it("strips a trailing slash, which would double every path separator", () => {
    set("https://www.flatironsmoves.com/");
    expect(siteOrigin()).toBe("https://www.flatironsmoves.com");
  });

  it("falls back rather than emitting an unparseable value into an SMS", () => {
    for (const junk of ["", "   ", "flatironsmoves.com", '"https://x.com"']) {
      set(junk);
      expect(siteOrigin()).toBe(CANONICAL_ORIGIN);
    }
  });
});
