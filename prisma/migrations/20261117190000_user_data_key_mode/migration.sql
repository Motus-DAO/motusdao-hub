-- CreateEnum
CREATE TYPE "DataKeyMode" AS ENUM ('account', 'wallet');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "data_key_mode" "DataKeyMode",
ADD COLUMN "data_key_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "data_key_wallet_eoa" TEXT;

-- AlterTable
ALTER TABLE "psychat_archive_snapshots" ADD COLUMN "data_key_mode" "DataKeyMode";