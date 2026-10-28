import type { Metadata } from "next";

import { LogoLockup } from "@/components/logo";
import {
  CUP_DIAMETER_IN,
  DU_TARGET,
  IRRIGATION_FAQ,
  IRRIGATION_ORIGIN,
  IRRIGATION_PROCESS,
  IRRIGATION_RATES,
  IRRIGATION_SERVICES,
  RUNTIME_MIN,
  SEASONS,
  seasonOf,
} from "@/lib/irrigation";
import { PHONE, PHONE_HREF, SHELL } from "@/lib/site";
import { CANONICAL_ORIGIN } from "@/lib/site-url";

import { HollyCaseStudy } from "./holly-case-study";

/**
 * Flatirons Services — the irrigation marketing page: services, the measuring
 * method, the 4343 Holly audit as proof, the seasonal calendar, process,
 * rates and FAQ.
 *
 * Served at the root of its own subdomain (the host rewrite is in
 * `next.config.ts`), so like `/natives` it carries its own chrome, its nav is
 * in-page anchors, and every link back to the main site is absolute.
 */

export const metadata: Metadata = {
  title: "Irrigation services — audits, repairs, retrofits & blowouts | Flatirons Services",
  description:
    "Sprinkler audits, repairs, Hunter MP Rotator retrofits, backflow and controller work, spring start-ups and fall blowouts across Denver and the Front Range — measured with catch cups, quoted line by line.",
  alternates: { canonical: IRRIGATION_ORIGIN },
};

// The seasonal call-out follows the calendar; a daily rebuild keeps it current.
export const revalidate = 86400;

const NAV = [
  { href: "#services", label: "Services" },
  { href: "#holly", label: "Case study" },
  { href: "#seasons", label: "Seasons" },
  { href: "#rates", label: "Rates" },
  { href: "#faq", label: "FAQ" },
] as const;

const CREDENTIALS = [
  "Certified Landscape Professional",
  "Licensed general contractor",
  "Self-performed — no subcontractors",
  "Raw readings with every audit",
] as const;

const kicker = "text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase";

