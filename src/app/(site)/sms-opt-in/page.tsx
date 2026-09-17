/**
 * Opt-in proof, for A2P 10DLC campaign registration.
 *
 * Carriers vet a campaign by opening the opt-in URL and looking for the
 * consent disclosure. Ours is correctly placed at the point of collection —
 * under the Mobile field on the last step of the booking form — which is
 * right for the customer and invisible to a vetter, because `/estimate`
 * server-renders step 1 and the disclosure is three clicks away.
 *
 * So this page exists for the vetter: one server-rendered URL showing the
 * exact wording, where it appears, and the messages it consents to. It is
 * deliberately indexable, unlike `/estimate`, so the submission can be
 * verified without a human clicking through a four-step form.
 *
 * Nothing here is written twice. The disclosure comes from `SMS_CONSENT`,
 * the same constant the form renders, and the sample messages are generated
 * by the functions that actually send them — so this page cannot promise a
 * carrier something the code does not do.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ADDRESS, PHONE, PHONE_HREF, SHELL, SMS_CONSENT } from "@/lib/site";
import type { Job } from "@/lib/jobs";
import { arrivalWindow } from "@/lib/format";
import { bookingConfirmationText, reviewRequestText } from "@/lib/sms";
import { siteOrigin } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "SMS opt-in — Flatirons Movers",
  description:
    "How Flatirons Movers collects consent to send booking confirmations and one post-move follow-up by text.",
};

/** A representative booked move, so the samples read as the real thing. */
const SAMPLE = {
  id: "FM-8848",
  date: "2026-10-04",
  window: arrivalWindow(8),
  crew: "Crew A",
} as Job;

export default function SmsOptInPage() {
  const origin = siteOrigin();
  const samples = [
    {
      when: "Immediately after a booking is submitted",
      text: bookingConfirmationText(SAMPLE, origin),
    },
    {
      when: "Once, the morning after the move is completed",
      text: reviewRequestText(SAMPLE, origin),
    },
  ];

  return (
    <div className={`${SHELL} pt-[46px] pb-16`}>
      <div className="max-w-[70ch]">
        <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
          SMS opt-in
        </p>
        <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
          How we collect consent to text you
        </h1>
        <p className="text-body-lg text-ink-lede mb-10">
          We send two transactional texts per move and no marketing. This page
          documents where consent is collected and what it covers.
        </p>

        <div className="grid gap-8">
          <section>
            <h2 className="text-card-title-sm mb-2.5">Where consent is given</h2>
            <div className="text-ink-lede grid gap-3 text-[14.5px] leading-[1.6]">
              <p>
                A customer enters their own mobile number on the last step of
                the booking form at{" "}
                <Link href="/estimate" className="text-olive-dark underline">
                  {origin.replace(/^https?:\/\//, "")}/estimate
                </Link>
                . The disclosure below sits directly under that field, above
                the button that submits the booking. Nothing is pre-checked,
                and no number is obtained from any other source — never
                purchased, rented, or shared from a third party.
              </p>
              <p>
                Giving a mobile number is optional. A customer can book by
                phone on{" "}
                <a href={PHONE_HREF} className="text-olive-dark underline">
                  {PHONE}
                </a>{" "}
                without one, so consent to texts is never a condition of
                service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-card-title-sm mb-2.5">The exact wording</h2>
            <blockquote className="border-olive text-ink bg-olive-tint border-l-2 p-4 text-[14.5px] leading-[1.6]">
              {SMS_CONSENT} See our{" "}
              <Link href="/privacy" className="text-olive-dark underline">
                privacy policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-olive-dark underline">
                terms
              </Link>
              .
            </blockquote>
          </section>

          <section>
            <h2 className="text-card-title-sm mb-2.5">
              The form, as the customer sees it
            </h2>
            <p className="text-ink-lede mb-3 text-[14.5px] leading-[1.6]">
              The confirm step of the booking form, with the disclosure beneath
              the Mobile field.
            </p>
            <Image
              src="/sms-opt-in-proof.png"
              alt="The booking form's confirm step. Under the Mobile field, the SMS consent disclosure appears above the Book this move button."
              width={1740}
              height={1848}
              className="border-line border"
            />
          </section>

          <section>
            <h2 className="text-card-title-sm mb-2.5">What we send</h2>
            <div className="grid gap-3">
              {samples.map((sample) => (
                <div key={sample.when} className="border-line bg-paper border p-4">
                  <p className="text-olive mb-2 text-[10.5px] leading-none font-medium tracking-[0.18em] uppercase">
                    {sample.when}
                  </p>
                  <p className="text-ink font-mono text-[13px] leading-[1.6]">
                    {sample.text}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-ink-lede mt-3 text-[14.5px] leading-[1.6]">
              Two messages per move. There is no recurring or promotional
              messaging, and no message is sent to a number that has not booked
              a move.
            </p>
          </section>

          <section>
            <h2 className="text-card-title-sm mb-2.5">Opting out</h2>
            <div className="text-ink-lede grid gap-3 text-[14.5px] leading-[1.6]">
              <p>
                Reply <strong className="text-ink font-semibold">STOP</strong>{" "}
                to any message to opt out, or{" "}
                <strong className="text-ink font-semibold">HELP</strong> for
                support. Both are handled automatically by our messaging
                provider, and STOP takes effect immediately and permanently for
                that number.
              </p>
              <p>
                Consent to receive texts is never sold or shared with third
                parties for their own marketing. See the{" "}
                <Link href="/privacy" className="text-olive-dark underline">
                  privacy policy
                </Link>{" "}
                for everything else we hold.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-card-title-sm mb-2.5">Contact</h2>
            <p className="text-ink-lede text-[14.5px] leading-[1.6]">
              Flatirons Movers · {ADDRESS} ·{" "}
              <a href={PHONE_HREF} className="text-olive-dark underline">
                {PHONE}
              </a>{" "}
              · PUC 00412
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
