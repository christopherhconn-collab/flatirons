/**
 * Which connection string to use, and when.
 *
 * SERVER / CLI ONLY.
 *
 * On a plain Postgres there is one URL and this module is a formality. On
 * Supabase there are two, and using the wrong one fails in ways that do not
 * look like a connection problem:
 *
 *   `DATABASE_URL` — the transaction pooler, port 6543. What the *application*
 *   uses. A serverless instance opens and drops connections constantly and
 *   Postgres cannot take that directly; the pooler exists to absorb it.
 *
 *   `DIRECT_URL` — a session-mode connection, port 5432. What *migrations and
 *   the seed* use. The migration engine takes advisory locks and runs multi
 *   statement DDL that must land on one server connection from start to
 *   finish. A transaction pooler hands out a different backend per
 *   transaction, so `migrate deploy` against port 6543 either hangs on the
 *   lock or half-applies.
 *
 * `DIRECT_URL` is optional. Unset, both resolve to `DATABASE_URL`, which is
 * exactly right for a local Postgres and for CI.
 *
 * ── The hostname trap ──────────────────────────────────────────────────────
 *
 * Supabase offers two things that both call themselves direct connections:
 *
 *   db.<ref>.supabase.co:5432                   IPv6 only
 *   aws-<n>-<region>.pooler.supabase.com:5432   IPv4, session mode
 *
 * The first is the one the dashboard shows first and the one that fails on
 * GitHub Actions, on most CI, and on any IPv4-only host, with `ENETUNREACH`
 * — a network error that reads like an outage rather than a configuration
 * mistake. Use the second unless you have the IPv4 add-on. Note the port:
 * 5432 on the pooler host is session mode, 6543 on the same host is
 * transaction mode. The hostnames are identical and only the port tells them
 * apart.
 */

/**
 * The application's connection string. Pooled on Supabase.
 *
 * Throws rather than returning undefined: a missing URL surfaces at the first
 * query with a message that says what to do, instead of as a driver error
 * several frames down.
 */
export function appDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a " +
        "Postgres instance — see README.md, 'Local setup'.",
    );
  }
  return url;
}

/**
 * The connection string for migrations and the seed. Direct on Supabase,
 * falling back to `DATABASE_URL` where there is only one.
 */
export function migrationDatabaseUrl(): string {
  return process.env.DIRECT_URL || appDatabaseUrl();
}

/**
 * How many connections one pool may open.
 *
 * node-postgres defaults to 10 per pool, and on Vercel every warm serverless
 * instance holds its own pool. A few dozen instances against a Supabase
 * pooler whose default pool size is in the teens exhausts it, and the symptom
 * is other instances timing out rather than this one erroring. Five is small
 * enough to survive that fan-out and ample for one instance's concurrency.
 *
 * A single long-lived server — `next start` on a VM, where there is exactly
 * one pool — can raise it with `DATABASE_POOL_MAX`.
 */
export function poolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (!raw) return 5;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `DATABASE_POOL_MAX must be a positive integer, got ${JSON.stringify(raw)}.`,
    );
  }
  return parsed;
}
