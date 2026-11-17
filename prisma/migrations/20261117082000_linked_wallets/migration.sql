-- CreateTable
CREATE TABLE "linked_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "linked_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linked_wallets_address_key" ON "linked_wallets"("address");

-- CreateIndex
CREATE INDEX "linked_wallets_userId_idx" ON "linked_wallets"("userId");

-- AddForeignKey
ALTER TABLE "linked_wallets" ADD CONSTRAINT "linked_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill primary link from legacy users.eoaAddress
INSERT INTO "linked_wallets" ("id", "userId", "address", "isPrimary", "linkedAt")
SELECT
    'lw_backfill_' || "users"."id",
    "users"."id",
    lower("users"."eoaAddress"),
    true,
    COALESCE("users"."createdAt", CURRENT_TIMESTAMP)
FROM "users"
WHERE "users"."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "linked_wallets" lw
    WHERE lw."address" = lower("users"."eoaAddress")
  );