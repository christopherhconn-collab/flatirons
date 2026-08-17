# Deploying

Vercel runs the app; Supabase holds the database. The app itself needs no
Supabase API keys — it speaks plain Postgres over `DATABASE_URL`, so the only
things that cross the wire are the two connection strings.

Order matters: schema first, then the app. The build prerenders the home page,
and that page reads real crew capacity, so a deploy against an empty database
fails the build rather than serving a broken page.

## What you need

- This repo cloned locally, `npm install` run, on the commit you are deploying.
- A Supabase project (free tier is fine).
- A Vercel account connected to the GitHub account that owns this repo.

## 1. Put the schema on Supabase

From the dashboard, **Connect** (top of the project page), and take two
strings — both from the pooler, and only the port differs:

| Goes in | Labelled | Port |
| --- | --- | --- |
| `DATABASE_URL` | Transaction pooler | 6543 |
| `DIRECT_URL` | Session pooler | 5432 |

Skip the one labelled "Direct connection" (`db.<ref>.supabase.co`). It is
IPv6-only and fails from most CI and many networks with a misleading
`ENETUNREACH` — the README's "Running on Supabase" section has the full story.

Then, locally:

```bash
cp .env.example .env     # paste both strings in
npm run db:deploy        # applies prisma/migrations/ from scratch
npm run db:seed          # catalogue, crews, counter, fixture jobs
```

Check the Table Editor: ten tables, each badged **RLS enabled**, and `jobs`
holding the eight fixtures. "RLS enabled, no policies" is the intended state,
not a warning to fix — it is what keeps PostgREST and the publishable key away
from customer data while the app, connecting as the table owner, is unaffected.
Do not click "Disable RLS" and do not add permissive policies.

The seed is idempotent; `npm run db:seed -- --force` wipes and rewrites the
fixture jobs once real data should replace them (it never touches jobs you
have edited into other states — force clears everything, so use it only
before go-live).

## 2. Import the repo on Vercel

**Add New → Project**, import this repository. Vercel detects Next.js, and
`vercel.json` in the repo already sets the build command to
`npm run db:deploy && npm run build` — confirm the import screen shows it,
change nothing else. Every production deploy then applies any new committed
migrations before the build, so schema and code cannot get out of step.
`migrate deploy` only ever applies committed migration files — it generates
nothing and asks nothing.

The one thing the dashboard still needs from you is the environment:

**Environment variables** — add three, scoped to **Production only**:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the 6543 string from step 1 |
| `DIRECT_URL` | the 5432 string from step 1 |
| `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app`, or the custom domain |

Production-only is deliberate. Scoped to Preview as well, every PR's preview
deployment would run its migrations against — and read and write — the
production database, which means an unmerged PR could alter prod schema.
The cost is that preview builds fail for lack of a database; live previews
need a database per branch, which is Supabase branching, and
`supabase/README.md` covers what adopting that would involve.

Deploy. The first build takes a couple of minutes; the site is then at
`https://<project>.vercel.app`, and every push to `main` redeploys.

## 3. Prove it works

- `/` — renders, and the availability line shows real capacity (that number
  came from the database at build time).
- `/estimate` — prices update as rooms change; refresh mid-quote and the
  draft survives (that is a `quote_drafts` row, not browser state).
- Book a move — it issues an `FM-XXXX` reference from the counter.
- `/track` with that reference — the portal loads; tick a checklist item,
  reload, still ticked.
- `/reviews` — post one, the average recomputes.

If the build fails with `ENETUNREACH`, a connection string is the IPv6 direct
host — go back to step 1. If it fails with an advisory-lock timeout in
`db:deploy`, `DIRECT_URL` is pointing at port 6543.

## Things to know

- **GitHub Pages must be off**, in two places: repo Settings → Pages →
  Source → None, and delete `.github/workflows/nextjs.yml` if it exists.
  That file is GitHub's stock "Next.js to Pages" workflow, and it cannot
  succeed here: it builds with no database (the prerender fails) and uploads
  an `./out` folder that only exists for statically-exported sites — which
  this app, with its Server Functions and cookies, cannot be. Pages serves
  static files; it cannot run this app under any configuration, so any Pages
  setup only produces failing checks or publishes the raw source tree.
- **No auth yet.** `/move/[id]` is readable by anyone holding the reference.
  That is step 8 of the build plan; deploying before it is fine for staging,
  but treat the URL accordingly.
- **Custom domain** — Vercel project → Settings → Domains, then update
  `NEXT_PUBLIC_SITE_URL` to match so the sitemap advertises the right host.
