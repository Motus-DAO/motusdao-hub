-- Chat-data slice 3: therapist-readable consented summary + FHIR DocumentReference envelope

ALTER TYPE "ClinicalResource" ADD VALUE IF NOT EXISTS 'consented_summary';

CREATE TABLE IF NOT EXISTS "consented_clinical_summaries" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "psmId" TEXT NOT NULL,
  "title" TEXT,
  "summaryText" TEXT NOT NULL,
  "fhirDocumentReference" JSONB NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "consented_clinical_summaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consented_clinical_summaries_userId_createdAt_idx"
  ON "consented_clinical_summaries"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "consented_clinical_summaries_psmId_createdAt_idx"
  ON "consented_clinical_summaries"("psmId", "createdAt");
CREATE INDEX IF NOT EXISTS "consented_clinical_summaries_matchId_idx"
  ON "consented_clinical_summaries"("matchId");

ALTER TABLE "consented_clinical_summaries"
  ADD CONSTRAINT "consented_clinical_summaries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consented_clinical_summaries"
  ADD CONSTRAINT "consented_clinical_summaries_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consented_clinical_summaries"
  ADD CONSTRAINT "consented_clinical_summaries_psmId_fkey"
  FOREIGN KEY ("psmId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
