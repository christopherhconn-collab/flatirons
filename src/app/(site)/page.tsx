import type { Metadata } from "next";

import { ShieldCheck } from "@/components/icons";
import { SHELL } from "@/lib/site";
import { startEstimate } from "@/app/estimate/actions";
import { firstOpenDate } from "@/lib/estimate";
import { dateLabel } from "@/lib/format";
import { HOME_SIZES } from "@/lib/pricing";
import { bookedOutDates } from "@/lib/store";
import { todayISO } from "@/lib/session";

export const metadata: Metadata = {
  title: "Flatirons Movers — Denver metro movers, licensed and insured",
  description:
    "Flat hourly rates, no surprise fees, no deposit to book. Strong hands, careful moves across Denver and the Front Range since 2024.",
  openGraph: {
    title: "Flatirons Movers",
    description:
      "Flat hourly rates, no surprise fees, no deposit to book. Free estimate in two minutes.",
    type: "website",
  },
};

const SERVICES = [
  {
    kicker: "01 · Residential",
    title: ["Apartments to", "four-bedrooms"],
    body: "Stairs, tight Denver alleys and third-floor walk-ups, all included at no upcharge.",
  },
  {
    kicker: "02 · Commercial",
    title: ["Offices moved", "over a weekend"],
    body: "Labeled crates, floor plans honored, desks reassembled before Monday.",
  },
  {
    kicker: "03 · Packing & storage",
    title: ["Boxed by us,", "held by us"],
    body: "Climate-controlled units in Commerce City when the closing date slips.",
  },
];

// Static but for the target date in the hero form, which follows real crew
// capacity. An hour of staleness there is harmless — the estimator re-checks
// the day against the board before anyone can book it.
export const revalidate = 3600;

export default async function HomePage() {
  // The hero form shows the date the estimator would default to, so the two
  // never disagree about when the first crew is free.
  const targetDate = firstOpenDate(todayISO(), await bookedOutDates());

  return (
    <>
      <div className="topo">
        <div
          className={`${SHELL} grid grid-cols-[1.12fr_.88fr] items-start gap-[44px] pt-[52px] pb-[46px] max-lg:grid-cols-1 max-lg:gap-9 max-md:pt-8`}
        >
          {/* ── Left: the pitch ─────────────────────────────────────────── */}
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <span aria-hidden="true" className="bg-olive h-px w-[26px]" />
              <span className="text-olive text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
                Front Range · Since 2024
              </span>
            </div>

            <h1 className="text-h1 mb-2 max-md:text-[46px]">
              Strong hands.
              <br />
              Careful moves.
            </h1>

            <p className="text-olive mb-[22px] text-[15px] leading-none font-medium tracking-[0.2em] uppercase">
              Local. Reliable. Professional.
            </p>

            <p className="text-body-lg mb-[30px] max-w-[44ch] text-[rgb(22_40_63/0.78)]">
              Flat hourly rates, no surprise fees, no deposit to book. We wrap
              the furniture, pad the doorframes, and get your Saturday back.
            </p>

            <dl className="gridlines border-line max-w-[560px] grid-cols-3 border max-sm:grid-cols-1">
              {[
                { value: "4,100+", label: "Moves completed" },
                { value: "4.9", suffix: "/5", label: "612 reviews" },
                { value: "$0", label: "Deposit to book" },
              ].map((stat) => (
                <div key={stat.label} className="bg-bg px-[18px] py-4">
                  <dd className="display text-stat-sm">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-olive text-[18px]">{stat.suffix}</span>
                    )}
                  </dd>
                  <dt className="text-ink-muted mt-[5px] text-[10.5px] leading-[1.4] font-medium tracking-[0.14em] uppercase">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>

            <div className="gridlines border-line mt-[34px] max-w-[560px] grid-cols-2 border max-sm:grid-cols-1">
              {[
                { crew: "2 movers + truck", rate: "$149" },
                { crew: "3 movers + truck", rate: "$199" },
              ].map((row) => (
                <div key={row.crew} className="bg-bg p-[18px]">
                  <div className="text-olive mb-2 text-[10.5px] leading-none font-medium tracking-[0.18em] uppercase">
                    {row.crew}
                  </div>
                  <div className="display text-[26px] leading-none">
                    {row.rate}
                    <span className="text-ink-quiet text-[15px]">/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: the estimate form ────────────────────────────────── */}
          <form
            action={startEstimate}
            className="blueprint bg-paper px-6 pt-[26px] pb-6"
          >
            <h2 className="text-card-title-sm mb-1 tracking-[0.1em]">
              Free estimate
            </h2>
            <p className="text-ink-muted mb-[22px] text-[13px] leading-[1.5]">
              Two minutes. No phone tag.
            </p>

            <div className="grid gap-3.5">
              <Field label="Moving from">
                <input
                  name="from"
                  placeholder="ZIP or address"
                  autoComplete="street-address"
                  className="border-line-strong bg-bg w-full border px-3 py-[11px] text-[14px]"
                />
              </Field>

              <Field label="Moving to">
                <input
                  name="to"
                  placeholder="ZIP or address"
                  className="border-line-strong bg-bg w-full border px-3 py-[11px] text-[14px]"
                />
              </Field>

              <fieldset>
                <legend className="text-label text-ink-muted mb-1.5 block">
                  Home size
                </legend>
                <div className="border-line-seg grid grid-cols-4 gap-px border bg-[rgb(22_40_63/0.22)]">
                  {HOME_SIZES.map((size) => (
                    <div key={size} className="contents">
                      <input
                        type="radio"
                        name="size"
                        id={`size-${size}`}
                        value={size}
                        defaultChecked={size === "2 bed"}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={`size-${size}`}
                        className="interactive bg-bg text-ink-body peer-checked:bg-olive peer-checked:text-paper peer-focus-visible:outline-olive block py-[11px] text-center text-[13px] leading-none peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                      >
                        {size}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>

              <Field label="Target date">
                <div className="border-line-strong bg-bg border px-3 py-[11px] text-[14px] leading-none font-medium">
                  {dateLabel(targetDate)}
                </div>
              </Field>

              <button
                type="submit"
                className="bg-olive text-btn interactive text-paper w-full py-[15px]"
              >
                Build my estimate
              </button>

              <p className="text-ink-quiet flex items-center justify-center gap-2 text-[11.5px] leading-none">
                <ShieldCheck size={14} className="text-olive" />
                Licensed, bonded, insured
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* ── Three services ──────────────────────────────────────────────── */}
      <div className="border-line border-t">
        <div className="gridlines mx-auto w-full max-w-[1180px] grid-cols-3 max-md:grid-cols-1">
          {SERVICES.map((service) => (
            <div key={service.kicker} className="bg-bg px-[26px] py-[30px]">
              <div className="text-olive mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
                {service.kicker}
              </div>
              <h3 className="text-card-title mb-2.5">
                {service.title[0]}
                <br />
                {service.title[1]}
              </h3>
              <p className="text-body-sm text-ink-body">{service.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-label text-ink-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
