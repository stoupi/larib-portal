-- CreateTable
CREATE TABLE "PublicationAgentReview" (
    "articleId" TEXT NOT NULL,
    "reviewedUpTo" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "PublicationAgentReview_pkey" PRIMARY KEY ("articleId")
);

-- AddForeignKey
ALTER TABLE "PublicationAgentReview" ADD CONSTRAINT "PublicationAgentReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
