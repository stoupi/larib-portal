ALTER TABLE "PublicationSettings" ADD COLUMN IF NOT EXISTS "acceptedRecapEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
