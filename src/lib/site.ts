/**
 * Constants the chrome and the pages share.
 *
 * These live outside `site-chrome.tsx` on purpose. That file carries the
 * `"use client"` directive, and a value exported from a client module and
 * imported by a Server Component arrives as a client *reference*, not the
 * value — a string constant crossing that boundary silently becomes a stub,
 * and any class name built from it stops matching anything.
 */

/** The 1180px content cap. Bands run full-bleed; their contents do not. */
export const SHELL = "mx-auto w-full max-w-[1180px] px-[34px] max-md:px-[18px]";

export const PHONE = "720.437.4198";
/** Bare digits, for `tel:`. */
export const PHONE_HREF = "tel:+17204374198";

/** The business address, as shown in the footer. One line; the suite is a
 * mailing suite, not the truck yard. */
export const ADDRESS =
  "5910 S University Blvd, Ste C18-253, Greenwood Village, CO 80121";

export const SITE_NAV = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/service-area", label: "Service area" },
  { href: "/commercial", label: "Commercial" },
  { href: "/reviews", label: "Reviews" },
] as const;
