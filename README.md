# Flatirons Movers

Marketing site, instant-quote flow, customer portal and office tooling for a
Denver metro moving company.

Built from the design handoff in `design_handoff_flatirons_movers/` — see that
package's `README.md` for the full specification and `CLAUDE_CODE_STEPS.md` for
the staged build order.

## Status

Steps 1 and 2 of the build plan are done.

| Step | What | State |
| --- | --- | --- |
| 1 | Scaffold and design tokens | Done |
| 2 | Pricing engine and tests | Done — tuning against real jobs still outstanding |
| 3 | Database and schema | Not started |
| 4 | Marketing pages | Not started |
| 5 | The estimator | Not started |
| 6+ | Booking, deploy, portal, payments, dispatch, office | Not started |

Two routes exist: `/` is a placeholder index, and `/tokens` is the design-token
reference — every colour as a labelled swatch and every type role at its real
size, for checking side by side against the prototype.

## Local setup

```bash
npm install
npm run dev        # http://localhost:3000
```

No environment variables are needed yet. Nothing here talks to a database or a
third-party service.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build, including a TypeScript check of the tests |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |
| `npm run tune -- jobs.csv` | Score the engine against real completed jobs |

## Layout

```
src/
  app/
    globals.css       Design tokens as a Tailwind v4 @theme, plus base and
                      component layers (.blueprint, .gridlines, .topo, .display)
    layout.tsx        Barlow + Barlow Condensed via next/font
    page.tsx          Placeholder index
    tokens/page.tsx   Design-token reference
  components/
    logo.tsx          Logo, refinement direction 2a
  lib/
    pricing.ts        The pricing engine — server only
    pricing.test.ts   Engine tests
    tuning.ts         Accuracy harness — server only
    tuning.test.ts    Harness tests
```

## The pricing engine

`src/lib/pricing.ts` is a pure, dependency-free port of the prototype's
`quote()` method and its catalogue. It is the most business-critical code in the
project.

**Never import it from a client component.** The prototype computes prices in
the browser for demo purposes; a browser-computed price is user-editable and
therefore not a price. Call it from a server action or at build time.

Every tunable number lives in the exported `CONFIG` object — rates, throughput,
the three-hour minimum, the stair multipliers, the packing formula and the range
multipliers. Logic never has a literal in it.

```ts
import { quote, typicalBands } from "@/lib/pricing";

quote({ counts: { "Sofa, 3-seat": 1, "Medium boxes": 20 }, movers: 3 });
// → { units, hours, rate, extras, low, high, itemCount }

typicalBands(); // the four published bands for the pricing page
```

The published "typical move" bands are computed from the room presets by
`typicalBands()` so the advertised numbers cannot drift from the quotes. Do not
hard-code them into the pricing page.

## Tuning the engine

The constants came from the prototype, not from data. Step 2's real exit test is
that 85–90% of your completed jobs price inside the quoted range, and until that
passes these numbers are a designer's estimate.

Export your last 60 completed jobs in the shape of `jobs-template.xlsx` (or `jobs.example.csv`), then:

```bash
npm run tune -- jobs.csv
```

The report gives you the current hit rate, the throughput implied directly by
recorded hours, a ranked sweep of every tunable, and the ten worst misses.
Apply one change, re-run, repeat. Re-run it quarterly — drifting throughput is
how movers quietly lose money.

**Two things to know before you act on it.**

The sweep optimises the share of jobs landing inside the range, and that measure
cannot pin throughput down: a job whose true throughput is `T` prices inside the
range for every candidate from `0.9T` to `1.15T`, because the range is 0.9×–1.15×
of the point estimate. That is a plateau about 28% wide. Where the crew's real
hours were recorded, `impliedThroughput()` reads throughput straight off them
with no such ambiguity — trust that number, and use the sweep as the sanity
check. Include an `actual_hours` column and you get both.

The sweeps are also one-at-a-time. Each row is the best single move from where
you stand, not the best combination, which is why the workflow is apply-one-then-
re-run rather than apply-everything.

