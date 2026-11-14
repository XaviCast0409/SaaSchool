-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('TRANSFER', 'YAPE', 'PLIN', 'CASH', 'CARD', 'OTHER');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidOn" DATE NOT NULL,
    "method" "SubscriptionPaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "monthsCovered" INTEGER NOT NULL,
    "previousExpiresAt" TIMESTAMP(3),
    "newExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByEmail" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByEmail" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPayment_schoolId_paidOn_idx" ON "SubscriptionPayment"("schoolId", "paidOn");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_paidOn_idx" ON "SubscriptionPayment"("paidOn");

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

