-- CreateEnum
CREATE TYPE "AttendanceOrigin" AS ENUM ('MANUAL', 'QR_SCAN', 'BARCODE', 'AUTO_CLOSE');

-- CreateEnum
CREATE TYPE "AttendanceScheduleScope" AS ENUM ('GENERAL', 'INITIAL', 'PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('LESSON_MATERIAL', 'HOMEWORK', 'FORUM');

-- CreateEnum
CREATE TYPE "EnrollmentCondition" AS ENUM ('INGRESANTE', 'CONTINUO', 'TRASLADO', 'REENTRANTE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT', 'ATTENDANCE', 'ANNOUNCEMENT', 'ACADEMIC', 'GENERAL', 'INCIDENT');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'CARNET_EXTRANJERIA';
ALTER TYPE "DocumentType" ADD VALUE 'CODIGO_TEMPORAL';
-- AlterEnum
ALTER TYPE "RelationshipType" ADD VALUE 'TUTOR_LEGAL';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMINISTRATIVE';

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "annualCalculationMode" TEXT NOT NULL DEFAULT 'LAST_PERIOD',
ADD COLUMN     "periodsConfig" JSONB;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkInTime" TIMESTAMP(3),
ADD COLUMN     "origin" "AttendanceOrigin" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "tutorTeacherId" TEXT;

-- AlterTable
ALTER TABLE "CurricularArea" ADD COLUMN     "evaluatedCompetenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "parentAreaId" TEXT;

-- AlterTable
ALTER TABLE "CurricularCompetence" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "condition" "EnrollmentCondition" NOT NULL DEFAULT 'CONTINUO';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "blockGradesOnOverdue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offeredLevels" "EducationLevel"[] DEFAULT ARRAY['PRIMARY', 'SECONDARY']::"EducationLevel"[],
ADD COLUMN     "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3),
ADD COLUMN     "receiptCounter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "birthUbigeo" TEXT,
ADD COLUMN     "residenceUbigeo" TEXT,
ALTER COLUMN "lastNameMaternal" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "educationLevel" TEXT;

-- CreateTable
CREATE TABLE "AttendanceScheduleConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "scope" "AttendanceScheduleScope" NOT NULL DEFAULT 'GENERAL',
    "entryTime" TEXT NOT NULL DEFAULT '07:45',
    "lateToleranceTime" TEXT NOT NULL DEFAULT '08:15',
    "autoCloseTime" TEXT NOT NULL DEFAULT '08:30',
    "autoCloseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetenceConclusion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseAssignmentId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "conclusion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetenceConclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseContent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "courseAssignmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "bimester" INTEGER NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "dueDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetailedGrade" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseAssignmentId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "numericScore" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    

    CONSTRAINT "DetailedGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCriterion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "order" INTEGER NOT NULL DEFAULT 1,
    "educationLevel" "EducationLevel",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "courseContentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingPeriodLock" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classroomId" TEXT,
    "periodNumber" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingPeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentIncident" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT,
    "citationDate" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceScheduleConfig_schoolId_idx" ON "AttendanceScheduleConfig"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceScheduleConfig_schoolId_scope_key" ON "AttendanceScheduleConfig"("schoolId" ASC, "scope" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CompetenceConclusion_enrollmentId_courseAssignmentId_compet_key" ON "CompetenceConclusion"("enrollmentId" ASC, "courseAssignmentId" ASC, "competenceId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "CompetenceConclusion_enrollmentId_periodNumber_idx" ON "CompetenceConclusion"("enrollmentId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "CompetenceConclusion_schoolId_courseAssignmentId_periodNumb_idx" ON "CompetenceConclusion"("schoolId" ASC, "courseAssignmentId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "CourseContent_schoolId_contentType_idx" ON "CourseContent"("schoolId" ASC, "contentType" ASC);

-- CreateIndex
CREATE INDEX "CourseContent_schoolId_courseAssignmentId_bimester_idx" ON "CourseContent"("schoolId" ASC, "courseAssignmentId" ASC, "bimester" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DetailedGrade_enrollmentId_courseAssignmentId_competenceId__key" ON "DetailedGrade"("enrollmentId" ASC, "courseAssignmentId" ASC, "competenceId" ASC, "criterionId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "DetailedGrade_enrollmentId_periodNumber_idx" ON "DetailedGrade"("enrollmentId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "DetailedGrade_schoolId_courseAssignmentId_periodNumber_idx" ON "DetailedGrade"("schoolId" ASC, "courseAssignmentId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "EvaluationCriterion_schoolId_isActive_idx" ON "EvaluationCriterion"("schoolId" ASC, "isActive" ASC);

-- CreateIndex
CREATE INDEX "EvaluationCriterion_schoolId_order_idx" ON "EvaluationCriterion"("schoolId" ASC, "order" ASC);

-- CreateIndex
CREATE INDEX "ForumComment_schoolId_courseContentId_createdAt_idx" ON "ForumComment"("schoolId" ASC, "courseContentId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GradingPeriodLock_schoolId_classroomId_periodNumber_key" ON "GradingPeriodLock"("schoolId" ASC, "classroomId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "GradingPeriodLock_schoolId_periodNumber_idx" ON "GradingPeriodLock"("schoolId" ASC, "periodNumber" ASC);

-- CreateIndex
CREATE INDEX "Notification_schoolId_createdAt_idx" ON "Notification"("schoolId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Notification_schoolId_studentId_isRead_idx" ON "Notification"("schoolId" ASC, "studentId" ASC, "isRead" ASC);

-- CreateIndex
CREATE INDEX "Notification_schoolId_userId_isRead_idx" ON "Notification"("schoolId" ASC, "userId" ASC, "isRead" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "PushSubscription_schoolId_studentId_idx" ON "PushSubscription"("schoolId" ASC, "studentId" ASC);

-- CreateIndex
CREATE INDEX "PushSubscription_schoolId_userId_idx" ON "PushSubscription"("schoolId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "StudentIncident_schoolId_enrollmentId_idx" ON "StudentIncident"("schoolId" ASC, "enrollmentId" ASC);

-- CreateIndex
CREATE INDEX "Announcement_schoolId_isActive_idx" ON "Announcement"("schoolId" ASC, "isActive" ASC);

-- CreateIndex
CREATE INDEX "Attendance_schoolId_date_idx" ON "Attendance"("schoolId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "Classroom_schoolId_educationLevel_grade_idx" ON "Classroom"("schoolId" ASC, "educationLevel" ASC, "grade" ASC);

-- CreateIndex
CREATE INDEX "Classroom_schoolId_tutorTeacherId_idx" ON "Classroom"("schoolId" ASC, "tutorTeacherId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CourseAssignment_classroomId_areaId_key" ON "CourseAssignment"("classroomId" ASC, "areaId" ASC);

-- CreateIndex
CREATE INDEX "CourseAssignment_schoolId_teacherId_idx" ON "CourseAssignment"("schoolId" ASC, "teacherId" ASC);

-- CreateIndex
CREATE INDEX "CurricularArea_schoolId_parentAreaId_idx" ON "CurricularArea"("schoolId" ASC, "parentAreaId" ASC);

-- CreateIndex
CREATE INDEX "Enrollment_schoolId_academicYearId_idx" ON "Enrollment"("schoolId" ASC, "academicYearId" ASC);

-- CreateIndex
CREATE INDEX "Enrollment_schoolId_classroomId_idx" ON "Enrollment"("schoolId" ASC, "classroomId" ASC);

-- CreateIndex
CREATE INDEX "PaymentObligation_schoolId_dueDate_idx" ON "PaymentObligation"("schoolId" ASC, "dueDate" ASC);

-- CreateIndex
CREATE INDEX "PaymentObligation_schoolId_status_idx" ON "PaymentObligation"("schoolId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "PaymentTransaction_schoolId_paymentDate_idx" ON "PaymentTransaction"("schoolId" ASC, "paymentDate" ASC);

-- CreateIndex
CREATE INDEX "Student_schoolId_documentId_idx" ON "Student"("schoolId" ASC, "documentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_documentType_documentId_key" ON "Student"("schoolId" ASC, "documentType" ASC, "documentId" ASC);

-- CreateIndex
CREATE INDEX "Student_schoolId_studentCode_idx" ON "Student"("schoolId" ASC, "studentCode" ASC);

-- CreateIndex
CREATE INDEX "User_schoolId_role_idx" ON "User"("schoolId" ASC, "role" ASC);

-- AddForeignKey
ALTER TABLE "AttendanceScheduleConfig" ADD CONSTRAINT "AttendanceScheduleConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_tutorTeacherId_fkey" FOREIGN KEY ("tutorTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetenceConclusion" ADD CONSTRAINT "CompetenceConclusion_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "CurricularCompetence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetenceConclusion" ADD CONSTRAINT "CompetenceConclusion_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetenceConclusion" ADD CONSTRAINT "CompetenceConclusion_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetenceConclusion" ADD CONSTRAINT "CompetenceConclusion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurricularArea" ADD CONSTRAINT "CurricularArea_parentAreaId_fkey" FOREIGN KEY ("parentAreaId") REFERENCES "CurricularArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailedGrade" ADD CONSTRAINT "DetailedGrade_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "CurricularCompetence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailedGrade" ADD CONSTRAINT "DetailedGrade_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailedGrade" ADD CONSTRAINT "DetailedGrade_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "EvaluationCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailedGrade" ADD CONSTRAINT "DetailedGrade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailedGrade" ADD CONSTRAINT "DetailedGrade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCriterion" ADD CONSTRAINT "EvaluationCriterion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_courseContentId_fkey" FOREIGN KEY ("courseContentId") REFERENCES "CourseContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPeriodLock" ADD CONSTRAINT "GradingPeriodLock_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPeriodLock" ADD CONSTRAINT "GradingPeriodLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPeriodLock" ADD CONSTRAINT "GradingPeriodLock_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentIncident" ADD CONSTRAINT "StudentIncident_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentIncident" ADD CONSTRAINT "StudentIncident_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentIncident" ADD CONSTRAINT "StudentIncident_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

