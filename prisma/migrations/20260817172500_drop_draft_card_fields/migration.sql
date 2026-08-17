-- Step 9. The estimator no longer collects a card: there is no deposit, and
-- the final invoice is paid through Stripe Checkout, so no card detail ever
-- reaches this database from a form. These two columns held whatever a
-- customer typed, in plain text — with the site live that is a liability,
-- not a feature. Dropping them also destroys any values already stored,
-- which is the point.
ALTER TABLE "quote_drafts" DROP COLUMN "cardNumber";
ALTER TABLE "quote_drafts" DROP COLUMN "cardExpiry";
