-- Historical migration: already applied in production (2026-01-23).
-- Adds modules table and restructures lessons under modules.

DO $$ BEGIN
  CREATE TYPE "CourseDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS "difficulty" "CourseDifficulty" DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS "instructor" TEXT DEFAULT 'MotusDAO',
  ADD COLUMN IF NOT EXISTS "instructorBio" TEXT,
  ADD COLUMN IF NOT EXISTS "instructorImage" TEXT,
  ADD COLUMN IF NOT EXISTS "instructorTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "lastUpdated" TEXT,
  ADD COLUMN IF NOT EXISTS "learningOutcomes" TEXT,
  ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS "modules" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "modules" ADD CONSTRAINT "modules_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "moduleId" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "isFreePreview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pdfResources" TEXT,
  ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

DO $$ BEGIN
  ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- courseId may have been dropped in production after module migration
ALTER TABLE "lessons" DROP COLUMN IF EXISTS "courseId";
