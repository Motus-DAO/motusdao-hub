-- CreateTable
CREATE TABLE "founding_stripe_coupon_templates" (
    "role" "FoundingWaitlistRole" NOT NULL,
    "tier" "FoundingWaitlistTier" NOT NULL,
    "couponId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "founding_stripe_coupon_templates_pkey" PRIMARY KEY ("role","tier")
);