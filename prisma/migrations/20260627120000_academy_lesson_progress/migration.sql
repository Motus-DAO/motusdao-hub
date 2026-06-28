-- Academy slice 5: per-lesson progress table
-- Rollback: DROP TABLE IF EXISTS "lesson_progress";

CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "enrollmentId" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT true,
  "completedAt" TIMESTAMP(3),
  "lastPosition" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_userId_lessonId_key"
  ON "lesson_progress"("userId", "lessonId");

CREATE INDEX IF NOT EXISTS "lesson_progress_enrollmentId_idx"
  ON "lesson_progress"("enrollmentId");

ALTER TABLE "lesson_progress"
  ADD CONSTRAINT "lesson_progress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_progress"
  ADD CONSTRAINT "lesson_progress_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_progress"
  ADD CONSTRAINT "lesson_progress_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
