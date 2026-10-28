-- Psychat opt-in archive (ciphertext only)

ALTER TABLE "consent_records"
  ADD COLUMN IF NOT EXISTS "consentToPsychatArchive" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "psychat_archive_snapshots" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "psychat_archive_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "psychat_archive_snapshots_userId_key"
  ON "psychat_archive_snapshots"("userId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'psychat_archive_snapshots_userId_fkey'
  ) THEN
    ALTER TABLE "psychat_archive_snapshots"
      ADD CONSTRAINT "psychat_archive_snapshots_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "psychat_archive_snapshots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "psychat_archive_snapshots" FROM anon, authenticated;

ALTER TYPE "ClinicalResource" ADD VALUE IF NOT EXISTS 'psychat_archive';
