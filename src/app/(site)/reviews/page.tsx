import type { Metadata } from "next";

import { SHELL } from "@/lib/site";
import { monthTag, stars } from "@/lib/format";
import { listReviews } from "@/lib/store";

export const metadata: Metadata = {
  title: "Reviews — Flatirons Movers",
  description:
    "Every review we receive, including the 4s. We ask the day after the move and publish what comes back.",
};

// Reviews are written by customers from the portal, so this page cannot be
// static — a review posted a minute ago has to be at the top.
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const reviews = await listReviews();
  const average = reviews.length
    ? reviews.reduce((total, r) => total + r.stars, 0) / reviews.length
    : 0;

  return (
    <div className={`${SHELL} pt-[46px] pb-10`}>
      <header className="mb-[30px] flex flex-wrap items-end justify-between gap-[34px]">
        <div className="max-w-[60ch]">
          <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
            Reviews
          </p>
          <h1 className="text-h1-sm mb-3.5 max-md:text-[42px]">
            Every review,
            <br />
            including the 4s
          </h1>
          <p className="text-body-lg text-ink-lede">
            We ask every customer the day after their move and publish what
            comes back. When something goes wrong we post the fix next to the
            complaint.
          </p>
        </div>

        <div className="blueprint bg-paper min-w-[230px] px-[26px] py-[22px]">
          <div className="display text-[54px] leading-none">
            {average.toFixed(1)}
          </div>
          <div
            className="text-olive my-2 text-[20px] leading-none tracking-[0.1em]"
            aria-hidden="true"
          >
            {stars(average)}
          </div>
          <div className="text-th text-ink-muted">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"} ·
            Colorado
          </div>
        </div>
      </header>

      {reviews.length === 0 ? (
        <p className="border-line text-ink-muted border border-dashed p-8 text-center text-[14px]">
          Nothing published yet.
        </p>
      ) : (
        <div className="gridlines border-line grid-cols-2 border max-md:grid-cols-1">
          {reviews.map((review) => (
            <article key={review.id} className="bg-paper px-[26px] py-6">
              <div className="mb-2.5 flex items-baseline justify-between gap-3.5">
                <h2 className="font-body text-[17px] leading-[1.2] font-semibold normal-case">
                  {review.who}
                </h2>
                <span
                  className="text-olive text-[15px] leading-none tracking-[0.08em]"
                  aria-label={`${review.stars} out of 5`}
                >
                  {stars(review.stars)}
                </span>
              </div>
              <p className="mb-3 text-[15.5px] leading-[1.6] text-[rgb(22_40_63/0.78)]">
                {review.text}
              </p>
              <p className="text-ink-quiet text-[10.5px] leading-none font-medium tracking-[0.14em] uppercase">
                {review.where} · {monthTag(review.date)} · {review.crew}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
