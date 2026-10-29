import { IRRIGATION_ORIGIN } from "@/lib/irrigation";
import { NATIVES_ORIGIN } from "@/lib/natives";
import { SHELL } from "@/lib/site";
import { CANONICAL_ORIGIN } from "@/lib/site-url";

/**
 * Header, footer and logo shared by the Flatirons Services pages. Each page
 * is the root of its own subdomain, so every cross-link is absolute.
 */

/** The Flatirons peaks redrawn in the Services palette, beside a serif wordmark. */
export function ServicesLogo() {
  return (
    <span className="inline-flex items-center gap-3">
      <svg viewBox="0 0 96 44" width="40" height="18.33" aria-hidden="true" focusable="false">
        <path d="M2 42 L22 12 L38 42 Z" fill="#1f4e5f" />
        <path d="M30 42 L52 4 L70 42 Z" fill="#1f4e5f" />
        <path d="M60 42 L78 15 L94 42 Z" fill="#7fae9f" />
        <path d="M0 42 Q24 38 48 42 T96 42 V44 H0 Z" fill="#1f4e5f" />
      </svg>
      <span className="leading-none">
        <span className="font-condensed block text-[21px] font-medium tracking-[-0.01em]">Flatirons</span>
        <span className="text-olive mt-0.5 block text-[10px] font-semibold tracking-[0.28em] uppercase">
          Services
        </span>
      </span>
      <span className="sr-only">Flatirons Services</span>
    </span>
  );
}

export function ServicesHeader({
  home,
  label,
  children,
}: {
  home: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <header className="bg-bg/90 border-line sticky top-0 z-10 border-b backdrop-blur">
      <div className={`${SHELL} flex items-center justify-between gap-4 py-3.5`}>
        <a href={home} className="flex-none" aria-label={label}>
          <ServicesLogo />
        </a>
        {children}
      </div>
    </header>
  );
}

export function ServicesFooter({ tagline }: { tagline: string }) {
  return (
    <footer className="bg-ink text-cream-muted mt-auto">
      <div className={`${SHELL} flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-8 text-[13px]`}>
        <span>{tagline}</span>
        <nav aria-label="Flatirons sites" className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={IRRIGATION_ORIGIN} className="hover:text-olive-pale">
            Irrigation services
          </a>
          <a href={NATIVES_ORIGIN} className="hover:text-olive-pale">
            Native plant guide
          </a>
          <a href={CANONICAL_ORIGIN} className="hover:text-olive-pale">
            Moving? Flatirons Movers
          </a>
        </nav>
      </div>
    </footer>
  );
}

const PILL_SHAPE =
  "interactive inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap";

/** The primary button on the Services side: a teal pill. */
export const PILL = `bg-olive text-paper ${PILL_SHAPE} px-6 py-3.5 text-[15px]`;

/** The same pill reversed, for a teal ground. */
export const PILL_LIGHT = `bg-paper text-olive ${PILL_SHAPE} px-6 py-3.5 text-[15px]`;

/** A compact teal pill — the header, and buttons inside cards. */
export const PILL_SM = `bg-olive text-paper ${PILL_SHAPE} px-5 py-2.5 text-[14px]`;