### What the first tuning pass found

60 real Denver jobs, run through the engine:

- **Throughput is right.** Recorded hours imply 9.17 units per mover per hour
  against a configured 9. The labour model needs no change — a genuine result,
  and the thing most likely to have been wrong.
- **Only 45% of jobs priced inside the range, and every single miss was an
  under-quote.** Not one of the 60 invoices came in below the bottom of its
  range. A one-sided error is not a range that needs widening; it is a missing
  charge.
- **The engine never modelled travel.** The pricing page specifies "$45 flat
  metro travel, $1.15/loaded mile beyond" and the prototype's `quote()` omits it
  entirely. Measured against billed hours, every invoice exceeded labour plus
  item surcharges — by $101 at the very least, $180 at the median, 17% of the
  bill. Nothing in the data explained it (best fit R² 0.48), because the driver
  was a column the export never carried.

`CONFIG.travel` now models it, and `quote()` accepts `miles`. Travel is only
charged when miles are supplied, so the published bands stay labour-only and
nothing customer-facing moved.

**The harness recommended widening `range.high` from 1.15 to 1.50, and that
recommendation should be ignored.** It would lift the hit rate to 92% by making
the range so wide that nothing could fall outside it — ±25% on every quote —
while leaving the systematic under-quote untouched. Given the pricing page
promises to absorb overage above the top of the range, hiding a one-sided error
inside a wider band is the expensive way to be wrong.

### Still to do on the engine

- **Re-run with mileage.** The template now has a `miles` column. That one
  column should close most of the gap; re-run and re-check.
- **Decide whether the quote should include travel.** Today the range is a
  labour estimate and the invoice includes travel, so customers exceed the range
  on essentially every job. Either the range should carry travel, or the page
  should say plainly that it does not. This is a product decision.
- **Move `CONFIG` into the database.** The handoff is explicit that these values
  must be changeable without a deploy, and that they will be re-tuned quarterly.
- **Decide the surcharge discrepancy.** `typicalBand()` reproduces the
  prototype's `bandFor()`, which omits per-item surcharges. The published 2-bed
  band therefore sits $40 below what the estimator quotes for the same preset,
  and the 3+-bed band $80 below. See `QuoteOptions.includeSurcharges`.

## Design tokens

Tokens live in the `@theme` block of `src/app/globals.css`, lifted from the
handoff's token table. Three rules matter more than the rest:

- **`border-radius: 0` everywhere.** The radius scale is zeroed and the base
  layer zeroes every element, so no third-party stylesheet can reintroduce a
  curve.
- **1px dividers come from grid gaps, not borders.** Use `.gridlines` and give
  the children an opaque background.
- **Two hues only.** Navy and olive on a warm off-white ground. Do not add a
  third.

Text-opacity colours carry an `ink-` or `cream-` prefix (`text-ink-body`,
`text-cream-muted`) because `text-*` addresses both the colour and the font-size
namespace — a bare `--color-body` would collide with `--text-body`.

Barlow Condensed is always 600 and always uppercase. Headings get that from the
base layer; anything else pairs `.display` with a size, as in
`<div className="display text-stat-sm">`.

## Logo

`src/components/logo.tsx` implements refinement direction **2a, "Trued peaks"** —
three peaks on one baseline with matched slopes and a single olive face, and a
rule under FLATIRONS that lets MOVERS carry its .42em tracking without the
lockup coming apart.

It was chosen because the marketing header is specified as a 40×19 SVG, which is
2a's 96×44 viewBox scaled down; direction 2c's 120×96 slab does not fit that
chrome. 2c is the stronger vehicle decal and is worth revisiting for signage and
truck doors.

## Notes

- Built on Next.js 16, not the 15 named in the build plan — 16 is the current
  release and the App Router APIs the plan relies on are unchanged.
- Responsive breakpoints were never designed. The handoff asks for the mobile
  approach to be agreed before it is built, not improvised from the desktop
  layout.
- Photography does not exist. Do not ship placeholder image slots.
