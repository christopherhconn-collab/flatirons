/**
 * Presentation helpers, ported from the prototype's `money()`, `stars()`,
 * `pad()` and `dateLabel()`.
 *
 * Pure and dependency-free so both server components and server actions can
 * use them. Every one of these renders a value the customer reads, so the
 * formats are part of the design, not incidental.
 */

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** `$1,240`. Whole dollars, always — no cents anywhere in this product. */
export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** `★★★★☆`. Filled then hollow, so the string is always five glyphs wide. */
export function stars(n: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(n)));
  return "★★★★★".slice(0, filled) + "☆☆☆☆☆".slice(0, 5 - filled);
}

export function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Dates

   Dates travel as `YYYY-MM-DD` strings and are only ever split on the hyphen.
   Never hand one to `new Date(string)` — that parses as UTC and slides the day
   backwards for anyone west of Greenwich, which is everyone in this company's
   service area.
   ═══════════════════════════════════════════════════════════════════════════ */

export type YMD = { year: number; month: number; day: number };

export function parseDate(iso: string): YMD {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Day of week, 0 = Sunday. */
export function dayOfWeek(iso: string): number {
  const { year, month, day } = parseDate(iso);
  return new Date(year, month - 1, day).getDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** `Sat, Sep 12` — the portal header and the estimator's date field. */
export function dateLabel(iso: string): string {
  const { year, month, day } = parseDate(iso);
  return `${DOW[new Date(year, month - 1, day).getDay()]}, ${MONTH_SHORT[month - 1]} ${day}`;
}

/** `Sep 12` — the same date without the weekday, for dense table cells. */
export function shortDate(iso: string): string {
  const { month, day } = parseDate(iso);
  return `${MONTH_SHORT[month - 1]} ${day}`;
}

/** `Sep 2026` — the month a review is filed under. */
export function monthTag(iso: string): string {
  const { year, month } = parseDate(iso);
  return `${MONTH_SHORT[month - 1]} ${year}`;
}

/** `September 2026` — the calendar card's header. */
export function monthTitle(year: number, month: number): string {
  return `${MONTH[month - 1]} ${year}`;
}

export const DOW_LABELS = DOW;

/** `H:MM:SS`, the crew clock's format. Used on the billed-hours read-out. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/**
 * The 30-minute arrival window for a start hour, in the prototype's format.
 * `8` → `8:00–8:30 AM`, `13` → `1:00–1:30 PM`.
 */
export function arrivalWindow(hour: number): string {
  const h = hour > 12 ? hour - 12 : hour;
  return `${h}:00–${h}:30 ${hour >= 12 ? "PM" : "AM"}`;
}

/** `Wash Park` from `Wash Park, Denver` — routes are shown without the city. */
export function place(address: string): string {
  return address.split(",")[0].trim();
}
