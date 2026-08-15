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

export const PHONE = "303.555.0150";
/** Bare digits, for `tel:`. */
export const PHONE_HREF = "tel:+13035550150";

export const SITE_NAV = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/service-area", label: "Service area" },
  { href: "/commercial", label: "Commercial" },
  { href: "/reviews", label: "Reviews" },
] as const;
