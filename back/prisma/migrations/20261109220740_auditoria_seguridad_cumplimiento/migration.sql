-- CreateEnum
CREATE TYPE "FileStorage" AS ENUM ('GOOGLE_DRIVE', 'LOCAL');

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "promotionRulesConfig" JSONB;

-- AlterTable
ALTER TABLE "AttendanceScheduleConfig" ADD COLUMN     "lastAutoClosedOn" DATE;

-- AlterTable
ALTER TABLE "PaymentObligation" ALTER COLUMN "amountDue" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "PaymentTransaction" ALTER COLUMN "amountPaid" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "receiptType" SET DEFAULT 'RECIBO_INTERNO';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "brandColor" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudentIncident" ADD COLUMN     "isViolenceCase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "siseveCode" TEXT,
ADD COLUMN     "siseveReportedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploaderRole" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "storage" "FileStorage" NOT NULL,
    "driveFileId" TEXT,
    "localPath" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "studentId" TEXT,
    "documentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolHoliday" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_driveFileId_key" ON "StoredFile"("driveFileId");

-- CreateIndex
CREATE INDEX "StoredFile_schoolId_uploadedById_createdAt_idx" ON "StoredFile"("schoolId", "uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_entity_entityId_idx" ON "AuditLog"("schoolId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_schoolId_userId_idx" ON "LegalAcceptance"("schoolId", "userId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_schoolId_studentId_idx" ON "LegalAcceptance"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolHoliday_schoolId_date_key" ON "SchoolHoliday"("schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GradingScale_schoolId_level_letterGrade_key" ON "GradingScale"("schoolId", "level", "letterGrade");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_documentId_key" ON "User"("schoolId", "documentId");

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolHoliday" ADD CONSTRAINT "SchoolHoliday_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Normalizar tipo de recibo: solo recibos internos hasta integrar facturación electrónica
UPDATE "PaymentTransaction" SET "receiptType" = 'RECIBO_INTERNO' WHERE "receiptType" IS DISTINCT FROM 'RECIBO_INTERNO';
