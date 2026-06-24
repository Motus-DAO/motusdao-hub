-- PSM intake v1: canonical professional narrative field (FHIR Practitioner.text inspired)
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "professionalNarrative" TEXT;

-- Backfill from legacy biografia
UPDATE "psm_profiles"
SET "professionalNarrative" = "biografia"
WHERE "professionalNarrative" IS NULL AND "biografia" IS NOT NULL AND length(trim("biografia")) > 0;