export default function IrrigationPage() {
  const season = SEASONS.find((s) => s.id === seasonOf(new Date()))!;

  return (
    <>
      <header className="border-line bg-bg/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className={`${SHELL} flex items-center justify-between gap-4 py-[14px]`}>
          <a href="#top" className="flex-none" aria-label="Flatirons Services irrigation, top of page">
            <LogoLockup markWidth={40} wordSize={19} subSize={9.5} sub="Services" />
          </a>
          <nav aria-label="Sections" className="flex items-center gap-6 max-lg:hidden">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-ink-muted hover:text-ink text-[12px] leading-none font-medium tracking-[0.1em] uppercase"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a href={PHONE_HREF} className="bg-ink text-paper text-btn-sm interactive px-4 py-3 whitespace-nowrap uppercase">
            Call {PHONE}
          </a>
        </div>
      </header>

      <main id="top" className="flex-1">
        <section className="topo border-line border-b">
          <div className={`${SHELL} grid grid-cols-[1fr_340px] items-end gap-10 pt-[54px] pb-12 max-lg:grid-cols-1`}>
            <div>
              <p className={kicker}>Irrigation services · Denver / Front Range</p>
              <h1 className="text-h1 mb-5 max-lg:text-[60px] max-md:text-[42px]">
                Even water,
                <br />
                not more water.
              </h1>
              <p className="text-body-lg text-ink-lede max-w-[680px]">
                Audits, repairs, retrofits and seasonal service for sprinkler
                systems that should be doing better. We measure every zone with
                catch cups, show you exactly where the water lands, and fix the
                hardware that’s causing it — then measure again.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a href={PHONE_HREF} className="bg-olive text-paper text-btn interactive px-6 py-4 uppercase">
                  Call {PHONE}
                </a>
                <a href="#services" className="text-olive-dark text-[13px] leading-none font-semibold tracking-[0.1em] uppercase">
                  What we do ↓
                </a>
              </div>
            </div>

            <aside className="blueprint bg-ink text-paper p-6" aria-labelledby="season-h">
              <p className="text-olive-pale mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
                Now · {season.label} · {season.months}
              </p>
              <h2 id="season-h" className="text-card-title mb-3">
                {season.cta}
              </h2>
              <p className="text-cream-body mb-5 text-[14px] leading-[1.6]">{season.work}</p>
              <a href={PHONE_HREF} className="text-olive-pale text-[12px] leading-none font-semibold tracking-[0.1em] uppercase">
                Call {PHONE} →
              </a>
            </aside>
          </div>

          <div className="border-line bg-paper border-t">
            <ul className={`${SHELL} grid grid-cols-4 max-md:grid-cols-2`}>
              {CREDENTIALS.map((item) => (
                <li
                  key={item}
                  className="text-ink-body flex items-center gap-2.5 py-4 pr-4 text-[13px] leading-[1.35] font-medium"
                >
                  <span className="bg-olive h-1.5 w-1.5 flex-none" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="services" className={`${SHELL} scroll-mt-20 pt-14`} aria-labelledby="services-h">
          <p className="text-kicker text-olive-dark mb-3 uppercase">Services</p>
          <h2 id="services-h" className="text-h2 mb-6">
            Everything from the backflow to the last head
          </h2>
          <ul className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {IRRIGATION_SERVICES.map((service, i) => (
              <li key={service.id} className="bg-paper border-line flex flex-col border px-5 pt-5 pb-4">
                <p className="text-kicker-sm text-olive-dark mb-2 uppercase">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="text-card-title-sm mb-2">{service.title}</h3>
                <p className="text-body-sm text-ink-body mb-4">{service.body}</p>
                <p className="border-line mt-auto border-t pt-3 text-[13px] font-semibold">{service.price}</p>
              </li>
            ))}
            <li className="blueprint bg-olive-wash flex flex-col justify-between p-5">
              <h3 className="text-card-title-sm mb-2">Not sure which?</h3>
              <p className="text-body-sm mb-4 text-[rgb(22_40_63/0.72)]">
                Describe what you’re seeing and we’ll tell you whether it needs a
                repair, a test or a retrofit.
              </p>
              <a href={PHONE_HREF} className="bg-ink text-paper text-btn-sm interactive self-start px-4 py-3 uppercase">
                Call {PHONE}
              </a>
            </li>
          </ul>
        </section>

        <section className={`${SHELL} pt-14`} aria-labelledby="method-h">
          <p className="text-kicker text-olive-dark mb-3 uppercase">The method</p>
          <h2 id="method-h" className="text-h2 mb-3">
            Measured, not eyeballed
          </h2>
          <p className="text-body-lg text-ink-lede mb-6 max-w-[760px]">
            Most brown spots aren’t a run-time problem. They’re a uniformity
            problem — mismatched heads on one valve, nozzles fogging at the
            wrong pressure — and running the clock longer drowns the rest of
            the lawn to rescue the dry patch.
          </p>
          <div className="gridlines border-line grid-cols-3 border max-md:grid-cols-1">
            <Step kicker="01 · Catch cups" title="Every head, on a grid">
              Calibrated {CUP_DIAMETER_IN}″ cups set around each head, then a
              timed {RUNTIME_MIN}-minute run. Each cup is read to the millilitre
              mark — that’s the raw data everything else comes from.
            </Step>
            <Step kicker="02 · Precipitation rate" title="Inches per hour">
              How fast the zone puts water down. It sets how long the zone
              should run — and on Front Range clay, whether it runs off before
              it soaks in.
            </Step>
            <Step kicker="03 · Uniformity" title={`DU — ${DU_TARGET * 100}% to pass`}>
              The driest quarter of the cups against the zone average. Below{" "}
              {DU_TARGET * 100}%, the controller is being set for the dry
              spots and the rest of the zone is overwatered.
            </Step>
          </div>
        </section>

        <HollyCaseStudy />

        <section id="seasons" className={`${SHELL} scroll-mt-20 pt-14`} aria-labelledby="seasons-h">
          <p className="text-kicker text-olive-dark mb-3 uppercase">The year</p>
          <h2 id="seasons-h" className="text-h2 mb-6">
            A system looked after all year
          </h2>
          <ol className="gridlines border-line grid-cols-4 border max-lg:grid-cols-2 max-sm:grid-cols-1">
            {SEASONS.map((s) => {
              const current = s.id === season.id;
              return (
                <li key={s.id} className={`border-0 p-6 ${current ? "bg-ink text-paper" : "bg-paper"}`}>
                  <p
                    className={`mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase ${
                      current ? "text-olive-pale" : "text-olive"
                    }`}
                  >
                    {s.months}
                    {current && " · Now"}
                  </p>
                  <h3 className="text-card-title-sm mb-2">{s.label}</h3>
                  <p className={`text-body-sm ${current ? "text-cream-body" : "text-ink-body"}`}>{s.work}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={`${SHELL} pt-14`} aria-labelledby="process-h">
          <p className="text-kicker text-olive-dark mb-3 uppercase">How a job runs</p>
          <h2 id="process-h" className="text-h2 mb-6">
            From the first call to the re-test
          </h2>
          <ol className="grid grid-cols-5 gap-5 max-lg:grid-cols-1">
            {IRRIGATION_PROCESS.map((step, i) => (
              <li key={step.title} className="border-olive border-t-2 pt-4 max-lg:grid max-lg:grid-cols-[48px_1fr] max-lg:gap-x-3">
                <span className="display text-stat-sm text-olive max-lg:row-span-2">{i + 1}</span>
                <h3 className="text-card-title-sm mt-2 mb-1.5 max-lg:mt-0">{step.title}</h3>
                <p className="text-body-sm text-ink-body">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="rates" className={`${SHELL} scroll-mt-20 pt-14`} aria-labelledby="rates-h">
          <p className="text-kicker text-olive-dark mb-3 uppercase">Rates</p>
          <h2 id="rates-h" className="text-h2 mb-6">
            Priced by the zone and the head
          </h2>
          <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-1">
            {IRRIGATION_RATES.map((service) => (
              <div key={service.id} className="bg-paper border-line flex flex-col border">
                <div className="px-5 pt-5 pb-4">
                  <p className="text-kicker-sm text-olive-dark mb-2 uppercase">{service.kicker}</p>
                  <h3 className="text-card-title-sm mb-2">{service.title}</h3>
                  <p className="text-body-sm text-ink-body">{service.body}</p>
                </div>
                <dl className="mt-auto border-t border-[rgb(22_40_63/0.1)]">
                  {service.rows.map((row, i) => (
                    <div
                      key={row.label}
                      className={`flex justify-between gap-4 px-5 py-3 text-[14.5px] leading-[1.3] ${
                        i < service.rows.length - 1 ? "border-b border-[rgb(22_40_63/0.1)]" : ""
                      }`}
                    >
                      <dt>{row.label}</dt>
                      <dd className="font-semibold whitespace-nowrap">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="text-meta text-ink-muted mt-3">
            Repairs, backflow and valve work, controller upgrades and seasonal
            visits are quoted per job, itemised by parts and labour. 50% deposit
            on acceptance, balance on completion.
          </p>
        </section>

        <section id="faq" className={`${SHELL} scroll-mt-20 pt-14`} aria-labelledby="faq-h">
          <p className="text-kicker text-olive-dark mb-3 uppercase">FAQ</p>
          <h2 id="faq-h" className="text-h2 mb-6">
            Questions we get
          </h2>
          <div className="border-line bg-paper max-w-[880px] border">
            {IRRIGATION_FAQ.map((item, i) => (
              <details
                key={item.q}
                className={`group px-5 ${i < IRRIGATION_FAQ.length - 1 ? "border-b border-[rgb(22_40_63/0.1)]" : ""}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-olive text-[20px] leading-none transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="text-body-sm text-ink-body max-w-[70ch] pb-5">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${SHELL} pt-14 pb-14`}>
          <div className="blueprint bg-olive-wash flex flex-wrap items-center justify-between gap-6 p-7">
            <div className="max-w-[60ch]">
              <h2 className="text-h2-sm mb-2">Find out where your water goes</h2>
              <p className="text-body-sm text-[rgb(22_40_63/0.72)]">
                Flatirons Services is run by Chris Conn — Certified Landscape
                Professional and licensed general contractor. You get the raw
                readings, the analysis and a head-by-head plan.
              </p>
            </div>
            <a href={PHONE_HREF} className="bg-ink text-paper text-btn interactive px-6 py-4 uppercase">
              Call {PHONE}
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-ink mt-auto">
        <div
          className={`${SHELL} text-cream-muted flex flex-wrap items-center justify-between gap-4 py-6 text-[11.5px] leading-none`}
        >
          <span>Irrigation services · Flatirons Services · Denver / Front Range</span>
          <a href={CANONICAL_ORIGIN} className="hover:text-olive-pale">
            Moving in the Denver metro? flatironsmoves.com
          </a>
        </div>
      </footer>
    </>
  );
}

function Step({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className="blueprint bg-paper border-0 p-[26px]">
      <div className="text-olive mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
        {kicker}
      </div>
      <h3 className="text-card-title-sm mb-2.5">{title}</h3>
      <p className="text-body-sm text-ink-body">{children}</p>
    </div>
  );
}
