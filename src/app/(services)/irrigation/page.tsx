import type { Metadata } from "next";

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

import { PILL, PILL_LIGHT, PILL_SM, ServicesFooter, ServicesHeader } from "../services-chrome";
import { HollyCaseStudy } from "./holly-case-study";

/**
 * Flatirons Services — the irrigation marketing page: services, the measuring
 * method, the 4343 Holly audit as proof, the seasonal calendar, process,
 * rates and FAQ.
 *
 * Served at the root of its own subdomain (the host rewrite is in
 * `next.config.ts`), in the Services look from `../layout.tsx`. Its nav is
 * in-page anchors, and every link off the page is absolute.
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

const eyebrow = "text-olive mb-3 text-[12px] font-semibold tracking-[0.18em] uppercase";
const card = "bg-paper border-line rounded-2xl border";

export default function IrrigationPage() {
  const season = SEASONS.find((s) => s.id === seasonOf(new Date()))!;

  return (
    <>
      <ServicesHeader home="#top" label="Flatirons Services irrigation, top of page">
        <nav aria-label="Sections" className="flex items-center gap-7 max-lg:hidden">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-ink-body hover:text-ink text-[14.5px] font-medium">
              {item.label}
            </a>
          ))}
        </nav>
        <a href={PHONE_HREF} className={PILL_SM}>
          Call {PHONE}
        </a>
      </ServicesHeader>

      <main id="top" className="services-wash flex-1">
        <section className={`${SHELL} pt-8`}>
          <div className="bg-olive text-paper relative overflow-hidden rounded-3xl">
            <SprayArcs />
            <div className="relative grid grid-cols-[1fr_340px] items-end gap-10 px-12 pt-16 pb-12 max-lg:grid-cols-1 max-md:px-6 max-md:pt-10">
              <div>
                <p className="text-olive-pale mb-4 text-[12px] font-semibold tracking-[0.18em] uppercase">
                  Irrigation · Denver & the Front Range
                </p>
                <h1 className="text-h1 mb-5 max-lg:text-[58px] max-md:text-[42px]">
                  Even water, <em className="text-olive-pale font-normal">not more water.</em>
                </h1>
                <p className="text-cream-body max-w-[620px] text-[18px] leading-[1.6]">
                  Audits, repairs, retrofits and seasonal service for sprinkler
                  systems that should be doing better. We measure every zone
                  with catch cups, show you exactly where the water lands, and
                  fix the hardware that’s causing it — then measure again.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-5">
                  <a href={PHONE_HREF} className={PILL_LIGHT}>
                    Call {PHONE}
                  </a>
                  <a href="#services" className="text-olive-mist hover:text-paper text-[15px] font-medium underline-offset-4 hover:underline">
                    See what we do →
                  </a>
                </div>
              </div>

              <aside
                className="rounded-2xl border border-[rgb(255_253_248/0.18)] bg-[rgb(255_253_248/0.1)] p-6 backdrop-blur-sm"
                aria-labelledby="season-h"
              >
                <p className="text-olive-pale mb-3 text-[12px] font-semibold tracking-[0.16em] uppercase">
                  Now · {season.label} · {season.months}
                </p>
                <h2 id="season-h" className="mb-3 text-[28px]">
                  {season.cta}
                </h2>
                <p className="text-cream-body mb-5 text-[14.5px] leading-[1.6]">{season.work}</p>
                <a href={PHONE_HREF} className="text-paper text-[14.5px] font-semibold underline-offset-4 hover:underline">
                  Call {PHONE} →
                </a>
              </aside>
            </div>
          </div>

          <ul className="mt-5 flex flex-wrap gap-2.5">
            {CREDENTIALS.map((item) => (
              <li
                key={item}
                className="bg-paper border-line text-ink-body flex items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-medium"
              >
                <Leaf />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section id="services" className={`${SHELL} scroll-mt-20 pt-20`} aria-labelledby="services-h">
          <p className={eyebrow}>Services</p>
          <h2 id="services-h" className="text-h2 mb-8 max-w-[18ch] text-[44px] max-md:text-[34px]">
            Everything from the backflow to the last head
          </h2>
          <ul className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {IRRIGATION_SERVICES.map((service) => (
              <li key={service.id} className={`${card} flex flex-col p-6`}>
                <h3 className="mb-2 text-[23px]">{service.title}</h3>
                <p className="text-body-sm text-ink-body mb-5">{service.body}</p>
                <p className="bg-olive-tint text-olive-dark mt-auto self-start rounded-full px-3 py-1.5 text-[13px] font-semibold">
                  {service.price}
                </p>
              </li>
            ))}
            <li className="bg-olive-wash flex flex-col justify-between rounded-2xl p-6">
              <h3 className="mb-2 text-[23px]">Not sure which?</h3>
              <p className="text-body-sm text-ink-body mb-5">
                Describe what you’re seeing and we’ll tell you whether it needs a
                repair, a test or a retrofit.
              </p>
              <a href={PHONE_HREF} className={`${PILL_SM} self-start`}>
                Call {PHONE}
              </a>
            </li>
          </ul>
        </section>

        <section className={`${SHELL} pt-20`} aria-labelledby="method-h">
          <div className="grid grid-cols-[0.9fr_1.1fr] gap-12 max-lg:grid-cols-1 max-lg:gap-8">
            <div>
              <p className={eyebrow}>The method</p>
              <h2 id="method-h" className="text-h2 mb-4 text-[44px] max-md:text-[34px]">
                Measured, not eyeballed
              </h2>
              <p className="text-body-lg text-ink-lede">
                Most brown spots aren’t a run-time problem. They’re a uniformity
                problem — mismatched heads on one valve, nozzles fogging at the
                wrong pressure — and running the clock longer drowns the rest of
                the lawn to rescue the dry patch.
              </p>
            </div>
            <ol className="grid gap-4">
              <Step n={1} title="Catch cups on every head">
                Calibrated {CUP_DIAMETER_IN}″ cups set around each head, then a
                timed {RUNTIME_MIN}-minute run. Each cup is read to the
                millilitre mark — the raw data everything else comes from.
              </Step>
              <Step n={2} title="Precipitation rate, in inches per hour">
                How fast the zone puts water down. It sets how long the zone
                should run — and on Front Range clay, whether it runs off before
                it soaks in.
              </Step>
              <Step n={3} title={`Uniformity — ${DU_TARGET * 100}% to pass`}>
                The driest quarter of the cups against the zone average. Below{" "}
                {DU_TARGET * 100}%, the controller is being set for the dry spots
                and the rest of the zone is overwatered.
              </Step>
            </ol>
          </div>
        </section>

        <HollyCaseStudy />

        <section id="seasons" className={`${SHELL} scroll-mt-20 pt-20`} aria-labelledby="seasons-h">
          <p className={eyebrow}>The year</p>
          <h2 id="seasons-h" className="text-h2 mb-8 text-[44px] max-md:text-[34px]">
            A system looked after all year
          </h2>
          <ol className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {SEASONS.map((s) => {
              const current = s.id === season.id;
              return (
                <li
                  key={s.id}
                  className={`rounded-2xl p-6 ${current ? "bg-ink text-paper" : `${card}`}`}
                >
                  <p
                    className={`mb-3 text-[12px] font-semibold tracking-[0.16em] uppercase ${
                      current ? "text-olive-pale" : "text-olive"
                    }`}
                  >
                    {s.months}
                    {current && " · Now"}
                  </p>
                  <h3 className="mb-2 text-[26px]">{s.label}</h3>
                  <p className={`text-body-sm ${current ? "text-cream-body" : "text-ink-body"}`}>{s.work}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={`${SHELL} pt-20`} aria-labelledby="process-h">
          <p className={eyebrow}>How a job runs</p>
          <h2 id="process-h" className="text-h2 mb-8 text-[44px] max-md:text-[34px]">
            From the first call to the re-test
          </h2>
          <ol className="grid grid-cols-5 gap-4 max-lg:grid-cols-1">
            {IRRIGATION_PROCESS.map((step, i) => (
              <li key={step.title} className="max-lg:grid max-lg:grid-cols-[52px_1fr] max-lg:gap-x-3">
                <span className="bg-olive-wash text-olive font-condensed mb-4 flex h-11 w-11 items-center justify-center rounded-full text-[20px] max-lg:row-span-2 max-lg:mb-0">
                  {i + 1}
                </span>
                <h3 className="mb-1.5 text-[22px]">{step.title}</h3>
                <p className="text-body-sm text-ink-body">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="rates" className={`${SHELL} scroll-mt-20 pt-20`} aria-labelledby="rates-h">
          <p className={eyebrow}>Rates</p>
          <h2 id="rates-h" className="text-h2 mb-8 text-[44px] max-md:text-[34px]">
            Priced by the zone and the head
          </h2>
          <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
            {IRRIGATION_RATES.map((service) => (
              <div key={service.id} className={`${card} flex flex-col overflow-hidden`}>
                <div className="px-6 pt-6 pb-5">
                  <p className="text-olive mb-2 text-[12px] font-semibold tracking-[0.16em] uppercase">{service.kicker}</p>
                  <h3 className="mb-2 text-[24px]">{service.title}</h3>
                  <p className="text-body-sm text-ink-body">{service.body}</p>
                </div>
                <dl className="bg-olive-tint mt-auto px-6 py-2">
                  {service.rows.map((row) => (
                    <div key={row.label} className="border-line flex justify-between gap-4 border-b py-2.5 text-[14.5px] last:border-b-0">
                      <dt>{row.label}</dt>
                      <dd className="font-semibold whitespace-nowrap">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="text-meta text-ink-muted mt-4">
            Repairs, backflow and valve work, controller upgrades and seasonal
            visits are quoted per job, itemised by parts and labour. 50% deposit
            on acceptance, balance on completion.
          </p>
        </section>

        <section id="faq" className={`${SHELL} scroll-mt-20 pt-20`} aria-labelledby="faq-h">
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-12 max-lg:grid-cols-1 max-lg:gap-6">
            <div>
              <p className={eyebrow}>FAQ</p>
              <h2 id="faq-h" className="text-h2 text-[44px] max-md:text-[34px]">
                Questions we get
              </h2>
            </div>
            <div className="grid gap-3">
              {IRRIGATION_FAQ.map((item) => (
                <details key={item.q} className={`${card} group px-6`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      className="bg-olive-tint text-olive flex h-7 w-7 flex-none items-center justify-center rounded-full text-[18px] leading-none transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="text-body-sm text-ink-body max-w-[70ch] pb-5">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={`${SHELL} pt-20 pb-20`}>
          <div className="bg-olive-wash flex flex-wrap items-center justify-between gap-6 rounded-3xl px-10 py-10 max-md:px-6">
            <div className="max-w-[56ch]">
              <h2 className="mb-2 text-[36px] max-md:text-[28px]">Find out where your water goes</h2>
              <p className="text-body text-ink-body">
                Flatirons Services is run by Chris Conn — Certified Landscape
                Professional and licensed general contractor. You get the raw
                readings, the analysis and a head-by-head plan.
              </p>
            </div>
            <a href={PHONE_HREF} className={PILL}>
              Call {PHONE}
            </a>
          </div>
        </section>
      </main>

      <ServicesFooter tagline="Flatirons Services · Irrigation, Denver & the Front Range" />
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className={`${card} grid grid-cols-[44px_1fr] gap-x-4 p-6`}>
      <span className="bg-olive text-paper font-condensed row-span-2 flex h-11 w-11 items-center justify-center rounded-full text-[19px]">
        {n}
      </span>
      <h3 className="mb-1.5 text-[22px]">{title}</h3>
      <p className="text-body-sm text-ink-body">{children}</p>
    </li>
  );
}

function Leaf() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false" className="text-olive">
      <path d="M14 2C7 2 2 5.5 2 11c0 1.2.3 2.2.8 3C4 9.5 7.5 7 11 6c-3 1.5-5.6 4.2-6.6 7.6C5.3 14 6.3 14 7 14c4.5 0 7-4.5 7-12Z" fill="currentColor" />
    </svg>
  );
}

/** Sprinkler throw arcs, drawn faintly across the hero. */
function SprayArcs() {
  return (
    <svg
      className="pointer-events-none absolute -right-24 -bottom-40 h-[620px] w-[620px] text-[rgb(156_203_200/0.22)] max-md:opacity-50"
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {[60, 110, 160, 210, 260].map((r) => (
        <path key={r} d={`M ${200 - r} 400 A ${r} ${r} 0 0 1 ${200 + r} 400`} strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" />
      ))}
      <circle cx="200" cy="400" r="6" fill="currentColor" />
    </svg>
  );
}
