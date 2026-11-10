-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PTP';
ALTER TYPE "DocumentType" ADD VALUE 'BIRTH_CERTIFICATE';

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "periodType" TEXT NOT NULL DEFAULT 'BIMESTER';

-- AlterTable
ALTER TABLE "CurricularArea" ADD COLUMN     "isTransversal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officialAreaCode" TEXT;

-- AlterTable
ALTER TABLE "CurricularCompetence" ADD COLUMN     "officialCompetenceCode" TEXT;

-- AlterTable
ALTER TABLE "DetailedGrade" ADD COLUMN     "isExonerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "literalScore" TEXT,
ALTER COLUMN "numericScore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "customPensionAmount" DECIMAL(10,2),
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "finalSituation" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "courseContentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "studentComment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "numericScore" DOUBLE PRECISION,
    "literalScore" TEXT,
    "teacherFeedback" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeworkSubmission_schoolId_courseContentId_idx" ON "HomeworkSubmission"("schoolId", "courseContentId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_courseContentId_enrollmentId_key" ON "HomeworkSubmission"("courseContentId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_courseContentId_fkey" FOREIGN KEY ("courseContentId") REFERENCES "CourseContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

