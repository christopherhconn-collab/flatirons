import { Fragment } from "react";

import type { Metadata } from "next";
import Link from "next/link";

import { Check } from "@/components/icons";
import { LogoLockup } from "@/components/logo";
import { CopyButton, LiveRefresh } from "@/components/portal-bits";
import { PHONE, PHONE_HREF } from "@/lib/site";
import { dateLabel, money, place } from "@/lib/format";
import {
  initialsOf,
  invoiceOf,
  isLive,
  loadedCount,
  loadedPercent,
  referralCode,
  timelineFor,
} from "@/lib/jobs";
import { authEnabled, requireMoveAccess } from "@/lib/auth";
import { stripeEnabled } from "@/lib/stripe";
import { payInvoice, sendMessage, submitReview, toggleTask } from "./actions";

export const metadata: Metadata = {
  title: "Your move — Flatirons Movers",
  robots: { index: false, follow: false },
};

// The crew moves this page from the field; nothing here may be cached.
export const dynamic = "force-dynamic";

/**
 * The customer's tracking portal.
 *
 * Guarded by `requireMoveAccess`: the signed-in visitor must be this job's
 * customer, or staff. The same guard opens every action in `actions.ts` —
 * they are reachable by direct POST, so this page guarding itself would
 * protect nothing. With auth unconfigured (no Supabase env) the guard admits
 * anyone with a reference, exactly as the prototype did — see the header of
 * `src/lib/auth.ts` for when that mode is acceptable.
 *
 * Mobile-first at 414px, floated on the desk ground exactly as designed. Touch
 * targets are 44px at minimum and 52px on the tappable list rows.
 */
