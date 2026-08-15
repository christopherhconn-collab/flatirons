# Handoff: Flatirons Movers — website, quote flow, portal, crew app, dispatch, office

## Overview

Flatirons Movers is a moving company serving Denver and the surrounding metro, plus long-haul work across Colorado. Established 2024. This package contains a complete, working design prototype of their software: a public marketing website with an instant-quote flow, a customer tracking portal, a crew mobile app, an internal dispatch board, and an office lead pipeline — six surfaces sharing one data model.

The goal of the build is **Stages 1–3 of the accompanying build plan**: ship the marketing site and instant quote, then the customer portal and payments, then integrate with a purchased dispatch platform. The dispatch board and crew app in the prototype are specifications for what that platform must do (and reference designs if it is ever built in-house), not necessarily code to ship in phase one.

## About the design files

**The files in `design/` are design references created in HTML.** They are prototypes showing intended look and behavior, not production code to copy. `.dc.html` files use a proprietary preview runtime (`support.js`) that will not exist in your codebase — do not try to port it. Read them for structure, exact values, copy, and interaction logic; then **recreate the designs in the target environment.**

No production codebase exists yet. Recommended target (matches the build plan):

- **Next.js (App Router) + TypeScript** on Vercel
- **Tailwind CSS** with the design tokens below mapped into `tailwind.config`
- **Postgres** via Supabase or Neon, with Prisma or Drizzle
- **Stripe** for payments, **Twilio** for SMS, **Resend** for email
- **Google Places + Distance Matrix** for addresses and mileage
- **Leaflet + OpenStreetMap** for maps (already used in `design/dispatch-map.html` — that file is close to production-ready and can be adapted directly)

Pricing must be computed **server-side**. The prototype computes it in the browser for demo purposes only; a browser-computed price is user-editable and therefore not a price.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, copy, and interaction behavior. Recreate the UI faithfully using the tokens in this document. Every hex value, font size, and letter-spacing in the prototype is deliberate.

Two exceptions:
- The crew-location map in the customer portal is a stylized placeholder; production should use the Leaflet implementation from `dispatch-map.html`.
- Photography is represented by drop-target placeholders. Real photography is not yet shot. Any layout with a photo slot needs a real image before launch; do not ship the placeholder.

---

## Design tokens

### Color

Derived from the company's business card. Navy and olive on a warm off-white ground. This is a two-color system — do not introduce a third hue.

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#16283f` | Primary text, dark surfaces, header bars, primary buttons on light |
| `ink-deep` | `#101e30` | Dispatch board ground, app chrome |
| `ink-deepest` | `#0b1624` | Map ground, deepest surface |
| `olive` | `#5d7340` | Accent: primary CTA fill, active states, checked states, progress |
| `olive-dark` | `#41522d` | Olive text on light tinted fills (accessible body-size olive) |
| `olive-pale` | `#a3b689` | Accent text on dark surfaces, "behind schedule" state |
| `olive-mist` | `#dfe7d2` | Light text on navy, subtle chips on dark |
| `olive-wash` | `#eef1e8` | Selected/complete row fill on light |
| `olive-tint` | `#f1f4ea` | Lightest accent fill |
| `paper` | `#fbfaf7` | Card surface |
| `bg` | `#f7f6f2` | Page ground |
| `surface` | `#efece4` | Table headers, secondary panels |
| `desk` | `#e8e6e0` | Outermost app background |

Derived values, used as literal `rgba()` in the prototype:

| Purpose | Value |
| --- | --- |
| Hairline border on light | `rgba(22,40,63,.16)` |
| Border, stronger (inputs) | `rgba(22,40,63,.24)` |
| Border, strongest (segmented controls) | `rgba(22,40,63,.22)` |
| Grid gap fill (1px dividers) | `rgba(22,40,63,.14)` |
| Body text, secondary | `rgba(22,40,63,.68)` — `.75` for lede |
| Muted label text | `rgba(22,40,63,.6)` — `.55` for quietest |
| Disabled / inactive text | `rgba(22,40,63,.45)` |
| Hairline border on dark | `rgba(223,231,210,.16)` — `.28` stronger, `.35`/`.4` strongest |
| Body text on dark | `rgba(247,246,242,.82)` |
| Muted text on dark | `rgba(247,246,242,.6)` — `.55` quietest |

