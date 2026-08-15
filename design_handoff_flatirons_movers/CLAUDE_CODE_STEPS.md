# Flatirons Movers — build with Claude Code

Step-by-step. Run these in order. Each step is one Claude Code session with one clear
outcome — don't merge them, and don't move on until the exit test passes.

Everything Claude Code needs to know about the design is in `README.md` in this folder.
The working prototype is in `design/`. Read the build plan
(`design/Flatirons Build Plan.dc.html`) before step 1 — it explains why the back office
is bought rather than built.

---

## Step 0 — Before Claude Code

Do these yourself. They cost nothing and they decide everything downstream.

- [ ] Pull your last 60 completed jobs: inventory, crew size, actual hours, final invoice.
      Put them in a spreadsheet, one row per job. Save as `jobs.csv`.
- [ ] Book demos with Elromco, SmartMoving and MoveitPro. Ask each: **can I create a job
      through your API?** No API, no deal.
- [ ] Decide the logo direction (2a, 2b or 2c in `design/Flatirons Logo Refinement.dc.html`).
- [ ] Register accounts you'll own: GitHub, Vercel, Stripe, Twilio, Resend, Supabase,
      Google Cloud (for Places + Distance Matrix).

---

## Step 1 — Scaffold and tokens

```
claude
```

> Read README.md in full. Scaffold a Next.js 15 app with the App Router, TypeScript,
> Tailwind CSS v4 and ESLint. Then translate the design tokens in README.md into the
> Tailwind theme: every colour, the two font families, and the type scale. Set
> border-radius to 0 globally. Add the Barlow and Barlow Condensed font links. Build a
> single page that renders every token as a labelled swatch and every type role at its
> real size, so I can check them against the prototype.

**Exit test:** the token page matches the prototype's palette and type when you put them
side by side.

Commit. `git commit -m "Scaffold + design tokens"`

---

## Step 2 — The pricing engine

This is the most important step in the project. Do it before any UI.

> Read the "Pricing engine" section of README.md and the `quote()` method plus the
> CATALOG, RATES, PRESETS, THROUGHPUT and MIN_HOURS constants in
> `design/Flatirons Movers App.dc.html`.
>
> Port the engine to `lib/pricing.ts` as pure, server-only TypeScript. Port the item
> catalogue verbatim — every item's volume units and handling label. Put RATES,
> THROUGHPUT, MIN_HOURS and the surcharges in one exported CONFIG object so I can tune
> them without touching logic.
>
> Then write Vitest tests: one per room preset asserting the quoted band, plus edge cases
> — empty inventory, the three-hour minimum, stairs with and without an elevator, the
> packing crew, and the piano and TV surcharges.

Then, with your data:

> Here is `jobs.csv` — 60 real completed jobs. Write a script that runs each through the
> engine and reports what percentage landed inside the quoted range, plus the mean and
> median error. Then tell me which single CONFIG value to change to improve accuracy, and
> by how much.

Iterate on THROUGHPUT and the range multipliers until you're at **85–90% inside the
range**. This is the tuning the whole business rests on.

**Exit test:** tests pass, and 85%+ of your historical jobs price inside the range.

Commit.

---

## Step 3 — Database and schema

> Read the "State management" section of README.md. Set up Prisma against Postgres
> (Supabase) and model: Job, Lead, InventoryItem, CustomerTask, Message, Review,
> Crew, CatalogItem.
>
> Job carries the full status machine (`lead → unassigned → scheduled → enroute →
> onsite → complete`) and the separate pipeline stage (`New → Survey set → Quoted →
> Booked → Complete`) as enums. Include clockIn, hours, photos, paid, reviewed, late.
>
> Seed CatalogItem from the ported catalogue and Crew with four crews. Write the
> migration and a seed script.

**Exit test:** `prisma studio` shows the schema, seeded catalogue, and four crews.

Commit.

---

## Step 4 — Marketing pages

> Read the "Marketing website" section of README.md. Build the five pages as static
> routes: `/`, `/pricing`, `/service-area`, `/commercial`, `/reviews`. Use the exact copy,
> layout, and values documented there. Recreate the shared utility bar, header and footer
> CTA band as components. Recreate the logo as an inline SVG component from the direction
> I chose.
>
> The pricing page's typical-move bands must be computed by calling `lib/pricing.ts` at
> build time — never hard-coded. The reviews page reads from the database.
>
> Match the prototype exactly: square corners everywhere, 1px grid-gap dividers, the
> topographic background on the home hero, `text-wrap: pretty` on body copy.
> Set metadata, Open Graph tags, and a sitemap.

Then, separately:

> Now design and build the mobile layouts for these five pages. README.md says
> breakpoints were never designed — propose an approach for the header nav and the home
> hero first, show me, then implement.

**Exit test:** all five pages render at 1180px matching the prototype, and work on a
phone. Lighthouse performance above 95.

Commit.

---

## Step 5 — The estimator

