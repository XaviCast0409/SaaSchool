-- CreateEnum
CREATE TYPE "JustificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JustificationReason" AS ENUM ('MEDICAL', 'FAMILY', 'BEREAVEMENT', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceAlertReason" AS ENUM ('CONSECUTIVE_ABSENCES', 'MONTHLY_ABSENCE_RATE', 'REPEATED_LATENESS');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkOutById" TEXT,
ADD COLUMN     "checkOutTime" TIMESTAMP(3),
ADD COLUMN     "earlyLeaveReason" TEXT,
ADD COLUMN     "pickedUpByDocument" TEXT,
ADD COLUMN     "pickedUpByName" TEXT,
ADD COLUMN     "pickupPersonId" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "absenceAlertConsecutive" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "absenceAlertMonthlyPercent" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "lastRiskEvaluationOn" DATE,
ADD COLUMN     "lateAlertMonthlyCount" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "notifyAbsencesToFamilies" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AttendanceJustification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "reason" "JustificationReason" NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "status" "JustificationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceJustification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAlert" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "reason" "AttendanceAlertReason" NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "triggeredOn" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "attendedById" TEXT,
    "attendedAt" TIMESTAMP(3),
    "attendedNote" TEXT,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizedPickup" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'DNI',
    "documentId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "cellphone" TEXT,
    "photoFileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorizedPickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAttendanceSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "courseAssignmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "periodLabel" TEXT NOT NULL DEFAULT '1',
    "takenById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,

    CONSTRAINT "CourseAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceJustification_schoolId_status_createdAt_idx" ON "AttendanceJustification"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceJustification_enrollmentId_dateFrom_idx" ON "AttendanceJustification"("enrollmentId", "dateFrom");

-- CreateIndex
CREATE INDEX "AttendanceAlert_schoolId_status_idx" ON "AttendanceAlert"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceAlert_enrollmentId_reason_triggeredOn_key" ON "AttendanceAlert"("enrollmentId", "reason", "triggeredOn");

-- CreateIndex
CREATE INDEX "AuthorizedPickup_schoolId_studentId_idx" ON "AuthorizedPickup"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "CourseAttendanceSession_schoolId_date_idx" ON "CourseAttendanceSession"("schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAttendanceSession_courseAssignmentId_date_periodLabel_key" ON "CourseAttendanceSession"("courseAssignmentId", "date", "periodLabel");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAttendanceRecord_sessionId_enrollmentId_key" ON "CourseAttendanceRecord"("sessionId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "AttendanceJustification" ADD CONSTRAINT "AttendanceJustification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceJustification" ADD CONSTRAINT "AttendanceJustification_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAlert" ADD CONSTRAINT "AttendanceAlert_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAlert" ADD CONSTRAINT "AttendanceAlert_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedPickup" ADD CONSTRAINT "AuthorizedPickup_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedPickup" ADD CONSTRAINT "AuthorizedPickup_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendanceSession" ADD CONSTRAINT "CourseAttendanceSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendanceSession" ADD CONSTRAINT "CourseAttendanceSession_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendanceRecord" ADD CONSTRAINT "CourseAttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseAttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendanceRecord" ADD CONSTRAINT "CourseAttendanceRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
