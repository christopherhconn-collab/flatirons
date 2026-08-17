// Prisma CLI configuration. Read by `db:migrate`, `db:deploy` and `db:studio`
// — not by the application, which builds its own client in src/lib/db.ts.
//
// That split is the point. The CLI gets the direct, session-mode connection
// its advisory locks and multi-statement DDL require; the app gets the pooled
// one. On a single-URL Postgres both resolve to `DATABASE_URL` and the
// distinction costs nothing. See src/lib/db-url.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

import { migrationDatabaseUrl } from "./src/lib/db-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationDatabaseUrl(),
  },
});
