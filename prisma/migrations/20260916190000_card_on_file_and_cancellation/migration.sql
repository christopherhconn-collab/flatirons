-- Card on file, and cancellation.
--
-- The booking confirmation now carries a link that saves a card without
-- charging it (Stripe Checkout in setup mode). The office later charges that
-- saved card for the final bill, or for a late-cancellation fee — neither
-- with the customer present, which is what the customer id and payment
-- method id are for.
--
-- `cancelled` joins JobStatus as a second terminal state. It is added rather
-- than reusing `complete` because a cancelled job releases its day, never
-- earns billed hours, and must not appear in revenue alongside moves that
-- actually happened.

ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE "jobs" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "jobs" ADD COLUMN "stripePaymentMethodId" TEXT;
ALTER TABLE "jobs" ADD COLUMN "cardOnFileAt" TIMESTAMP(3);
ALTER TABLE "jobs" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "jobs" ADD COLUMN "cancellationFeeCents" INTEGER;
