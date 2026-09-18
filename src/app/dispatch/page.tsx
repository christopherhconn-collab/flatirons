import type { Metadata } from "next";
import Link from "next/link";

import { LogoLockup } from "@/components/logo";
import { LiveRefresh } from "@/components/portal-bits";
import { RouteMap } from "@/components/route-map";
import { authEnabled, requireStaffAccess } from "@/lib/auth";
import { dateLabel, money } from "@/lib/format";
import type { Job } from "@/lib/jobs";
import { cancellationFor, invoiceOf, isLive, priceRange } from "@/lib/jobs";
import { todayISO } from "@/lib/session";
import {
  assignedToday,
  billedToday,
  busyCrews,
  dispatchStats,
} from "@/lib/staff";
import { listCrews, listJobs } from "@/lib/store";
import { stripeConfigProblem, stripeEnabled } from "@/lib/stripe";
import {
  advanceJobStatus,
  assignJobCrew,
  cancelJobAndCharge,
  chargeSavedCard,
  recordPayment,
} from "./actions";

export const metadata: Metadata = {
  title: "Dispatch — Flatirons Movers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ADVANCE_LABEL: Partial<Record<Job["status"], string>> = {
  scheduled: "Send en route",
  enroute: "Mark arrived",
  onsite: "Close out job",
};

/**
 * What a money action's outcome says to the office.
 *
 * Every one of these is actionable — three of the four failures are ordinary
 * business outcomes and each has a different next step, so they do not
 * collapse into "something went wrong".
 */
const CHARGE_OUTCOME: Record<string, string> = {
  ok: "Charged to the card on file. Stripe has emailed the receipt.",
  no_card: "No card on file — take payment by phone and record it here.",
  authentication_required:
    "The bank wants the cardholder. Ask the customer to pay from their portal.",
  declined: "The card was declined. Call the customer for another one.",
  error: "Stripe couldn't be reached. Nothing was charged — try again.",
};

const CANCEL_OUTCOME: Record<string, string> = {
  ok: "Cancelled. The day is free.",
  uncollected:
    "Cancelled, but the late fee was not charged — Stripe is not configured. Invoice it by hand.",
  no_card: "Cancelled. No card on file, so the late fee is uncollected.",
  authentication_required:
    "Cancelled. The late fee needs the cardholder — invoice it by hand.",
  declined: "Cancelled. The late fee was declined — invoice it by hand.",
  error: "Cancelled. Stripe couldn't be reached, so the late fee is unpaid.",
};

const STATUS_LABEL: Record<string, string> = {
  enroute: "En route",
  onsite: "On site",
  scheduled: "Scheduled",
};

