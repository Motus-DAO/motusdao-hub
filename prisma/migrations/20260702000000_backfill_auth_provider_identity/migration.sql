-- Backfill wallet vendor identity from legacy privyId values.
-- On this fork, privyId often stores WaaP user ids from before authProvider fields existed.

UPDATE "users"
SET
  "authProviderId" = "privyId",
  "authProvider" = 'waap'
WHERE "privyId" IS NOT NULL
  AND "authProviderId" IS NULL;
