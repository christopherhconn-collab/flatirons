import type { Metadata } from "next";
import Link from "next/link";

import { LogoLockup } from "@/components/logo";
import { requireStaffAccess } from "@/lib/auth";
import { FLOORS, HOME_SIZES } from "@/lib/pricing";
import { todayISO } from "@/lib/session";
import { createQuote } from "./actions";

export const metadata: Metadata = {
  title: "New estimate — Flatirons Movers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const INPUT =
  "border-line-strong bg-paper w-full border p-2.5 text-[14px] text-ink";
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

/**
 * The office's own estimator — for a move that arrives by phone.
 *
 * Deliberately coarser than the customer's: a caller gives a home size and
 * the doors at both ends, not a room-by-room inventory, and a form that asked
 * for one would put invented precision on the number quoted back. The size
 * preset is the same one the published price bands are built from, so a
 * phoned quote and a self-service quote for the same move agree.
 *
 * Plain form, no JavaScript required, like every other staff surface.
 */
export default async function NewQuotePage(props: PageProps<"/office/new">) {
  await requireStaffAccess("/office/new");
  const params = await props.searchParams;
  const failed = params.error === "missing";

  return (
    <div className="bg-bg min-h-dvh px-6 py-5 max-md:px-4">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Flatirons Movers, home">
            <LogoLockup markWidth={28} wordSize={13} subSize={7} gap={9} />
          </Link>
          <span className="text-ink-quiet">·</span>
          <h1 className="display text-[22px] leading-none tracking-[0.06em]">
            New estimate
          </h1>
        </div>
        <Link
          href="/office"
          className="text-ink border-line-strong interactive border px-3 py-2 text-[10.5px] leading-none font-medium tracking-[0.14em] uppercase"
        >
          Back to office
        </Link>
      </header>

      <form action={createQuote} className="max-w-[760px]">
        {failed && (
          <p
            role="alert"
            className="border-line-strong bg-olive-tint text-ink mb-5 border p-3 text-[13.5px] leading-[1.5]"
          >
            A name, an email address and a date are needed before a quote can
            be sent. Nothing was saved — fill those in and try again.
          </p>
        )}

        <section className="mb-7">
          <h2 className="text-ink-quiet mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
            Who called
          </h2>
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <Field label="Name">
              <input name="customer" required placeholder="Dana Doyle" className={INPUT} />
            </Field>
            <Field label="Email" hint="The quote is emailed here.">
              <input
                name="email"
                type="email"
                required
                placeholder="dana@example.com"
                className={INPUT}
              />
            </Field>
            <Field label="Mobile" hint="Optional. Texted only if given.">
              <input name="phone" type="tel" placeholder="303.555.0186" className={INPUT} />
            </Field>
          </div>
        </section>

        <section className="mb-7">
          <h2 className="text-ink-quiet mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
            The move
          </h2>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <Field label="Moving from">
              <input name="from" placeholder="1420 Tennyson St, Denver" className={INPUT} />
            </Field>
            <Field label="Moving to">
              <input name="to" placeholder="Golden, CO 80401" className={INPUT} />
            </Field>
            <Field
              label="Date offered"
              hint="Not held. The day is reserved only when the customer accepts."
            >
              <input
                name="date"
                type="date"
                required
                defaultValue={todayISO()}
                className={INPUT}
              />
            </Field>
            <Field label="Home size" hint="Sets the inventory the price is built from.">
              <select name="size" defaultValue="2 bed" className={INPUT}>
                {HOME_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Crew">
              <select name="movers" defaultValue="3" className={INPUT}>
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} movers
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
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
        </section>

        <section className="mb-7">
          <h2 className="text-ink-quiet mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
            Note from the call
          </h2>
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
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="bg-olive text-paper text-btn-sm interactive px-[26px] py-3.5 text-[14px]"
          >
            Price it and send
          </button>
          <span className="text-ink-muted text-[12.5px] leading-[1.5]">
            Creates a lead at <strong className="font-semibold">Quoted</strong>{" "}
            and emails the customer. Nothing is reserved.
          </span>
        </div>
      </form>
    </div>
  );
}
