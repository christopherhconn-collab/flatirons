"use client";

/**
 * The marketing chrome: utility bar, header and footer CTA band.
 *
 * A client component only so the header can mark the active nav item from the
 * pathname — nothing else here is interactive. The prototype's persistent dark
 * surface-switcher bar is deliberately absent: README.md calls it "a prototype
 * navigation aid only" that must not ship.
 *
 * The prototype is authored at a fixed 1180px. Bands run full-bleed and their
 * contents are capped at that width, so the design holds at its intended size
 * on a wider screen instead of stretching.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoLockup } from "@/components/logo";
import { PHONE, PHONE_HREF, SHELL, SITE_NAV } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header>
      {/* Utility bar — 34px, navy, mist type at .09em. */}
      <div className="bg-ink text-olive-mist">
        <div
          className={`${SHELL} flex h-[34px] items-center justify-between gap-4 text-[11px] leading-none font-medium tracking-[0.09em] uppercase max-md:h-auto max-md:flex-wrap max-md:gap-y-1.5 max-md:py-2`}
        >
          <span>
            Serving the Front Range since 2024 · Licensed &amp; insured · PUC
            00412
          </span>
          <span className="flex items-center gap-6 max-md:gap-4">
            <span className="max-sm:hidden">Mon–Sat 7a–7p</span>
            <Link href="/track" className="text-olive-pale hover:text-cream-body">
              Track my move
            </Link>
            <a href={PHONE_HREF} className="text-[#f7f6f2] hover:text-olive-pale">
              {PHONE}
            </a>
          </span>
        </div>
      </div>

      {/* Header — logo left, nav and the one olive button right. */}
      <div className="border-line border-b">
        <div
          className={`${SHELL} flex flex-wrap items-center justify-between gap-x-8 gap-y-5 py-[18px]`}
        >
          <Link href="/" className="flex-none" aria-label="Flatirons Movers, home">
            <LogoLockup markWidth={40} wordSize={19} subSize={9.5} />
          </Link>

          {/* The prototype fixes this group at its content width, which is
              right at 1180px and wrong on a phone. Letting it shrink and wrap
              is the conservative fallback: README.md says the mobile nav was
              never designed and asks for the approach to be agreed rather than
              improvised, so this wraps rather than inventing a drawer. */}
          <nav className="flex flex-wrap items-center justify-end gap-x-[22px] gap-y-3 text-[12px] leading-none font-medium tracking-[0.1em] uppercase">
            {SITE_NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "text-ink border-olive border-b-2 pb-1 font-semibold whitespace-nowrap"
                      : "text-ink-muted hover:text-ink border-b-2 border-transparent pb-1 whitespace-nowrap"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/estimate"
              className="bg-olive interactive px-[18px] py-[11px] text-[12px] leading-none font-semibold tracking-[0.1em] whitespace-nowrap text-[#f7f6f2] uppercase"
            >
              Free estimate
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

/** The closing band: "WE MOVE. YOU SETTLE IN." flanked by olive hairlines. */
export function SiteFooter() {
  return (
    <footer className="bg-ink mt-auto">
      <div
        className={`${SHELL} flex flex-wrap items-center justify-between gap-6 py-[34px]`}
      >
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="bg-olive h-px w-[34px]" />
          <span className="font-condensed text-olive-mist text-[30px] leading-none font-semibold tracking-[0.16em] uppercase max-sm:text-[22px]">
            We move. You settle in.
          </span>
          <span aria-hidden="true" className="bg-olive h-px w-[34px]" />
        </div>
        <Link
          href="/estimate"
          className="bg-olive interactive px-[22px] py-[14px] text-[14px] leading-none font-semibold tracking-[0.1em] text-[#f7f6f2] uppercase"
        >
          Start an estimate
        </Link>
      </div>
      <div className="border-line-dark border-t">
        <div
          className={`${SHELL} text-cream-muted flex flex-wrap justify-between gap-4 py-5 text-[11.5px] leading-none`}
        >
          <span>
            Flatirons Movers · Commerce City, CO · PUC 00412 · Licensed, bonded
            and insured
          </span>
          <a href={PHONE_HREF} className="hover:text-olive-pale">
            {PHONE}
          </a>
        </div>
      </div>
    </footer>
  );
}
