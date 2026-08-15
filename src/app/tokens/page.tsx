import type { Metadata } from "next";
import { Logo, LogoMark } from "@/components/logo";
import { CONFIG, typicalBands } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Design tokens · Flatirons Movers",
  description:
    "Every colour token as a labelled swatch and every type role at its real size.",
};

/* Swatches paint with `var(--color-*)` while the label prints the hex from the
   handoff. If someone edits a token, the swatch moves and the label does not —
   the mismatch is the alarm. */

type Swatch = { token: string; value: string; use: string; dark?: boolean };

const CORE: Swatch[] = [
  { token: "ink", value: "#16283f", use: "Primary text, dark surfaces, header bars, primary buttons on light" },
  { token: "ink-deep", value: "#101e30", use: "Dispatch board ground, app chrome" },
  { token: "ink-deepest", value: "#0b1624", use: "Map ground, deepest surface" },
  { token: "olive", value: "#5d7340", use: "Primary CTA fill, active states, checked states, progress" },
  { token: "olive-dark", value: "#41522d", use: "Olive text on light tinted fills (accessible body-size olive)" },
  { token: "olive-pale", value: "#a3b689", use: "Accent text on dark surfaces, “behind schedule” state" },
  { token: "olive-mist", value: "#dfe7d2", use: "Light text on navy, subtle chips on dark" },
  { token: "olive-wash", value: "#eef1e8", use: "Selected / complete row fill on light" },
  { token: "olive-tint", value: "#f1f4ea", use: "Lightest accent fill" },
  { token: "paper", value: "#fbfaf7", use: "Card surface" },
  { token: "bg", value: "#f7f6f2", use: "Page ground" },
  { token: "surface", value: "#efece4", use: "Table headers, secondary panels" },
  { token: "desk", value: "#e8e6e0", use: "Outermost app background" },
];

const DERIVED_LIGHT: Swatch[] = [
  { token: "line", value: "rgba(22,40,63,.16)", use: "Hairline border on light" },
  { token: "line-strong", value: "rgba(22,40,63,.24)", use: "Border, stronger (inputs)" },
  { token: "line-seg", value: "rgba(22,40,63,.22)", use: "Border, strongest (segmented controls)" },
  { token: "grid", value: "rgba(22,40,63,.14)", use: "Grid gap fill (1px dividers)" },
  { token: "ink-lede", value: "rgba(22,40,63,.75)", use: "Lede paragraph" },
  { token: "ink-body", value: "rgba(22,40,63,.68)", use: "Body text, secondary" },
  { token: "ink-muted", value: "rgba(22,40,63,.6)", use: "Muted label text" },
  { token: "ink-quiet", value: "rgba(22,40,63,.55)", use: "Quietest label text" },
  { token: "ink-disabled", value: "rgba(22,40,63,.45)", use: "Disabled / inactive text" },
];

const DERIVED_DARK: Swatch[] = [
  { token: "line-dark", value: "rgba(223,231,210,.16)", use: "Hairline border on dark", dark: true },
  { token: "line-dark-strong", value: "rgba(223,231,210,.28)", use: "Stronger hairline on dark", dark: true },
  { token: "line-dark-strongest", value: "rgba(223,231,210,.4)", use: "Strongest hairline on dark (.35 also in use)", dark: true },
  { token: "cream-body", value: "rgba(247,246,242,.82)", use: "Body text on dark", dark: true },
  { token: "cream-muted", value: "rgba(247,246,242,.6)", use: "Muted text on dark", dark: true },
  { token: "cream-quiet", value: "rgba(247,246,242,.55)", use: "Quietest text on dark", dark: true },
];

type TypeRole = {
  name: string;
  className: string;
  spec: string;
  sample: string;
  condensed?: boolean;
  olive?: boolean;
};

