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
    pricing.test.ts   45 tests
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

### Still to do on the engine

- **Tune it against real jobs.** The constants came from the prototype, not from
  data. Step 2 of the build plan calls for running 60 completed jobs through the
  engine and adjusting `CONFIG.throughput` and the range multipliers until 85–90%
  of them land inside the quoted range. Until that is done, these prices are a
  designer's estimate.
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
