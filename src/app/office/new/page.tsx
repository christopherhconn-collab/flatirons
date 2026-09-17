import type { Metadata } from "next";
import Link from "next/link";

import { LogoLockup } from "@/components/logo";
import { requireStaffAccess } from "@/lib/auth";
import { arrivalWindow } from "@/lib/format";
import {
  CONFIG,
  FLOORS,
  HOME_SIZES,
  SERVICE_LABEL,
  SERVICE_NOTE,
  SERVICE_TYPES,
} from "@/lib/pricing";
import { DEFAULT_WINDOW_HOUR, WINDOW_HOURS } from "@/lib/quotes";
import { todayISO } from "@/lib/session";
import { createOfficeJob } from "./actions";

export const metadata: Metadata = {
  title: "New move — Flatirons Movers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const INPUT =
  "border-line-strong bg-paper text-ink w-full border p-2.5 text-[14px]";
const LABEL = "text-label text-ink-muted mb-1.5 block";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && (
        <span className="text-ink-quiet mt-1 block text-[11.5px] leading-[1.4]">
          {hint}
        </span>
      )}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="text-ink-quiet mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The office's own estimator — for a move that arrives by phone.
 *
 * Deliberately coarser than the customer's: a caller gives a home size and the
 * doors at both ends, not a room-by-room inventory, and a form that asked for
 * one would put invented precision on the number quoted back. The size preset
 * is the same one the published price bands are built from, so a phoned quote
 * and a self-service quote for the same move agree.
 *
 * One form, two buttons, because the call ends one of two ways and the office
 * does not know which when it starts typing. Making them choose up front — or
 * worse, making them send a quote so the customer can click accept while still
 * on the phone — is ceremony the job does not need.
 *
 * Plain form, no JavaScript required, like every other staff surface. Which
 * means the labour-only fields and the arrival window are always on screen
 * rather than revealed: each says in its hint when it is read and when it is
 * ignored, and the action ignores them on exactly those terms.
 */