/** One job card. The flag chip and metadata line follow the handoff. */
function JobCard({
  job,
  crews,
  busy,
}: {
  job: Job;
  crews: { name: string; size: number }[];
  busy: ReadonlySet<string>;
}) {
  const advance = ADVANCE_LABEL[job.status];
  const complete = job.status === "complete";
  // What calling this job off costs right now. Shown on the button so the
  // dispatcher knows before they press it, not after.
  const cancellation = cancellationFor(job);
  const flag =
    job.late && !complete
      ? `${job.late} min late`
      : Object.keys(job.counts).some((n) => n === "Upright piano")
        ? "Piano"
        : complete
          ? "Signed"
          : `${job.movers} movers`;

  return (
    <article
      className={`border p-3.5 ${
        job.status === "unassigned"
          ? "border-olive bg-[rgb(223_231_210/0.06)]"
          : "border-[rgb(223_231_210/0.2)] bg-[rgb(223_231_210/0.04)]"
      } ${complete ? "opacity-70" : ""}`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h3 className="text-[14.5px] leading-tight font-semibold text-[#f7f6f2]">
          {job.customer}
        </h3>
        <span
          className={`px-1.5 py-1 text-[9.5px] leading-none font-medium tracking-[0.12em] uppercase ${
            job.late && !complete
              ? "bg-olive-pale text-ink"
              : "border border-[rgb(223_231_210/0.35)] text-[rgb(223_231_210/0.8)]"
          }`}
        >
          {flag}
        </span>
      </div>
      <p className="text-[12.5px] leading-[1.45] text-[rgb(247_246_242/0.72)]">
        {job.from} → {job.to}
      </p>
      <p className="text-olive-pale mt-1 text-[11.5px] leading-[1.4]">
        {job.window}
        {job.crew ? ` · ${job.crew}` : ""}
        {complete
          ? ` · ${(job.hours ?? 0).toFixed(1)} hrs · ${money(invoiceOf(job).total)}`
          : job.low
            ? ` · ${priceRange(job)}`
            : ""}
      </p>

      {job.status === "unassigned" && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {crews.map((crew) => (
            <form key={crew.name} action={assignJobCrew}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="crew" value={crew.name} />
              <button
                type="submit"
                disabled={busy.has(crew.name)}
                title={
                  busy.has(crew.name)
                    ? `${crew.name} is on a job`
                    : `Assign ${crew.name}`
                }
                className="border border-[rgb(223_231_210/0.4)] px-2 py-1.5 text-[10.5px] leading-none font-medium text-[#dfe7d2] uppercase disabled:opacity-35"
              >
                {crew.name.replace("Crew ", "")} · {crew.size}
              </button>
            </form>
          ))}
        </div>
      )}

      {advance && (
        <form action={advanceJobStatus} className="mt-2.5">
          <input type="hidden" name="id" value={job.id} />
          <button
            type="submit"
            className="bg-olive text-paper interactive w-full py-2 text-[11px] leading-none font-semibold tracking-[0.1em] uppercase"
          >
            {advance}
          </button>
        </form>
      )}

      {!complete && job.status !== "cancelled" && (
        <form action={cancelJobAndCharge} className="mt-1.5">
          <input type="hidden" name="id" value={job.id} />
          <button
            type="submit"
            title={
              cancellation.late
                ? `Inside the notice window — ${money(cancellation.feeCents / 100)} will be charged to the card on file`
                : "Outside the notice window — free to cancel"
            }
            className="w-full border border-[rgb(223_231_210/0.3)] py-2 text-[10.5px] leading-none font-medium tracking-[0.1em] text-[rgb(223_231_210/0.75)] uppercase"
          >
            {cancellation.late
              ? `Cancel · ${money(cancellation.feeCents / 100)} fee`
              : "Cancel · free"}
          </button>
        </form>
      )}
    </article>
  );
}

/**
 * The dispatch board — the handoff's screen 5, backed by the real store.
 *
 * Staff only (`requireStaffAccess`); every action re-checks. The schedule
 * strip's drag-and-drop and the "+ New job" form are not in this build — the
 * crew chips and advance buttons cover the day's actual operations, and
 * README's "deliberately not here" list says why the rest waits.
 */
