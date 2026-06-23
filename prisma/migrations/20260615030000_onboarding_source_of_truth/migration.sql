DO $$ BEGIN
  CREATE TYPE "OnboardingStatus" AS ENUM ('started', 'wallet_connected', 'profile_incomplete', 'profile_complete', 'pending_verification', 'active', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntakeSource" AS ENUM ('manual', 'ai_assisted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UrgencyLevel" AS ENUM ('low', 'medium', 'high', 'crisis');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "Modality" AS ENUM ('video', 'chat', 'in_person', 'hybrid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'started',
  ADD COLUMN IF NOT EXISTS "intakeSource" "IntakeSource" NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "motusName" TEXT,
  ADD COLUMN IF NOT EXISTS "profileNftTxHash" TEXT,
  ADD COLUMN IF NOT EXISTS "profileNftTokenURI" TEXT;

UPDATE "users"
SET "onboardingStatus" = 'active'
WHERE "registrationCompleted" = true
  AND "role" <> 'psm';

UPDATE "users"
SET "onboardingStatus" = 'pending_verification'
WHERE "registrationCompleted" = true
  AND "role" = 'psm';

ALTER TABLE "patient_profiles"
  ADD COLUMN IF NOT EXISTS "clinicalConcern" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "urgencyLevel" "UrgencyLevel" NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS "preferredModality" "Modality" NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS "preferredTherapyStyle" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "languages" TEXT NOT NULL DEFAULT '["es"]',
  ADD COLUMN IF NOT EXISTS "timezone" TEXT,
  ADD COLUMN IF NOT EXISTS "availability" TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "budgetMin" INTEGER,
  ADD COLUMN IF NOT EXISTS "budgetMax" INTEGER,
  ADD COLUMN IF NOT EXISTS "paymentPreference" TEXT,
  ADD COLUMN IF NOT EXISTS "therapistGenderPreference" TEXT,
  ADD COLUMN IF NOT EXISTS "priorTherapyExperience" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "medicationOrDiagnosisContext" TEXT,
  ADD COLUMN IF NOT EXISTS "riskFlags" TEXT NOT NULL DEFAULT '[]';

UPDATE "patient_profiles"
SET "clinicalConcern" = json_build_array("tipoAtencion")::text
WHERE "clinicalConcern" = '[]'
  AND "tipoAtencion" IS NOT NULL
  AND "tipoAtencion" <> '';

ALTER TABLE "psm_profiles"
  ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "isAcceptingPatients" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxActivePatients" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "therapyStyles" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "languages" TEXT NOT NULL DEFAULT '["es"]',
  ADD COLUMN IF NOT EXISTS "licensedCountries" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "licensedRegions" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "timezone" TEXT,
  ADD COLUMN IF NOT EXISTS "availability" TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "modalities" TEXT NOT NULL DEFAULT '["video"]',
  ADD COLUMN IF NOT EXISTS "sessionPrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS "acceptsSlidingScale" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "worksWithUrgencyLevels" TEXT NOT NULL DEFAULT '["low","medium"]',
  ADD COLUMN IF NOT EXISTS "exclusionCriteria" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "adminReviewNotes" TEXT;

CREATE TABLE IF NOT EXISTS "consent_records" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "consentToTerms" BOOLEAN NOT NULL DEFAULT false,
  "consentToPrivacy" BOOLEAN NOT NULL DEFAULT false,
  "consentToAIProcessing" BOOLEAN NOT NULL DEFAULT false,
  "consentToShareWithPSM" BOOLEAN NOT NULL DEFAULT false,
  "consentToClinicalMatching" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'onboarding',
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consent_records_userId_acceptedAt_idx" ON "consent_records"("userId", "acceptedAt");

DO $$ BEGIN
  ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
