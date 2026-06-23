-- Helper: safely cast TEXT JSON columns to JSONB
CREATE OR REPLACE FUNCTION migrate_text_to_jsonb(val TEXT, fallback TEXT)
RETURNS JSONB AS $$
BEGIN
  IF val IS NULL OR btrim(val) = '' THEN
    RETURN fallback::jsonb;
  END IF;
  BEGIN
    RETURN val::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN fallback::jsonb;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- patient_profiles: drop TEXT defaults, convert, re-apply JSONB defaults
ALTER TABLE "patient_profiles"
  ALTER COLUMN "clinicalConcern" DROP DEFAULT,
  ALTER COLUMN "preferredTherapyStyle" DROP DEFAULT,
  ALTER COLUMN "languages" DROP DEFAULT,
  ALTER COLUMN "availability" DROP DEFAULT,
  ALTER COLUMN "riskFlags" DROP DEFAULT;

ALTER TABLE "patient_profiles"
  ALTER COLUMN "clinicalConcern" TYPE JSONB
    USING migrate_text_to_jsonb("clinicalConcern", '[]'),
  ALTER COLUMN "preferredTherapyStyle" TYPE JSONB
    USING migrate_text_to_jsonb("preferredTherapyStyle", '[]'),
  ALTER COLUMN "languages" TYPE JSONB
    USING migrate_text_to_jsonb("languages", '["es"]'),
  ALTER COLUMN "availability" TYPE JSONB
    USING migrate_text_to_jsonb("availability", '{}'),
  ALTER COLUMN "riskFlags" TYPE JSONB
    USING migrate_text_to_jsonb("riskFlags", '[]');

ALTER TABLE "patient_profiles"
  ALTER COLUMN "clinicalConcern" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "preferredTherapyStyle" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "languages" SET DEFAULT '["es"]'::jsonb,
  ALTER COLUMN "availability" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "riskFlags" SET DEFAULT '[]'::jsonb;

-- psm_profiles
ALTER TABLE "psm_profiles"
  ALTER COLUMN "therapyStyles" DROP DEFAULT,
  ALTER COLUMN "languages" DROP DEFAULT,
  ALTER COLUMN "licensedCountries" DROP DEFAULT,
  ALTER COLUMN "licensedRegions" DROP DEFAULT,
  ALTER COLUMN "availability" DROP DEFAULT,
  ALTER COLUMN "modalities" DROP DEFAULT,
  ALTER COLUMN "worksWithUrgencyLevels" DROP DEFAULT,
  ALTER COLUMN "exclusionCriteria" DROP DEFAULT;

ALTER TABLE "psm_profiles"
  ALTER COLUMN "especialidades" TYPE JSONB
    USING migrate_text_to_jsonb("especialidades", '[]'),
  ALTER COLUMN "therapyStyles" TYPE JSONB
    USING migrate_text_to_jsonb("therapyStyles", '[]'),
  ALTER COLUMN "languages" TYPE JSONB
    USING migrate_text_to_jsonb("languages", '["es"]'),
  ALTER COLUMN "licensedCountries" TYPE JSONB
    USING migrate_text_to_jsonb("licensedCountries", '[]'),
  ALTER COLUMN "licensedRegions" TYPE JSONB
    USING migrate_text_to_jsonb("licensedRegions", '[]'),
  ALTER COLUMN "availability" TYPE JSONB
    USING migrate_text_to_jsonb("availability", '{}'),
  ALTER COLUMN "modalities" TYPE JSONB
    USING migrate_text_to_jsonb("modalities", '["video"]'),
  ALTER COLUMN "worksWithUrgencyLevels" TYPE JSONB
    USING migrate_text_to_jsonb("worksWithUrgencyLevels", '["low","medium"]'),
  ALTER COLUMN "exclusionCriteria" TYPE JSONB
    USING migrate_text_to_jsonb("exclusionCriteria", '[]');

ALTER TABLE "psm_profiles"
  ALTER COLUMN "therapyStyles" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "languages" SET DEFAULT '["es"]'::jsonb,
  ALTER COLUMN "licensedCountries" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "licensedRegions" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "availability" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "modalities" SET DEFAULT '["video"]'::jsonb,
  ALTER COLUMN "worksWithUrgencyLevels" SET DEFAULT '["low","medium"]'::jsonb,
  ALTER COLUMN "exclusionCriteria" SET DEFAULT '[]'::jsonb;

-- journal_entries
ALTER TABLE "journal_entries"
  ALTER COLUMN "tags" TYPE JSONB
    USING CASE
      WHEN "tags" IS NULL OR btrim("tags") = '' THEN NULL
      ELSE migrate_text_to_jsonb("tags", '[]')
    END;

-- courses
ALTER TABLE "courses"
  ALTER COLUMN "learningOutcomes" TYPE JSONB
    USING CASE
      WHEN "learningOutcomes" IS NULL OR btrim("learningOutcomes") = '' THEN NULL
      ELSE migrate_text_to_jsonb("learningOutcomes", '[]')
    END;

-- lessons
ALTER TABLE "lessons"
  ALTER COLUMN "pdfResources" TYPE JSONB
    USING CASE
      WHEN "pdfResources" IS NULL OR btrim("pdfResources") = '' THEN NULL
      ELSE migrate_text_to_jsonb("pdfResources", '[]')
    END;

DROP FUNCTION migrate_text_to_jsonb(TEXT, TEXT);
