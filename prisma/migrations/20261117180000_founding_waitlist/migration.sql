-- CreateEnum
CREATE TYPE "FoundingWaitlistRole" AS ENUM ('user', 'psm');

-- CreateEnum
CREATE TYPE "FoundingWaitlistTier" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "FoundingWaitlistStatus" AS ENUM ('registered', 'code_sent', 'redeemed');

-- CreateTable
CREATE TABLE "founding_waitlist_entries" (
    "id" TEXT NOT NULL,
    "role" "FoundingWaitlistRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,
    "tier" "FoundingWaitlistTier" NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "wallet" TEXT,
    "mnsLabel" TEXT NOT NULL,
    "mnsTxHash" TEXT NOT NULL,
    "status" "FoundingWaitlistStatus" NOT NULL DEFAULT 'registered',
    "stripePromotionCode" TEXT,
    "stripePromotionCodeId" TEXT,
    "codeSentAt" TIMESTAMP(3),
    "clientIp" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "optionalNote" TEXT,

    CONSTRAINT "founding_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "founding_waitlist_audit" (
    "id" TEXT NOT NULL,
    "entryId" TEXT,
    "emailHash" TEXT NOT NULL,
    "role" "FoundingWaitlistRole" NOT NULL,
    "adminWallet" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "founding_waitlist_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "founding_waitlist_entries_role_email_key" ON "founding_waitlist_entries"("role", "email");

-- CreateIndex
CREATE INDEX "founding_waitlist_entries_role_position_idx" ON "founding_waitlist_entries"("role", "position");

-- CreateIndex
CREATE INDEX "founding_waitlist_audit_role_deletedAt_idx" ON "founding_waitlist_audit"("role", "deletedAt");