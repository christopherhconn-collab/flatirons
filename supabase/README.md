# Supabase

This directory is the path the Supabase GitHub integration asks for. Give it
`supabase` — the default.

## What lives here

| Path | What it is |
| --- | --- |
| `config.toml` | Project and local-stack configuration, including the auth providers |
| `migrations/` | **Deliberately empty.** See below |
| `.gitignore` | CLI scratch directories |

## Prisma owns the schema, not Supabase

Migrations live in `prisma/migrations/` and are applied by `npm run db:deploy`.
CI runs that against a throwaway Postgres on every pull request, so a migration
that will not apply cleanly fails the PR rather than a deploy.

`supabase/migrations/` is empty on purpose. Two migration systems pointed at one
database will either double-apply and fail, or half-apply and leave the schema
in a state neither tool recognises. One owner, and it is Prisma — it already
generates the client types the app is written against, so it cannot be the one
that gives way.

**This means the Supabase integration will not apply any schema changes.** That
is the intended arrangement, not a misconfiguration. Deploys run
`npm run db:deploy`.

### If you would rather Supabase owned deploys

It is a real option — Supabase's branching gives every preview a database, which
Prisma-on-Vercel does not. But it is a deliberate switch, not a thing to drift
into:

1. Export the current schema as one baseline migration into
   `supabase/migrations/` — the SQL in `prisma/migrations/` is plain Postgres
   and can be copied as the starting point.
2. Stop CI and the deploy from running `db:deploy`.
3. Keep `prisma/schema.prisma` as the source for *types only*, and use
   `prisma db pull` after each Supabase migration so the client stays in step.
4. Delete `prisma/migrations/` so nobody can run it by accident.

Ask before doing this halfway. Half of it is worse than either whole.

## Auth

`config.toml` configures both providers the product needs:

- **Magic link** for customers. They are homeowners booking a move; a password
  is a support call waiting to happen, and the handoff specifies "no passwords".
- **GitHub OAuth** for staff and the office.

GitHub credentials come from the environment, never the repo:

```
SUPABASE_AUTH_GITHUB_CLIENT_ID
SUPABASE_AUTH_GITHUB_SECRET
```

Create the OAuth app under GitHub → Settings → Developer settings → OAuth Apps.
The Authorization callback URL must be Supabase's, not the app's:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

None of the application code for this exists yet — step 8 of the build plan.
The configuration is here so the integration has something coherent to read.

## Local stack

Needs the Supabase CLI, which is not a dependency of this repo:

```bash
supabase start          # Postgres, auth, storage, Studio on 54321–54324
npm run db:deploy       # Prisma applies the schema
npm run db:seed
```

`supabase start` brings up its own Postgres on port 54322. Point `DATABASE_URL`
at that one, not at the port in `.env.example`, if you go this route.
