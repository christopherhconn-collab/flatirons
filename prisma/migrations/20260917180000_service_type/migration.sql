-- What we are hired to do: "full", "loading" or "unloading".
--
-- The two labour-only halves are one field rather than a `laborOnly` boolean
-- beside an `unloadOnly` one, because those two can contradict each other.
--
-- Additive and defaulted, so every existing job and draft reads as a full
-- move, which is what they were.
ALTER TABLE "jobs" ADD COLUMN "service" TEXT NOT NULL DEFAULT 'full';
ALTER TABLE "quote_drafts" ADD COLUMN "service" TEXT NOT NULL DEFAULT 'full';
