# Flatirons Movers

Marketing site, instant-quote flow and customer tracking portal for a Denver
metro moving company.

Built from the design handoff in `design_handoff_flatirons_movers/` — see that
package's `README.md` for the full specification and `CLAUDE_CODE_STEPS.md` for
the staged build order.

## Status

| Step | What | State |
| --- | --- | --- |
| 1 | Scaffold and design tokens | Done |
| 2 | Pricing engine and tests | Done — tuning against real jobs still outstanding |
| 3 | Database and schema | Done — Postgres behind Prisma, with migrations and a seed script |
| 4 | Marketing pages | Done — desktop as designed; mobile is a fallback, not a design |
| 5 | The estimator | Done |
| 6 | Booking | Done, minus the third-party services (no Resend, Twilio, Places or Distance Matrix) |
| 7 | Deploy | Not started |
| 8 | Customer portal | Done, minus magic-link auth |
| 9 | Payments | Bill of lading and review prompt done; Stripe not wired |
| 10–11 | Dispatch integration, office dashboard | Not started |

Routes:

| Route | What |
| --- | --- |
| `/` | Home — hero, stats, rates, hero quote form, three service cards |
| `/pricing` | Rate cards, add-ons, computed typical-move bands, the rules |
| `/service-area` | Areas served and the live Leaflet routing map |
| `/commercial` | Process, commercial pricing, walkthrough CTA |
| `/reviews` | Published reviews, average and count recomputed from the store |
| `/estimate` | The four-step estimator with the persistent price rail |
| `/track` | Reference lookup into the portal |
| `/move/[id]` | The customer's tracking portal |
| `/tokens` | Design-token reference, for checking against the prototype |

## Local setup

You need Postgres. Anything from a local install to a Supabase project will do
— the app only ever sees `DATABASE_URL`.

```bash
cp .env.example .env          # then point DATABASE_URL at your database
npm install                   # `postinstall` generates the Prisma client
npm run db:migrate            # apply migrations
npm run db:seed               # catalogue, four crews, fixture jobs and reviews
npm run dev                   # http://localhost:3000
```

`npm run db:seed` is safe to re-run: the catalogue, crews and reference counter
are upserted, and fixture jobs are left alone if any job already exists. Pass
`-- --force` to wipe and rewrite them.

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Required. |
| `NEXT_PUBLIC_SITE_URL` | Used by `src/app/sitemap.ts`; falls back to the production hostname. |

**On Supabase specifically:** use the pooled connection string (pgbouncer, port
6543) for the app and the direct one (port 5432) for `db:migrate` and
`db:deploy`. Migrations need a session-mode connection that a transaction
pooler will not give them.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build, including a TypeScript check of the tests |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |
| `npm run db:migrate` | Create and apply a migration from schema changes |
| `npm run db:deploy` | Apply committed migrations — what CI and production run |
| `npm run db:seed` | Seed the catalogue, crews, counter and fixtures |
| `npm run db:studio` | Prisma Studio, to browse the data |
| `npm run tune -- jobs.csv` | Score the engine against real completed jobs |

### Seeded data to look at

`db:seed` writes eight jobs dated relative to the day it runs, so every state
in the portal is reachable straight away:

| Reference | State | What it shows |
| --- | --- | --- |
| `FM-8841` | On site, Crew A | The live panel — pulsing dot, route map, loading progress, checklist, message thread |
| `FM-8842` | On site, 45 min late | The behind-schedule treatment |
| `FM-8843` | En route | The earlier live state |
| `FM-8839` | Complete, unpaid | Bill of lading, pay action, review prompt |
| `FM-8844`, `FM-8845` | Unassigned | Booked but not yet crewed |
| `FM-8846`, `FM-8847` | Leads | Not on the board, not in the portal |

## Layout

```
src/
  app/
    (site)/           The five public marketing pages plus /track, sharing the
                      utility bar, header and footer CTA band
    estimate/         The four-step estimator: page, client component, actions
    move/[id]/        The customer portal: page, actions, not-found
    tokens/           Design-token reference
    globals.css       Design tokens as a Tailwind v4 @theme, plus base and
                      component layers (.blueprint, .gridlines, .topo, .display)
    sitemap.ts        The five public pages
  components/
    site-chrome.tsx   Utility bar, header, footer
    logo.tsx          Logo, refinement direction 2a
    icons.tsx         Lucide glyphs, inline at stroke-width 1.5
    route-map.tsx     Wrapper around public/dispatch-map.html
    portal-bits.tsx   Live refresh and the clipboard button
  lib/
    db.ts             The Prisma client — server only
    pricing.ts        The pricing engine — server only
    pricing.test.ts   Engine tests
    estimate.ts       The estimator's view model and patch validator
    jobs.ts           The job record and its two state machines
    store.ts          The repository over Prisma — server only
    seed.ts           Fixture jobs, reviews and crews
    session.ts        Quote and move cookies — server only
    format.ts         Money, stars, dates
    site.ts           Constants shared by the chrome and the pages
    tuning.ts         Accuracy harness — server only
    tuning.test.ts    Harness tests
prisma/
  schema.prisma       The schema
  migrations/         Committed migrations
  seed.ts             The seed script
scripts/
  tune.ts             The tuning CLI
public/
  dispatch-map.html   The handoff's Leaflet map, kept whole
```