const DISPLAY_ROLES: TypeRole[] = [
  { name: "hero", className: "text-hero", spec: "Barlow Condensed 600 · 92px · lh .92 · uppercase", sample: "Strong hands.", condensed: true },
  { name: "h1", className: "text-h1", spec: "Barlow Condensed 600 · 76px · lh .94 · uppercase", sample: "What it costs", condensed: true },
  { name: "h1-sm", className: "text-h1-sm", spec: "Barlow Condensed 600 · 60px · lh .98 · uppercase", sample: "Denver metro", condensed: true },
  { name: "stat", className: "text-stat", spec: "Barlow Condensed 600 · 52px · lh 1", sample: "4,100+", condensed: true },
  { name: "stat-md", className: "text-stat-md", spec: "Barlow Condensed 600 · 38px · lh 1", sample: "Tue 14 Oct", condensed: true },
  { name: "h2", className: "text-h2", spec: "Barlow Condensed 600 · 34px · lh 1 · uppercase", sample: "The rules, plainly", condensed: true },
  { name: "h2-sm", className: "text-h2-sm", spec: "Barlow Condensed 600 · 30px · lh 1 · uppercase", sample: "We move. You settle in.", condensed: true },
  { name: "stat-sm", className: "text-stat-sm", spec: "Barlow Condensed 600 · 30px · lh 1", sample: "$820–$1,050", condensed: true },
  { name: "card-title", className: "text-card-title", spec: "Barlow Condensed 600 · 27px · lh 1.05 · uppercase", sample: "Packing & storage", condensed: true },
  { name: "card-title-sm", className: "text-card-title-sm", spec: "Barlow Condensed 600 · 22px · lh 1.15 · uppercase", sample: "Free estimate", condensed: true },
];

const LABEL_ROLES: TypeRole[] = [
  { name: "kicker", className: "text-kicker", spec: "Barlow 500 · 11px · ls .18em · uppercase · olive", sample: "Front range · since 2024", olive: true },
  { name: "kicker-sm", className: "text-kicker-sm", spec: "Barlow 500 · 10px · ls .24em · uppercase · olive", sample: "Running estimate", olive: true },
  { name: "label", className: "text-label", spec: "Barlow 500 · 10.5px · ls .15em · uppercase · muted", sample: "Moving from" },
  { name: "th", className: "text-th", spec: "Barlow 500 · 10.5px · ls .16em · uppercase · muted", sample: "Customer" },
  { name: "btn", className: "text-btn", spec: "Barlow 600 · 15px · ls .1em · uppercase", sample: "Build my estimate" },
  { name: "btn-sm", className: "text-btn-sm", spec: "Barlow 600 · 11px · ls .1em · uppercase", sample: "Track my move" },
];

const BODY_ROLES: TypeRole[] = [
  { name: "body-lg", className: "text-body-lg", spec: "Barlow 400 · 17px · lh 1.65 · text-wrap pretty", sample: "Four trucks out of a Commerce City yard, and long-haul work the length of the state. We quote a range, not a bid — and we absorb the overage above the top of it." },
  { name: "body", className: "text-body", spec: "Barlow 400 · 15px · lh 1.6", sample: "The clock starts when we arrive, runs in quarter-hour increments after a three-hour minimum, and stops when the last box is inside." },
  { name: "body-sm", className: "text-body-sm", spec: "Barlow 400 · 14px · lh 1.55", sample: "Stairs and elevator waits are never an upcharge. The weekend rate is the weekday rate." },
  { name: "dense", className: "text-dense", spec: "Barlow 400/500 · 15px · lh 1.5 — tables, list rows", sample: "Sofa, 3-seat · Blanket wrap" },
  { name: "dense-sm", className: "text-dense-sm", spec: "Barlow 400/500 · 13px · lh 1.3 — dense rows", sample: "Crew A · Tovar, Deng, Pike" },
  { name: "meta", className: "text-meta", spec: "Barlow 400 · 13px · lh 1.5 · muted", sample: "2 bed · Cap Hill → Wash Park · October" },
  { name: "meta-sm", className: "text-meta-sm", spec: "Barlow 400 · 11.5px · lh 1.4 · muted — the 12.5px floor sits just above this", sample: "Arrival window 8:00–8:30 AM" },
];