### Typography

Two families, both Google Fonts:

- **Barlow Condensed** — 600 weight, `text-transform: uppercase`. All headings, display numbers, statistics, wordmark. Line-height `.94`–`1.1`.
- **Barlow** — 400/500/600. All body copy, labels, buttons, table cells, form fields.

| Role | Spec |
| --- | --- |
| Page h1 (marketing) | Barlow Condensed 600, 60–76px, `line-height: .94–.98`, uppercase |
| Hero h1 (navy variant) | Barlow Condensed 600, 92px, `line-height: .92`, uppercase |
| Section h2 | Barlow Condensed 600, 30–34px, `line-height: 1`, uppercase |
| Card title | Barlow Condensed 600, 22–27px, `line-height: 1.05–1.15`, uppercase |
| Display statistic | Barlow Condensed 600, 30–52px, `line-height: 1` |
| Kicker / eyebrow | Barlow 500, 10–11px, `letter-spacing: .18–.24em`, uppercase, olive |
| Field label | Barlow 500, 10.5px, `letter-spacing: .15em`, uppercase, muted |
| Table header | Barlow 500, 10.5px, `letter-spacing: .16em`, uppercase, muted |
| Button | Barlow 600, 11–15px, `letter-spacing: .1em`, uppercase |
| Body | Barlow 400, 14–17px, `line-height: 1.55–1.65`, `text-wrap: pretty` |
| Body, dense (tables, list rows) | Barlow 400/500, 13–15px, `line-height: 1.3–1.5` |
| Meta / caption | Barlow 400, 11.5–13px, `line-height: 1.4–1.5`, muted |
| Wordmark, FLATIRONS | Barlow Condensed 600/700, `letter-spacing: .14em`, uppercase |
| Wordmark, MOVERS | Barlow 500, `letter-spacing: .42em`, uppercase, olive |

Minimum body size anywhere: 12.5px. Minimum touch target in mobile views: 44px (the prototype uses 48–52px).

### Geometry and spacing

- **`border-radius: 0` everywhere.** No rounded corners on any element — buttons, inputs, cards, chips, avatars, badges. This is the single most important visual rule.
- **1px dividers are produced by grid gaps**, not borders: a grid with `gap: 1px` and `background: rgba(22,40,63,.14)`, children with an opaque background. Use this for stat rows, tables, kanban columns, list groups.
- Section padding: `44–52px` vertical, `30–34px` horizontal on desktop; `18–22px` on mobile views.
- Card padding: `24–30px` desktop, `14–18px` dense/mobile.
- Grid gaps between major regions: `34–44px`. Within component groups: `8–14px`.
- **Registration marks**: cards and figures optionally wear the design system's `.blueprint` class with four `<i class="corner tl|tr|bl|br">` children — small `+` crosshairs at each corner. Used on the estimate form, "next action" cards, and callouts. Reproduce as a CSS pseudo-element pattern.
- Elevation is used sparingly: `0 4px 22px rgba(22,40,63,.12)` on floating mobile frames only. Cards are flat with hairline borders.

### Iconography

Lucide, `stroke-width: 1.5`, `fill: none`. Sizes 14–22px. Icons used: shield-check (insurance), camera (photos), check (checkboxes/completion), arrow-right (links).

### Logo

The mark is three mountain peaks — two navy, the rightmost olive — on a common baseline, beside a stacked wordmark (FLATIRONS over letterspaced MOVERS). `design/Flatirons Logo Refinement.dc.html` contains three refinement directions with reversed, small-size, single-color, and truck-door treatments. **Direction not yet chosen — confirm with the client before building the header.** All three fix the same two defects in the original card: mismatched peak angles and a wordmark/tagline tracking conflict.

