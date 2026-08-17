import { describe, expect, it } from "vitest";

import { canOpenMove, parseStaffEmails, safeNextPath, sameEmail } from "./access";

describe("parseStaffEmails", () => {
  it("is empty when unset — unset must not mean everyone", () => {
    expect(parseStaffEmails(undefined).size).toBe(0);
    expect(parseStaffEmails("").size).toBe(0);
  });

  it("splits on commas, trims, lowercases", () => {
    const staff = parseStaffEmails(" Dispatch@flatirons.co ,owner@flatirons.co");
    expect(staff.has("dispatch@flatirons.co")).toBe(true);
    expect(staff.has("owner@flatirons.co")).toBe(true);
    expect(staff.size).toBe(2);
  });

  it("drops entries that are not addresses", () => {
    // A stray word in the variable must not become a wildcard entry that a
    // Supabase user could sign up as.
    expect(parseStaffEmails("dispatch, owner@flatirons.co").size).toBe(1);
  });
});

describe("sameEmail", () => {
  it("ignores case and whitespace — booking forms and auth providers disagree on both", () => {
    expect(sameEmail(" Dana@Example.com", "dana@example.com ")).toBe(true);
    expect(sameEmail("dana@example.com", "dana@example.co")).toBe(false);
  });
});

describe("canOpenMove", () => {
  const staff = parseStaffEmails("dispatch@flatirons.co");

  it("admits the job's own customer", () => {
    expect(canOpenMove("dana@example.com", "Dana@Example.com", staff)).toBe(true);
  });

  it("admits staff regardless of the job's email", () => {
    expect(canOpenMove("dispatch@flatirons.co", "dana@example.com", staff)).toBe(true);
  });

  it("refuses another signed-in customer", () => {
    expect(canOpenMove("other@example.com", "dana@example.com", staff)).toBe(false);
  });

  it("refuses a missing session", () => {
    expect(canOpenMove(null, "dana@example.com", staff)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/move/FM-8841")).toBe("/move/FM-8841");
  });

  it("collapses absolute URLs, protocol-relative URLs and junk to /", () => {
    // The value round-trips through an email, so it is attacker-writable;
    // anything that could leave the site must not survive.
    expect(safeNextPath("https://evil.example/")).toBe("/");
    expect(safeNextPath("//evil.example/")).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