## How a price is produced

**No price is ever computed in the browser.** The prototype prices in the
browser for demo purposes; a browser-computed price is user-editable and
therefore not a price.

The estimator's client component holds *selections* — counts, floors, the
chosen crew. Every interaction posts the change to the `updateEstimate` Server
Function, which validates it, folds it into the stored draft, re-prices through
`lib/pricing.ts`, and returns the whole view as finished strings: the range, the
basis line, the rail's line items, the hours on each crew card, the confirm
table. The browser renders those strings and computes nothing.

That also means a refresh never loses a quote: the draft lives in the store,
keyed by an opaque id in an `httpOnly` cookie.

The pricing page's typical-move bands come from `typicalBands()`, which prices
the room presets through the same engine, so the published numbers cannot drift
from the quotes.

`applyPatch` in `src/lib/estimate.ts` is the trust boundary. Server Functions
are reachable by direct POST, not only through our UI, so every field is
re-checked against its domain there and anything that does not typecheck is
dropped rather than stored.

## What is deliberately not here

- **A managed database.** The schema, migrations and seed are real, and the
  app runs against any Postgres. Nothing provisions one for you — point
  `DATABASE_URL` at Supabase, Neon or a local server.
- **Authentication.** `/move/[id]` is readable by anyone who knows a job
  reference, exactly as in the prototype. Magic-link auth is step 8 and must
  land before this is pointed at real customers; the guard belongs both in the
  page and in every action in `src/app/move/[id]/actions.ts`.
- **Stripe, Resend, Twilio, Google Places and Distance Matrix.** Booking writes
  the job and routes to the portal. It does not send a confirmation, alert the
  office, geocode an address or authorise a card, and it does not pretend to.
  The portal's pay button flips a `paid` flag; it moves no money.
- **The crew app and the dispatch board.** The handoff is explicit that these
  are specifications for a purchased platform, to be built in-house only under
  Stage 4's conditions. The status machine they drive *is* implemented, in
  `src/lib/jobs.ts` (`advanceStatus`, `assignCrew`, `advanceStage`), tested, and
  ready for that platform's webhooks to call.
- **Photography.** Every photo position in the prototype is a placeholder and
  the handoff says not to ship them. Nothing here has an image slot.
- **A designed mobile layout.** See below.

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
- **Whether the quote should include travel — decided, for now.** The range is
  a labour estimate and the bill includes travel, so of the two options open
  here (carry travel in the range, or say plainly that it does not) the second
  was taken: `/pricing`, the estimator's price rail and the confirm table all
  state the exclusion. That is a stopgap. `quote()` already accepts `miles` and
  will price travel when given them; the estimator has no mileage source until
  step 6, and when it does, travel becomes a real quoted line and the wording
  comes back out. See "Known gaps worth a decision" below.
- **Move `CONFIG` into the database.** The handoff is explicit that these values
  must be changeable without a deploy, and that they will be re-tuned quarterly.
- **Decide the surcharge discrepancy.** `typicalBand()` reproduces the
  prototype's `bandFor()`, which omits per-item surcharges. The published 2-bed
  band therefore sits $40 below what the estimator quotes for the same preset,
  and the 3+-bed band $80 below. See `QuoteOptions.includeSurcharges`.

## Departures from the prototype

Each of these is a decision, not an oversight.

- **Mobile is a fallback, not a design.** The handoff says breakpoints were
  never designed and asks for the approach to be agreed rather than improvised.
  So the marketing pages hold the desktop design down to 1024px and below that
  do the minimum that keeps a phone usable: two-column grids stack, and the
  header nav wraps instead of becoming a drawer. No page scrolls sideways at
  390px. A real mobile design — the drawer nav, the hero stack, the estimator's
  rail as a sticky bottom bar — is still outstanding.
- **The prototype's dark surface-switcher bar is gone.** It is a prototype
  navigation aid and the handoff says it must not ship.
- **The portal's "See crew view" button is "Call dispatch".** The crew app is
  not in this build, so the primary action is the one a customer on move day
  actually wants.
- **The calendar has month arrows.** The prototype hard-codes September 2026.
  A booking calendar has to move, so the month header carries two square
  hairline buttons. It will not page back before the current month.
- **Booked-out days are computed, not hard-coded.** A day is closed when every
  crew is committed, per the handoff. Leads do not consume a crew.
- **The crew cards' hour estimates include the stair premium.** The prototype
  computed those without it, so the card and the price rail disagreed whenever
  a move had stairs.
- **Seed dates are relative to first run,** not pinned to September 2026, so the
  live panel is live whenever someone opens the portal.
- **One copy fix.** The home page's residential card read "Capitol Hill
  walk-ups and third-floor walk-ups", a duplication; it now reads "Stairs, tight
  Denver alleys and third-floor walk-ups, all included at no upcharge."

## Known gaps worth a decision

