-- Hours the customer named, on a labour-only job.
--
-- On the job because the crew needs it: a manual-hours booking may carry no
-- inventory at all, and "three hours of unloading" is then the only thing
-- saying how long to allow.
ALTER TABLE "jobs" ADD COLUMN "quotedHours" DOUBLE PRECISION;
ALTER TABLE "quote_drafts" ADD COLUMN "hoursMode" TEXT NOT NULL DEFAULT 'inventory';
ALTER TABLE "quote_drafts" ADD COLUMN "quotedHours" DOUBLE PRECISION;
