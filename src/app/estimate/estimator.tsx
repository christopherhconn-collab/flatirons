"use client";

/**
 * The four-step estimator.
 *
 * This component holds *selections*, never prices. Every interaction posts the
 * change to `updateEstimate`, which re-prices on the server and returns the
 * whole view as finished strings. The running estimate in the rail is
 * therefore always a server number — the one rule the handoff is most emphatic
 * about (README.md: "a browser-computed price is user-editable and therefore
 * not a price").
 *
 * Counts and toggles are echoed locally the instant they are tapped so the UI
 * does not wait on a roundtrip; the moment the server answers, its view wins.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";

import { Check, ChevronLeft, ChevronRight } from "@/components/icons";
import { LogoLockup } from "@/components/logo";
import { PHONE, PHONE_HREF } from "@/lib/site";
import type { DayCell, EstimateView } from "@/lib/estimate";
import { FLOORS, type CrewSize, type Floor } from "@/lib/pricing";
import { bookMove, updateEstimate } from "./actions";

const STEP_LABELS = [
  "Addresses",
  "What we’re moving",
  "Date & crew",
  "Confirm",
] as const;

export function Estimator({ initial }: { initial: EstimateView }) {
  const [view, setView] = useState(initial);
  const [month, setMonth] = useState({
    year: initial.calendar.year,
    month: initial.calendar.month,
  });
  const [pending, startTransition] = useTransition();
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function send(
    patch: Parameters<typeof updateEstimate>[0],
    nextMonth = month,
  ) {
    // Any edit invalidates the last refusal — otherwise "add your name" sits
    // there accusingly after the name has been typed.
    setError(null);
    startTransition(async () => {
      setView(await updateEstimate(patch, nextMonth));
    });
  }

  /** Text fields do not move the price, so they persist on a lazy timer. */
  function sendLater(field: string, patch: Parameters<typeof updateEstimate>[0]) {
    clearTimeout(debounce.current[field]);
    debounce.current[field] = setTimeout(() => send(patch), 400);
  }

  // A cold visit to /estimate has no draft yet: a Server Component cannot set
  // the cookie that identifies one, so the page renders an unsaved draft with
  // no reference and this mints the real one. The state lands in the promise
  // callback rather than in the effect body — this is synchronising with the
  // server, not cascading a render.
  useEffect(() => {
    if (initial.ref) return;
    let live = true;
    updateEstimate({}).then((minted) => {
      if (live) setView(minted);
    });
    return () => {
      live = false;
    };
  }, [initial.ref]);

  useEffect(
    () => () => Object.values(debounce.current).forEach(clearTimeout),
    [],
  );

  function bump(name: string, delta: number) {
    setView((v) => ({
      ...v,
      itemRows: v.itemRows.map((row) =>
        row.name === name
          ? { ...row, count: Math.max(0, row.count + delta) }
          : row,
      ),
      roomTabs: v.roomTabs.map((tab) =>
        tab.room === v.room
          ? {
              ...tab,
              count: Math.max(0, tab.count + delta),
              label:
                Math.max(0, tab.count + delta) > 0
                  ? `${tab.room} · ${Math.max(0, tab.count + delta)}`
                  : tab.room,
            }
          : tab,
      ),
    }));
    send({ bump: { name, delta } });
  }

  function goToStep(step: number) {
    if (step > view.step) return; // backward navigation only
    send({ step });
  }

  async function book() {
    setBooking(true);
    setError(null);
    const result = await bookMove();
    // A successful booking redirects, so reaching here means it was refused.
    if (result?.error) setError(result.error);
    setBooking(false);
  }

  return (
    <div className="bg-bg flex min-h-dvh flex-col">
      {/* ── Chrome ────────────────────────────────────────────────────── */}
      <div className="border-line flex items-center justify-between gap-4 border-b px-[30px] py-4 max-md:px-[18px]">
        <Link href="/" aria-label="Flatirons Movers, home">
          <LogoLockup markWidth={32} wordSize={15} subSize={8} gap={9} />
        </Link>
        <span className="text-ink-muted text-[12.5px] leading-none">
          {view.ref
            ? `Saved automatically · quote #${view.ref}`
            : "Saving your quote…"}
        </span>
      </div>

      {/* ── Step bar ──────────────────────────────────────────────────── */}
      <ol className="gridlines border-line grid-cols-4 border-b max-sm:grid-cols-2">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = view.step === n;
          const done = view.step > n;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => goToStep(n)}
                disabled={n > view.step}
                aria-current={active ? "step" : undefined}
                className={`interactive w-full px-5 py-3.5 text-left ${
                  active
                    ? "bg-olive"
                    : done
                      ? "bg-olive-wash"
                      : "bg-bg cursor-default"
                }`}
              >
                <span
                  className={`block text-[10px] leading-none font-medium tracking-[0.18em] uppercase ${
                    active
                      ? "text-olive-mist"
                      : done
                        ? "text-olive"
                        : "text-ink-disabled"
                  }`}
                >
                  Step {n}
                  {done && " · done"}
                </span>
                <span
                  className={`display mt-1.5 block text-[17px] leading-none tracking-[0.06em] ${
                    active
                      ? "text-paper"
                      : done
                        ? "text-ink"
                        : "text-ink-disabled"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="grid flex-1 grid-cols-[1fr_350px] max-lg:grid-cols-1">
        <div className="px-[30px] pt-7 pb-9 max-md:px-[18px]">
          {view.step === 1 && (
            <StepAddresses view={view} send={send} sendLater={sendLater} />
          )}
          {view.step === 2 && <StepInventory view={view} send={send} bump={bump} />}
          {view.step === 3 && (
            <StepDateCrew
              view={view}
              send={send}
              month={month}
              setMonth={setMonth}
            />
          )}
          {view.step === 4 && (
            <StepConfirm
              view={view}
              send={send}
              sendLater={sendLater}
              onBook={book}
              booking={booking}
              error={error}
            />
          )}
        </div>

        <PriceRail view={view} pending={pending} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   The price rail
   ═══════════════════════════════════════════════════════════════════════════ */

function PriceRail({ view, pending }: { view: EstimateView; pending: boolean }) {
  return (
    <aside
      className="border-line bg-ink flex flex-col border-l px-[26px] py-7 max-lg:border-t max-lg:border-l-0"
      aria-live="polite"
    >
      <h2 className="text-olive-pale mb-4 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
        Running estimate
      </h2>
      <div
        className={`display text-[50px] leading-none text-[#f7f6f2] transition-opacity duration-150 ${
          pending ? "opacity-55" : "opacity-100"
        }`}
      >
        {view.priceRange}
      </div>
      <p className="text-cream-muted mt-2 text-[13px] leading-[1.5]">
        {view.priceBasis}
      </p>
      {/* The range is labour plus item surcharges. Travel is billed on top and
          the engine cannot price it until step 6 resolves real mileage, so the
          rail says what the number leaves out rather than letting it read as
          the whole bill. */}
      <p className="text-olive-pale mt-2 mb-[22px] text-[12px] leading-[1.5]">
        {view.travelNote}
      </p>

      <dl className="grid gap-[11px] text-[13.5px] leading-[1.3]">
        {view.priceLines.map((line) => (
          <div key={line.label}>
            <div
              className={`flex justify-between gap-3 ${
                line.accent ? "text-olive-pale" : "text-[rgb(247_246_242/0.85)]"
              }`}
            >
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
            <div className="mt-[11px] h-px bg-[rgb(223_231_210/0.18)]" />
          </div>
        ))}
      </dl>

      <div className="mt-[22px] border border-[rgb(223_231_210/0.28)] p-3.5">
        <div className="text-olive-pale mb-2 text-[10px] leading-none font-medium tracking-[0.18em] uppercase">
          Inventory
        </div>
        <p className="text-[13px] leading-[1.6] text-[rgb(247_246_242/0.8)]">
          {view.inventorySummary}
        </p>
      </div>

      <p className="text-cream-quiet mt-auto pt-6 text-[12px] leading-[1.5]">
        Prefer to talk it through? Call{" "}
        <a href={PHONE_HREF} className="text-olive-pale">
          {PHONE}
        </a>{" "}
        — a dispatcher picks up, not a menu.
      </p>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shared controls
   ═══════════════════════════════════════════════════════════════════════════ */

function Segmented<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onPick: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-label text-ink-muted mb-1.5 block">{label}</legend>
      <div className="border-line-seg grid grid-cols-4 gap-px border bg-[rgb(22_40_63/0.22)]">
        {options.map((option) => {
          const on = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(option)}
              className={`interactive py-[11px] text-center text-[13px] leading-none ${
                on
                  ? "bg-olive text-paper font-semibold"
                  : "bg-bg text-ink-body font-medium"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CheckRow({
  checked,
  onToggle,
  title,
  note,
  className = "",
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  note: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`interactive bg-paper flex w-full items-center gap-3 border border-[rgb(22_40_63/0.18)] p-4 text-left ${className}`}
    >
      <span
        className={`grid h-[22px] w-[22px] flex-none place-items-center border ${
          checked ? "bg-olive border-olive" : "border-[rgb(22_40_63/0.4)]"
        }`}
      >
        {checked && <Check size={14} color="#fbfaf7" />}
      </span>
      <span>
        <span className="block text-[15px] leading-[1.2] font-semibold">
          {title}
        </span>
        <span className="text-ink-muted block text-[13px] leading-[1.4]">
          {note}
        </span>
      </span>
    </button>
  );
}

function StepButtons({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="mt-7 flex flex-wrap gap-2.5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-ink text-btn-sm interactive border border-[rgb(22_40_63/0.3)] px-[22px] py-3.5 text-[14px]"
        >
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        className="bg-olive text-paper text-btn-sm interactive px-[26px] py-3.5 text-[14px]"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "col-span-full" : ""}`}>
      <span className="text-label text-ink-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

const INPUT =
  "w-full border border-[rgb(22_40_63/0.24)] bg-paper p-3 text-[14.5px]";

/* ═══════════════════════════════════════════════════════════════════════════
   Step 1 — addresses and access
   ═══════════════════════════════════════════════════════════════════════════ */

function StepAddresses({
  view,
  send,
  sendLater,
}: {
  view: EstimateView;
  send: (patch: Parameters<typeof updateEstimate>[0]) => void;
  sendLater: (
    field: string,
    patch: Parameters<typeof updateEstimate>[0],
  ) => void;
}) {
  return (
    <section>
      <h2 className="text-h2 mb-1.5">Where to where</h2>
      <p className="text-ink-body mb-[26px] max-w-[60ch] text-[14.5px] leading-[1.6]">
        Stairs and long carries change the clock more than distance does, so
        tell us about the doors on both ends.
      </p>

      <div className="grid max-w-[720px] grid-cols-2 gap-[22px] max-sm:grid-cols-1">
        <Field label="Moving from">
          <input
            defaultValue={view.from}
            placeholder="1420 Tennyson St, Denver"
            autoComplete="street-address"
            onChange={(e) => sendLater("from", { from: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Moving to">
          <input
            defaultValue={view.to}
            placeholder="Golden, CO 80401"
            onChange={(e) => sendLater("to", { to: e.target.value })}
            className={INPUT}
          />
        </Field>

        <Segmented<Floor>
          label="Pickup access"
          options={FLOORS}
          value={view.fromFloor}
          onPick={(fromFloor) => send({ fromFloor })}
        />
        <Segmented<Floor>
          label="Drop-off access"
          options={FLOORS}
          value={view.toFloor}
          onPick={(toFloor) => send({ toFloor })}
        />
      </div>

      <CheckRow
        checked={view.elevator}
        onToggle={() => send({ elevator: !view.elevator })}
        title="There’s a service elevator we can reserve"
        note="Cuts the stair premium out of the estimate."
        className="mt-6 max-w-[720px]"
      />

      <StepButtons
        onNext={() => send({ step: 2 })}
        nextLabel="Next — what we’re moving"
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 2 — room by room
   ═══════════════════════════════════════════════════════════════════════════ */

function StepInventory({
  view,
  send,
  bump,
}: {
  view: EstimateView;
  send: (patch: Parameters<typeof updateEstimate>[0]) => void;
  bump: (name: string, delta: number) => void;
}) {
  return (
    <section>
      <h2 className="text-h2 mb-1.5">Room by room</h2>
      <p className="text-ink-body mb-[22px] max-w-[60ch] text-[14.5px] leading-[1.6]">
        Rough counts are fine — the crew confirms on arrival. The estimate on
        the right moves as you count.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {view.roomTabs.map((tab) => (
          <button
            key={tab.room}
            type="button"
            aria-pressed={tab.active}
            onClick={() => send({ room: tab.room })}
            className={`interactive border px-3.5 py-[9px] text-[11.5px] leading-none font-semibold tracking-[0.1em] uppercase ${
              tab.active
                ? "bg-olive border-olive text-paper"
                : "text-ink-body border-[rgb(22_40_63/0.22)] bg-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="border-line border">
        <div className="grid grid-cols-[1fr_150px_140px] gap-px bg-[rgb(22_40_63/0.12)] max-sm:grid-cols-[1fr_110px]">
          <div className="text-th text-ink-muted bg-surface px-4 py-2.5">Item</div>
          <div className="text-th text-ink-muted bg-surface px-4 py-2.5 max-sm:hidden">
            Handling
          </div>
          <div className="text-th text-ink-muted bg-surface px-4 py-2.5 text-right">
            Count
          </div>

          {view.itemRows.map((row) => {
            const tint = row.count ? "bg-[#f4f6ef]" : "bg-paper";
            return (
              <div key={row.name} className="contents">
                <div className={`${tint} px-4 py-[13px] text-[15px] leading-none font-medium`}>
                  {row.name}
                </div>
                <div
                  className={`${tint} px-4 py-[13px] text-[13px] leading-none max-sm:hidden ${
                    row.surcharge ? "text-olive" : "text-[rgb(22_40_63/0.5)]"
                  }`}
                >
                  {row.handling}
                </div>
                <div className={`${tint} flex justify-end gap-px px-3 py-[9px]`}>
                  <button
                    type="button"
                    onClick={() => bump(row.name, -1)}
                    disabled={row.count === 0}
                    aria-label={`One fewer ${row.name}`}
                    className="interactive text-ink-muted h-[30px] w-8 border border-[rgb(22_40_63/0.22)] bg-transparent text-[16px] leading-none font-medium disabled:opacity-40"
                  >
                    −
                  </button>
                  <span
                    aria-label={`${row.count} ${row.name}`}
                    className={`grid h-[30px] w-9 place-items-center border border-[rgb(22_40_63/0.22)] text-[15px] leading-none font-semibold ${
                      row.count ? "text-ink" : "text-[rgb(22_40_63/0.35)]"
                    }`}
                  >
                    {row.count}
                  </span>
                  <button
                    type="button"
                    onClick={() => bump(row.name, 1)}
                    aria-label={`One more ${row.name}`}
                    className="bg-olive border-olive interactive text-paper h-[30px] w-8 border text-[16px] leading-none font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CheckRow
        checked={view.packing}
        onToggle={() => send({ packing: !view.packing })}
        title="Add a packing crew the day before — $65/hr"
        note="Boxes, paper and tape included. Kitchens go four times faster."
        className="mt-[22px]"
      />

      <StepButtons
        onBack={() => send({ step: 1 })}
        onNext={() => send({ step: 3 })}
        nextLabel="Next — date & crew"
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 3 — date and crew
   ═══════════════════════════════════════════════════════════════════════════ */

const DAY_STATE: Record<DayCell["state"], string> = {
  blank: "",
  selected: "bg-olive border-olive text-paper font-semibold",
  open: "bg-surface border-line text-ink",
  booked: "bg-[rgb(22_40_63/0.1)] border-line text-[rgb(22_40_63/0.35)]",
  past: "bg-[rgb(22_40_63/0.04)] border-line text-[rgb(22_40_63/0.28)]",
};

function StepDateCrew({
  view,
  send,
  month,
  setMonth,
}: {
  view: EstimateView;
  send: (
    patch: Parameters<typeof updateEstimate>[0],
    month?: { year: number; month: number },
  ) => void;
  month: { year: number; month: number };
  setMonth: (m: { year: number; month: number }) => void;
}) {
  function shiftMonth(delta: number) {
    const m = month.month + delta;
    const next = {
      year: month.year + (m < 1 ? -1 : m > 12 ? 1 : 0),
      month: m < 1 ? 12 : m > 12 ? 1 : m,
    };
    setMonth(next);
    send({}, next);
  }

  return (
    <section>
      <h2 className="text-h2 mb-1.5">Pick a day, pick a crew</h2>
      <p className="text-ink-body mb-6 max-w-[60ch] text-[14.5px] leading-[1.6]">
        Bigger crews cost more per hour and less in total. Greyed days are
        already booked out.
      </p>

      <div className="grid grid-cols-[auto_1fr] items-start gap-[34px] max-lg:grid-cols-1">
        {/* Calendar */}
        <div className="border-line bg-paper w-[352px] max-w-full border p-[18px]">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!view.calendar.canGoBack}
                aria-label="Previous month"
                className="interactive text-ink-muted grid h-[26px] w-[26px] place-items-center border border-[rgb(22_40_63/0.22)] disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="display text-[20px] leading-none tracking-[0.1em]">
                {view.calendar.title}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={!view.calendar.canGoForward}
                aria-label="Next month"
                className="interactive text-ink-muted grid h-[26px] w-[26px] place-items-center border border-[rgb(22_40_63/0.22)] disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <span className="text-ink-quiet text-[11.5px] leading-none">
              the Denver metro
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {view.calendar.dayLabels.map((label) => (
              <div
                key={label}
                className="pb-1.5 text-center text-[9.5px] leading-none font-medium tracking-[0.1em] text-[rgb(22_40_63/0.45)] uppercase"
              >
                {label}
              </div>
            ))}
            {view.calendar.cells.map((cell, i) =>
              cell.state === "blank" ? (
                <div key={`blank-${i}`} className="h-10" />
              ) : (
                <button
                  key={cell.date}
                  type="button"
                  disabled={cell.state === "booked" || cell.state === "past"}
                  aria-pressed={cell.state === "selected"}
                  onClick={() => send({ date: cell.date })}
                  className={`interactive grid h-10 place-items-center border text-[14px] leading-none disabled:cursor-default ${DAY_STATE[cell.state]}`}
                >
                  {cell.label}
                </button>
              ),
            )}
          </div>

          <div className="text-ink-quiet mt-3.5 flex flex-wrap gap-4 text-[11px] leading-none">
            <span className="flex items-center gap-1.5">
              <span className="bg-olive h-2.5 w-2.5" />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-surface h-2.5 w-2.5 border border-[rgb(22_40_63/0.18)]" />
              Open
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-[rgb(22_40_63/0.1)]" />
              Booked out
            </span>
          </div>
        </div>

        {/* Crew size */}
        <div>
          <h3 className="text-label text-ink-muted mb-2.5 tracking-[0.18em]">
            Crew size
          </h3>
          <div className="grid gap-2.5">
            {view.moverOptions.map((option) => (
              <button
                key={option.movers}
                type="button"
                aria-pressed={option.selected}
                onClick={() => send({ movers: option.movers as CrewSize })}
                className={`interactive flex items-center justify-between gap-4 border px-[18px] py-4 text-left ${
                  option.selected
                    ? "border-olive bg-olive-wash"
                    : "bg-paper border-[rgb(22_40_63/0.18)]"
                }`}
              >
                <span>
                  <span className="block text-[17px] leading-[1.1] font-semibold">
                    {option.label}
                  </span>
                  <span className="text-ink-muted mt-1 block text-[13px] leading-[1.4]">
                    {option.note}
                  </span>
                </span>
                <span className="text-right">
                  <span className="display block text-[22px] leading-none">
                    {option.rate}
                  </span>
                  <span className="text-ink-muted mt-1 block text-[12px] leading-none">
                    {option.estimate}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="text-ink-lede mt-5 border border-dashed border-[rgb(22_40_63/0.3)] p-4 text-[13.5px] leading-[1.55]">
            Arrival windows are 30 minutes wide. You’ll get the crew’s names and
            the truck number 48 hours out.
          </p>
        </div>
      </div>

      <StepButtons
        onBack={() => send({ step: 2 })}
        onNext={() => send({ step: 4 })}
        nextLabel="Next — confirm"
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Step 4 — confirm and book
   ═══════════════════════════════════════════════════════════════════════════ */

function StepConfirm({
  view,
  send,
  sendLater,
  onBook,
  booking,
  error,
}: {
  view: EstimateView;
  send: (patch: Parameters<typeof updateEstimate>[0]) => void;
  sendLater: (
    field: string,
    patch: Parameters<typeof updateEstimate>[0],
  ) => void;
  onBook: () => void;
  booking: boolean;
  error: string | null;
}) {
  return (
    <section>
      <h2 className="text-h2 mb-1.5">Confirm and hold the day</h2>
      <p className="text-ink-body mb-6 max-w-[60ch] text-[14.5px] leading-[1.6]">
        No card, no deposit. We charge the hourly rate on the day, rounded to
        the quarter hour.
      </p>

      <div className="mb-6 grid max-w-[720px] grid-cols-2 gap-[18px] max-sm:grid-cols-1">
        <Field label="Name">
          <input
            defaultValue={view.name}
            placeholder="Dana Doyle"
            autoComplete="name"
            onChange={(e) => sendLater("name", { name: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Mobile">
          <input
            defaultValue={view.phone}
            placeholder="303.555.0186"
            type="tel"
            autoComplete="tel"
            onChange={(e) => sendLater("phone", { phone: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Email" full>
          <input
            defaultValue={view.email}
            placeholder="dana@example.com"
            type="email"
            autoComplete="email"
            onChange={(e) => sendLater("email", { email: e.target.value })}
            className={INPUT}
          />
        </Field>
      </div>

      <dl className="border-line bg-paper border">
        {view.confirmRows.map((row, i) => (
          <div
            key={row.label}
            className={`flex justify-between gap-4 px-[18px] py-[13px] text-[14.5px] leading-[1.3] ${
              i < view.confirmRows.length - 1
                ? "border-b border-[rgb(22_40_63/0.1)]"
                : ""
            }`}
          >
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="text-right font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="bg-paper mt-6 max-w-[720px] border border-[rgb(22_40_63/0.18)] p-5">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="display text-[20px] leading-none tracking-[0.08em]">
            Card on file — optional
          </h3>
          <span className="text-olive text-[10.5px] leading-none font-medium tracking-[0.16em] uppercase">
            $0 charged today
          </span>
        </div>
        <p className="text-ink-body mb-4 text-[13.5px] leading-[1.55]">
          Skip it and pay the crew by card or check on the day. Leave it and we
          bill the final hours automatically once you sign the bill of lading.
        </p>
        <div className="grid grid-cols-[1.4fr_1fr] gap-3.5 max-sm:grid-cols-1">
          <input
            defaultValue={view.cardNumber}
            placeholder="Card number"
            inputMode="numeric"
            autoComplete="cc-number"
            onChange={(e) =>
              sendLater("cardNumber", { cardNumber: e.target.value })
            }
            className="bg-bg border border-[rgb(22_40_63/0.24)] p-3 text-[14.5px]"
          />
          <input
            defaultValue={view.cardExpiry}
            placeholder="MM / YY"
            autoComplete="cc-exp"
            onChange={(e) =>
              sendLater("cardExpiry", { cardExpiry: e.target.value })
            }
            className="bg-bg border border-[rgb(22_40_63/0.24)] p-3 text-[14.5px]"
          />
        </div>
      </div>

      <div className="mt-[26px] flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => send({ step: 3 })}
          className="text-ink text-btn-sm interactive border border-[rgb(22_40_63/0.3)] px-[22px] py-3.5 text-[14px]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onBook}
          disabled={booking}
          className="bg-ink text-paper text-btn interactive px-[30px] py-4 disabled:opacity-60"
        >
          {booking ? "Booking…" : "Book this move"}
        </button>
        <span className="text-ink-quiet text-[13px] leading-[1.4]">
          {view.bookNote}
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="text-olive-dark bg-olive-tint border-olive mt-4 max-w-[720px] border p-3.5 text-[13.5px] leading-[1.5]"
        >
          {error}
        </p>
      )}
    </section>
  );
}
