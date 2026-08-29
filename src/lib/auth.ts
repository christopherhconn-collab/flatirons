/**
 * Sessions, and the gate on the customer portal.
 *
 * SERVER ONLY.
 *
 * Supabase Auth holds the sessions — magic links for customers, GitHub for
 * staff — and this module is the only place the rest of the app asks about
 * them. The decision logic itself is in `src/lib/access.ts`, pure and tested;
 * this file is the plumbing that feeds it a session.
 *
 * ── Auth is configured by environment, and absent by default ─────────────
 *
 * With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` unset,
 * `authEnabled()` is false and the portal behaves exactly as before this
 * module existed: open to anyone with a reference, as the prototype was.
 * That keeps CI, local hacking and the seed-and-click loop working with no
 * Supabase project at hand — and it means THE PORTAL IS NOT PROTECTED UNTIL
 * PRODUCTION SETS THOSE TWO VARIABLES. The deploy checklist in DEPLOY.md
 * says so too.
 *
 * The publishable key is designed to be public — it ships to the browser on
 * every Supabase project. Sessions live in httpOnly cookies managed by
 * `@supabase/ssr`; `src/proxy.ts` refreshes them, because rendering cannot
 * write cookies.
 */

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createServerClient } from "@supabase/ssr";

import { canOpenMove, parseStaffEmails } from "./access";
import type { Job } from "./jobs";
import { getJob } from "./store";

/** True when the environment names a Supabase project to hold sessions. */
export function authEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * A Supabase client bound to this request's cookies.
 *
 * Callable from Server Components, Server Functions and Route Handlers. The
 * catch around `setAll` is the documented @supabase/ssr pattern: a Server
 * Component may *read* the session but cannot write cookies mid-render, and
 * the token refresh that would want to is handled by `src/proxy.ts` instead.
 */
export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              jar.set(name, value, options);
            }
          } catch {
            // Rendering — proxy.ts owns the refresh.
          }
        },
      },
    },
  );
}

/**
 * The signed-in visitor's email, or null.
 *
 * `getUser()` rather than `getSession()`: the former revalidates the JWT
 * against Supabase, the latter trusts whatever the cookie claims. The gate
 * on customer PII gets the validated one.
 */
export async function sessionEmail(): Promise<string | null> {
  if (!authEnabled()) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.email ?? null;
}

/** Staff, per the `STAFF_EMAILS` environment variable. */
export function staffEmails(): ReadonlySet<string> {
  return parseStaffEmails(process.env.STAFF_EMAILS);
}

/**
 * The gate. Call it before rendering `/move/[id]` and at the top of every
 * Server Function that mutates a job — actions are reachable by direct POST,
 * so the page guarding itself protects nothing.
 *
 * Returns the job on success, so callers replace their own `getJob`.
 *
 *   Signed out            → redirect to /login, carrying the way back
 *   Signed in, wrong user → 404, indistinguishable from a reference that
 *                           does not exist — a guessed reference must not
 *                           confirm itself by behaving differently
 *   Auth not configured   → open, prototype behavior (see header comment)
 */
/**
 * The gate on the staff surfaces — the dispatch board and the office
 * pipeline. Same contract as `requireMoveAccess`, applied to a whole page:
 *
 *   Signed out          → redirect to /login, carrying the way back
 *   Signed in, not staff → 404 — the boards' existence is not customer-facing
 *   Auth not configured  → open, prototype behavior (see header comment)
 *
 * Call it at the top of the page *and* of every staff Server Function.
 */
export async function requireStaffAccess(nextPath: string): Promise<void> {
  if (!authEnabled()) return;

  const email = await sessionEmail();
  if (!email) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!staffEmails().has(email.trim().toLowerCase())) notFound();
}

export async function requireMoveAccess(id: string): Promise<Job> {
  const job = await getJob(id);
  if (!job) notFound();

  if (!authEnabled()) return job;

  const email = await sessionEmail();
  if (!email) redirect(`/login?next=${encodeURIComponent(`/move/${id}`)}`);
  if (!canOpenMove(email, job.email, staffEmails())) notFound();

  return job;
}
