-- AlterEnum
ALTER TYPE "Application" ADD VALUE 'CORELAB';

-- CreateTable
CREATE TABLE "ApplicationAccessPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "application" "Application" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationAccessPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAccessPeriod_userId_application_key" ON "ApplicationAccessPeriod"("userId", "application");

-- AddForeignKey
ALTER TABLE "ApplicationAccessPeriod" ADD CONSTRAINT "ApplicationAccessPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
