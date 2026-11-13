-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('DISCOUNT', 'SCHOLARSHIP', 'LATE_FEE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "ScholarshipKind" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "PaymentObligation" ADD COLUMN     "originalAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "adjustmentCounter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateFeeAnnualRate" DECIMAL(6,3),
ADD COLUMN     "lateFeeGraceDays" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ObligationAdjustment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "scholarshipId" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "FinanceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObligationAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ScholarshipKind" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "concepts" TEXT[] DEFAULT ARRAY['PENSION']::TEXT[],
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedById" TEXT,
    "deactivationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObligationAdjustment_obligationId_idx" ON "ObligationAdjustment"("obligationId");

-- CreateIndex
CREATE INDEX "ObligationAdjustment_schoolId_createdAt_idx" ON "ObligationAdjustment"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "ObligationAdjustment_scholarshipId_idx" ON "ObligationAdjustment"("scholarshipId");

-- CreateIndex
CREATE UNIQUE INDEX "ObligationAdjustment_schoolId_number_key" ON "ObligationAdjustment"("schoolId", "number");

-- CreateIndex
CREATE INDEX "Scholarship_schoolId_isActive_idx" ON "Scholarship"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "Scholarship_enrollmentId_idx" ON "Scholarship"("enrollmentId");

-- AddForeignKey
ALTER TABLE "ObligationAdjustment" ADD CONSTRAINT "ObligationAdjustment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationAdjustment" ADD CONSTRAINT "ObligationAdjustment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationAdjustment" ADD CONSTRAINT "ObligationAdjustment_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationAdjustment" ADD CONSTRAINT "ObligationAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationAdjustment" ADD CONSTRAINT "ObligationAdjustment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Las cuotas existentes quedan con su monto actual como monto original.
UPDATE "PaymentObligation" SET "originalAmount" = "amountDue" WHERE "originalAmount" IS NULL;
