-- CreateEnum
CREATE TYPE "CourseBillingInterval" AS ENUM ('one_time', 'monthly');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "billingInterval" "CourseBillingInterval" NOT NULL DEFAULT 'one_time';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_stripeSubscriptionId_key" ON "Enrollment"("stripeSubscriptionId");
