-- Labour-only: our crew, the customer's truck or container.
--
-- Additive and defaulted, so every existing job and draft reads as full
-- service, which is what they were.
ALTER TABLE "jobs" ADD COLUMN "laborOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quote_drafts" ADD COLUMN "laborOnly" BOOLEAN NOT NULL DEFAULT false;
