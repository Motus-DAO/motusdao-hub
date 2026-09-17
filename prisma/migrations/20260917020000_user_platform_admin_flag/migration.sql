-- Dual role: platform admin flag can combine with role=psm
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Existing pure admins keep admin access via role=admin; also mark the flag
UPDATE "users" SET "isPlatformAdmin" = true WHERE "role" = 'admin' AND "deletedAt" IS NULL;
