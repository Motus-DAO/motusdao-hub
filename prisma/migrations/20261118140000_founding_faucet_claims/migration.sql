-- Founding waitlist: one CELO drip per wallet (signature proof, no Hub session).
CREATE TABLE "founding_faucet_claims" (
    "wallet" TEXT NOT NULL,
    "txHash" TEXT,
    "amount" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "founding_faucet_claims_pkey" PRIMARY KEY ("wallet")
);