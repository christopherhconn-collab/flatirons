"use server";

/**
 * The portal's Server Functions.
 *
 * All four are written as form actions so the portal keeps working with
 * JavaScript off — the checklist, the message thread, the payment and the
 * review are the things a customer reaches for on a phone with one bar in a
 * stairwell.
 *
 * Every function starts with `requireMoveAccess`: Server Functions are
 * reachable by direct POST, so the page guarding itself protects nothing.
 * With auth unconfigured the guard admits everyone — prototype mode; see
 * `src/lib/auth.ts` for exactly what that means and when it ends.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMoveAccess } from "@/lib/auth";
import { place } from "@/lib/format";
import { invoiceOf } from "@/lib/jobs";
import { siteOrigin } from "@/lib/site-url";
import { addReview, updateJob } from "@/lib/store";
import { checkoutParamsFor, stripe, stripeEnabled } from "@/lib/stripe";

function refresh(id: string) {
  revalidatePath(`/move/${id}`);
}

/** Tick or untick one row of the customer's checklist. */
export async function toggleTask(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const index = Number(formData.get("index"));
  if (!id || !Number.isInteger(index)) return;
  await requireMoveAccess(id);

  await updateJob(id, (job) => ({
    ...job,
    tasks: job.tasks.map((task, i) =>
      i === index ? { ...task, done: !task.done } : task,
    ),
  }));
  refresh(id);
}

/** Post a message to the thread the crew app mirrors. */
export async function sendMessage(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 1000);
  if (!id || !text) return;
  await requireMoveAccess(id);

  await updateJob(id, (job) => ({
    ...job,
    messages: [
      ...job.messages,
      { who: "You", text, mine: true, at: Date.now() },
    ],
  }));
  refresh(id);
}

/**
 * Settle the bill.
 *
 * With Stripe configured this creates a Checkout Session and sends the
 * customer to Stripe's page — the card is typed there, never here — and the
 * *webhook* is what marks the job paid, because a success URL can be typed
 * into a browser but a signed webhook cannot.
 *
 * Without Stripe it stays the prototype's bookkeeping flip. Nothing in that
 * mode moves money.
 */
export async function payInvoice(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const job = await requireMoveAccess(id);

  if (stripeEnabled()) {
    if (job.paid || job.status !== "complete") return;
    const session = await stripe().checkout.sessions.create(
      checkoutParamsFor(job, invoiceOf(job), siteOrigin()),
    );
    if (!session.url) throw new Error("Stripe returned a session with no URL");
    redirect(session.url);
  }

  await updateJob(id, (job) =>
    job.paid || job.status !== "complete"
      ? job
      : {
          ...job,
          paid: true,
          messages: [
            ...job.messages,
            {
              who: "Flatirons",
              text: "Payment received — receipt is in your documents.",
              mine: false,
              at: Date.now(),
            },
          ],
        },
  );
  refresh(id);
}

/**
 * Publish a review.
 *
 * It appears at the top of `/reviews` immediately and the average recomputes.
 * The positioning copy on that page commits to publishing the 4s as well as
 * the 5s, so nothing here filters by rating — honour that in moderation.
 */
export async function submitReview(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const stars = Number(formData.get("stars"));
  const text = String(formData.get("text") ?? "").trim().slice(0, 1000);
  if (!id || !Number.isInteger(stars) || stars < 1 || stars > 5) return;

  const job = await requireMoveAccess(id);
  if (job.status !== "complete" || job.reviewed) return;

  await addReview({
    id: `RV-${job.id}`,
    who: job.customer,
    where: `${job.size} · ${place(job.from)} → ${place(job.to)}`,
    stars,
    text: text || "Smooth move, on time, no surprises on the bill.",
    date: job.date,
    crew: job.crew ?? "Flatirons",
  });
  await updateJob(id, (current) => ({ ...current, reviewed: true }));

  refresh(id);
  revalidatePath("/reviews");
}
