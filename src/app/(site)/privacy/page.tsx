import type { Metadata } from "next";

import { ADDRESS, PHONE, PHONE_HREF, SHELL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy — Flatirons Movers",
  description:
    "What Flatirons Movers collects when you get an estimate, book a move or use the customer portal, and how it's used.",
};

const SECTIONS = [
  {
    heading: "What we collect",
    body: (
      <>
        <p>
          When you build an estimate, book a move, or use your move portal,
          we collect what the job requires: your name, phone number, email,
          the addresses you&rsquo;re moving from and to, your move date and
          time window, and details about the move itself (home size, floors,
          elevator access, inventory, photos you add, and any messages you
          send through the portal).
        </p>
        <p>
          If you pay online, card details are entered directly into Stripe&rsquo;s
          payment page and never reach our servers — we only receive
          confirmation that payment succeeded and the last four digits of the
          card, for your receipt.
        </p>
      </>
    ),
  },
  {
    heading: "How we use it",
    body: (
      <p>
        To quote, schedule, and staff your move; to keep your checklist,
        message thread, and bill of lading current in the portal; to process
        payment; and to follow up after a completed move for a review, with a
        referral code for a friend.
      </p>
    ),
  },
  {
    heading: "Text messages",
    body: (
      <>
        <p>
          If you provide a mobile number when booking, we may text you a
          booking confirmation with your move details and portal link, and a
          one-time follow-up the morning after your move with a review
          request and referral code. That&rsquo;s the extent of it — no
          recurring marketing texts.
        </p>
        <p>
          Message and data rates may apply. Reply STOP at any time to opt
          out, or HELP for support. Consent to receive texts is never sold or
          shared with third parties for their own marketing.
        </p>
      </>
    ),
  },
  {
    heading: "Who we share it with",
    body: (
      <p>
        We use Stripe to process payments and Twilio to send text messages —
        each receives only what it needs to do that (payment details for
        Stripe; your phone number and message text for Twilio). We don&rsquo;t
        sell your information, and we don&rsquo;t share it with anyone else
        except a crew member assigned to your move, or when the law requires
        it.
      </p>
    ),
  },
  {
    heading: "Cookies",
    body: (
      <p>
        The estimator sets a cookie to remember your in-progress quote, and
        the portal sets one to remember your most recent move so `/track`
        can find it faster on the same device. Neither is used for
        advertising or tracking across other sites, and neither is treated as
        a login credential.
      </p>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <p>
        We keep move records for as long as needed for support, warranty,
        accounting, and legal purposes. You can ask us to delete your
        information by contacting us below, and we will unless we&rsquo;re
        required to keep it (for example, financial records).
      </p>
    ),
  },
  {
    heading: "Your choices",
    body: (
      <p>
        You can ask to see, correct, or delete the information we hold about
        you, or opt out of text messages, at any time by calling or writing
        us using the contact details below.
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

export default function PrivacyPage() {
  return (
    <div className={`${SHELL} pt-[46px] pb-16`}>
      <div className="max-w-[70ch]">
        <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
          Privacy
        </p>
        <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
          Privacy policy
        </h1>
        <p className="text-body-lg text-ink-lede mb-10">
          This is what we collect when you get an estimate, book a move, or
          use your move portal — and how it&rsquo;s used. Last updated
          September 16, 2026.
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
