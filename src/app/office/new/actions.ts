"use server";

/**
 * Creating and sending a staff-written quote.
 *
 * `requireStaffAccess` first, as everywhere: a Server Function is reachable by
 * direct POST, so the page guarding itself would guard nothing.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaffAccess } from "@/lib/auth";
import { quoteEmail, emailEnabled, sendEmail } from "@/lib/email";
import type { QuoteRequest } from "@/lib/quotes";
import { quoteToLead } from "@/lib/quotes";
import {
  type CrewSize,
  type Floor,
  FLOORS,
  type HomeSize,
  HOME_SIZES,
} from "@/lib/pricing";
import { quoteText, sendSms, smsEnabled } from "@/lib/sms";
import { siteOrigin } from "@/lib/site-url";
import { createJob, nextReference } from "@/lib/store";

/**
 * Read one field from a form as a member of a known set.
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

export async function createQuote(formData: FormData): Promise<void> {
  await requireStaffAccess("/office/new");

  const customer = String(formData.get("customer") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const date = String(formData.get("date") ?? "").trim();

  // The three the quote cannot be sent without. The form marks them required;
  // this is the check that actually holds, and it sends the office back to
  // the form rather than writing a lead nobody can be quoted against.
  if (!customer || !email.includes("@") || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect("/office/new?error=missing");
  }

  const movers = Number(formData.get("movers"));
  const request: QuoteRequest = {
    customer,
    email,
    phone: String(formData.get("phone") ?? "").trim().slice(0, 40),
    size: oneOf<HomeSize>(formData, "size", HOME_SIZES, "2 bed"),
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
    note: String(formData.get("note") ?? "").slice(0, 1000),
  };

  const job = quoteToLead(request, await nextReference(), Date.now());
  await createJob(job);

  // Sent by both channels the customer gave us, together rather than in
  // sequence, and neither can fail the quote — the office would have no way
  // to tell, and the lead is on the board either way.
  const origin = siteOrigin();
  const [textOk, mailOk] = await Promise.all([
    smsEnabled() && request.phone
      ? sendSms(request.phone, quoteText(job, origin))
      : null,
    emailEnabled() ? sendEmail(request.email, quoteEmail(job, origin)) : null,
  ]);

  revalidatePath("/office");
  redirect(
    `/office?quoted=${job.id}&sent=${[textOk ? "text" : null, mailOk ? "email" : null]
      .filter(Boolean)
      .join(",")}`,
  );
}