function Section({
  n,
  title,
  note,
  children,
}: {
  n: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8 pb-12">
      <div className="flex items-baseline gap-3">
        <span className="bg-ink text-bg text-btn-sm px-[7px] py-[3px]">{n}</span>
        <h2 className="text-h2-sm">{title}</h2>
      </div>
      {note && (
        <p className="text-body-sm text-ink-body mt-3 max-w-[78ch]">{note}</p>
      )}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function SwatchRow({ s }: { s: Swatch }) {
  return (
    <div className="bg-paper grid grid-cols-[110px_1fr] items-center gap-4 px-4 py-3">
      <div
        className={`h-14 border ${s.dark ? "border-line-dark" : "border-line"}`}
        style={{
          background: s.dark ? "#101e30" : `var(--color-${s.token})`,
        }}
      >
        {s.dark && (
          <div
            className="h-full w-full"
            style={{ background: `var(--color-${s.token})` }}
          />
        )}
      </div>
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <code className="text-dense-sm font-medium">{s.token}</code>
          <code className="text-meta-sm text-ink-muted">{s.value}</code>
        </div>
        <div className="text-meta-sm text-ink-muted mt-1">{s.use}</div>
      </div>
    </div>
  );
}

function TypeSpecimen({ role }: { role: TypeRole }) {
  return (
    <div className="bg-paper px-5 py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="text-dense-sm font-medium">{role.name}</code>
        <span className="text-meta-sm text-ink-muted">{role.spec}</span>
      </div>
      <div
        className={[
          "mt-3",
          role.className,
          role.condensed ? "display" : "font-body",
          role.olive ? "text-olive uppercase" : "",
          role.name.startsWith("label") || role.name === "th"
            ? "text-ink-muted uppercase"
            : "",
          role.name.startsWith("btn") ? "uppercase" : "",
          role.name.startsWith("meta") ? "text-ink-muted" : "",
          role.name === "body-lg" || role.name === "body" ? "text-ink-lede" : "",
          role.name === "body-sm" ? "text-ink-body" : "",
        ].join(" ")}
        style={{ maxWidth: role.name.startsWith("body") ? "62ch" : undefined }}
      >
        {role.sample}
      </div>
    </div>
  );
}

export default function TokensPage() {
  const bands = typicalBands();

  return (
    <main className="bg-bg min-h-full">
      <header className="border-b border-line px-[34px] py-6">
        <div className="mx-auto max-w-[1180px]">
          <Logo scale={0.55} />
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-[34px] py-11">
        <p className="text-kicker text-olive">Design system reference</p>
        <h1 className="text-h1-sm mt-4">
          Every token,
          <br />
          at its real size
        </h1>
        <p className="text-body-lg text-ink-lede mt-5 max-w-[62ch]">
          Put this page beside the prototype. Swatches paint from the live
          Tailwind theme; the hex beside each one is the value written down in
          the handoff. If a swatch and its label disagree, the theme has drifted.
        </p>

        <div className="mt-12">
          <Section
            n="1"
            title="Colour"
            note="Navy and olive on a warm off-white ground, derived from the company's business card. This is a two-colour system — do not introduce a third hue."
          >
            <div className="gridlines border border-line md:grid-cols-2">
              {CORE.map((s) => (
                <SwatchRow key={s.token} s={s} />
              ))}
              {/* An odd token count would leave the grid fill showing through
                  the vacant cell; cap it with an opaque one. */}
              {CORE.length % 2 === 1 && <div className="bg-paper" />}
            </div>
          </Section>

          <Section
            n="2"
            title="Derived values"
            note="Borders, dividers and text opacities. Named here rather than written as literal rgba() so a tuning pass happens in one place. The dark-ground values are shown against #101e30."
          >
            <div className="gridlines border border-line md:grid-cols-2">
              {DERIVED_LIGHT.map((s) => (
                <SwatchRow key={s.token} s={s} />
              ))}
            </div>
            <div className="gridlines border border-line mt-[34px] md:grid-cols-2">
              {DERIVED_DARK.map((s) => (
                <SwatchRow key={s.token} s={s} />
              ))}
            </div>
          </Section>

          <Section
            n="3"
            title="Display and headings"
            note="Barlow Condensed, 600 weight, uppercase, everywhere. Ranges in the handoff are expressed here as discrete steps — the top and bottom of each range each get a token."
          >
            <div className="gridlines border border-line">
              {DISPLAY_ROLES.map((r) => (
                <TypeSpecimen key={r.name} role={r} />
              ))}
            </div>
          </Section>

          <Section
            n="4"
            title="Labels and controls"
            note="Barlow, letterspaced, uppercase. Kickers are olive; field and table labels are muted."
          >
            <div className="gridlines border border-line md:grid-cols-2">
              {LABEL_ROLES.map((r) => (
                <TypeSpecimen key={r.name} role={r} />
              ))}
            </div>
          </Section>

          <Section
            n="5"
            title="Body"
            note="Barlow 400/500. Minimum body size anywhere is 12.5px; text-wrap: pretty is applied to every paragraph in the base layer."
          >
            <div className="gridlines border border-line">
              {BODY_ROLES.map((r) => (
                <TypeSpecimen key={r.name} role={r} />
              ))}
            </div>
          </Section>

          <Section
            n="6"
            title="Wordmark and logo"
            note="Refinement direction 2a, “Trued peaks”: three peaks on one baseline with matched slopes and one olive face. The rule under FLATIRONS ties the two words into a single object so MOVERS can carry its .42em tracking. The mark's 96×44 viewBox renders at 40×19 in the marketing header."
          >
            <div className="gridlines border border-line md:grid-cols-3">
              <div className="bg-paper grid place-items-center px-6 py-11">
                <Logo scale={1} />
              </div>
              <div className="bg-ink grid place-items-center px-6 py-11">
                <Logo scale={0.55} tone="dark" rule={false} />
              </div>
              <div className="bg-surface grid place-items-center px-6 py-11">
                <div className="text-ink text-center">
                  <LogoMark width={52} tone="mono" className="mx-auto" />
                  <div className="text-meta-sm text-ink-muted mt-3">One colour</div>
                </div>
              </div>
            </div>
            <div className="gridlines border-line mt-px border-x border-b md:grid-cols-3">
              <div className="bg-paper grid place-items-center px-6 py-8">
                <div className="text-center">
                  <LogoMark width={40} className="mx-auto" />
                  <div className="text-meta-sm text-ink-muted mt-3">
                    40×19 — header
                  </div>
                </div>
              </div>
              <div className="bg-paper grid place-items-center px-6 py-8">
                <div className="text-center">
                  <LogoMark width={16} className="mx-auto" />
                  <div className="text-meta-sm text-ink-muted mt-3">
                    16px — favicon
                  </div>
                </div>
              </div>
              <div className="bg-olive grid place-items-center px-6 py-8">
                <div className="text-paper text-center">
                  <LogoMark width={40} tone="mono" className="mx-auto" />
                  <div className="text-meta-sm mt-3 opacity-70">On olive</div>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-2">
              <div className="display text-wordmark">
                Flatirons
              </div>
              <div className="text-wordmark-sub font-body text-olive uppercase">
                Movers
              </div>
              <p className="text-meta-sm text-ink-muted mt-1">
                wordmark · Barlow Condensed 700, ls .14em (2a sets .09em at
                lockup size) — wordmark-sub · Barlow 500, ls .42em, olive
              </p>
            </div>
          </Section>

          <Section
            n="7"
            title="Geometry"
            note="border-radius: 0 on every element — the single most important visual rule. 1px dividers come from grid gaps, not borders: a grid with gap 1px over the grid fill, children opaque."
          >
            <div className="grid gap-[34px] md:grid-cols-2">
              <div>
                <p className="text-label text-ink-muted mb-3">
                  Blueprint registration marks
                </p>
                <div className="blueprint bg-paper px-7 py-7">
                  <div className="display text-card-title-sm">Free estimate</div>
                  <p className="text-body-sm text-ink-body mt-2">
                    Four crosshairs, 11px, drawn outside the frame. Used on the
                    estimate form, “next action” cards and callouts.
                  </p>
                </div>
                <div className="bg-ink-deep mt-9 px-7 py-7">
                  <div className="blueprint blueprint-dark px-6 py-6">
                    <div className="display text-card-title-sm text-olive-mist">
                      Reversed
                    </div>
                    <p className="text-body-sm text-cream-body mt-2">
                      Frame and crosshairs in mist on the app chrome ground.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-label text-ink-muted mb-3">
                  Grid-gap dividers — 1px, no borders
                </p>
                <div className="gridlines border-line grid-cols-3 border">
                  {[
                    ["4,100+", "moves"],
                    ["4.9 / 5", "612 reviews"],
                    ["$0", "deposit"],
                  ].map(([stat, label]) => (
                    <div key={label} className="bg-paper px-5 py-6">
                      <div className="display text-stat-sm">{stat}</div>
                      <div className="text-meta-sm text-ink-muted mt-1">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-label text-ink-muted mt-9 mb-3">
                  Topographic ground — 1px lines at 34px
                </p>
                <div className="topo border-line h-[150px] border" />

                <p className="text-label text-ink-muted mt-9 mb-3">
                  Elevation — floating mobile frames only
                </p>
                <div className="bg-paper border-line shadow-frame border px-5 py-5">
                  <span className="text-body-sm text-ink-body">
                    0 4px 22px rgba(22,40,63,.12)
                  </span>
                </div>
              </div>
            </div>
          </Section>

          <Section
            n="8"
            title="States"
            note="Hover brightens by 4%. Focus is always a 2px olive outline at 2px offset — never the browser default. Live-status dots pulse 1 → .35 → 1 over 1.6s."
          >
            <div className="flex flex-wrap items-center gap-4">
              <button className="bg-olive text-paper text-btn-sm interactive px-[18px] py-[11px] uppercase">
                Free estimate
              </button>
              <button className="bg-ink text-paper text-btn-sm interactive px-[18px] py-[11px] uppercase">
                Book this move
              </button>
              <button className="border-line-strong text-ink text-btn-sm interactive border bg-transparent px-[18px] py-[11px] uppercase">
                Message crew
              </button>
              <button
                disabled
                className="border-line text-ink-disabled cursor-not-allowed border px-[18px] py-[11px] text-btn-sm uppercase"
              >
                Booked out
              </button>
              <input
                className="border-line-strong bg-paper text-body-sm px-3 py-[10px]"
                placeholder="Moving from"
                aria-label="Moving from"
              />
              <span className="bg-ink-deep text-olive-mist text-meta-sm inline-flex items-center gap-2 px-3 py-2">
                <span className="bg-olive animate-pulse-dot inline-block h-2 w-2" />
                Crew en route
              </span>
            </div>
            <p className="text-meta-sm text-ink-muted mt-4">
              Tab through the row above to check the focus ring.
            </p>
          </Section>

          <Section
            n="9"
            title="The engine, wired in"
            note="Proof that the published bands come from lib/pricing.ts rather than a hard-coded table. These are computed at build time from the room presets — the same code path the estimator uses."
          >
            <div className="gridlines border-line grid-cols-2 border md:grid-cols-4">
              {bands.map((b) => (
                <div key={b.size} className="bg-paper px-5 py-6">
                  <div className="text-label text-ink-muted uppercase">
                    {b.size}
                  </div>
                  <div className="display text-stat-sm mt-3">
                    ${b.low.toLocaleString()}–${b.high.toLocaleString()}
                  </div>
                  <div className="text-meta-sm text-ink-muted mt-2">
                    {b.hours.toFixed(1)} hrs · {b.movers} movers · $
                    {CONFIG.rates[b.movers]}/hr
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div className="bg-ink px-[34px] py-[34px]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-[34px]">
          <span className="bg-olive h-px w-[34px]" />
          <span className="display text-h2-sm text-olive-mist tracking-[.16em]">
            We move. You settle in.
          </span>
          <span className="bg-olive h-px w-[34px]" />
        </div>
      </div>
    </main>
  );
}
