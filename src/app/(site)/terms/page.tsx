import type { Metadata } from "next";

import { ADDRESS, PHONE, PHONE_HREF, SHELL } from "@/lib/site";
import { money } from "@/lib/format";
import { CONFIG } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms & conditions — Flatirons Movers",
  description:
    "The terms that apply to an estimate, a booking, and a move with Flatirons Movers.",
};

const SECTIONS = [
  {
    heading: "Estimates",
    body: (
      <p>
        An online estimate is a range, not a bid — it&rsquo;s built from the
        home size, inventory, and details you give us, and covers the crew,
        truck and any special handling you select. You pay for the hours we
        actually work, billed to the quarter hour after a{" "}
        {CONFIG.minHours}-hour minimum. If the job runs over the top of your
        quoted range on labor alone, we absorb the difference.
      </p>
    ),
  },
  {
    heading: "Booking, deposits and cancellation",
    body: (
      <>
        <p>
          No deposit is required to hold a date. You may save a card when you
          book so there is nothing to settle on the day — nothing is charged
          to it until after your move.
        </p>
        <p>
          You may cancel or reschedule up to{" "}
          {CONFIG.cancellation.windowHours} hours before your arrival window at
          no charge. Cancelling inside that window is a flat{" "}
          {money(CONFIG.cancellation.feeDollars)}, charged to the card on file
          if there is one and invoiced if there is not. A crew turned away on
          arrival may be billed at the {CONFIG.minHours}-hour minimum instead.
        </p>
      </>
    ),
  },
  {
    heading: "Pricing and travel",
    body: (
      <p>
        Rates are the hourly crew rate shown at booking, plus travel: a flat
        ${CONFIG.travel.flat} inside the Denver metro, or $
        {CONFIG.travel.perLoadedMile} per loaded mile elsewhere in Colorado.
        Stairs, long carries and elevator waits are never an upcharge, and
        weekend rates match weekday rates.
      </p>
    ),
  },
  {
    heading: "Payment",
    body: (
      <p>
        Payment is due when the job is marked complete. You can settle it
        yourself from the invoice in your move portal, or we charge the card
        you saved at booking — for the hours actually worked, never the
        estimate. Card payments are processed by Stripe; we never see or store
        your full card number. A staff member may instead record a payment
        taken by check or card over the phone.
      </p>
    ),
  },
  {
    heading: "Liability and claims",
    body: (
      <p>
        Flatirons Movers is licensed, bonded and insured (PUC 00412). Our
        crews take standard care in packing, handling and transport, but a
        move carries inherent risk to items and property. Report any loss or
        damage within 7 days of the move so we can open a claim — later
        reports may not be recoverable. This is a summary; the coverage terms
        in your bill of lading control.
      </p>
    ),
  },
  {
    heading: "Text messages",
    body: (
      <p>
        Booking with a mobile number means you may receive a small number of
        transactional texts — a booking confirmation and a one-time
        post-move follow-up. Message and data rates may apply, and you can
        reply STOP at any time. See the{" "}
        <a href="/privacy" className="text-olive-dark underline">
          privacy policy
        </a>{" "}
        for how that number and your other details are used.
      </p>
    ),
  },
  {
    heading: "Reviews and referrals",
    body: (
      <p>
        A review you submit after a completed move is published on our
        reviews page as written, including the star rating — we don&rsquo;t
        filter by score. A referral code is valid for one discount per new
        customer at the terms stated when it&rsquo;s issued.
      </p>
    ),
  },
  {
    heading: "Changes to these terms",
    body: (
      <p>
        We may update these terms as our services change. The terms in
        effect at the time you book are the ones that apply to your move.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Flatirons Movers · {ADDRESS} ·{" "}
        <a href={PHONE_HREF} className="text-olive-dark underline">
          {PHONE}
        </a>
      </p>
    ),
  },
] as const;

export default function TermsPage() {
  return (
    <div className={`${SHELL} pt-[46px] pb-16`}>
      <div className="max-w-[70ch]">
        <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
          Terms
        </p>
        <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
          Terms &amp; conditions
        </h1>
        <p className="text-body-lg text-ink-lede mb-10">
          The terms that apply to an estimate, a booking, and a move with us.
          Last updated September 16, 2026.
        </p>

        <div className="grid gap-8">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-card-title-sm mb-2.5">{section.heading}</h2>
              <div className="text-ink-lede grid gap-3 text-[14.5px] leading-[1.6]">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
