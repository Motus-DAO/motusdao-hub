-- Daily AI credit ledger. Rows store token counts and USD, never prompt text.
CREATE TABLE IF NOT EXISTS "ai_credit_charges" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DECIMAL(12,8) NOT NULL,
  "settled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_credit_charges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_credit_charges_userId_createdAt_idx"
  ON "ai_credit_charges"("userId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_charges_userId_fkey'
  ) THEN
    ALTER TABLE "ai_credit_charges"
      ADD CONSTRAINT "ai_credit_charges_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ai_credit_charges" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "ai_credit_charges" FROM anon, authenticated;
