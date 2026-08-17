/**
 * Who may open a move. Pure functions — the Supabase-aware plumbing that
 * feeds them lives in `src/lib/auth.ts`, kept separate so this file can be
 * unit-tested without a session or a network.
 *
 * The rule is deliberately small: a signed-in visitor may open `/move/[id]`
 * when their email is the one on the job, or when they are staff. Email is
 * the join key because it is the one identifier both sides already have —
 * the booking wrote it on the job, and the magic link proved the visitor
 * owns it. No account table, no linking step, nothing to forget to clean up.
 */

/**
 * `STAFF_EMAILS`, parsed: comma-separated, case-insensitive, whitespace
 * forgiven. Unset means no staff — not everyone.
 */
export function parseStaffEmails(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

/** Case- and whitespace-insensitive email equality. */
export function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * May `sessionEmail` open a job addressed to `jobEmail`?
 *
 * A null session may open nothing — the caller decides whether that means
 * "redirect to /login" (pages) or "refuse" (actions).
 */
export function canOpenMove(
  sessionEmail: string | null,
  jobEmail: string,
  staff: ReadonlySet<string>,
): boolean {
  if (!sessionEmail) return false;
  const email = sessionEmail.trim().toLowerCase();
  return staff.has(email) || sameEmail(email, jobEmail);
}

/**
 * Where may an auth flow return to? Only same-origin paths — anything else
 * collapses to the portal root. `//evil.example` is a protocol-relative URL,
 * which is why the check is "one slash, then not a slash".
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
