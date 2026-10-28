import {
  CONTROLLERS,
  DU_TARGET,
  HOLLY_RESULTS,
  RUNTIME_MIN,
  type Verdict,
  type ZoneResult,
} from "@/lib/irrigation";
import { SHELL } from "@/lib/site";

/**
 * The 4343 Holly audit — every figure computed in `lib/irrigation.ts` from
 * the raw catch-cup readings; nothing here is typed in from the report.
 */

const pct = (du: number) => `${(du * 100).toFixed(1)}%`;

export function HollyCaseStudy() {
  const asFound = HOLLY_RESULTS.filter((r) => r.status === "as-found");
  const passing = asFound.filter((r) => r.verdict === "Pass").length;
  const cupCount = HOLLY_RESULTS.reduce((sum, r) => sum + r.cups.length, 0);
  const find = (controller: string, zone: number, status: ZoneResult["status"]) =>
    HOLLY_RESULTS.find((r) => r.controller === controller && r.zone === zone && r.status === status)!;
  const porticoBefore = find("CB2", 2, "as-found");
  const porticoAfter = find("CB2", 2, "retrofitted");
  const cb1Retrofit = find("CB1", 1, "retrofitted");
  const worstRemaining = find("CB2", 3, "as-found");

  return (
    <section id="holly" className={`${SHELL} scroll-mt-20 pt-14`} aria-labelledby="holly-h">
      <p className="text-kicker text-olive-dark mb-3 uppercase">Case study · August 2026</p>
      <h2 id="holly-h" className="text-h2 mb-4">
        4343 Holly
      </h2>
      <p className="text-body-lg text-ink-lede mb-8 max-w-[760px]">
        A large residential property with roughly 86 zones across several
        controllers. Phase 1 started at two of them: a walk-through, then a
        catch-cup audit of every working zone we could reach. Here’s what{" "}
        {cupCount} cups said.
      </p>

      <div className="border-line bg-paper mb-8 grid grid-cols-4 border max-md:grid-cols-2">
        <Stat value={String(cupCount)} label="Catch-cup readings" />
        <Stat value={`${passing} of ${asFound.length}`} label="As-found zones passing" />
        <Stat value={pct(porticoBefore.du)} label="Worst zone, as found" />
        <Stat value={pct(cb1Retrofit.du)} label="Best zone — already retrofitted" />
      </div>

      <h3 className="text-card-title-sm mb-3">Zone by zone</h3>
      <p className="text-meta text-ink-muted mb-3">
        {CONTROLLERS.map((c) => `${c.id}: ${c.location.toLowerCase()}, ${c.zonesFunctional} of ${c.zonesTotal} zones working`).join(" · ")}
      </p>
      <div className="border-line bg-paper overflow-x-auto border">
        <table className="text-dense w-full min-w-[640px] border-collapse">
          <thead className="bg-surface">
            <tr className="text-th text-ink-muted uppercase">
              <th className="px-4 py-3 text-left font-medium">Zone</th>
              <th className="px-4 py-3 text-left font-medium">Heads</th>
              <th className="px-4 py-3 text-right font-medium">Cups</th>
              <th className="px-4 py-3 text-right font-medium">PR in/hr</th>
              <th className="w-[34%] px-4 py-3 text-left font-medium">Uniformity (DU)</th>
              <th className="px-4 py-3 text-left font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {HOLLY_RESULTS.map((r) => (
              <tr key={`${r.controller}-${r.zone}-${r.status}`} className="border-t border-[rgb(22_40_63/0.1)]">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold">
                    {r.controller} · Zone {r.zone}
                  </span>
                  {r.status === "retrofitted" && (
                    <span className="bg-olive-wash text-olive-dark ml-2 px-1.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase">
                      Retrofitted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{r.heads.length}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.cups.length}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.prInHr.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <DuBar du={r.du} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <VerdictChip verdict={r.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-meta text-ink-muted mt-3">
        The marker on each bar is the {DU_TARGET * 100}% pass line. PR is
        the zone’s mean catch over a {RUNTIME_MIN}-minute run.
      </p>

      <div className="mt-12 grid grid-cols-[1fr_1fr] gap-[34px] max-lg:grid-cols-1">
        <div>
          <h3 className="text-card-title-sm mb-2">The driveway zone, before and after</h3>
          <p className="text-body-sm text-ink-body mb-5">
            {porticoBefore.note} Most cups caught next to nothing while a
            few by the sprays flooded. Every bar below is one cup, grouped
            by head.
          </p>
          <CupStrip result={porticoBefore} caption={`As found — DU ${pct(porticoBefore.du)}, ${porticoBefore.prInHr.toFixed(2)} in/hr`} />
          <CupStrip result={porticoAfter} caption={`Retrofitted — DU ${pct(porticoAfter.du)}, ${porticoAfter.prInHr.toFixed(2)} in/hr`} />
          <p className="text-body-sm text-ink-body mt-4">
            {porticoAfter.note} Uniformity nearly tripled. It’s still short
            of {DU_TARGET * 100}%, so the zone is booked for a coverage
            recheck around the relocated heads, with the high cups
            re-read.
          </p>
        </div>

        <div className="blueprint bg-surface p-6">
          <h3 className="text-card-title-sm mb-4">What the audit found</h3>
          <ul className="text-body-sm grid gap-4">
            <li>
              <strong className="font-semibold">Poor uniformity was a hardware problem, not a design one.</strong>{" "}
              Mixed body series, mixed nozzles and heads off level on a
              shared valve — so no run time could ever water the zone
              evenly.
            </li>
            <li>
              <strong className="font-semibold">The standard retrofit works.</strong>{" "}
              The one zone already on Hunter PRS-40 bodies and MP3000
              nozzles measured {pct(cb1Retrofit.du)} — the best on the
              property, at {cb1Retrofit.prInHr.toFixed(2)} in/hr.
            </li>
            <li>
              <strong className="font-semibold">Fix the worst first.</strong>{" "}
              Retrofit priority runs CB2 Zone 3 ({pct(worstRemaining.du)}),
              then CB1 Zone 4, then CB2 Zones 4 and 6 — each priced per head
              from the head-by-head readings.
            </li>
            <li>
              <strong className="font-semibold">Still to come.</strong>{" "}
              Four CB1 valve boxes to locate, four more CB2 zones to test,
              the remaining controllers, and Phase 2 diagnostics on the
              stations that don’t run at all.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-line border-r px-5 py-5 last:border-r-0 max-md:border-b max-md:nth-[2n]:border-r-0">
      <div className="display text-stat-sm mb-2">{value}</div>
      <div className="text-label text-ink-muted uppercase">{label}</div>
    </div>
  );
}

function DuBar({ du }: { du: number }) {
  const pass = du >= DU_TARGET;
  return (
    <div className="flex items-center gap-3">
      <div className="bg-surface relative h-2.5 flex-1" aria-hidden="true">
        <div className={`h-full ${pass ? "bg-olive" : "bg-ink"}`} style={{ width: `${Math.min(du, 1) * 100}%` }} />
        <div className="bg-olive-dark absolute -top-1 -bottom-1 w-0.5" style={{ left: `${DU_TARGET * 100}%` }} />
      </div>
      <span className="w-[46px] text-right font-semibold tabular-nums">{pct(du)}</span>
    </div>
  );
}

const VERDICT_STYLE: Record<Verdict, string> = {
  Pass: "bg-olive text-paper",
  "Marginal fail": "bg-olive-wash text-olive-dark",
  Fail: "bg-surface text-ink",
  "Severe fail": "bg-ink text-paper",
};

function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`${VERDICT_STYLE[verdict]} px-2 py-1 text-[10.5px] font-semibold tracking-[0.12em] uppercase`}>
      {verdict}
    </span>
  );
}

/** One bar per catch cup, grouped by head — the shape of a zone's coverage. */
function CupStrip({ result, caption }: { result: ZoneResult; caption: string }) {
  const max = 50;
  return (
    <figure className="mb-5">
      <div
        className="border-line bg-paper flex h-[96px] items-end gap-3 border px-3 pt-3"
        role="img"
        aria-label={`${caption}. Cup readings in mL: ${result.cups.join(", ")}.`}
      >
        {result.heads.map((cups, h) => (
          <div key={h} className="flex h-full flex-1 items-end gap-[3px]">
            {cups.map((ml, c) => (
              <div
                key={c}
                className="bg-olive flex-1"
                style={{ height: `${Math.max(2, (Math.min(ml, max) / max) * 100)}%` }}
                title={`Head ${h + 1}, cup ${c + 1}: ${ml} mL`}
              />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="text-meta text-ink-muted mt-2">{caption}</figcaption>
    </figure>
  );
}
