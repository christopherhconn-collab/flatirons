/**
 * The Prisma client.
 *
 * SERVER ONLY.
 *
 * Prisma 7 has no Rust query engine: it talks to Postgres through a driver
 * adapter, which is why `@prisma/adapter-pg` is wired in here rather than a
 * connection string going straight into `PrismaClient`.
 *
 * The client is built on first use, not on import. Next pulls this module into
 * the graph of every page that imports a Server Function — `/commercial` has
 * no queries at all but imports `startEstimate` — so constructing eagerly made
 * `DATABASE_URL` a requirement for *building* pages that never touch the
 * database. Now a missing URL fails the first query, which is where the
 * problem actually is.
 *
 * The instance is cached on `globalThis` because Next's dev server re-evaluates
 * modules on every hot reload, and a fresh client per reload opens a fresh
 * connection pool until Postgres refuses new ones. Production gets one module
 * instance, so the cache is a no-op there.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { appDatabaseUrl, poolMax } from "@/lib/db-url";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  return new PrismaClient({
    // The pooled URL on Supabase — see src/lib/db-url.ts for why the app and
    // the migrations use different ones.
    //
    // No `statementNameGenerator` is passed, so the adapter leaves the `name`
    // off every query and node-postgres uses the unnamed prepared statement.
    // That is what makes this safe through a transaction pooler, which does
    // not carry named statements across the connections it hands out.
    adapter: new PrismaPg({
      connectionString: appDatabaseUrl(),
      max: poolMax(),
    }),
    // Slow queries are the thing worth seeing in development; a full query log
    // buries them.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function client(): PrismaClient {
  return (globalForPrisma.prisma ??= createClient());
}

/**
 * The client, constructed on first property access.
 *
 * A proxy rather than a `getClient()` function so every call site reads as
 * ordinary Prisma — `prisma.job.findMany(...)` — and so this file can be
 * swapped for a plain instance later without touching the store.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(client(), property, receiver);
  },
  has(_target, property) {
    return Reflect.has(client(), property);
  },
});
