ALTER TABLE "psm_profiles"
  ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "psm_profiles_stripeConnectedAccountId_key"
  ON "psm_profiles"("stripeConnectedAccountId");

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_stripeCheckoutSessionId_key"
  ON "sessions"("stripeCheckoutSessionId");

CREATE TABLE IF NOT EXISTS "therapy_checkout_holds" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "psmId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "stripeCheckoutSessionId" TEXT NOT NULL,
  "stripeConnectedAccountId" TEXT NOT NULL,
  "checkoutUrl" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "feeCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "therapy_checkout_holds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "therapy_checkout_holds_slotId_key"
  ON "therapy_checkout_holds"("slotId");

CREATE UNIQUE INDEX IF NOT EXISTS "therapy_checkout_holds_stripeCheckoutSessionId_key"
  ON "therapy_checkout_holds"("stripeCheckoutSessionId");

CREATE INDEX IF NOT EXISTS "therapy_checkout_holds_userId_status_idx"
  ON "therapy_checkout_holds"("userId", "status");

DO $$ BEGIN
  ALTER TABLE "therapy_checkout_holds"
    ADD CONSTRAINT "therapy_checkout_holds_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "therapy_checkout_holds"
    ADD CONSTRAINT "therapy_checkout_holds_psmId_fkey"
    FOREIGN KEY ("psmId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "therapy_checkout_holds"
    ADD CONSTRAINT "therapy_checkout_holds_slotId_fkey"
    FOREIGN KEY ("slotId") REFERENCES "provider_availability_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