- **The quoted range excludes travel — because nothing can measure it yet.**
  `quote()` *can* price travel: pass `miles` and it adds a Travel line from
  `CONFIG.travel` ($45 flat, then $1.15 per loaded mile beyond a 25-mile metro
  radius). Nothing passes it. The estimator has two free-text address fields
  and no geocoding until Google Places and Distance Matrix land at step 6, so
  the range it shows is labour plus item surcharges, and travel arrives on the
  bill afterwards — $180 at the median across the 60 tuned jobs. Every place a
  range appears says so: both blocks on `/pricing`, the estimator's price rail,
  and a `Travel` row in the confirm table directly above `Due today`.
  **That disclosure is a stopgap, not the fix.** When step 6 resolves real
  coordinates, pass `miles` into `quote()` and take the wording back out —
  `estimate.test.ts` has a test that fails the moment travel enters the range,
  so the copy cannot be left behind to become false.
  Note that `CONFIG.travel.metroMiles` is a placeholder: 25 miles is a guess at
  the metro radius, not something the handoff states. Fit it against real
  mileage on the next tuning run.
- **There is no published hit-rate claim.** The prototype's "nine out of ten
  moves land inside the range we quote" was removed: measured against 60 real
  jobs it was 45%, and every miss was over the top. Reinstate a figure only from
  a measured re-run that counts mileage.
- **The published bands sit below the estimator for the same preset.**
  `typicalBand()` reproduces the prototype's `bandFor()`, which omits per-item
  surcharges, so the 2-bed band is $40 under what the estimator quotes and the
  3+-bed band $80 under. See `QuoteOptions.includeSurcharges` in
  `src/lib/pricing.ts`. This is a pricing-policy call, not a bug to quietly fix.
- **"57 items" and "12 items on the list" describe the same move.** The
  estimator counts pieces; the portal and the crew's checklist count handling
  groups, because 34 boxes are one row on the truck list. Both come from the
  prototype. Worth one copy pass to name the two units.
- **Home advertises 4.9 from 612 reviews; `/reviews` shows the published few.**
  The first is a company-level claim, the second is what has been published
  through this system. Reconcile before launch.
- **The engine is still a designer's estimate.** Step 2 of the build plan calls
  for running 60 completed jobs through it and tuning `CONFIG.throughput` and
  the range multipliers until 85–90% land inside the quoted range. Until that is
  done these prices are not calibrated. `CONFIG` also needs to move into the
  database — the handoff is explicit that it must be changeable without a
  deploy, and that it will be re-tuned quarterly.

## The routing map

`public/dispatch-map.html` is the handoff's Leaflet document, kept whole rather
than ported: it is a map instance with its own lifecycle, and its visual
treatment (the tile filter, the square markers, the dashed legs, the tooltip
design) is specified exactly. `src/components/route-map.tsx` frames it and feeds
it today's jobs by `postMessage`.

It loads Leaflet 1.9.4 from unpkg with SRI hashes, so **the service-area map
needs outbound network access**. When that is blocked the map replaces itself
with a legible message and the phone number rather than a black rectangle.

Two numbers in it are approximations and must be replaced with the Google
Distance Matrix API before they are shown as fact: road distance is a
straight-line multiplied by 1.32, and drive time assumes a flat 32 mph. Its
`PLACES` gazetteer stands in for geocoding until step 6 resolves and stores real
coordinates.

## Tests

`npm run test` — 84 tests, all on logic that decides money or state:

- `src/lib/pricing.test.ts` — the engine: every room preset's band, the
  three-hour minimum, stairs with and without an elevator, the packing crew, the
  piano and TV surcharges, empty inventories.
- `src/lib/estimate.test.ts` — the patch validator's rejection of out-of-domain
  input, the calendar's date arithmetic, and the rules that block a booking.
- `src/lib/jobs.test.ts` — the status and pipeline machines, close-out
  converting elapsed time to billed hours, and the invoice.

Following the handoff's advice: test the money, don't test the markup.

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

**Do not export a value used in a `className` from a `"use client"` module.** A
constant crossing that boundary into a Server Component arrives as a client
reference, not a string, and every class built from it silently stops matching.
That is why `src/lib/site.ts` exists.

## Logo

`src/components/logo.tsx` implements refinement direction **2a, "Trued peaks"** —
three peaks on one baseline with matched slopes and a single olive face, and a
rule under FLATIRONS that lets MOVERS carry its .42em tracking without the
lockup coming apart.

It was chosen because the marketing header is specified as a 40×19 SVG, which is
2a's 96×44 viewBox scaled down; direction 2c's 120×96 slab does not fit that
chrome. 2c is the stronger vehicle decal and is worth revisiting for signage and
truck doors.

`LogoLockup` sizes the mark and the wordmark independently, because the chrome
specifies them independently. `Logo` keeps the refinement sheet's proportions
under a single `scale`, for the token page.

## Notes

- Built on Next.js 16, not the 15 named in the build plan — 16 is the current
  release and the App Router APIs the plan relies on are unchanged.
- The pricing engine is server-only. Never import `src/lib/pricing.ts`,
  `src/lib/store.ts` or `src/lib/session.ts` from a client component.
