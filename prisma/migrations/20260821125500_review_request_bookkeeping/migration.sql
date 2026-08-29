-- Step 10's review request: the daily cron texts each completed job's
-- customer once, the morning after. This timestamp is what "once" means.
ALTER TABLE "jobs" ADD COLUMN "reviewAskedAt" TIMESTAMP(3);
