import type { Metadata } from "next";

import { SHELL } from "@/lib/site";
import { startEstimate } from "@/app/estimate/actions";
import { money } from "@/lib/format";
import { typicalBands } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing — Flatirons Movers",
  description:
    "One hourly rate per crew size. Three-hour minimum, billed to the quarter hour, $45 flat metro travel and no deposit.",
};

const RATE_CARDS = [
  {
    crew: "2 movers + truck",
    rate: "$149",
    body: "Studios and one-bedrooms. Typically 3–5 hours door to door.",
    featured: false,
  },
  {
    crew: "3 movers + truck · most booked",
    rate: "$199",
    body: "Two and three-bedrooms, stairs on either end, one truck load.",
    featured: true,
  },
  {
    crew: "4 movers + truck",
    rate: "$249",
    body: "Four bedrooms, offices, or a hard deadline. Fewer hours, same care.",
    featured: false,
  },
];

const ADD_ONS = [
  { label: "Packing crew, day before", value: "$65/hr" },
  { label: "TV crate, per set", value: "$40" },
  { label: "Upright piano handling", value: "$180" },
  { label: "Gun safe, under 600 lb", value: "$220" },
  { label: "Storage, climate controlled", value: "from $95/mo" },
  {
    label: "Wrap, pads, tape, wardrobe boxes",
    value: "Included",
    included: true,
  },
];

const RULES = [
  "Three-hour minimum, then billed to the quarter hour — the clock starts when we arrive, not when we leave the yard.",
  "$45 flat travel inside the Denver metro. Anywhere else in Colorado, $1.15 per loaded mile.",
  "No deposit, no card required to hold a date. Cancel up to 48 hours out for free.",
  "Stairs, long carries and elevator waits are never an upcharge. Weekend rates are the same as weekday.",
];

export default function PricingPage() {
  // Computed from the room presets by the same engine that quotes a move, so
  // the published numbers cannot drift from what the estimator says. Never
  // hard-code these (README.md).
  const bands = typicalBands();

  return (
    <div className={`${SHELL} pt-[46px] pb-10`}>
      <header className="mb-[34px] max-w-[70ch]">
        <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
          Pricing
        </p>
        <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
          What it costs,
          <br />
          before you call
        </h1>
        <p className="text-body-lg text-ink-lede">
          One hourly rate per crew size. Three-hour minimum, then billed to the
          quarter hour. Travel inside the Denver metro is $45 flat, and we run
          statewide.
        </p>
      </header>

      <div className="gridlines border-line mb-9 grid-cols-3 border max-md:grid-cols-1">
        {RATE_CARDS.map((card) => (
          <div
            key={card.crew}
            className={`blueprint border-0 p-[26px] ${card.featured ? "bg-olive-wash" : "bg-paper"}`}
          >
            <div
              className={`mb-3.5 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase ${
                card.featured ? "text-olive-dark" : "text-olive"
              }`}
            >
              {card.crew}
            </div>
            <div className="display text-[46px] leading-none">
              {card.rate}
              <span className="text-ink-quiet text-[20px]">/hr</span>
            </div>
            <p className="text-body-sm text-ink-body mt-3.5">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.15fr_.85fr] gap-[34px] max-lg:grid-cols-1">
        <div>
          <h2 className="text-h2-sm mb-4 text-[26px]">Add-ons, at cost of labor</h2>
          <dl className="border-line bg-paper border">
            {ADD_ONS.map((row, i) => (
              <div
                key={row.label}
                className={`flex justify-between px-[18px] py-[13px] text-[15px] leading-[1.3] ${
                  i < ADD_ONS.length - 1
                    ? "border-b border-[rgb(22_40_63/0.1)]"
                    : ""
                }`}
              >
                <dt>{row.label}</dt>
                <dd
                  className={`font-semibold ${row.included ? "text-olive-dark" : ""}`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <h2 className="text-h2-sm mt-8 mb-4 text-[26px]">
            What a typical move runs
          </h2>
          <div className="gridlines border-line grid-cols-4 border max-md:grid-cols-2">
            {bands.map((band) => (
              <div key={band.size} className="bg-paper p-[18px]">
                <div className="text-th text-ink-quiet mb-2">{band.size}</div>
                <div className="display text-[24px] leading-none">
                  {money(band.low)}–{money(band.high)}
                </div>
                <div className="text-ink-muted mt-1.5 text-[12.5px] leading-[1.5]">
                  {band.movers} movers, {hourSpan(band.hours)} hrs
                </div>
              </div>
            ))}
          </div>
          <p className="text-ink-quiet mt-3 text-[12.5px] leading-[1.5]">
            Crew and truck only — travel is added as listed. Computed from the
            same engine that prices your estimate, not a rounded-off marketing
            number.
          </p>
        </div>

        <div>
          <div className="blueprint bg-paper mb-5 p-[22px]">
            <h2 className="text-card-title-sm mb-3.5">The rules, plainly</h2>
            <div className="text-ink-lede grid gap-3 text-[14.5px] leading-[1.55]">
              {RULES.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </div>
          </div>

          <div className="border border-dashed border-[rgb(22_40_63/0.3)] p-5">
            <h2 className="text-card-title-sm mb-2 text-[19px] leading-[1.15]">
              Your estimate is a range, not a bid
            </h2>
            <p className="text-body-sm mb-4 text-[rgb(22_40_63/0.7)]">
              You pay the hours we work. The range covers the move itself —
              crew, truck and any special handling. Travel is added on top, at
              the flat metro rate or by the mile, exactly as listed above. Go
              over the top of the range on the labour and we eat the
              difference.
            </p>
            <form action={startEstimate}>
              <button
                type="submit"
                className="bg-olive text-paper text-btn-sm interactive px-5 py-[13px] text-[13px]"
              >
                Build my estimate
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/** `4–5` — the band's hours rounded to the half, with an hour of headroom. */
function hourSpan(hours: number): string {
  const half = (n: number) =>
    (Math.round(n * 2) / 2).toFixed(1).replace(/\.0$/, "");
  return `${half(hours)}–${half(hours + 1)}`;
}
