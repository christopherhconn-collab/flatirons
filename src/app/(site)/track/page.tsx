import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PHONE, PHONE_HREF, SHELL } from "@/lib/site";
import { dateLabel } from "@/lib/format";
import { getJob } from "@/lib/store";
import { rememberedMove } from "@/lib/session";

export const metadata: Metadata = {
  title: "Track my move — Flatirons Movers",
  description:
    "Open your move: the live crew location, your checklist, the message thread and the bill of lading.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * The way back into the portal.
 *
 * A reference is all this asks for, which is all the portal itself requires
 * today — see the authentication note in `src/app/move/[id]/page.tsx`. When
 * magic links land at step 8 this page becomes "enter your email and we'll
 * send you a link", and the reference stops being a credential.
 */
export default async function TrackPage(props: PageProps<"/track">) {
  const { notFound: missing } = await props.searchParams;
  const remembered = await rememberedMove();
  const lastMove = remembered ? await getJob(remembered) : null;

  async function findMove(formData: FormData) {
    "use server";
    const raw = String(formData.get("reference") ?? "")
      .trim()
      .toUpperCase();
    const reference = raw.startsWith("FM-") ? raw : `FM-${raw}`;
    const job = await getJob(reference);
    if (!job) redirect(`/track?notFound=${encodeURIComponent(raw)}`);
    redirect(`/move/${job.id}`);
  }

  return (
    <div className={`${SHELL} pt-[46px] pb-16`}>
      <div className="max-w-[620px]">
        <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
          Track my move
        </p>
        <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
          Open your move
        </h1>
        <p className="text-body-lg text-ink-lede mb-8">
          Your quote reference is on the confirmation we sent you — it looks
          like FM-8841. The portal shows where the crew is, what is on the
          truck, and the bill when it is done.
        </p>

        {lastMove && (
          <div className="blueprint bg-paper mb-6 p-[22px]">
            <p className="text-olive mb-2 text-[10px] leading-none font-medium tracking-[0.2em] uppercase">
              Last move on this device
            </p>
            <h2 className="display mb-1 text-[24px] leading-none">
              {lastMove.id} · {dateLabel(lastMove.date)}
            </h2>
            <p className="text-ink-muted mb-4 text-[13.5px] leading-[1.5]">
              {lastMove.from} → {lastMove.to}
            </p>
            <Link
              href={`/move/${lastMove.id}`}
              className="bg-olive text-paper text-btn-sm interactive inline-block px-5 py-[13px] text-[13px]"
            >
              Open it
            </Link>
          </div>
        )}

        <form action={findMove} className="border-line bg-paper border p-[22px]">
          <label className="block">
            <span className="text-label text-ink-muted mb-1.5 block">
              Quote reference
            </span>
            <input
              name="reference"
              required
              placeholder="FM-8841"
              autoCapitalize="characters"
              className="border-line-strong bg-bg mb-3.5 w-full border p-3 text-[14.5px]"
            />
          </label>
          <button
            type="submit"
            className="bg-ink text-paper text-btn-sm interactive px-6 py-3.5 text-[13px]"
          >
            Find my move
          </button>

          {missing && (
            <p
              role="alert"
              className="text-olive-dark bg-olive-tint border-olive mt-4 border p-3.5 text-[13.5px] leading-[1.5]"
            >
              No move under “{missing}”. Check the confirmation email, or call{" "}
              <a href={PHONE_HREF} className="font-semibold underline">
                {PHONE}
              </a>{" "}
              and a dispatcher will find it.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
