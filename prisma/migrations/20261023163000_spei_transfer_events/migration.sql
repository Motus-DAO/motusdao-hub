ALTER TABLE "psm_profiles"
  ADD COLUMN IF NOT EXISTS "speiBeneficiaryName" TEXT,
  ADD COLUMN IF NOT EXISTS "speiBankName" TEXT,
  ADD COLUMN IF NOT EXISTS "speiClabe" TEXT;

CREATE TABLE IF NOT EXISTS "session_transfer_events" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "reference" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_transfer_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "session_transfer_events_sessionId_createdAt_idx"
  ON "session_transfer_events"("sessionId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "session_transfer_events"
    ADD CONSTRAINT "session_transfer_events_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "session_transfer_events"
    ADD CONSTRAINT "session_transfer_events_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