---

## Screens / views

Six top-level surfaces. In the prototype they are switched by a persistent dark nav bar (48px tall, `#101e30`, olive 2px underline on the active item) — that bar is a **prototype navigation aid only** and must not ship. In production these are separate routes and separate applications.

### 1. Marketing website

Public, unauthenticated. Five pages sharing a header and footer.

**Chrome (all pages)**
- Utility bar: 34px tall, `#16283f` ground, `#dfe7d2` text, Barlow 500 11px `letter-spacing: .09em` uppercase. Left: "Serving the Front Range since 2024 · Licensed & insured · PUC 00412". Right: hours, "Track my move" link (`#a3b689`), phone `303.555.0150` in `#f7f6f2`.
- Header: 18px vertical padding, 34px horizontal, hairline bottom border, `flex-wrap: wrap` with `gap: 20px 32px`. Logo left (40×19 SVG + wordmark, non-shrinking). Nav right: Home / Pricing / Service area / Commercial / Reviews, Barlow 500 12px `letter-spacing: .1em` uppercase, active item `#16283f` 600 weight with a 2px olive bottom border and 4px padding-bottom; inactive `rgba(22,40,63,.6)`. Then a solid olive button, "Free estimate", `padding: 11px 18px`, `white-space: nowrap`.
- Footer CTA band: `#16283f`, 34px padding, centered "WE MOVE. YOU SETTLE IN." in Barlow Condensed 600 30px `letter-spacing: .16em` `#dfe7d2`, flanked by 34px olive hairlines; olive button "Start an estimate" right.

**1a. Home**
Two-column, `1.12fr .88fr`, 44px gap, on a topographic grid background (`linear-gradient` 1px lines at 34px intervals, `rgba(22,40,63,.055)`).

Left column: olive kicker "FRONT RANGE · SINCE 2024" preceded by a 26px olive hairline; h1 "STRONG HANDS. / CAREFUL MOVES." at 76px; tagline "LOCAL. RELIABLE. PROFESSIONAL." in Barlow 500 15px `letter-spacing: .2em` olive; a 17px body paragraph capped at `44ch`; a three-cell stat row (4,100+ moves / 4.9-of-5 from 612 reviews / $0 deposit) built as a 1px-gap grid; and a two-cell rate row ($149/hr for 2 movers + truck, $199/hr for 3).

Right column: the quote form as a bordered blueprint card on `#fbfaf7`, 26px padding. Title "FREE ESTIMATE" (Barlow Condensed 600 22px), subtitle "Two minutes. No phone tag.", then: Moving from (text), Moving to (text), Home size (4-way segmented: Studio / 1 bed / 2 bed / 3+ bed, olive fill on the active option), Target date (read-only display of the selected date), a full-width olive submit "BUILD MY ESTIMATE", and a shield-check reassurance line "Licensed, bonded, insured".

Below: three service cards in a 1px-gap grid — 01 Residential ("APARTMENTS TO FOUR-BEDROOMS"), 02 Commercial ("OFFICES MOVED OVER A WEEKEND"), 03 Packing & storage ("BOXED BY US, HELD BY US") — each with a numbered olive kicker, a two-line condensed title, and a 14px body paragraph.

**1b. Pricing**
h1 "WHAT IT COSTS, / BEFORE YOU CALL". Three rate cards (2 / 3 / 4 movers at $149 / $199 / $249 per hour; the 3-mover card is tinted `#eef1e8` and flagged "most booked"). Then a two-column region: left, an add-on price list (packing crew $65/hr, TV crate $40, upright piano $180, gun safe under 600lb $220, storage from $95/mo, materials Included in olive) and a four-cell "typical move" band table; right, a blueprint card "THE RULES, PLAINLY" (three-hour minimum then quarter-hour increments, clock starts on arrival; $45 flat metro travel, $1.15/loaded mile beyond; no deposit, free cancellation to 48 hours; stairs and elevator waits never an upcharge, weekend rate equals weekday) and a dashed-border card explaining that the estimate is a range, not a bid — including the promise that overage above the top of the range is absorbed.

