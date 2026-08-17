import type { Metadata } from "next";
import Link from "next/link";

import { LogoLockup } from "@/components/logo";
import { authEnabled, requireStaffAccess } from "@/lib/auth";
import { dateLabel, money } from "@/lib/format";
import type { Job } from "@/lib/jobs";
import { todayISO } from "@/lib/session";
import { nextAction, officeStats, weekCapacity, assignedToday } from "@/lib/staff";
import { listCrews, listJobs } from "@/lib/store";
import { advanceJobStage } from "../dispatch/actions";

export const metadata: Metadata = {
  title: "Office — Flatirons Movers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FILTERS = ["All", "New", "Quoted", "Booked"] as const;

function matchesFilter(job: Job, filter: string): boolean {
  if (filter === "All") return true;
  if (filter === "New") return job.stage === "New" || job.stage === "Survey set";
  return job.stage === filter;
}

function matchesQuery(job: Job, q: string): boolean {
  if (!q) return true;
  const hay =
    `${job.customer} ${job.phone} ${job.from} ${job.to}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

/**
 * The office pipeline — the handoff's screen 6, backed by the real store.
 *
 * Search and the stage filter are GET params, so the whole page works with
 * JavaScript off and every view is a bookmarkable URL. A row click opens the
 * customer's portal; the stage chip advances the stage (staff being staff,
 * that also promotes a Booked lead onto the dispatch board).
 */
export default async function OfficePage(props: PageProps<"/office">) {
  await requireStaffAccess("/office");

  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const rawFilter = typeof params.stage === "string" ? params.stage : "All";
  const filter = (FILTERS as readonly string[]).includes(rawFilter)
    ? rawFilter
    : "All";

  const [jobs, crews] = await Promise.all([listJobs(), listCrews()]);
  const today = todayISO();
  const stats = officeStats(jobs, today.slice(0, 7));
  const action = nextAction(jobs);
  const week = weekCapacity(jobs, crews, today);
  const roster = assignedToday(jobs, crews, today);

  const rows = jobs
    .filter((j) => matchesFilter(j, filter) && matchesQuery(j, q))
    .sort((a, b) => b.createdAt - a.createdAt);

  const countFor = (f: string) => jobs.filter((j) => matchesFilter(j, f)).length;

  return (
    <div className="bg-bg min-h-dvh px-6 py-5 max-md:px-4">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Flatirons Movers, home">
            <LogoLockup markWidth={28} wordSize={13} subSize={7} gap={9} />
          </Link>
          <span className="text-ink-disabled">·</span>
          <h1 className="text-ink text-[15px] font-semibold tracking-[0.14em] uppercase">
            Office
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <form action="/office" className="flex">
            {filter !== "All" && (
              <input type="hidden" name="stage" value={filter} />
            )}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, phone, address"
              className="border-line-strong bg-paper w-[260px] border p-2.5 text-[13px] max-md:w-[180px]"
            />
          </form>
          <Link
            href="/dispatch"
            className="border-line-strong text-ink border px-3 py-2 text-[10.5px] leading-none font-medium tracking-[0.14em] uppercase"
          >
            Dispatch
          </Link>
          {authEnabled() && (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-ink-quiet text-[10.5px] leading-none font-medium tracking-[0.14em] uppercase"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>

      <div className="grid grid-cols-[1fr_300px] gap-5 max-lg:grid-cols-1">
        {/* ── Left: filter, table, stats ─────────────────────────────────── */}
        <div>
          <div className="mb-3 flex gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f}
                href={
                  f === "All"
                    ? q
                      ? `/office?q=${encodeURIComponent(q)}`
                      : "/office"
                    : `/office?stage=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`
                }
                className={`px-3 py-2 text-[11px] leading-none font-medium tracking-[0.1em] uppercase ${
                  filter === f
                    ? "bg-olive text-paper"
                    : "border-line-strong text-ink-muted border"
                }`}
              >
                {f} · {countFor(f)}
              </Link>
            ))}
          </div>

          <div className="bg-grid border-line-strong grid grid-cols-[1.4fr_1.6fr_0.9fr_0.9fr_0.8fr] gap-px border max-md:hidden">
            {["Customer", "Move", "Date", "Estimate", "Stage"].map((h) => (
              <div
                key={h}
                className="bg-surface text-ink px-3 py-2.5 text-[10.5px] leading-none font-semibold tracking-[0.14em] uppercase"
              >
                {h}
              </div>
            ))}
            {rows.map((job) => (
              <Job key={job.id} job={job} />
            ))}
          </div>
          {/* Mobile fallback: same rows, stacked. */}
          <div className="hidden flex-col gap-2 max-md:flex">
            {rows.map((job) => (
              <div key={job.id} className="border-line-strong bg-paper border p-3">
                <Job job={job} stacked />
              </div>
            ))}
          </div>
          {rows.length === 0 && (
            <p className="border-line text-ink-muted mt-3 border border-dashed p-6 text-center text-[13px]">
              No leads match{q ? ` “${q}”` : ""} — clear the search or add one
              by phone: every call is a lead.
            </p>
          )}

          <div className="bg-grid border-line-strong mt-4 grid grid-cols-4 gap-px border max-md:grid-cols-2">
            {[
              { label: "Leads this month", value: String(stats.leads) },
              { label: "Booked", value: String(stats.booked) },
              { label: "Close rate", value: `${stats.closeRate}%` },
              { label: "Avg job value", value: money(stats.averageValue) },
            ].map((cell) => (
              <div key={cell.label} className="bg-paper p-4">
                <p className="text-ink-muted text-[10px] leading-none font-medium tracking-[0.16em] uppercase">
                  {cell.label}
                </p>
                <p className="text-ink mt-2 text-[26px] leading-none font-semibold">
                  {cell.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right rail ─────────────────────────────────────────────────── */}
        <aside className="bg-surface flex flex-col gap-4 p-4">
          <section>
            <h2 className="text-ink mb-2 text-[10.5px] leading-none font-semibold tracking-[0.16em] uppercase">
              Week capacity
            </h2>
            <ul className="flex flex-col">
              {week.map((day, i) => (
                <li
                  key={day.date}
                  className={`flex items-center justify-between gap-2 px-2 py-2 ${
                    i === 0 ? "bg-olive-wash border-olive border-l-2" : ""
                  }`}
                >
                  <span className="text-ink text-[12.5px]">
                    {day.label}{" "}
                    <span className="text-ink-quiet">{day.date.slice(5)}</span>
                  </span>
                  <span className="flex gap-1" aria-label={`${day.booked} of ${day.slots} slots booked`}>
                    {Array.from({ length: day.slots }, (_, slot) => (
                      <span
                        key={slot}
                        className={`h-2 w-2 ${
                          slot < day.booked
                            ? "bg-olive"
                            : "border-line-strong border"
                        }`}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="blueprint bg-paper border-line-strong border p-3.5">
            <h2 className="text-olive mb-2 text-[10px] leading-none font-medium tracking-[0.18em] uppercase">
              Next action
            </h2>
            {action.kind === "call" && (
              <>
                <p className="text-ink text-[14px] leading-[1.5] font-semibold">
                  Call {action.job.customer} — new lead,{" "}
                  {action.ageHours < 1
                    ? "under an hour old"
                    : `${Math.round(action.ageHours)} hrs old`}
                </p>
                <p className="text-ink-muted mt-1 text-[12.5px] leading-[1.5]">
                  Leads called inside four hours book three times more often.
                </p>
                <a
                  href={`tel:${action.job.phone.replace(/\D/g, "")}`}
                  className="bg-olive text-paper interactive mt-3 block py-2.5 text-center text-[11px] leading-none font-semibold tracking-[0.1em] uppercase"
                >
                  Call {action.job.phone}
                </a>
              </>
            )}
            {action.kind === "assign" && (
              <>
                <p className="text-ink text-[14px] leading-[1.5] font-semibold">
                  {action.job.customer} is booked for{" "}
                  {dateLabel(action.job.date)} with no crew
                </p>
                <Link
                  href="/dispatch"
                  className="bg-olive text-paper interactive mt-3 block py-2.5 text-center text-[11px] leading-none font-semibold tracking-[0.1em] uppercase"
                >
                  Assign on dispatch
                </Link>
              </>
            )}
            {action.kind === "clear" && (
              <p className="text-ink-muted text-[13px] leading-[1.55]">
                Board is clean — every lead is called, every job has a crew.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-ink mb-2 text-[10.5px] leading-none font-semibold tracking-[0.16em] uppercase">
              Assigned today
            </h2>
            <ul className="flex flex-col gap-1.5">
              {roster.map((row) => (
                <li
                  key={row.crew}
                  className="flex items-baseline justify-between gap-2 text-[12.5px]"
                >
                  <span className="text-ink">{row.crew}</span>
                  <span className={row.customer ? "text-olive-dark" : "text-ink-quiet"}>
                    {row.customer ?? "Open"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** One table row (or stacked card on mobile). */
function Job({ job, stacked = false }: { job: Job; stacked?: boolean }) {
  const cells = (
    <>
      <div className={stacked ? "" : "bg-paper px-3 py-2.5"}>
        <Link href={`/move/${job.id}`} className="text-ink text-[13.5px] font-semibold hover:underline">
          {job.customer}
        </Link>
        <p className="text-ink-muted text-[11.5px]">{job.phone}</p>
      </div>
      <div className={`text-ink-body text-[12.5px] leading-[1.45] ${stacked ? "mt-1" : "bg-paper px-3 py-2.5"}`}>
        {job.from} → {job.to}
      </div>
      <div className={`text-ink-body text-[12.5px] ${stacked ? "mt-1" : "bg-paper px-3 py-2.5"}`}>
        {job.date ? dateLabel(job.date) : "Not set"}
      </div>
      <div className={`text-ink-body text-[12.5px] ${stacked ? "mt-1" : "bg-paper px-3 py-2.5"}`}>
        {job.low ? `${money(job.low)}–${money(job.high)}` : "—"}
      </div>
      <div className={stacked ? "mt-2" : "bg-paper px-3 py-2.5"}>
        <form action={advanceJobStage}>
          <input type="hidden" name="id" value={job.id} />
          <button
            type="submit"
            title="Advance stage"
            className={`px-2 py-1.5 text-[10px] leading-none font-medium tracking-[0.1em] uppercase ${
              job.stage === "Booked" || job.stage === "Complete"
                ? "bg-olive text-paper"
                : job.stage === "New"
                  ? "bg-ink text-paper"
                  : "border-line-strong text-ink border"
            }`}
          >
            {job.stage}
          </button>
        </form>
      </div>
    </>
  );
  return cells;
}
