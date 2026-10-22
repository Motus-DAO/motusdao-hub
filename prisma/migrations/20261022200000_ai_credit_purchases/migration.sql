ALTER TABLE "ai_credit_charges"
  ADD COLUMN IF NOT EXISTS "freeCoverUsd" DECIMAL(12,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "purchasedHoldUsd" DECIMAL(12,8) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ai_credit_wallets" (
  "userId" TEXT NOT NULL,
  "purchasedUsd" DECIMAL(12,8) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_credit_wallets_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "ai_credit_wallets"
  ADD CONSTRAINT "ai_credit_wallets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ai_credit_purchases" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountUsd" DECIMAL(12,2) NOT NULL,
  "stripeCheckoutSessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_credit_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_credit_purchases_stripeCheckoutSessionId_key"
  ON "ai_credit_purchases"("stripeCheckoutSessionId");

CREATE INDEX IF NOT EXISTS "ai_credit_purchases_userId_idx"
  ON "ai_credit_purchases"("userId");

ALTER TABLE "ai_credit_purchases"
  ADD CONSTRAINT "ai_credit_purchases_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_credit_wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_credit_purchases" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "ai_credit_wallets" FROM anon, authenticated;
REVOKE ALL ON TABLE "ai_credit_purchases" FROM anon, authenticated;
