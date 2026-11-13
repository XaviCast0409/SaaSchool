-- CreateEnum
CREATE TYPE "FinanceRecordStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateEnum
CREATE TYPE "FinanceRole" AS ENUM ('CASHIER', 'TREASURER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'REVIEWED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'YAPE';
ALTER TYPE "PaymentMethod" ADD VALUE 'PLIN';
ALTER TYPE "PaymentMethod" ADD VALUE 'DEPOSIT';

-- AlterTable
ALTER TABLE "PaymentObligation" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT;

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "cashSessionId" TEXT,
ADD COLUMN     "collectedById" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "FinanceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "expenseCounter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "financeRole" "FinanceRole";

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingAmount" DECIMAL(10,2) NOT NULL,
    "openingNote" TEXT,
    "closedAt" TIMESTAMP(3),
    "expectedCash" DECIMAL(10,2),
    "countedCash" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "totalsByMethod" JSONB,
    "closingNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashExpense" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "beneficiary" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "attachmentUrl" TEXT,
    "registeredById" TEXT NOT NULL,
    "status" "FinanceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashSession_schoolId_status_idx" ON "CashSession"("schoolId", "status");

-- CreateIndex
CREATE INDEX "CashSession_schoolId_openedAt_idx" ON "CashSession"("schoolId", "openedAt");

-- CreateIndex
CREATE INDEX "CashSession_cashierId_status_idx" ON "CashSession"("cashierId", "status");

-- CreateIndex
CREATE INDEX "CashExpense_schoolId_createdAt_idx" ON "CashExpense"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "CashExpense_cashSessionId_idx" ON "CashExpense"("cashSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CashExpense_schoolId_expenseNumber_key" ON "CashExpense"("schoolId", "expenseNumber");

-- CreateIndex
CREATE INDEX "PaymentTransaction_schoolId_status_paymentDate_idx" ON "PaymentTransaction"("schoolId", "status", "paymentDate");

-- CreateIndex
CREATE INDEX "PaymentTransaction_cashSessionId_idx" ON "PaymentTransaction"("cashSessionId");

-- Recibos con número repetido (escritos a mano antes): se conserva el primero y los demás
-- reciben un sufijo, para poder exigir que el número de recibo sea único por colegio.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "schoolId", "receiptNumber" ORDER BY "paymentDate", "id") AS rn
  FROM "PaymentTransaction"
  WHERE "receiptNumber" IS NOT NULL
)
UPDATE "PaymentTransaction" t
SET "receiptNumber" = t."receiptNumber" || '-' || ranked.rn
FROM ranked
WHERE ranked."id" = t."id" AND ranked.rn > 1;

-- Los pagos anteriores quedan con fecha de registro igual a la fecha de pago, y los
-- vouchers ya aprobados quedan a nombre de quien los validó.
UPDATE "PaymentTransaction" SET "createdAt" = "paymentDate";
UPDATE "PaymentTransaction" t
SET "collectedById" = r."reviewedById"
FROM "PaymentReport" r
WHERE r."transactionId" = t."id" AND r."reviewedById" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_schoolId_receiptNumber_key" ON "PaymentTransaction"("schoolId", "receiptNumber");

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

