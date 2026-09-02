CREATE TABLE "PublicationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "recapCcEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationSettings_pkey" PRIMARY KEY ("id")
);
