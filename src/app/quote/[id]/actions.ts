"use server";

/**
 * Accepting a quote — the customer's side of a phone enquiry.
 *
 * `requireMoveAccess` first, as on every action that touches a job: this is
 * reachable by direct POST, so the page guarding itself would guard nothing.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMoveAccess } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { acceptQuote, isOpenQuote } from "@/lib/quotes";
import { rememberMove } from "@/lib/session";
import { siteOrigin } from "@/lib/site-url";
import { updateJob } from "@/lib/store";

export async function accept(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await requireMoveAccess(id, `/quote/${id}`);

  // Whether this click was the one that booked it. Read inside the updater,
  // which runs within the transaction, so it describes the row being written
  // rather than one fetched a moment earlier.
  //
  // `acceptQuote` is itself a no-op on anything that is not an open quote, so
  // the state is right however many times this is submitted; this flag only
  // decides whether to send a confirmation. Two clicks landing in genuinely
  // concurrent transactions could each see an open quote and each send one —
  // a duplicate email on a double-click, which is not worth a lock.
  let booked = false;
  const job = await updateJob(id, (current) => {
    booked = isOpenQuote(current);
    return acceptQuote(current, Date.now());
  });
  // Gone between the guard and here, which means someone else deleted it.
  if (!job) redirect("/");

  if (booked) {
    await rememberMove(id);
    await notify(job, "booking", siteOrigin());
    revalidatePath("/office");
    revalidatePath("/dispatch");
  }

  redirect(`/move/${id}`);
}
