import type { Metadata } from "next";

import { Estimator } from "./estimator";
import { buildView, emptyDraft } from "@/lib/estimate";
import { bookedOutDates } from "@/lib/store";
import { currentDraft, todayISO } from "@/lib/session";

export const metadata: Metadata = {
  title: "Free estimate — Flatirons Movers",
  description:
    "Price your move in two minutes. Room-by-room inventory, a real hourly rate and no deposit to book.",
  robots: { index: false },
};

export default async function EstimatePage() {
  // A returning customer resumes their draft. A cold visitor gets an unsaved
  // one with no reference; the estimator's first call to `updateEstimate`
  // reserves it, because a Server Component cannot set the cookie that
  // identifies it.
  const draft = (await currentDraft()) ?? emptyDraft("", "");

  const view = buildView(draft, {
    bookedOut: await bookedOutDates(),
    today: todayISO(),
  });

  return <Estimator initial={view} />;
}
