"use server";

/**
 * Entering a move by hand — the office's write path.
 *
 * One action, two endings. Which one is decided by the submit button that was
 * pressed, and re-checked here rather than trusted: `requireStaffAccess`
 * first, as everywhere, because a Server Function is reachable by direct POST
 * and the page guarding itself would guard nothing.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaffAccess } from "@/lib/auth";
import { channelParam, notify } from "@/lib/notify";
import {
  type CrewSize,
  FLOORS,
  type Floor,
  HOME_SIZES,
  type HomeSize,
  SERVICE_TYPES,
  type ServiceType,
} from "@/lib/pricing";
import {
  DEFAULT_WINDOW_HOUR,
  type OfficeIntent,
  type OfficeRequest,
  officeJob,
} from "@/lib/quotes";
import { siteOrigin } from "@/lib/site-url";
import { createJob, nextReference } from "@/lib/store";

/**
 * Read one field as a member of a known set.
 *
 * The same argument as `applyPatch` in `estimate.ts`: a Server Function takes
 * whatever is posted to it, not whatever our own `<select>` offered, so every
 * field is re-checked against its domain here and anything else falls back to
 * a default rather than reaching the pricing engine.
 */
function oneOf<T extends string>(
  form: FormData,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = String(form.get(key) ?? "");
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

const CREW_SIZES: CrewSize[] = [2, 3, 4];

/** The hours field, or null when it was left empty. `officeJob` clamps and
 * ignores it on a full move; this only decides whether one was given. */
function statedHours(form: FormData): number | null {
  const raw = String(form.get("hours") ?? "").trim();
  if (!raw) return null;
  const hours = Number(raw);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

export async function createOfficeJob(formData: FormData): Promise<void> {
  await requireStaffAccess("/office/new");

  const intent: OfficeIntent =
    String(formData.get("intent") ?? "") === "book" ? "book" : "quote";

  const customer = String(formData.get("customer") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const date = String(formData.get("date") ?? "").trim();

  // The three it cannot be sent without. The form marks them required; this is
  // the check that actually holds, and it sends the office back to the form
  // rather than writing a record nobody can be reached about.
  if (!customer || !email.includes("@") || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect(`/office/new?error=missing`);
  }

  const movers = Number(formData.get("movers"));
  const request: OfficeRequest = {
    customer,
    email,
    phone: String(formData.get("phone") ?? "").trim().slice(0, 40),
    size: oneOf<HomeSize>(formData, "size", HOME_SIZES, "2 bed"),
    service: oneOf<ServiceType>(formData, "service", SERVICE_TYPES, "full"),
    from: String(formData.get("from") ?? "").trim().slice(0, 200),
    to: String(formData.get("to") ?? "").trim().slice(0, 200),
    date,
    movers: (CREW_SIZES as number[]).includes(movers)
      ? (movers as CrewSize)
      : 3,
    fromFloor: oneOf<Floor>(formData, "fromFloor", FLOORS, "Ground"),
    toFloor: oneOf<Floor>(formData, "toFloor", FLOORS, "Ground"),
    elevator: formData.get("elevator") === "on",
    packing: formData.get("packing") === "on",
    hours: statedHours(formData),
    windowHour: Number(formData.get("windowHour")) || DEFAULT_WINDOW_HOUR,
    note: String(formData.get("note") ?? "").slice(0, 1000),
  };

  const job = officeJob(request, intent, await nextReference(), Date.now());
  await createJob(job);

  const sent = await notify(
    job,
    intent === "book" ? "booking" : "quote",
    siteOrigin(),
  );

  revalidatePath("/office");
  revalidatePath("/dispatch");
  redirect(
    `/office?new=${job.id}&as=${intent}&sent=${channelParam(sent)}`,
  );
}
