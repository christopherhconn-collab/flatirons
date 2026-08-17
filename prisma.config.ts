// Prisma CLI configuration. Read by `db:migrate`, `db:deploy` and `db:studio`
// — not by the application, which builds its own client in src/lib/db.ts.
//
// The CLI gets the direct, session-mode connection its advisory locks and
// multi-statement DDL require; the app gets the pooled one. On a single-URL
// Postgres both resolve to `DATABASE_URL`. See src/lib/db-url.ts.
//
// The URL is read leniently here — NOT through `migrationDatabaseUrl()`,
// which throws when nothing is set. This file is evaluated by every Prisma
// command, including the `prisma generate` that `postinstall` runs, and
// generating a client needs no database at all: a fresh clone must survive
// `npm install` with no `.env`. Commands that actually connect still fail on
// a missing URL, with Prisma's own message.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
