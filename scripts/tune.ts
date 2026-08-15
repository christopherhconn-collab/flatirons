/**
 * Report how accurately the pricing engine would have priced real completed
 * jobs, and which single CONFIG value to change to improve it.
 *
 *   npm run tune -- jobs.csv
 *
 * See `jobs.example.csv` for the expected columns. All the logic lives in
 * `src/lib/tuning.ts`; this file is the I/O and the formatting.
 */

import { readFileSync } from "node:fs";
import { CONFIG } from "../src/lib/pricing";
import {
  impliedThroughput,
  parseJobsCsv,
  recommend,
  scoreJobs,
} from "../src/lib/tuning";

/** The build plan's acceptance band for step 2. */
const TARGET_LOW = 0.85;
const TARGET_HIGH = 0.9;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const money = (x: number) =>
  `${x < 0 ? "−" : ""}$${Math.abs(Math.round(x)).toLocaleString()}`;

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npm run tune -- <jobs.csv>");
    console.error("See jobs.example.csv for the expected columns.");
    process.exit(1);
  }

  let csv: string;
  try {
    csv = readFileSync(path, "utf8");
  } catch {
    console.error(`Could not read ${path}.`);
    process.exit(1);
  }

  const { jobs, issues } = parseJobsCsv(csv);

  if (issues.length) {
    console.log(`\n${issues.length} row${issues.length === 1 ? "" : "s"} needed attention:`);
    for (const i of issues.slice(0, 20)) {
      console.log(`  line ${i.row}: ${i.message}`);
    }
    if (issues.length > 20) console.log(`  … and ${issues.length - 20} more.`);
  }

  if (jobs.length === 0) {
    console.error("\nNo usable jobs. Nothing to measure.");
    process.exit(1);
  }

  if (jobs.length < 30) {
    console.log(
      `\nOnly ${jobs.length} jobs. The plan calls for around 60 — below that, a` +
        " sweep is fitting noise as much as signal. Treat what follows as directional.",
    );
  }

  /* — Where we stand ————————————————————————————————————————————————— */

  const now = scoreJobs(jobs);

  console.log(`\n${"═".repeat(64)}`);
  console.log(`ACCURACY — ${now.n} jobs against the current configuration`);
  console.log("═".repeat(64));
  console.log(`  Inside the quoted range   ${now.inside}/${now.n}  ${pct(now.insidePct)}`);
  console.log(`  Quoted too high (under)   ${now.below}  ${pct(now.below / now.n)}`);
  console.log(`  Quoted too low  (over)    ${now.above}  ${pct(now.above / now.n)}`);
  console.log(`  Mean error outside range  ${money(now.meanError)}`);
  console.log(`  Median error              ${money(now.medianError)}`);
  console.log(`  Mean absolute error       ${money(now.meanAbsError)}`);
  if (now.meanHoursError !== undefined) {
    const h = now.meanHoursError;
    console.log(
      `  Mean hours error          ${h >= 0 ? "+" : "−"}${Math.abs(h).toFixed(2)} hrs ` +
        `(${h >= 0 ? "we quote longer than the crew takes" : "the crew runs longer than we quote"})`,
    );
  }

  const verdict =
    now.insidePct >= TARGET_LOW && now.insidePct <= TARGET_HIGH
      ? "On target — 85–90% is where the plan wants this."
      : now.insidePct > TARGET_HIGH
        ? "Above target. The range is wider than it needs to be; a tighter one quotes more precisely."
        : "Below target. The plan's exit test for step 2 is 85%.";
  console.log(`\n  ${verdict}`);

  /* — Throughput read straight off recorded hours ————————————————————— */

  const implied = impliedThroughput(jobs);
  if (implied) {
    console.log(`\n${"═".repeat(64)}`);
    console.log(`THROUGHPUT IMPLIED BY RECORDED HOURS — ${implied.n} jobs`);
    console.log("═".repeat(64));
    console.log(`  Median          ${implied.median.toFixed(2)} units per mover per hour`);
    console.log(`  Mean            ${implied.mean.toFixed(2)}`);
    console.log(`  Middle 80%      ${implied.p10.toFixed(2)} – ${implied.p90.toFixed(2)}`);
    console.log(`  CONFIG.throughput is ${CONFIG.throughput}`);
    console.log(
      "\n  Trust this over the sweep below. Hit-rate cannot pin throughput down:" +
        "\n  a job priced at its true throughput T also lands inside the range for" +
        "\n  every value from 0.9T to 1.15T, so the sweep has a ~28% plateau to sit" +
        "\n  anywhere on. Recorded hours have no such ambiguity." +
        "\n  Jobs billed at the three-hour minimum are excluded — their hours" +
        "\n  describe the floor, not the crew's pace.",
    );
  } else {
    console.log(
      "\n  No job carried recorded hours above the minimum, so throughput can only" +
        "\n  be inferred from the sweep below — which is imprecise by construction." +
        "\n  Add an actual_hours column to get a direct read.",
    );
  }

  /* — What to change ————————————————————————————————————————————————— */

  const ranked = recommend(jobs);
  const top = ranked[0];

  console.log(`\n${"═".repeat(64)}`);
  console.log("RECOMMENDATION");
  console.log("═".repeat(64));

  if (!top || top.gain <= 0) {
    console.log("  No single value improves accuracy. Leave the configuration alone.");
  } else {
    console.log(`  Change ${top.label}`);
    console.log(`    from ${top.current}  to ${top.best}`);
    console.log(
      `    inside the range: ${pct(top.currentInsidePct)} → ${pct(top.bestInsidePct)} ` +
        `(+${(top.gain * 100).toFixed(1)} points)`,
    );
  }

  console.log("\n  Every knob, ranked:");
  for (const r of ranked) {
    const arrow = r.gain > 0 ? `${r.current} → ${r.best}` : `${r.current} (no change)`;
    console.log(
      `    ${r.key.padEnd(15)} ${arrow.padEnd(20)} ${pct(r.bestInsidePct).padStart(7)}` +
        `  ${r.gain > 0 ? `+${(r.gain * 100).toFixed(1)}pts` : "—"}`,
    );
  }

  console.log(
    "\n  These are one-at-a-time sweeps: each row is the best single move from" +
      "\n  where you stand now, not the best combination. Apply one, re-run, repeat.",
  );

  /* — The worst misses ——————————————————————————————————————————————— */

  const misses = now.scores
    .filter((s) => !s.inside)
    .sort((a, b) => Math.abs(b.error) - Math.abs(a.error))
    .slice(0, 10);

  if (misses.length) {
    console.log(`\n${"═".repeat(64)}`);
    console.log(`WORST MISSES — ${Math.min(10, misses.length)} of ${now.n - now.inside}`);
    console.log("═".repeat(64));
    console.log(
      `  ${"job".padEnd(14)}${"quoted".padEnd(20)}${"invoiced".padEnd(12)}error`,
    );
    for (const m of misses) {
      const band = `$${m.low.toLocaleString()}–$${m.high.toLocaleString()}`;
      console.log(
        `  ${m.id.slice(0, 13).padEnd(14)}${band.padEnd(20)}` +
          `${("$" + m.invoice.toLocaleString()).padEnd(12)}${money(m.error)}`,
      );
    }
    console.log(
      "\n  A job far outside the range is usually a data problem, not a pricing" +
        "\n  one — an inventory that was never recorded, or work that was not a move.",
    );
  }

  console.log(
    `\nCurrent configuration: throughput ${CONFIG.throughput}, ` +
      `minHours ${CONFIG.minHours}, range ${CONFIG.range.low}–${CONFIG.range.high}\n`,
  );
}

main();
