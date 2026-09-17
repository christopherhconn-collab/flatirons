import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoLockup } from "@/components/logo";
import { requireMoveAccess } from "@/lib/auth";
import { dateLabel } from "@/lib/format";
import { CONFIG, SERVICE_NOTE } from "@/lib/pricing";
import { priceRange } from "@/lib/jobs";
import { isOpenQuote, quoteFacts } from "@/lib/quotes";
import { PHONE, PHONE_HREF } from "@/lib/site";
import { accept } from "./actions";

export const metadata: Metadata = {
  title: "Your estimate — Flatirons Movers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The quote the office sent, and the button that turns it into a booking.
 *
 * Guarded exactly as the portal is — `requireMoveAccess`, the same job, the
 * same rules — because that is what it is: the same record, seen from before
 * it was booked. Anything weaker would make the quote link a way around the
 * gate on the portal.
 *
 * A quote that is no longer open redirects to the portal rather than showing
 * a dead page. That covers the two ordinary cases — the customer opening the
 * link a second time after accepting, and the office having booked it over
 * the phone in the meantime — and both want the same thing: the move.
 */
export default async function QuotePage(props: PageProps<"/quote/[id]">) {
  const { id } = await props.params;
  const job = await requireMoveAccess(id, `/quote/${id}`);
  if (!isOpenQuote(job)) redirect(`/move/${job.id}`);

  const facts = quoteFacts(job);
  const { feeDollars, windowHours } = CONFIG.cancellation;

  return (
    <div className="bg-desk flex min-h-dvh justify-center px-4 py-[26px] pb-10">
      <div className="bg-bg w-[560px] max-w-full border border-[rgb(22_40_63/0.18)] shadow-[0_4px_22px_rgb(22_40_63/0.12)]">
        <header className="bg-ink px-6 pt-[18px] pb-[22px]">
          <div className="mb-5">
            <Link href="/" aria-label="Flatirons Movers, home">
              <LogoLockup
                markWidth={30}
                wordSize={14}
                subSize={7.5}
                gap={10}
                tone="dark"
              />
            </Link>
          </div>
          <p className="text-olive-pale text-[10.5px] leading-none font-medium tracking-[0.18em] uppercase">
            Your estimate
          </p>
          <p className="text-paper mt-3 text-[34px] leading-none font-semibold">
            {priceRange(job)}
          </p>
          <p className="text-paper/70 mt-2.5 text-[13.5px] leading-[1.5]">
            {dateLabel(job.date)} · reference {job.id}
          </p>
        </header>

        <div className="px-6 py-6">
          <p className="text-ink-body text-[14px] leading-[1.6]">
            {job.customer.split(" ")[0]}, here is what we quoted you.{" "}
            {SERVICE_NOTE[job.service]}
          </p>

          <dl className="border-line mt-5 border-t">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className="border-line flex items-baseline justify-between gap-4 border-b py-2.5"
              >
                <dt className="text-ink-muted text-[12.5px]">{label}</dt>
                <dd className="text-ink text-right text-[13.5px] font-semibold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-ink-muted mt-4 text-[12.5px] leading-[1.55]">
            {job.quotedHours
              ? "You told us how long you need, so this is the price — not a range. If the crew runs over, you're billed for the hours they actually work."
              : "You're billed for the hours the crew actually works. Anything above the top of this range is on us."}
          </p>

          <div className="border-line-strong bg-olive-tint mt-6 border p-4">
            <p className="text-ink text-[14px] leading-[1.55] font-semibold">
              This day is not held.
            </p>
            <p className="text-ink-body mt-1.5 text-[13px] leading-[1.55]">
              Accepting reserves {dateLabel(job.date)} and puts you on the
              board. Nothing is charged today — we take a card after the move,
              once the hours are known. Cancelling within {windowHours} hours
              of your arrival window is ${feeDollars}; before that it&rsquo;s
              free.
            </p>
            <form action={accept} className="mt-4">
              <input type="hidden" name="id" value={job.id} />
              <button
                type="submit"
                className="bg-olive text-paper text-btn-sm interactive w-full py-4 text-[14px]"
              >
                Accept and book {dateLabel(job.date)}
              </button>
            </form>
          </div>

          <p className="text-ink-muted mt-5 text-[13px] leading-[1.6]">
            Want to change the date, the crew or what we&rsquo;re moving? Call{" "}
            <a href={PHONE_HREF} className="text-ink font-semibold underline">
              {PHONE}
            </a>{" "}
            and we&rsquo;ll re-quote it. Quote {job.id} — have it to hand and
            we&rsquo;ll find you in a second.
          </p>
        </div>

        <footer className="border-line bg-surface border-t px-6 py-4">
          <p className="text-ink-quiet text-[11.5px] leading-[1.55]">
            Flatirons Movers · PUC 00412 · Licensed and insured in Colorado.{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
