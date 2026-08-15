import type { Metadata } from "next";

import { PHONE, PHONE_HREF, SHELL } from "@/lib/site";
import { startEstimate } from "@/app/estimate/actions";

export const metadata: Metadata = {
  title: "Commercial moves — Flatirons Movers",
  description:
    "Offices, clinics and labs moved over a weekend. $2M general liability, COI to your building manager, no after-hours premium.",
};

const PROCESS = [
  {
    kicker: "01 · Planning",
    title: ["Walkthrough", "and floor plan"],
    body: "We label to your new seating chart. Every crate gets a room number, every desk gets a photo of its cable run.",
  },
  {
    kicker: "02 · Paperwork",
    title: ["COI in your", "manager’s inbox"],
    body: "$2M general liability, additional insured on request, same day. Loading dock and elevator windows booked by us.",
  },
  {
    kicker: "03 · Cutover",
    title: ["Desks built", "before standup"],
    body: "Monitors mounted, chairs at the right desks, crates collected the following Tuesday at no charge.",
  },
];

const PRICING = [
  { label: "Under 2,000 sq ft", value: "Hourly, 4 movers" },
  { label: "2,000–6,000 sq ft", value: "Flat bid after walkthrough" },
  { label: "Crate rental, per crate / week", value: "$4" },
  { label: "After-hours & weekend", value: "No premium", free: true },
];

export default function CommercialPage() {
  return (
    <div className={`${SHELL} pt-[46px] pb-10`}>
      <header className="mb-[34px] max-w-[70ch]">
        <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
          Commercial
        </p>
        <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
          Closed Friday.
          <br />
          Open Monday.
        </h1>
        <p className="text-body-lg text-ink-lede">
          Offices, clinics and labs across the metro and up the Front Range. We
          work the weekend so your team never loses a day, and we hand building
          management the paperwork before they ask for it.
        </p>
      </header>

      <div className="gridlines border-line mb-[34px] grid-cols-3 border max-md:grid-cols-1">
        {PROCESS.map((step) => (
          <div key={step.kicker} className="blueprint bg-paper border-0 p-[26px]">
            <div className="text-olive mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
              {step.kicker}
            </div>
            <h2 className="text-card-title-sm mb-2.5 text-[24px] leading-[1.1]">
              {step.title[0]}
              <br />
              {step.title[1]}
            </h2>
            <p className="text-body-sm text-ink-body">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 items-start gap-[34px] max-lg:grid-cols-1">
        <div>
          <h2 className="text-h2-sm mb-4 text-[26px]">How commercial is priced</h2>
          <dl className="border-line bg-paper border">
            {PRICING.map((row, i) => (
              <div
                key={row.label}
                className={`flex justify-between px-[18px] py-3.5 text-[15px] leading-[1.3] ${
                  i < PRICING.length - 1
                    ? "border-b border-[rgb(22_40_63/0.1)]"
                    : ""
                }`}
              >
                <dt>{row.label}</dt>
                <dd className={`font-semibold ${row.free ? "text-olive-dark" : ""}`}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-ink-muted mt-3 text-[13px] leading-[1.6]">
            Recent: Baumann Dental (4,200 sq ft, two ops rooms, weekend), Reyes
            Design (studio of 11), Meadow Labs (cold storage, chain of custody).
          </p>
        </div>

        <div className="blueprint bg-olive-wash p-6">
          <h2 className="text-card-title-sm mb-2.5 text-[24px] leading-[1.05]">
            Book a walkthrough
          </h2>
          <p className="mb-[18px] text-[14.5px] leading-[1.6] text-[rgb(22_40_63/0.72)]">
            Thirty minutes on site, a flat bid in two business days, and a named
            project lead who answers their phone on move day.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <form action={startEstimate}>
              <button
                type="submit"
                className="bg-ink text-paper text-btn-sm interactive px-5 py-3.5 text-[13px]"
              >
                Request a bid
              </button>
            </form>
            <a
              href={PHONE_HREF}
              className="text-olive-dark grid place-items-center text-[13px] leading-none font-medium"
            >
              or call {PHONE}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
