/**
 * Cookies: which quote is in progress, and which move to open from "Track my
 * move".
 *
 * SERVER ONLY.
 *
 * Neither cookie is authentication. The portal is readable by anyone who knows
 * a job reference — magic-link auth is step 8 of the build plan and must land
 * before this is pointed at real customers. See `src/app/move/[id]/page.tsx`.
 */

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { isoDate } from "./format";
import { emptyDraft } from "./estimate";
import { type QuoteDraft, getDraft, nextReference, saveDraft } from "./store";

export const QUOTE_COOKIE = "fm_quote";
export const MOVE_COOKIE = "fm_move";

const YEAR = 60 * 60 * 24 * 365;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Today on the server, as `YYYY-MM-DD`. */
export function todayISO(): string {
  const now = new Date();
  return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** The in-progress quote, or null. Safe to call while rendering. */
export async function currentDraft(): Promise<QuoteDraft | null> {
  const id = (await cookies()).get(QUOTE_COOKIE)?.value;
  if (!id) return null;
  return getDraft(id);
}

/**
 * The in-progress quote, creating and reserving one if there is none.
 *
 * Sets a cookie, so this may only be called from a Server Function or a Route
 * Handler — HTTP does not allow setting cookies once rendering has streamed.
 */
export async function ensureDraft(): Promise<QuoteDraft> {
  const jar = await cookies();
  const id = jar.get(QUOTE_COOKIE)?.value;
  if (id) {
    const existing = await getDraft(id);
    if (existing) return existing;
  }

  const draft = emptyDraft(randomUUID(), await nextReference());
  await saveDraft(draft);
  jar.set(QUOTE_COOKIE, draft.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return draft;
}

export async function clearDraftCookie(): Promise<void> {
  (await cookies()).delete(QUOTE_COOKIE);
}

/** Remember the move the "Track my move" link should open. */
export async function rememberMove(id: string): Promise<void> {
  (await cookies()).set(MOVE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
}

export async function rememberedMove(): Promise<string | null> {
  return (await cookies()).get(MOVE_COOKIE)?.value ?? null;
}
