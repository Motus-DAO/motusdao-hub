-- PSM public profile marketplace fields + review extensions

CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'published', 'flagged', 'removed');

ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "topSpecialties" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "introVideoUrl" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "introVideoStoragePath" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "introVideoApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "introVideoApprovedAt" TIMESTAMP(3);
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "firstSessionExpectations" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "styleTags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "doesNotWorkWithNote" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "completedSessionsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "patientCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "psm_profiles_slug_key" ON "psm_profiles"("slug");

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "issueTags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "status" "ReviewStatus" NOT NULL DEFAULT 'published';

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_authorId_psmId_key" ON "reviews"("authorId", "psmId") WHERE "psmId" IS NOT NULL;

-- Platform defaults for teletherapy marketplace
UPDATE "psm_profiles"
SET
  "sessionPrice" = 45,
  "currency" = 'USD',
  "modalities" = '["video"]'::jsonb
WHERE "sessionPrice" IS NULL OR "currency" = 'MXN';

-- Backfill slugs from user profile names + id suffix for uniqueness
UPDATE "psm_profiles" p
SET "slug" = sub.slug
FROM (
  SELECT
    p2.id,
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(
            COALESCE(pr."nombre", 'psm') || '-' ||
            COALESCE(NULLIF(TRIM(pr."apellido"), ''), 'profesional')
          ),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    ) || '-' || SUBSTRING(p2.id, 1, 6) AS slug
  FROM "psm_profiles" p2
  JOIN "users" u ON u.id = p2."userId"
  LEFT JOIN "profiles" pr ON pr."userId" = u.id
  WHERE p2."slug" IS NULL
) sub
WHERE p.id = sub.id;

-- Backfill topSpecialties from first 3 especialidades
UPDATE "psm_profiles"
SET "topSpecialties" = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM (
    SELECT elem
    FROM jsonb_array_elements_text("especialidades") WITH ORDINALITY AS t(elem, ord)
    WHERE ord <= 3
  ) s
)
WHERE jsonb_array_length(COALESCE("topSpecialties", '[]'::jsonb)) = 0
  AND jsonb_array_length(COALESCE("especialidades", '[]'::jsonb)) > 0;