export default async function MovePage(props: PageProps<"/move/[id]">) {
  const { id } = await props.params;
  const job = await requireMoveAccess(id);
  const params = await props.searchParams;
  // Back from Stripe but the webhook hasn't landed yet. The page already
  // re-polls while live; the banner explains the seconds in between.
  const paymentPending = params.paid === "pending" && !job.paid;

  const live = isLive(job);
  const loaded = loadedCount(job);
  const percent = loadedPercent(job);
  const timeline = timelineFor(job);
  const complete = job.status === "complete";
  const invoice = complete ? invoiceOf(job) : null;

  return (
    <div className="bg-desk flex min-h-dvh justify-center px-4 py-[26px] pb-10">
      {(live || paymentPending) && <LiveRefresh />}

      <div
        id="top"
        className="bg-bg w-[414px] max-w-full border border-[rgb(22_40_63/0.18)] shadow-[0_4px_22px_rgb(22_40_63/0.12)]"
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="bg-ink px-5 pt-[18px] pb-[22px]">
          <div className="mb-5 flex items-center justify-between">
            <Link href="/" aria-label="Flatirons Movers, home">
              <LogoLockup
                markWidth={28}
                wordSize={13}
                subSize={7}
                gap={9}
                tone="dark"
              />
            </Link>
            <span
              className="grid h-[30px] w-[30px] place-items-center border border-[rgb(223_231_210/0.4)] text-[12px] leading-none font-medium text-[#dfe7d2]"
              aria-hidden="true"
            >
              {initialsOf(job.customer)}
            </span>
          </div>

          <p className="text-olive-pale mb-2.5 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
            Your move · {job.id}
          </p>
          <h1 className="text-stat-md text-[#f7f6f2]">{dateLabel(job.date)}</h1>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-[rgb(247_246_242/0.72)]">
            {job.crew
              ? `Crew arrives ${job.window} · ${job.movers} movers · ${job.crew}`
              : `Arrival window ${job.window} · crew assigned 48 hrs out`}
          </p>
          <p className="text-olive-pale mt-0.5 text-[13px] leading-[1.5]">
            {job.from} → {job.to}
          </p>
        </header>

        {/* ── Live panel ────────────────────────────────────────────────── */}
        {live && (
          <section className="bg-ink-deep border-t border-[rgb(223_231_210/0.18)] px-5 pt-4 pb-[18px]">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="animate-pulse-dot bg-olive-pale h-2 w-2 rounded-full"
                aria-hidden="true"
              />
              <h2 className="text-olive-pale text-[10.5px] leading-none font-semibold tracking-[0.2em] uppercase">
                {job.status === "enroute" ? "Crew en route" : "Crew on site"}
              </h2>
            </div>

            <div
              className="bg-ink-deepest relative h-[132px] border border-[rgb(223_231_210/0.28)]"
              style={{
                backgroundImage:
                  "linear-gradient(rgb(223 231 210 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(223 231 210 / 0.07) 1px, transparent 1px)",
                backgroundSize: "26px 26px",
              }}
            >
              <svg
                viewBox="0 0 340 132"
                className="absolute inset-0 h-[132px] w-full"
                aria-hidden="true"
              >
                <path
                  d="M40 100 C110 92, 150 60, 300 34"
                  fill="none"
                  stroke="#5d7340"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
              </svg>
              <span className="absolute top-[92px] left-[34px] h-[11px] w-[11px] bg-[#dfe7d2]" />
              <span className="absolute top-[28px] right-[26px] h-[11px] w-[11px] border border-[#dfe7d2]" />
              <span
                className="animate-pulse-dot bg-olive absolute h-[13px] w-[13px] shadow-[0_0_0_5px_rgb(93_115_64/0.3)]"
                style={{
                  left: job.status === "enroute" ? "46%" : "11%",
                  top: job.status === "enroute" ? "48%" : "68%",
                }}
              />
              <span className="absolute bottom-2 left-2.5 text-[9.5px] leading-none font-medium tracking-[0.14em] text-[rgb(223_231_210/0.55)] uppercase">
                {place(job.from)} → {place(job.to)}
              </span>
            </div>

            <div className="mt-3 flex justify-between text-[13px] leading-none text-[rgb(247_246_242/0.8)]">
              <span>
                {loaded} of {job.items.length} items loaded
              </span>
              <span className="text-olive-pale">
                {job.late ? `Running ${job.late} min late` : "On schedule"}
              </span>
            </div>
            <div className="mt-2.5 h-1 bg-[rgb(223_231_210/0.2)]">
              <div className="bg-olive h-1" style={{ width: `${percent}%` }} />
            </div>
          </section>
        )}

        {/* ── Two actions ───────────────────────────────────────────────── */}
        <div className="flex gap-2 px-5 pt-5 pb-2">
          {/* The prototype's primary here is "See crew view", a shortcut into
              the crew app. That app is not in this build (README.md: build it
              in-house only under Stage 4's conditions), so the primary is the
              thing a customer on move day actually wants — a dispatcher. */}
          <a
            href={PHONE_HREF}
            className="bg-olive text-paper interactive flex-1 py-[13px] text-center text-[12px] leading-none font-semibold tracking-[0.1em] uppercase"
          >
            Call dispatch
          </a>
          <a
            href="#messages"
            className="text-ink interactive flex-1 border border-[rgb(22_40_63/0.3)] py-[13px] text-center text-[12px] leading-none font-semibold tracking-[0.1em] uppercase"
          >
            Message crew
          </a>
        </div>

        <div className="px-5 pt-3.5 pb-[22px]">
          {/* ── Timeline ────────────────────────────────────────────────── */}
          <h2 className="text-ink-quiet mb-4 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
            Where things stand
          </h2>
          <ol>
            {timeline.map((stage, i) => (
              <li key={stage.label} className="grid grid-cols-[22px_1fr] gap-3.5">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 h-3 w-3 border ${
                      stage.done
                        ? "bg-olive border-olive"
                        : "border-[rgb(22_40_63/0.35)]"
                    }`}
                  />
                  {i < timeline.length - 1 && (
                    <span
                      className={`w-px flex-1 ${
                        stage.done ? "bg-olive" : "bg-[rgb(22_40_63/0.2)]"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-5">
                  <p
                    className={`text-[16px] leading-[1.2] font-semibold ${
                      stage.done ? "text-ink" : "text-[rgb(22_40_63/0.5)]"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p
                    className={`text-[13px] leading-[1.5] ${
                      stage.done ? "text-ink-muted" : "text-ink-disabled"
                    }`}
                  >
                    {stage.note}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* ── Checklist ───────────────────────────────────────────────── */}
          {job.tasks.length > 0 && (
            <>
              <h2 className="text-ink-quiet mt-1.5 mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
                Your checklist
              </h2>
              <div className="gridlines border-line mb-[22px] border">
                {job.tasks.map((task, index) => (
                  <form key={task.label} action={toggleTask}>
                    <input type="hidden" name="id" value={job.id} />
                    <input type="hidden" name="index" value={index} />
                    <button
                      type="submit"
                      aria-pressed={task.done}
                      className={`interactive flex min-h-[52px] w-full items-start gap-3 px-[15px] py-3.5 text-left ${
                        task.done ? "bg-olive-wash" : "bg-paper"
                      }`}
                    >
                      <span
                        className={`mt-px grid h-[22px] w-[22px] flex-none place-items-center border ${
                          task.done
                            ? "bg-olive border-olive"
                            : "border-[rgb(22_40_63/0.4)]"
                        }`}
                      >
                        {task.done && <Check size={14} color="#fbfaf7" />}
                      </span>
                      <span>
                        <span
                          className={`block text-[15px] leading-[1.25] font-semibold ${
                            task.done
                              ? "text-[rgb(22_40_63/0.5)] line-through"
                              : "text-ink"
                          }`}
                        >
                          {task.label}
                        </span>
                        <span className="mt-[3px] block text-[12.5px] leading-[1.45] text-[rgb(22_40_63/0.58)]">
                          {task.note}
                        </span>
                      </span>
                    </button>
                  </form>
                ))}
              </div>
            </>
          )}

          {/* ── Messages ────────────────────────────────────────────────── */}
          <h2
            id="messages"
            className="text-ink-quiet mb-3 scroll-mt-4 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase"
          >
            Messages
          </h2>
          <div className="border-line bg-paper mb-2.5 grid gap-3 border p-3.5">
            {job.messages.length === 0 ? (
              <p className="text-ink-quiet text-center text-[13px] leading-[1.5]">
                Nothing yet. Ask us anything — a dispatcher reads these.
              </p>
            ) : (
              job.messages.map((message, i) => (
                <div
                  key={`${message.at}-${i}`}
                  className={`max-w-[84%] px-3 py-2.5 ${
                    message.mine
                      ? "bg-ink text-[#f7f6f2] justify-self-end"
                      : "bg-olive-wash text-ink justify-self-start"
                  }`}
                >
                  <p
                    className={`mb-[5px] text-[9.5px] leading-none font-medium tracking-[0.16em] uppercase ${
                      message.mine ? "text-olive-pale" : "text-olive"
                    }`}
                  >
                    {message.who}
                  </p>
                  <p className="text-[14px] leading-[1.45]">{message.text}</p>
                </div>
              ))
            )}
          </div>
          <form action={sendMessage} className="mb-[22px] flex gap-2">
            <input type="hidden" name="id" value={job.id} />
            <input
              name="text"
              required
              placeholder="Ask the crew something"
              aria-label="Message the crew"
              className="border-line-strong bg-paper flex-1 border p-3 text-[14px]"
            />
            <button
              type="submit"
              className="bg-ink text-paper interactive px-[18px] text-[12px] leading-none font-semibold tracking-[0.1em] uppercase"
            >
              Send
            </button>
          </form>

          {/* ── Bill of lading ──────────────────────────────────────────── */}
          {complete && invoice && (
            <section className="mb-[22px]">
              <h2 className="text-ink-quiet mb-3 text-[10.5px] leading-none font-medium tracking-[0.2em] uppercase">
                Final bill of lading
              </h2>
              <div className="blueprint bg-paper p-[18px]">
                <div className="mb-3.5 flex items-baseline justify-between gap-3">
                  <span className="display text-stat-sm">
                    {money(invoice.total)}
                  </span>
                  <span
                    className={`text-[10.5px] leading-none font-semibold tracking-[0.16em] uppercase ${
                      job.paid ? "text-olive" : "text-[#8a5a2b]"
                    }`}
                  >
                    {job.paid ? "Paid in full" : "Due on receipt"}
                  </span>
                </div>

                <dl className="mb-3.5 grid gap-[9px]">
                  {invoice.lines.map((line) => (
                    <div key={line.label}>
                      <div className="text-ink-lede flex justify-between gap-3 text-[13.5px] leading-[1.4]">
                        <dt>{line.label}</dt>
                        <dd className="font-semibold whitespace-nowrap">
                          {money(line.amount)}
                        </dd>
                      </div>
                      <div className="mt-[9px] h-px bg-[rgb(22_40_63/0.1)]" />
                    </div>
                  ))}
                </dl>

                <dl className="mb-4 grid gap-2">
                  {[
                    {
                      label: "Items loaded / delivered",
                      value: `${job.items.length} / ${job.items.length}`,
                    },
                    { label: "Condition photos", value: String(job.photos) },
                    { label: "Damage claims", value: "None reported" },
                    {
                      label: "Hours billed",
                      value: `${invoice.hours.toFixed(2)} hrs @ $${invoice.rate}`,
                    },
                    { label: "Signed at drop-off", value: job.customer },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="text-ink-muted flex justify-between gap-3 text-[12.5px] leading-[1.4]"
                    >
                      <dt>{row.label}</dt>
                      <dd className="text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {paymentPending && (
                  <p
                    role="status"
                    className="border-line-strong bg-olive-tint text-ink mb-3 border p-3 text-[12.5px] leading-[1.5]"
                  >
                    Payment received by Stripe — confirming with the office.
                    This usually takes a few seconds; the page updates itself.
                  </p>
                )}
                <form action={payInvoice}>
                  <input type="hidden" name="id" value={job.id} />
                  <button
                    type="submit"
                    disabled={job.paid || paymentPending}
                    className={`interactive w-full border py-3.5 text-[13px] leading-none font-semibold tracking-[0.1em] uppercase ${
                      job.paid
                        ? "text-ink border-[rgb(22_40_63/0.3)] bg-transparent"
                        : "bg-ink text-paper border-ink"
                    }`}
                  >
                    {job.paid
                      ? "Paid — receipt in your documents"
                      : `Pay ${money(invoice.total)} now`}
                  </button>
                </form>
                <p className="text-ink-quiet mt-[9px] text-center text-[11.5px] leading-[1.4]">
                  {job.paid
                    ? job.cardLast4
                      ? `Paid · •••• ${job.cardLast4}`
                      : "Paid in full"
                    : stripeEnabled()
                      ? "Secure checkout by Stripe — Apple Pay, Google Pay, or any card"
                      : "Card or check with the crew — this button records the payment"}
                </p>
              </div>
            </section>
          )}

          {/* ── Review prompt ───────────────────────────────────────────── */}
          {complete && !job.reviewed && (
            <form
              action={submitReview}
              className="border-olive bg-olive-wash mb-[22px] border p-[18px]"
            >
              <input type="hidden" name="id" value={job.id} />
              <p className="text-olive-dark mb-2 text-[10px] leading-none font-medium tracking-[0.2em] uppercase">
                How did we do
              </p>
              <h2 className="display mb-1 text-[20px] leading-[1.15]">
                Rate {job.crew ?? "your crew"} · {dateLabel(job.date)}
              </h2>

              {/* Reversed DOM order so a checked star also colours every star
                  to its left: `peer-checked` is a sibling selector, and every
                  lower-numbered label follows the checked input. The rating
                  works without a line of JavaScript.

                  The inputs and labels must be *direct* siblings for that to
                  hold — wrapping each pair in a `display: contents` div hides
                  the box but not the DOM, and the combinator stops crossing
                  pairs. Hence the fragments. */}
              <fieldset className="my-3 flex flex-row-reverse justify-end gap-1.5">
                <legend className="sr-only">Stars, out of five</legend>
                {[5, 4, 3, 2, 1].map((n) => (
                  <Fragment key={n}>
                    <input
                      type="radio"
                      name="stars"
                      id={`stars-${n}`}
                      value={n}
                      defaultChecked={n === 5}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={`stars-${n}`}
                      className="interactive peer-checked:text-olive peer-focus-visible:outline-olive text-[30px] leading-none text-[rgb(22_40_63/0.25)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                    >
                      <span aria-hidden="true">★</span>
                      <span className="sr-only">
                        {n} star{n === 1 ? "" : "s"}
                      </span>
                    </label>
                  </Fragment>
                ))}
              </fieldset>

              <input
                name="text"
                placeholder="Anything worth telling the next customer?"
                aria-label="Your review"
                className="border-line-strong bg-paper mb-3 w-full border p-3 text-[14px]"
              />
              <button
                type="submit"
                className="bg-olive text-paper interactive w-full py-[13px] text-[13px] leading-none font-semibold tracking-[0.1em] uppercase"
              >
                Post my review
              </button>
            </form>
          )}

          {/* ── Referral ────────────────────────────────────────────────── */}
          <section className="mb-[22px] border border-dashed border-[rgb(22_40_63/0.3)] p-[18px]">
            <h2 className="text-olive mb-2 text-[10px] leading-none font-medium tracking-[0.2em] uppercase">
              Refer a neighbor
            </h2>
            <p className="display mb-2 text-[19px] leading-[1.15]">
              $75 for them, $75 for you
            </p>
            <p className="text-ink-body mb-3.5 text-[13.5px] leading-[1.55]">
              They get $75 off their first move, you get $75 back the day they
              book.
            </p>
            <div className="flex gap-2">
              <span className="border-line-strong bg-paper flex-1 border p-3 text-[15px] leading-none font-semibold tracking-[0.1em]">
                {referralCode(job)}
              </span>
              <CopyButton value={referralCode(job)} />
            </div>
          </section>

          {/* ── Inventory ───────────────────────────────────────────────── */}
          <details id="inventory" className="border-line bg-paper mb-[22px] scroll-mt-4 border">
            <summary className="interactive flex cursor-pointer items-center justify-between px-4 py-3.5 text-[14px] leading-none font-medium">
              Inventory list
              <span className="text-olive text-[12px]">
                {loaded} / {job.items.length} loaded
              </span>
            </summary>
            <ul className="gridlines border-line border-t">
              {job.items.map((item, i) => (
                <li
                  key={`${item.name}-${i}`}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    item.done ? "bg-olive-wash" : "bg-paper"
                  }`}
                >
                  <span
                    className={`grid h-[18px] w-[18px] flex-none place-items-center border ${
                      item.done
                        ? "bg-olive border-olive"
                        : "border-[rgb(22_40_63/0.3)]"
                    }`}
                    aria-hidden="true"
                  >
                    {item.done && <Check size={11} color="#fbfaf7" />}
                  </span>
                  <span
                    className={`flex-1 text-[13.5px] leading-[1.3] ${
                      item.done ? "text-[rgb(22_40_63/0.5)]" : "text-ink"
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="text-ink-quiet text-[11.5px] leading-none">
                    {item.handling}
                  </span>
                </li>
              ))}
            </ul>
          </details>

          {/* ── Documents ───────────────────────────────────────────────── */}
          <div id="documents" className="border-line bg-paper scroll-mt-4 border">
            {[
              { label: "Signed estimate", kind: "PDF" },
              { label: "Certificate of insurance", kind: "PDF" },
            ].map((doc) => (
              <div
                key={doc.label}
                aria-disabled="true"
                className="flex items-center justify-between border-b border-[rgb(22_40_63/0.1)] px-4 py-3.5"
              >
                <span className="text-ink-disabled text-[14px] leading-none font-medium">
                  {doc.label}
                </span>
                <span className="text-ink-disabled text-[12px] leading-none">
                  {doc.kind}
                </span>
              </div>
            ))}
            <a
              href="#inventory"
              className="interactive flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-[14px] leading-none font-medium">
                Inventory list ({job.items.length})
              </span>
              <span className="text-olive text-[12px] leading-none">View</span>
            </a>
          </div>
          <p className="text-ink-quiet mt-2 text-[11.5px] leading-[1.4]">
            The estimate and COI PDFs are issued by the office — call {PHONE} if
            you need one today.
          </p>
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <nav className="bg-paper border-line grid grid-cols-4 border-t pt-[11px] pb-4 text-center text-[10px] leading-none font-medium tracking-[0.1em] uppercase">
          <a href="#top" className="text-olive py-2">
            Move
          </a>
          <a href="#inventory" className="text-ink-disabled py-2">
            Inventory
          </a>
          <a href="#documents" className="text-ink-disabled py-2">
            Docs
          </a>
          <a href={PHONE_HREF} className="text-ink-disabled py-2">
            Help
          </a>
        </nav>

        {/* Only rendered when there is a session to end. */}
        {authEnabled() && (
          <form action="/auth/signout" method="post" className="border-line border-t">
            <button
              type="submit"
              className="text-ink-quiet interactive w-full py-3 text-center text-[10.5px] leading-none font-medium tracking-[0.14em] uppercase"
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
