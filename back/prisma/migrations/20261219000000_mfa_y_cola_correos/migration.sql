-- Verificación en dos pasos (TOTP) para cuentas de soporte
ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mfaLastStep" INTEGER;

-- Cola persistente de correos
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailOutbox_status_createdAt_idx" ON "EmailOutbox"("status", "createdAt");
CREATE INDEX "EmailOutbox_createdAt_idx" ON "EmailOutbox"("createdAt");
CREATE INDEX "EmailOutbox_schoolId_category_createdAt_idx" ON "EmailOutbox"("schoolId", "category", "createdAt");
CREATE INDEX "EmailOutbox_to_createdAt_idx" ON "EmailOutbox"("to", "createdAt");
