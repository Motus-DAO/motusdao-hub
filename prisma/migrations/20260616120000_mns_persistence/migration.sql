ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mnsTxHash" TEXT,
  ADD COLUMN IF NOT EXISTS "mnsRegisteredAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_motusName_unique"
  ON "users" ("motusName")
  WHERE "motusName" IS NOT NULL;