export default async function DispatchPage(props: PageProps<"/dispatch">) {
  await requireStaffAccess("/dispatch");

  // What the last money action did, carried back in the query string. Both
  // actions redirect here rather than failing silently — an uncollected bill
  // nobody hears about is worse than a declined card somebody does.
  const params = await props.searchParams;
  const one = (key: string) =>
    typeof params[key] === "string" ? params[key] : null;
  const jobRef = one("job");
  const notice =
    (one("charge") && CHARGE_OUTCOME[one("charge")!]) ||
    (one("cancel") && CANCEL_OUTCOME[one("cancel")!]) ||
    null;
  const noticeOk = one("charge") === "ok" || one("cancel") === "ok";

  const [jobs, crews] = await Promise.all([listJobs(), listCrews()]);
  const today = todayISO();
  const stats = dispatchStats(jobs, today);
  const busy = busyCrews(jobs);
  const anyLive = jobs.some(isLive);
  // Null when Stripe is off altogether, which is a choice; a string only when
  // the key is set and unusable, which is a mistake.
  const stripeMisconfigured = process.env.STRIPE_SECRET_KEY?.trim()
    ? stripeConfigProblem()
    : null;

  const columns: { title: string; jobs: Job[] }[] = [
    { title: "Unassigned", jobs: jobs.filter((j) => j.status === "unassigned") },
    { title: "Scheduled", jobs: jobs.filter((j) => j.status === "scheduled") },
    {
      title: "In progress",
      jobs: jobs.filter((j) => j.status === "enroute" || j.status === "onsite"),
    },
    {
      title: "Complete",
      jobs: jobs.filter((j) => j.status === "complete" && j.date === today),
    },
  ];

  const invoices = jobs.filter((j) => j.status === "complete");
  const roster = assignedToday(jobs, crews, today);

  return (
    <div className="bg-ink-deep min-h-dvh px-6 py-5 max-md:px-4">
      {anyLive && <LiveRefresh />}

      {/* A key that cannot work is worse than no key: every money button on
          this board is dead and nothing says so until someone presses one.
          Shown only for a key that is present and wrong — an unset key is the
          ordinary state in development and must not nag. */}
      {stripeMisconfigured && (
        <p
          role="alert"
          className="border-olive-pale mb-4 border bg-[rgb(223_231_210/0.12)] p-3 text-[12.5px] leading-[1.5] text-[#f7f6f2]"
        >
          <strong className="font-semibold">Card payments are off.</strong>{" "}
          {stripeMisconfigured} Until it is fixed, take payment another way and
          record it here — no card can be saved or charged.
        </p>
      )}

      {notice && (
        <p
          role="status"
          className={`mb-4 border p-3 text-[12.5px] leading-[1.5] ${
            noticeOk
              ? "border-olive bg-[rgb(223_231_210/0.08)] text-[#dfe7d2]"
              : "border-olive-pale bg-[rgb(223_231_210/0.12)] text-[#f7f6f2]"
          }`}
        >
          {jobRef ? `${jobRef} — ` : ""}
          {notice}
        </p>
      )}

      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Flatirons Movers, home">
            <LogoLockup markWidth={28} wordSize={13} subSize={7} gap={9} tone="dark" />
          </Link>
          <span className="text-[rgb(223_231_210/0.35)]">·</span>
          <h1 className="text-[15px] font-semibold tracking-[0.14em] text-[#f7f6f2] uppercase">
            Dispatch
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[13px] text-[rgb(247_246_242/0.65)]">
            {dateLabel(today)} · {columns.reduce((n, c) => n + c.jobs.length, 0)}{" "}
            jobs
          </p>
          <Link
            href="/office"
            className="border border-[rgb(223_231_210/0.35)] px-3 py-2 text-[10.5px] leading-none font-medium tracking-[0.14em] text-[#dfe7d2] uppercase"
          >
            Office
          </Link>
          {authEnabled() && (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-[10.5px] leading-none font-medium tracking-[0.14em] text-[rgb(223_231_210/0.55)] uppercase"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>

      {/* ── Stat cells ──────────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-4 gap-px bg-[rgb(223_231_210/0.14)] max-md:grid-cols-2">
        {[
          { label: "Unassigned", value: String(stats.unassigned) },
          { label: "In progress", value: String(stats.inProgress) },
          { label: "Hours billed", value: stats.hoursBilled.toFixed(1) },
          { label: "Running late", value: String(stats.late) },
        ].map((cell) => (
          <div key={cell.label} className="bg-ink-deep p-4">
            <p className="text-[10px] leading-none font-medium tracking-[0.18em] text-[rgb(223_231_210/0.55)] uppercase">
              {cell.label}
            </p>
            <p className="mt-2 text-[30px] leading-none font-semibold text-[#f7f6f2]">
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Kanban + rail ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_280px] gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
        {columns.map((column) => (
          <section key={column.title}>
            <h2 className="mb-2.5 text-[10.5px] leading-none font-semibold tracking-[0.18em] text-[rgb(223_231_210/0.6)] uppercase">
              {column.title} · {column.jobs.length}
            </h2>
            <div className="flex flex-col gap-2.5">
              {column.jobs.length === 0 ? (
                <p className="border border-dashed border-[rgb(223_231_210/0.25)] p-4 text-center text-[11.5px] text-[rgb(223_231_210/0.4)]">
                  Nothing here
                </p>
              ) : (
                column.jobs.map((job) => (
                  <JobCard key={job.id} job={job} crews={crews} busy={busy} />
                ))
              )}
            </div>
          </section>
        ))}

        {/* Right rail */}
        <aside className="flex flex-col gap-4">
          <section className="border border-[rgb(223_231_210/0.2)] p-3.5">
            <h2 className="mb-2.5 text-[10.5px] leading-none font-semibold tracking-[0.18em] text-[rgb(223_231_210/0.6)] uppercase">
              Crews
            </h2>
            <ul className="flex flex-col gap-2">
              {roster.map((row) => (
                <li
                  key={row.crew}
                  className="flex items-baseline justify-between gap-2 text-[12.5px]"
                >
                  <span className="text-[#f7f6f2]">{row.crew}</span>
                  <span
                    className={
                      row.status && STATUS_LABEL[row.status]
                        ? "text-olive-pale"
                        : "text-[rgb(223_231_210/0.45)]"
                    }
                  >
                    {row.customer
                      ? `${STATUS_LABEL[row.status ?? ""] ?? "Assigned"} · ${row.customer}`
                      : "Available"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-[rgb(223_231_210/0.2)] p-3.5">
            <h2 className="mb-2.5 text-[10.5px] leading-none font-semibold tracking-[0.18em] text-[rgb(223_231_210/0.6)] uppercase">
              Invoices
            </h2>
            <ul className="flex flex-col gap-1.5">
              {invoices.map((job) => (
                <li key={job.id}>
                  <form
                    action={recordPayment}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <input type="hidden" name="id" value={job.id} />
                    <span className="text-[12.5px] text-[#f7f6f2]">
                      {job.id} · {money(invoiceOf(job).total)}
                    </span>
                    <button
                      type="submit"
                      title={
                        job.paid
                          ? "Recorded paid — press to undo"
                          : "Record a payment taken by the crew or phone"
                      }
                      className={`px-2 py-1 text-[9.5px] leading-none font-medium tracking-[0.12em] uppercase ${
                        job.paid
                          ? "bg-olive text-paper"
                          : "border border-[rgb(223_231_210/0.4)] text-[#dfe7d2]"
                      }`}
                    >
                      {job.paid ? "Paid" : "Due"}
                    </button>
                  </form>
                  {!job.paid && job.cardOnFileAt && stripeEnabled() && (
                    <form action={chargeSavedCard} className="mt-1">
                      <input type="hidden" name="id" value={job.id} />
                      <button
                        type="submit"
                        className="w-full border border-[rgb(223_231_210/0.3)] py-1.5 text-[9.5px] leading-none font-medium tracking-[0.12em] text-[#dfe7d2] uppercase"
                      >
                        Charge •••• {job.cardLast4 ?? "card"}
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-[rgb(223_231_210/0.16)] pt-2.5 text-[11px] text-[rgb(223_231_210/0.55)]">
              Billed today{" "}
              <span className="text-olive-pale font-semibold">
                {money(billedToday(jobs, today))}
              </span>
            </p>
          </section>
        </aside>
      </div>

      {/* ── Routing map ─────────────────────────────────────────────────── */}
      <section className="mt-5">
        <h2 className="mb-2.5 text-[10.5px] leading-none font-semibold tracking-[0.18em] text-[rgb(223_231_210/0.6)] uppercase">
          Today&rsquo;s routes
        </h2>
        <RouteMap
          jobs={jobs
            .filter((j) => j.date === today && j.status !== "lead")
            .map((j) => ({
              id: j.id,
              customer: j.customer,
              from: j.from,
              to: j.to,
              crew: j.crew,
              status: j.status,
              late: j.late ?? 0,
            }))}
        />
      </section>
    </div>
  );
}