**The typical-move bands must be computed from the same pricing engine as the estimator, not hard-coded.** The prototype derives them from the room presets so the published numbers cannot drift from the quotes.

**1c. Service area**
Two columns. Left: h1 "DENVER METRO, / AND ALL OF COLORADO", a paragraph establishing four trucks out of a Commerce City yard and statewide long-haul, then a six-cell grid of areas (Denver & RiNo; Aurora & Centennial; Littleton & Highlands Ranch; Golden, Arvada & Lakewood; Westminster & Thornton; Statewide long-haul) each with a one-line service note. Right: a live Leaflet map in a hairline-bordered frame, 430px tall, showing today's routes — see `design/dispatch-map.html`.

**1d. Commercial**
h1 "CLOSED FRIDAY. / OPEN MONDAY." Three process cards (01 Planning — walkthrough and floor plan; 02 Paperwork — COI in the building manager's inbox, $2M general liability, additional insured on request; 03 Cutover — desks built before standup, crates collected free the following Tuesday). Then two columns: a commercial pricing table (under 2,000 sq ft hourly with 4 movers; 2,000–6,000 sq ft flat bid after walkthrough; crate rental $4/crate/week; after-hours and weekend at no premium) with a line of recent-client evidence; and an olive-tinted card "BOOK A WALKTHROUGH" promising 30 minutes on site, a flat bid in two business days, and a named project lead reachable on move day.

**1e. Reviews**
h1 "EVERY REVIEW, / INCLUDING THE 4s". A blueprint stat card showing the computed average (54px condensed numeral, a star string, and the count). Then a two-column 1px-gap grid of review cards: name, star string in olive, the review body at 15.5px, and a footer line of move type, route, month, and crew. **Reviews are seeded from real submissions and new ones appear at the top of this list — the average and count recompute.** Positioning copy commits to publishing 4-star reviews and posting the fix next to any complaint; honor that in the moderation policy.

### 2. Instant quote flow

Four steps with a persistent price rail. Header: logo left, "Saved automatically · quote #FM-XXXX" right. Step bar: four equal cells in a 1px-gap grid, each showing "Step N" (or "Step N · done") over a condensed uppercase label; active cell olive with cream text, completed cells `#eef1e8` with navy text, future cells `#f7f6f2` with `rgba(22,40,63,.45)` text. **Steps are clickable for backward navigation.**

Body is `1fr 350px`: the step content left, the running-estimate rail right (navy `#16283f`, 28px padding, full height).

**Price rail** — olive kicker "RUNNING ESTIMATE"; the range in Barlow Condensed 600 50px cream, or the string "Add items" when the inventory is empty; a basis line ("Based on 4.6 hrs, 3 movers, one truck."); then hairline-separated line items — Labor & truck at the hourly rate, Estimated hours, one line per surcharge, a stair/elevator line, and Deposit `$0` in olive-pale; then a bordered inventory summary (item count, volume units, date); and a footer offering the phone number.

**Step 1 — Addresses.** Two text inputs (from / to), two 4-way segmented controls for pickup and drop-off access (Ground / 2nd / 3rd / 4th+), and a checkbox row "There's a service elevator we can reserve — cuts the stair premium out of the estimate."

**Step 2 — Room by room.** Room tabs as chips (Living room / Kitchen / Bedrooms / Office / Garage & misc), each showing a count badge once items are added; active chip is olive-filled. Below, a three-column table (Item / Handling / Count) with a stepper per row: `−` outlined, the count in an outlined box, `+` olive-filled, each 30–32px tall in a 1px-gap flex. Rows with a nonzero count tint to `#f4f6ef`. Handling text is olive when the item carries a surcharge, muted otherwise. Then a checkbox offering a packing crew the day before at $65/hr.

**Step 3 — Date & crew.** A 352px calendar card: month header, seven day-of-week labels, then a 7-column grid of 40px day cells — selected cell olive-filled, open cells `#efece4`, booked-out cells `rgba(22,40,63,.1)` and non-interactive. A three-item legend below. Right, three crew-size options as selectable rows (2 / 3 / 4 movers) each showing the rate, a one-line audience note, and the computed hour estimate for that crew size; the selected row is `#eef1e8` with an olive border. Below, a dashed note on 30-minute arrival windows and 48-hour crew notification.

**Step 4 — Confirm.** Name, mobile, email inputs. An optional card-on-file block (card number, MM/YY) explicitly labeled "$0 charged today" and explaining the alternative. Then a seven-row summary table (move date, route, access, crew and rate, inventory count, estimate range, "Due today $0"). Primary action "BOOK THIS MOVE" in navy, with a note that anything can change up to 48 hours out.

Booking creates the job, seeds the customer's checklist, and routes to the portal.

### 3. Customer portal (mobile, 414px)

Navy header: logo, initials avatar, olive kicker "YOUR MOVE · FM-XXXX", the date in Barlow Condensed 600 38px, a crew line ("Crew arrives 8:00–8:30 AM · 3 movers · Crew A"), and the route in olive-pale.

**Live panel** (only while the crew is en route or on site): a pulsing olive dot beside "CREW EN ROUTE" / "CREW ON SITE"; a 132px map on the deepest navy ground with a dashed olive route, square origin and destination markers, and a pulsing truck marker; below, items-loaded count, on-schedule or minutes-late status in olive-pale, and a 4px progress bar.

Two buttons: "See crew view" (olive) and "Message crew" (outlined).

**Timeline** — five stages (Estimate accepted / Inventory confirmed / Crew assigned / Move day / Delivered & signed), each a 12px square dot on a connecting vertical rule; completed stages are olive-filled with navy text, future stages are outlined with `rgba(22,40,63,.5)` text. Each carries a live sub-line (the locked range, the item count, the crew and truck, the live loading count, the billed hours).

**Customer checklist** — tappable rows, minimum 52px, with a 22px checkbox; completed rows tint `#eef1e8` and strike through. Seeded per job (e.g. reserve the freight elevator; empty the filing cabinet; set aside what you're taking yourself).

**Final bill of lading** (once complete) — a blueprint card: total in Barlow Condensed 600 30px, a paid/due chip, hairline-separated invoice lines (hours at rate, piano handling, TV crate, materials $28), then a bill-of-lading fact block (items loaded and delivered, condition photo count, damage claims, hours billed at rate, signed-at-drop-off name), then a full-width pay button and the card-on-file line.

**Review prompt** (once complete, once only) — five tappable 30px stars, a one-line text input, and a submit that posts to the public Reviews page and marks the job reviewed.

**Referral card** — dashed border, "$75 FOR THEM, $75 FOR YOU", the mechanic in one line, and a code field (`FLAT-XXXX`) with a Copy action.

**Messages** — a two-party thread: customer messages right-aligned on navy with cream text, crew messages left-aligned on `#eef1e8` with navy text, each with a letterspaced uppercase attribution. A text input and a navy Send button. **The same thread appears in the crew app with alignment mirrored.**

**Documents** — signed estimate (PDF), certificate of insurance (PDF), inventory list (View).

Bottom tab bar: Move / Inventory / Docs / Help, active in olive.

### 4. Crew app (mobile, 414px)

Navy header: job index ("Job 1 of 6 · FM-8841"), route in Barlow Condensed 600 26px, a status badge, and a row of elapsed-time and estimate-range metadata.

**Load checklist** on the light ground: a progress header ("28 / 42") and a 4px olive bar, then tappable item rows in a 1px-gap grid, minimum 52px, scroll-capped at 330px. Each row: a 24px checkbox, the item name (500 weight, striking through and dropping to `rgba(22,40,63,.5)` when checked), and the handling note in olive on the right. Items are the exact inventory from the booking.

Two 48px actions: "Log condition photo" (navy) and "Mark all loaded" (outlined). Then a dashed photo card with a thumbnail slot, a running photo count, and a note on what to shoot.

**Customer thread** — the mirrored version of the portal thread, with a reply input and an olive Send.

**Bottom action bar** (olive `#5d7340`): a clock label and a live `H:MM:SS` timer ticking once per second while the job is on site, and an outlined 48px button whose label advances the job — "Start the run" → "Arrived on site" → "Depart for drop-off" → "Job closed". Arriving on site starts the clock; closing out converts elapsed time to billed hours, marks every item loaded, and moves the job to Complete.

Beside the phone: a "Today's runs" list of every job, tappable to switch. The active job's card inverts to navy.

### 5. Dispatch board (desktop)

Navy `#101e30` ground. Header with the date and job count and a "+ New job" action. Four stat cells (Unassigned / In progress / Hours billed / Running late).

**Kanban**, five columns at `1fr 1fr 1fr 1fr 280px`: Unassigned, Scheduled, In progress, Complete, and a right rail.

Job cards carry the customer name, a state flag chip (a piano warning, mover count, minutes late, or "Signed"), the route, and a metadata line (arrival window, crew, hours and revenue or the estimate range). Unassigned cards get an olive border and **an inline crew-assignment strip**: one chip per crew showing initial and size, disabled and dimmed when that crew is already busy — tapping assigns the crew and moves the job to Scheduled. Cards in later states get a single action button that advances the status ("Send en route" → "Mark arrived" → "Close out job"). In-progress cards show a 3px progress bar. Complete cards drop to 70% opacity. Empty columns show a dashed placeholder.

Right rail: a crew-and-truck roster with live status per crew, an invoices list where tapping toggles paid/due, and a "Billed today" figure with a supporting line.

**Schedule strip** — a crew-by-hour grid, 7a to 5p, one row per crew plus an Unassigned row. Jobs render as absolutely positioned blocks whose left offset is the start hour and width is the duration. **Blocks are draggable**: dropping on an hour cell reassigns crew and start time and rewrites the arrival window; dropping on another block swaps to that block's crew and hour; dropping on the Unassigned row un-assigns. An "Auto-fill open crews" button assigns every crewless job to an available crew in order.

**Live routing map** — the Leaflet map, 420px, full width. See `design/dispatch-map.html`: it draws one dashed leg per job (olive for active, olive-pale for late, dotted pale for unassigned, faded for complete), square markers for pickup and drop-off, a pulsing truck marker positioned by progress along the leg, per-leg tooltips with real mileage and drive time, and a summary panel of stops, loaded miles, and total drive time. It receives job data by `postMessage` from the host and re-renders. Tiles are OpenStreetMap under a `saturate(.3) brightness(.92) contrast(1.06)` filter to sit in the palette. Straight-line distance is multiplied by 1.32 to approximate road distance and divided by a 32 mph average for drive time — **replace both with the Google Distance Matrix API in production.**

### 6. Office / lead pipeline (desktop)

Light ground. Header with a search input (filters across name, phone, and both addresses) and "+ Add lead".

Left: a stage filter row (All / New / Quoted / Booked with live counts, active filter olive-filled) and a five-column lead table (Customer with phone beneath / Move / Date / Estimate / Stage) built as a 1px-gap grid. **A row click opens that customer's portal; a stage-chip click advances the stage** through New → Survey set → Quoted → Booked → Complete. Below, four computed stat cells (leads this month, booked, close rate, average job value).

Right rail on `#efece4`: a week capacity strip (one row per day, with four slot pips filled by booked job count, the selected day tinted and olive-marked); a blueprint "Next action" card that computes the most urgent thing — an uncalled new lead with its age and the "leads called inside four hours book three times more often" rationale, falling back to unassigned jobs, falling back to a clean-board state — with a one-tap action; and an "Assigned today" list of crews and their current customer.

---

## Interactions & behavior

Everything below is implemented in the prototype and should be preserved.

**Cross-surface data flow.** All six surfaces read and write one job list. Booking a quote creates a job that appears immediately on the dispatch board and in the office pipeline. Assigning a crew on dispatch updates the customer's timeline. Checking items in the crew app moves the portal's progress bar. Closing out a job converts elapsed time into billed hours, generates the invoice, and unlocks the review prompt. Submitting a review adds it to the public Reviews page and recomputes the average.

**Status machine.** `lead → unassigned → scheduled → enroute → onsite → complete`. Transitions are triggered from either the crew app's advance button or the dispatch card's action button; both must produce identical results. Entering `onsite` timestamps the clock-in. Entering `complete` computes billed hours from elapsed time, marks every inventory item loaded, and sets the pipeline stage to Complete.

**Pipeline stages** are separate from job status: `New → Survey set → Quoted → Booked → Complete`, cycled by clicking the stage chip. Advancing a lead to Booked promotes its status from `lead` to `unassigned` so it appears on the dispatch board.

**Live clock.** A one-second interval updates elapsed time, and only while at least one job is clocked in. Format `H:MM:SS`.

**Drag and drop** on the dispatch schedule, as described above. Dragged blocks drop to 40% opacity.

**Selecting a home size** on the marketing form or in step 2 replaces the inventory with that size's preset and sets the default crew size. This is a deliberate overwrite — it is how most customers get to a usable estimate in under a minute.

**Hover.** `filter: brightness(1.04)` on interactive elements, `cursor: pointer`, `transition: background .12s, color .12s, border-color .12s`.

**Focus.** `outline: 2px solid #5d7340; outline-offset: 2px` on `:focus-visible` for every input and button. Never leave the browser default.

**Pulse animation.** `@keyframes` cycling opacity 1 → .35 → 1 over 1.6s `ease-in-out`, on live-status dots and the truck marker.

**Empty states.** The price rail shows "Add items" and a prompt when the inventory is empty. Dispatch columns show a dashed "Nothing here right now." The next-action card degrades through three levels to "Board is clean".

### Responsive behavior

The prototype is authored at fixed widths: 1180px for desktop surfaces, 414px for mobile. **Responsive breakpoints have not been designed.** The marketing site needs a real mobile layout before launch — expect the header nav to become a drawer, the hero to stack to one column, and the quote form to move below the hero. The estimator's 350px price rail should become a sticky bottom bar on mobile. Confirm the approach before building; do not improvise it from the desktop design alone.

---

## State management

Prototype state, as a guide to the production data model:

```
route            which surface is showing (prototype nav only — drop in production)
sitePage         which marketing page (becomes real routes)
step             quote step 1–4
room             active room tab in step 2
q                the in-progress quote:
                 from, to, fromFloor, toFloor, elevator, size, day,
                 movers, packing, counts {itemName: qty}, name, email, phone
jobs[]           every job and lead — the single source of truth
myId             which job the portal is showing (auth in production)
crewId           which job the crew app is showing (auth in production)
reviews[]        published reviews
draft            in-progress review {stars, text}
drag             id of the job being dragged
card             card-on-file capture (Stripe Elements in production)
leadFilter       pipeline stage filter
search           pipeline search string
now              tick for the live clock
seq              next quote reference number
```

**Job record:**

```
id, customer, phone, size, from, to, day, hour, window,
movers, crew, status, stage, low, high,
clockIn, hours, photos, paid, reviewed, late,
items[]     {name, handling, done}
tasks[]     {label, note, done}
messages[]  {who, text, mine}
```

### The pricing engine

**Port this exactly, server-side.** It is the most business-critical logic in the prototype.

```
RATES        = { 2: $149/hr, 3: $199/hr, 4: $249/hr }
THROUGHPUT   = 9            volume units cleared per mover per hour
MIN_HOURS    = 3            published three-hour minimum

units   = Σ (catalogItem.volumeUnits × quantity)
hours   = units / (movers × THROUGHPUT)
          × 1.12  if pickup is above ground and no elevator
          × 1.08  if drop-off is above ground and no elevator
          then clamped to a minimum of MIN_HOURS

extras  = per-item surcharges (TV crate $40 each, piano $180 each)
          + packing crew: round(hours × 0.6 × $65) when selected

low     = round((hours × 0.90 × rate + extras) / 10) × 10
high    = round((hours × 1.15 × rate + extras) / 10) × 10
```

Every catalog item carries `{name, volumeUnits, handling, surcharge?, surchargeLabel?}`. The five rooms and their items are enumerated in the prototype's logic — port the table verbatim; the volume units were tuned so that the room presets produce the published price bands.

Room presets map a home size to a starting inventory and default crew size: Studio → 2 movers, 1 bed → 2, 2 bed → 3, 3+ bed → 4.

**Booked-out dates** are a hard-coded array in the prototype. In production this must be computed from real crew capacity: a day is closed when every crew is committed.

**Invoice generation** from a completed job: hours at the crew rate, plus $180 if the inventory contains a piano, plus $40 if it contains a TV, plus $28 materials. Replace this with real line items from the crew's recorded work before charging anyone.

**These constants must be configurable without a deploy.** The build plan's Stage 0 exists specifically to tune them against 60 real historical jobs; expect them to change, and expect to re-tune quarterly.

---

## Assets

- **Fonts:** Barlow and Barlow Condensed, Google Fonts, weights 400/500/600/700.
- **Map tiles:** OpenStreetMap via Leaflet 1.9.4 (pinned, SRI hashes in `dispatch-map.html`). Attribution is required and present — do not remove it. Consider a paid tile provider before high traffic.
- **Logo:** inline SVG, three variants at three sizes, in every file. Three refinement directions in `Flatirons Logo Refinement.dc.html`.
- **Icons:** Lucide, drawn inline as SVG at `stroke-width: 1.5`.
- **Photography:** none exists. Every photo position is a drop-target placeholder (`image-slot.js`). Real photography is needed for the navy hero variant and the crew app's condition-photo thumbnail. Do not ship placeholders.
- **Design system:** the Industry design system's stylesheet and bundle are in `design/_ds/` — the source of the token values above, and of the `.blueprint`, `.duotone`, `.btn`, `.tag`, `.input`, and `.table` patterns the prototype composes with.

## Files

In `design/`:

| File | What it is |
| --- | --- |
| `Flatirons Movers App.dc.html` | **The primary reference.** All six surfaces, fully interactive, sharing one data model. Read the template for markup and the logic class for the pricing engine and status machine. |
| `dispatch-map.html` | Leaflet routing map. Standalone, near-production-ready, adaptable directly. |
| `Flatirons Movers UI.dc.html` | Earlier static mockups: three home-page directions plus five product surfaces. Useful for the rejected alternatives. |
| `Flatirons Logo Refinement.dc.html` | Three logo directions with reversed, small, single-color, and truck-door treatments. Awaiting client decision. |
| `Flatirons Build Plan.dc.html` | The staged development plan: buy-vs-build reasoning, four stages, budgets, hiring guidance, risk table. **Read this first.** |
| `_ds/industry-.../styles.css` | Design system tokens and component layer. |
| `_ds/industry-.../readme.md` | Design system guide: direction, color, type, component inventory. |
| `support.js`, `doc-page.js`, `image-slot.js` | Preview-runtime files. **Not for production** — do not port. |

## Recommended build order

Per the build plan, and matching how the prototype is layered:

1. **Port the pricing engine first**, server-side, with unit tests against real historical jobs. Nothing else can be validated until this is right.
2. Marketing pages — static, fast, real content, good search performance.
3. The four-step estimator against the engine, writing leads to the database.
4. Booking, confirmation email and SMS, and the dispatch-platform API handoff.
5. Portal with magic-link auth, timeline, checklist, and documents.
6. Stripe: authorize at booking, capture at close-out. Get the terms reviewed by a lawyer first.
7. Dispatch integration and the crew-location feed.
8. Review request automation and the referral loop.

The dispatch board and crew app are specifications for what the purchased platform must deliver. Build them in-house only under the conditions set out in Stage 4 of the plan.
