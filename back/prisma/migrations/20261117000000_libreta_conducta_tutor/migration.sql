-- Libreta interna: conducta y comentario del tutor por estudiante y periodo
CREATE TABLE "StudentPeriodReport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "conductScore" DOUBLE PRECISION,
    "conductLetter" TEXT,
    "conductComment" TEXT,
    "tutorComment" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPeriodReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentPeriodReport_enrollmentId_periodNumber_key" ON "StudentPeriodReport"("enrollmentId", "periodNumber");
CREATE INDEX "StudentPeriodReport_schoolId_periodNumber_idx" ON "StudentPeriodReport"("schoolId", "periodNumber");

ALTER TABLE "StudentPeriodReport" ADD CONSTRAINT "StudentPeriodReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPeriodReport" ADD CONSTRAINT "StudentPeriodReport_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
