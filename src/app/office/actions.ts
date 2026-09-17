"use server";

/**
 * Office actions on a job that already exists.
 *
 * `requireStaffAccess` first, as everywhere: a Server Function is reachable by
 * direct POST, so the board guarding itself would guard nothing.
 */

import { redirect } from "next/navigation";

import { requireStaffAccess } from "@/lib/auth";
import { channelParam, notify } from "@/lib/notify";
import { resendableNotice } from "@/lib/quotes";
import { siteOrigin } from "@/lib/site-url";
import { getJob } from "@/lib/store";

/**
 * Send the customer their quote or their confirmation again.
 *
 * For the call that starts "I never got it" — which is common enough to be
 * worth a button, and costly, because until they say so the board looks like
 * a customer considering a quote rather than a customer who never saw one.
 *
 * Which message goes is decided from the job's current state by
 * `resendableNotice`, not from what was sent the first time: a quote accepted
 * in between must re-send as a confirmation. Nothing about the job changes —
 * this only re-sends, so it is safe to press twice.
 */
export async function resendNotice(formData: FormData): Promise<void> {
  await requireStaffAccess("/office");

  const id = String(formData.get("id") ?? "");
  const job = await getJob(id);
  const notice = job && resendableNotice(job);
  // The board only renders the button where there is something to send, so
  // this is the direct-POST path — nothing to tell the office about.
  if (!job || !notice) redirect("/office");

  const sent = await notify(job, notice, siteOrigin());
  redirect(
    `/office?sent-to=${job.id}&as=${notice}&sent=${channelParam(sent)}`,
  );
}
