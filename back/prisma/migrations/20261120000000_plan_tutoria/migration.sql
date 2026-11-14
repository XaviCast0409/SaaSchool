-- CreateTable
CREATE TABLE "TutoringIntervention" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT NOT NULL,
    "agreements" TEXT,
    "followUpDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutoringIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutoringIntervention_schoolId_enrollmentId_date_idx" ON "TutoringIntervention"("schoolId", "enrollmentId", "date");

-- CreateIndex
CREATE INDEX "TutoringIntervention_schoolId_status_followUpDate_idx" ON "TutoringIntervention"("schoolId", "status", "followUpDate");

-- AddForeignKey
ALTER TABLE "TutoringIntervention" ADD CONSTRAINT "TutoringIntervention_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringIntervention" ADD CONSTRAINT "TutoringIntervention_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringIntervention" ADD CONSTRAINT "TutoringIntervention_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

