-- Chat-data slice 4: training copy consent + readable contribution store

ALTER TYPE "ClinicalResource" ADD VALUE IF NOT EXISTS 'training_copy';

ALTER TABLE "consent_records"
  ADD COLUMN IF NOT EXISTS "consentToTrainingCopy" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "TrainingPayoutStatus" AS ENUM ('none', 'recorded', 'paid', 'cancelled');

CREATE TABLE IF NOT EXISTS "training_copy_contributions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "copyText" TEXT NOT NULL,
  "processorLabel" TEXT NOT NULL DEFAULT 'MotusDAO y socios de entrenamiento autorizados',
  "policyVersion" TEXT NOT NULL,
  "compensationUsd" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "payoutStatus" "TrainingPayoutStatus" NOT NULL DEFAULT 'none',
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_copy_contributions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "training_copy_contributions_userId_createdAt_idx"
  ON "training_copy_contributions"("userId", "createdAt");

ALTER TABLE "training_copy_contributions"
  ADD CONSTRAINT "training_copy_contributions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
