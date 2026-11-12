-- AlterTable
ALTER TABLE "CurricularArea" ADD COLUMN     "catalogKey" TEXT;

-- CreateTable
CREATE TABLE "ConclusionPhrase" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ownerId" TEXT,
    "educationLevel" "EducationLevel",
    "cnebNumber" INTEGER NOT NULL,
    "letter" TEXT,
    "courseKey" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConclusionPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiddenConclusionPhrase" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "phraseKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenConclusionPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConclusionPhrase_schoolId_cnebNumber_idx" ON "ConclusionPhrase"("schoolId", "cnebNumber");

-- CreateIndex
CREATE INDEX "ConclusionPhrase_schoolId_ownerId_idx" ON "ConclusionPhrase"("schoolId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenConclusionPhrase_schoolId_phraseKey_key" ON "HiddenConclusionPhrase"("schoolId", "phraseKey");

-- AddForeignKey
ALTER TABLE "ConclusionPhrase" ADD CONSTRAINT "ConclusionPhrase_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConclusionPhrase" ADD CONSTRAINT "ConclusionPhrase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenConclusionPhrase" ADD CONSTRAINT "HiddenConclusionPhrase_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