> Read the "Instant quote flow" section of README.md. Build `/estimate` as a four-step
> flow with the persistent price rail, exactly as documented: the step bar with clickable
> backward navigation, the segmented controls, the room tabs with count badges, the item
> steppers, the calendar with booked-out days, the crew-size cards, and the confirm
> summary.
>
> Every price comes from a server action calling `lib/pricing.ts`. Never compute a price
> in the browser. Persist the in-progress quote so a refresh doesn't lose it.
>
> Booked-out days come from real crew capacity: a day is closed when all four crews are
> committed.

**Exit test:** you can price a 2-bed move in under two minutes and the number matches the
prototype for the same inputs.

Commit.

---

## Step 6 — Booking

> Booking writes a Job with its inventory and seeded customer checklist, then: sends the
> customer a confirmation email (Resend) and SMS (Twilio), sends an instant SMS alert to
> the office, and returns a magic link to the portal.
>
> Add Google Places autocomplete to both address fields and Distance Matrix for real
> mileage — replace the straight-line approximation in the prototype. Store the resolved
> coordinates on the Job.
>
> Rate-limit the booking endpoint and validate every input server-side with Zod.

**Exit test:** book a real move; the confirmation arrives, the job is in the database,
and you get the alert.

Commit. **You now have something that earns money. Ship it.**

---

## Step 7 — Deploy

> Set up deployment: Vercel with a production and preview environment, environment
> variables for every service, Sentry for errors, and a GitHub action running the test
> suite on every PR. Write a `README.md` at the repo root documenting local setup and
> every environment variable.

Point your domain at it. **Stop here for two weeks and watch the funnel** before building
more — the estimator's abandon points will tell you what to fix next.

---

## Step 8 — Customer portal

> Read the "Customer portal" section of README.md. Build `/move/[id]` with magic-link
> auth (no passwords). Include the navy header, the live panel, the five-stage timeline
> computed from job status, the tappable customer checklist, the message thread, and the
> documents list.
>
> Generate the certificate of insurance and signed estimate as PDFs. Everything is
> mobile-first at 414px — 44px minimum touch targets.

**Exit test:** a customer sees their move, ticks a checklist item, and messages you.

Commit.

---

## Step 9 — Payments

Get your terms reviewed by a lawyer before this step. Hourly billing means the final
amount is unknown at booking — that needs to be written down properly.

> Read the "Final bill of lading" and "invoice generation" parts of README.md.
>
> Add Stripe: capture a card at booking with Stripe Elements, place an authorization for
> the top of the estimate range, and capture the true amount when the job closes out.
> Handle authorization expiry (7 days) by re-authorizing before move day.
>
> Build the bill of lading: invoice lines from the job's real recorded work, the fact
> block, a signature captured on the crew's phone, and a pay action. Store the signed
> document immutably.
>
> Then the review prompt — five stars and a text field, publishing to `/reviews` and
> marking the job reviewed — and the referral card with its `FLAT-XXXX` code.

**Exit test:** a move completes, gets signed, gets charged the right amount, and the
customer leaves a review that appears publicly.

Commit.

---

## Step 10 — Dispatch integration

By now you've subscribed to a dispatch platform.

> Read the "Dispatch board" section of README.md — it's the specification for what the
> platform must do.
>
> Integrate with [platform]'s API: bookings create jobs there, their status changes
> webhook back to update our Job and the customer's portal timeline. Publish crew
> location to the portal map on move day only.
>
> Adapt `design/dispatch-map.html` into a React component using our real coordinates and
> Distance Matrix drive times instead of its approximation. Keep the visual treatment
> exactly — the tile filter, the square markers, the dashed legs, the tooltip design.
>
> Then automate the review request: SMS the morning after completion with the portal link
> and the referral code.

**Exit test:** your office team works in one system, and the customer's tracking view is
live without anyone updating it by hand.

Commit.

---

## Step 11 — Office dashboard

Only the parts the platform reports badly.

> Read the "Office / lead pipeline" section of README.md. Build an internal `/office`
> route behind auth: the lead table with stage chips and search, the computed stat cells,
> the week capacity strip, and the next-action card with its three-level fallback logic.
>
> Add the metrics the platform doesn't give us: estimate accuracy against actuals, close
> rate by lead source, and revenue per crew hour.

**Exit test:** you can see, in one place, whether your pricing is still accurate.

---

## Working well with Claude Code

- **Read before writing.** Start each session with "read README.md and
  `design/Flatirons Movers App.dc.html`" — the prototype answers questions a spec can't.
- **One step, one session, one commit.** Long sessions drift.
- **Ask for a plan first** on anything ambiguous: "propose an approach, show me, then
  implement."
- **Put the constants in one file.** `CONFIG` in `lib/pricing.ts` will change quarterly.
- **Make it write tests for the pricing engine and nothing else** at first. Test the
  money; don't test the markup.
- **Re-tune quarterly.** Re-run step 2's accuracy script against the last 60 jobs every
  three months. Drifting throughput is how movers quietly lose money.

## Don't

- Don't port `support.js`, `doc-page.js` or `image-slot.js` — preview runtime, not product.
- Don't ship the prototype's top nav bar. It exists so you can flip between surfaces.
- Don't ship photo placeholders. Shoot real photography first.
- Don't build the dispatch board or crew app in-house until Stage 4's conditions are met.
- Don't compute a price anywhere the customer can edit it.
