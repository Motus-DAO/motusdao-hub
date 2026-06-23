-- Profile avatars and PSM credential documents (Supabase Storage paths)

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "avatarStoragePath" TEXT;

ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "cedulaDocumentPath" TEXT;
ALTER TABLE "psm_profiles" ADD COLUMN IF NOT EXISTS "tituloDocumentPath" TEXT;
