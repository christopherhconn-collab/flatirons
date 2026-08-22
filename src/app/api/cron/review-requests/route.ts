/**
 * The morning-after review request — step 10's automation, run daily by
 * Vercel Cron (see `crons` in vercel.json; the hour there is UTC).
 *
 * Finds every job completed before today whose customer has neither
 * reviewed nor been asked, texts the portal link and referral code, and
 * stamps `reviewAskedAt` so each customer is asked exactly once, ever.
 * A failed send is NOT stamped — it gets another try tomorrow.
 *
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` when that env var
 * exists. With the secret set, anything else is turned away; without it
 * (local hacking), the route runs open — and with SMS unconfigured it is a
 * report, not a sender, either way.
 */

import { type NextRequest, NextResponse } from "next/server";

import { siteOrigin } from "@/lib/site-url";
import { reviewRequestText, sendSms, smsEnabled } from "@/lib/sms";
import { jobsAwaitingReviewRequest, markReviewAsked } from "@/lib/store";
import { todayISO } from "@/lib/session";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const due = await jobsAwaitingReviewRequest(todayISO());
  if (!smsEnabled()) {
    return NextResponse.json({ due: due.length, sent: 0, sms: "disabled" });
  }

  let sent = 0;
  for (const job of due) {
    const ok = await sendSms(job.phone, reviewRequestText(job, siteOrigin()));
    if (ok) {
      await markReviewAsked(job.id);
      sent += 1;
    }
  }

  return NextResponse.json({ due: due.length, sent });
}
