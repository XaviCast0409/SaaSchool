-- CreateEnum
CREATE TYPE "PaymentReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "paymentInstructions" TEXT,
ADD COLUMN     "paymentQrFileUrl" TEXT;

-- CreateTable
CREATE TABLE "PaymentReport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "operationNumber" TEXT NOT NULL,
    "paidOn" DATE NOT NULL,
    "voucherFileUrl" TEXT,
    "note" TEXT,
    "status" "PaymentReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReport_transactionId_key" ON "PaymentReport"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentReport_schoolId_status_createdAt_idx" ON "PaymentReport"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentReport_obligationId_idx" ON "PaymentReport"("obligationId");

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

