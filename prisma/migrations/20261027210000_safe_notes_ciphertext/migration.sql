-- Slice 7: journal ciphertext at rest (mood/tags move into encrypted payload)

ALTER TABLE "journal_entries" RENAME COLUMN "content" TO "ciphertext";

ALTER TABLE "journal_entries" ADD COLUMN "iv" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN "key_version" INTEGER NOT NULL DEFAULT 1;

-- Pack legacy plaintext + mood/tags into JSON in ciphertext for one-time client re-encrypt
UPDATE "journal_entries"
SET "ciphertext" = (
  json_build_object(
    'content', "ciphertext",
    'mood', COALESCE("mood", 'neutral'),
    'tags', COALESCE("tags", '[]'::jsonb)
  )::text
)
WHERE "iv" IS NULL;

ALTER TABLE "journal_entries" DROP COLUMN "mood";
ALTER TABLE "journal_entries" DROP COLUMN "tags";
