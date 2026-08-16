-- Lock every table out of Supabase's auto-generated REST API.
--
-- Supabase serves the `public` schema over PostgREST, and the publishable
-- ("anon") key that reaches it is designed to ship in the browser. A table in
-- `public` with row-level security disabled is therefore readable and
-- writable by anyone who reads that key out of the page source — every
-- customer name, phone number, email address and home address in `jobs`,
-- every card's last four digits, every in-progress quote.
--
-- Enabling RLS with no policies denies PostgREST everything: `anon` and
-- `authenticated` match no policy, so no row is visible to either. The
-- application is unaffected, because it does not go through PostgREST at all
-- — it connects over the connection string as the role that owns these
-- tables, and an owner is exempt from its own tables' policies unless the
-- table is set to FORCE ROW LEVEL SECURITY, which none of these are. Prisma
-- keeps full access.
--
-- Two consequences worth knowing:
--
--   Adding a table to `public` means adding a line here. Closed by default,
--   opened deliberately — not "policies to be added later", which is how a
--   table ships open.
--
--   If the app is ever pointed at a non-owner role, these tables go dark
--   until real policies exist. That is the intended failure direction.
--
-- On a plain Postgres with no PostgREST in front of it this migration is a
-- no-op in practice, which is why it is safe to run everywhere.

ALTER TABLE "crews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "catalog_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "counters" ENABLE ROW LEVEL SECURITY;

-- Prisma's own migration bookkeeping also lives in `public`, so PostgREST
-- exposes it too. It is created by the CLI rather than by a migration, hence
-- the existence check: this file has to be a no-op if the layout ever
-- changes rather than failing the deploy.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;
