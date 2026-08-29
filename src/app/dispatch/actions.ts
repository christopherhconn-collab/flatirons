"use server";

/**
 * The staff Server Functions — shared by the dispatch board and the office
 * pipeline, because the handoff requires the crew app's advance button and
 * the dispatch card's to "produce identical results", and one function each
 * is how that stays true.
 *
 * Every one starts with `requireStaffAccess`: reachable by direct POST, same
 * argument as the portal's actions. The transition logic itself lives in
 * `src/lib/jobs.ts`, pure and already tested — these functions only decide
 * who may call it and which paths to refresh.
 */

import { revalidatePath } from "next/cache";

import { requireStaffAccess } from "@/lib/auth";
import { advanceStage, advanceStatus, assignCrew } from "@/lib/jobs";
import { updateJob } from "@/lib/store";

function refresh(id: string) {
  revalidatePath("/dispatch");
  revalidatePath("/office");
  revalidatePath(`/move/${id}`);
}

/** The dispatch card's action button — one step along the status machine. */
export async function advanceJobStatus(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateJob(id, (job) => advanceStatus(job, Date.now()));
  refresh(id);
}

/** An unassigned card's crew chip. */
export async function assignJobCrew(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  const crew = String(formData.get("crew") ?? "");
  if (!id || !crew) return;

  await updateJob(id, (job) => assignCrew(job, crew));
  refresh(id);
}

/** The office table's stage chip — New → Survey set → Quoted → Booked → Complete. */
export async function advanceJobStage(formData: FormData): Promise<void> {
  await requireStaffAccess("/office");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateJob(id, (job) => advanceStage(job));
  refresh(id);
}

/**
 * Record a payment taken outside Stripe — the check handed to the crew, the
 * card read over the phone into the terminal. The rail's invoice list only
 * offers this for completed jobs; Stripe payments arrive through the webhook
 * and never need it.
 */
export async function recordPayment(formData: FormData): Promise<void> {
  await requireStaffAccess("/dispatch");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateJob(id, (job) =>
    job.status === "complete" ? { ...job, paid: !job.paid } : job,
  );
  refresh(id);
}
