-- Security, intake, provider workflow, scheduling, and marketplace foundations.
-- This migration is intentionally additive so current v1 data can be backfilled gradually.

DO $$ BEGIN
  CREATE TYPE "MatchSource" AS ENUM ('automatic', 'admin', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClinicalResource" AS ENUM ('profile', 'patient_profile', 'psm_profile', 'journal_entry', 'match', 'session', 'document', 'payment', 'crisis_event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CrisisSeverity" AS ENUM ('possible', 'high', 'imminent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CrisisStatus" AS ENUM ('open', 'reviewed', 'escalated', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderItemType" AS ENUM ('session', 'course', 'subscription', 'donation', 'provider_payout', 'dao_treasury');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('onchain', 'transak', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "priceAmount" DECIMAL(12, 2);
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'MXN';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "isFree" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "purchasedAt" TIMESTAMP(3);
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "accessExpiresAt" TIMESTAMP(3);

ALTER TABLE "matches" DROP CONSTRAINT IF EXISTS "matches_userId_psmId_key";
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "source" "MatchSource" NOT NULL DEFAULT 'automatic';
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "score" DOUBLE PRECISION;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scoreBreakdown" JSONB;

ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);

ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'es';
ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "scope" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "revocationReason" TEXT;

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "scheduledStart" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "scheduledEnd" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;

ALTER TABLE "payment_logs" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "payment_logs" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
ALTER TABLE "payment_logs" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "payment_logs" ADD COLUMN IF NOT EXISTS "enrollmentId" TEXT;

CREATE TABLE IF NOT EXISTS "clinical_access_logs" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "action" TEXT NOT NULL,
  "resource" "ClinicalResource" NOT NULL,
  "resourceId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "match_criteria" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "criterion" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crisis_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'intake',
  "severity" "CrisisSeverity" NOT NULL DEFAULT 'possible',
  "status" "CrisisStatus" NOT NULL DEFAULT 'open',
  "summary" TEXT,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crisis_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'pending',
  "subtotalAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "OrderItemType" NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitAmount" DECIMAL(12, 2) NOT NULL,
  "totalAmount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "sessionId" TEXT,
  "courseId" TEXT,
  "enrollmentId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "provider" "PaymentProvider" NOT NULL DEFAULT 'onchain',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL,
  "destination" "PaymentDestination" NOT NULL,
  "destinationAddress" TEXT NOT NULL,
  "transactionHash" TEXT,
  "explorerUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "provider_availability_slots" (
  "id" TEXT NOT NULL,
  "psmId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "recurrenceRule" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_availability_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "psmId" TEXT,
  "courseId" TEXT,
  "sessionId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_transactionHash_key" ON "payments"("transactionHash") WHERE "transactionHash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "clinical_access_logs_targetUserId_createdAt_idx" ON "clinical_access_logs"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "clinical_access_logs_actorUserId_createdAt_idx" ON "clinical_access_logs"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "clinical_access_logs_resource_resourceId_idx" ON "clinical_access_logs"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "match_criteria_matchId_idx" ON "match_criteria"("matchId");
CREATE INDEX IF NOT EXISTS "crisis_events_userId_status_idx" ON "crisis_events"("userId", "status");
CREATE INDEX IF NOT EXISTS "orders_userId_status_idx" ON "orders"("userId", "status");
CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_sessionId_idx" ON "order_items"("sessionId");
CREATE INDEX IF NOT EXISTS "order_items_courseId_idx" ON "order_items"("courseId");
CREATE INDEX IF NOT EXISTS "payments_orderId_idx" ON "payments"("orderId");
CREATE INDEX IF NOT EXISTS "payments_userId_status_idx" ON "payments"("userId", "status");
CREATE INDEX IF NOT EXISTS "provider_availability_slots_psmId_startsAt_idx" ON "provider_availability_slots"("psmId", "startsAt");
CREATE INDEX IF NOT EXISTS "reviews_psmId_idx" ON "reviews"("psmId");
CREATE INDEX IF NOT EXISTS "reviews_courseId_idx" ON "reviews"("courseId");
CREATE INDEX IF NOT EXISTS "sessions_scheduledStart_scheduledEnd_idx" ON "sessions"("scheduledStart", "scheduledEnd");
CREATE INDEX IF NOT EXISTS "payment_logs_orderId_idx" ON "payment_logs"("orderId");
CREATE INDEX IF NOT EXISTS "payment_logs_paymentId_idx" ON "payment_logs"("paymentId");
CREATE INDEX IF NOT EXISTS "payment_logs_sessionId_idx" ON "payment_logs"("sessionId");

ALTER TABLE "clinical_access_logs" ADD CONSTRAINT "clinical_access_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_access_logs" ADD CONSTRAINT "clinical_access_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "match_criteria" ADD CONSTRAINT "match_criteria_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crisis_events" ADD CONSTRAINT "crisis_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_availability_slots" ADD CONSTRAINT "provider_availability_slots_psmId_fkey" FOREIGN KEY ("psmId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_psmId_fkey" FOREIGN KEY ("psmId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
