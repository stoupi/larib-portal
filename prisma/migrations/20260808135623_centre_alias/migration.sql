-- CreateTable
CREATE TABLE "CentreAlias" (
    "id" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentreAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentreAlias_normalized_key" ON "CentreAlias"("normalized");

-- CreateIndex
CREATE INDEX "CentreAlias_centreId_idx" ON "CentreAlias"("centreId");

-- AddForeignKey
ALTER TABLE "CentreAlias" ADD CONSTRAINT "CentreAlias_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
