-- Leads capturados desde la web de marketing de KIPUX (nivel plataforma)
CREATE TYPE "SalesLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'WON', 'LOST');

CREATE TABLE "SalesLead" (
    "id" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "studentRange" TEXT,
    "interestPlan" TEXT,
    "message" TEXT,
    "source" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "SalesLeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalesLead_status_createdAt_idx" ON "SalesLead"("status", "createdAt");
