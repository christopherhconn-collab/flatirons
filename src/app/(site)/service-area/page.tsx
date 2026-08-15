import type { Metadata } from "next";

import { RouteMap, type MapJob } from "@/components/route-map";
import { SHELL } from "@/lib/site";
import { listJobs } from "@/lib/store";

export const metadata: Metadata = {
  title: "Service area — Flatirons Movers",
  description:
    "Four trucks out of a Commerce City yard, serving Denver, Aurora, Littleton, Golden, Westminster and long-haul across Colorado.",
};

const AREAS = [
  {
    name: "Denver & RiNo",
    note: "Same-week openings · street permits handled",
  },
  { name: "Aurora & Centennial", note: "25 min from the yard" },
  { name: "Littleton & Highlands Ranch", note: "Two crews staged daily" },
  { name: "Golden, Arvada & Lakewood", note: "HOA windows booked for you" },
  { name: "Westminster & Thornton", note: "$45 travel, no mileage" },
  {
    name: "Statewide long-haul",
    note: "Springs, Fort Collins, mountain towns · $1.15/mi",
  },
];

// The map draws today's board, which moves all day.
export const dynamic = "force-dynamic";

export default async function ServiceAreaPage() {
  const jobs = await listJobs();
  // The map draws the board, so leads — which have no crew and no confirmed
  // route — are left off it.
  const routed: MapJob[] = jobs
    .filter((job) => job.status !== "lead")
    .map((job) => ({
      id: job.id,
      customer: job.customer,
      from: job.from,
      to: job.to,
      crew: job.crew,
      status: job.status,
      late: job.late ?? 0,
    }));

  return (
    <div className={`${SHELL} pt-[46px] pb-10`}>
      <div className="grid grid-cols-2 items-start gap-10 max-lg:grid-cols-1">
        <div>
          <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
            Service area
          </p>
          <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
            Denver metro,
            <br />
            and all of Colorado
          </h1>
          <p className="text-body-lg text-ink-lede mb-[22px]">
            Four trucks out of a Commerce City yard. Anywhere inside the metro
            we can usually be there the same week — and we run statewide, from
            Colorado Springs to the Western Slope, at a flat loaded-mile rate.
          </p>

          <div className="gridlines border-line grid-cols-2 border max-sm:grid-cols-1">
            {AREAS.map((area) => (
              <div key={area.name} className="bg-paper px-4 py-3.5">
                <h2 className="font-body text-[15px] leading-[1.2] font-semibold normal-case">
                  {area.name}
                </h2>
                <p className="text-ink-muted mt-[3px] text-[12.5px] leading-[1.5]">
                  {area.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="border border-[rgb(22_40_63/0.2)]">
            <RouteMap jobs={routed} title="Flatirons service area" />
          </div>
          <p className="text-ink-quiet mt-2.5 text-[12px] leading-[1.5]">
            Live board: today’s pickups, drop-offs and crews. Hover a route for
            distance and drive time.
          </p>
        </div>
      </div>
    </div>
  );
}