export default async function NewJobPage(props: PageProps<"/office/new">) {
  await requireStaffAccess("/office/new");
  const params = await props.searchParams;
  const failed = params.error === "missing";
  const { movers, minHours, ratePerHour } = CONFIG.laborOnly;

  return (
    <div className="bg-bg min-h-dvh px-6 py-5 max-md:px-4">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Flatirons Movers, home">
            <LogoLockup markWidth={28} wordSize={13} subSize={7} gap={9} />
          </Link>
          <span className="text-ink-quiet">·</span>
          <h1 className="display text-[22px] leading-none tracking-[0.06em]">
            New move
          </h1>
        </div>
        <Link
          href="/office"
          className="text-ink border-line-strong interactive border px-3 py-2 text-[10.5px] leading-none font-medium tracking-[0.14em] uppercase"
        >
          Back to office
        </Link>
      </header>

      <form action={createOfficeJob} className="max-w-[760px]">
        {failed && (
          <p
            role="alert"
            className="border-line-strong bg-olive-tint text-ink mb-5 border p-3 text-[13.5px] leading-[1.5]"
          >
            A name, an email address and a date are needed before anything can
            be sent. Nothing was saved — fill those in and try again.
          </p>
        )}

        <Section title="Who called">
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <Field label="Name">
              <input
                name="customer"
                required
                placeholder="Dana Doyle"
                className={INPUT}
              />
            </Field>
            <Field label="Email" hint="Where the quote or confirmation goes.">
              <input
                name="email"
                type="email"
                required
                placeholder="dana@example.com"
                className={INPUT}
              />
            </Field>
            <Field label="Mobile" hint="Optional. Texted only if given.">
              <input
                name="phone"
                type="tel"
                placeholder="303.555.0186"
                className={INPUT}
              />
            </Field>
          </div>
        </Section>

        <Section title="What we're doing">
          <fieldset className="border-line-strong grid grid-cols-3 gap-px border bg-[rgb(22_40_63/0.12)] max-md:grid-cols-1">
            <legend className="sr-only">Service</legend>
            {SERVICE_TYPES.map((service) => (
              <label
                key={service}
                className="bg-paper flex cursor-pointer gap-2.5 p-3"
              >
                <input
                  type="radio"
                  name="service"
                  value={service}
                  defaultChecked={service === "full"}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  <span className="text-ink block text-[13.5px] font-semibold">
                    {SERVICE_LABEL[service]}
                  </span>
                  <span className="text-ink-muted mt-0.5 block text-[11.5px] leading-[1.4]">
                    {SERVICE_NOTE[service]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="mt-4 grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <Field
              label="Home size"
              hint="Sets the inventory the price is built from. Ignored when hours are stated."
            >
              <select name="size" defaultValue="2 bed" className={INPUT}>
                {HOME_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Crew"
              hint={`Labour only is always ${movers} movers at $${ratePerHour}/hr.`}
            >
              <select name="movers" defaultValue="3" className={INPUT}>
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} movers
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Hours, if they named one"
              hint={`Labour only. Leave empty to price the home size instead. ${minHours} hr minimum.`}
            >
              <input
                name="hours"
                type="number"
                min={minHours}
                max={12}
                step={0.25}
                placeholder="e.g. 3"
                className={INPUT}
              />
            </Field>
          </div>
        </Section>

        <Section title="The move">
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <Field
              label="Pickup address"
              hint={`Not used on ${SERVICE_LABEL.unloading.toLowerCase()}.`}
            >
              <input
                name="from"
                placeholder="1420 Tennyson St, Denver"
                className={INPUT}
              />
            </Field>
            <Field
              label="Destination address"
              hint={`Not used on ${SERVICE_LABEL.loading.toLowerCase()}.`}
            >
              <input name="to" placeholder="Golden, CO 80401" className={INPUT} />
            </Field>
            <Field label="Pickup access">
              <select name="fromFloor" defaultValue="Ground" className={INPUT}>
                {FLOORS.map((floor) => (
                  <option key={floor} value={floor}>
                    {floor}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Drop-off access">
              <select name="toFloor" defaultValue="Ground" className={INPUT}>
                {FLOORS.map((floor) => (
                  <option key={floor} value={floor}>
                    {floor}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                name="date"
                type="date"
                required
                defaultValue={todayISO()}
                className={INPUT}
              />
            </Field>
            <Field
              label="Arrival window"
              hint="Only set when you book. A quote holds no day, so it gets no window."
            >
              <select
                name="windowHour"
                defaultValue={String(DEFAULT_WINDOW_HOUR)}
                className={INPUT}
              >
                {WINDOW_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {arrivalWindow(hour)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-5">
            <label className="flex items-center gap-2.5 text-[14px]">
              <input name="elevator" type="checkbox" className="h-4 w-4" />
              Service elevator reserved
            </label>
            <label className="flex items-center gap-2.5 text-[14px]">
              <input name="packing" type="checkbox" className="h-4 w-4" />
              Packing the day before
            </label>
          </div>
        </Section>

        <Section title="Note from the call">
          <Field
            label="Anything the crew should know"
            hint="Optional. Goes on the customer's message thread."
          >
            <textarea
              name="note"
              rows={3}
              placeholder="Piano on the second floor, no elevator. Gate code 4417."
              className={INPUT}
            />
          </Field>
        </Section>

        {/* Two endings, two buttons. `intent` rides on the button rather than
            a hidden field, so the office never has to set a mode before it
            knows how the call went — and a browser posts only the one
            pressed. */}
        <div className="border-line-strong grid grid-cols-2 gap-px border bg-[rgb(22_40_63/0.12)] max-md:grid-cols-1">
          <div className="bg-paper p-4">
            <button
              type="submit"
              name="intent"
              value="quote"
              className="border-line-strong text-ink text-btn-sm interactive w-full border py-3.5 text-[13.5px]"
            >
              Send the quote
            </button>
            <p className="text-ink-muted mt-2.5 text-[12.5px] leading-[1.5]">
              Emails and texts the estimate with a link to accept it. Lands at{" "}
              <strong className="font-semibold">Quoted</strong> on this board.{" "}
              <strong className="font-semibold">Nothing is reserved</strong> —
              the day stays open until they accept.
            </p>
          </div>
          <div className="bg-paper p-4">
            <button
              type="submit"
              name="intent"
              value="book"
              className="bg-olive text-paper text-btn-sm interactive w-full py-3.5 text-[13.5px]"
            >
              Book it now
            </button>
            <p className="text-ink-muted mt-2.5 text-[12.5px] leading-[1.5]">
              For a customer saying yes on the call. Reserves the day with the
              arrival window above, seeds their checklist, and sends the
              booking confirmation. Goes straight to{" "}
              <strong className="font-semibold">dispatch</strong> for a crew.
            </p>
          </div>
        </div>

        <p className="text-ink-quiet mt-4 text-[12.5px] leading-[1.55]">
          Either way the customer gets a portal at{" "}
          <span className="text-ink-muted">/move/FM-…</span> where they can put
          a card on file. Nothing is charged until after the move.
        </p>
      </form>
    </div>
  );
}
