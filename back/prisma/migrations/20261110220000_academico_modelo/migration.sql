-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('OFFICIAL', 'SUBCOURSE', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "PeriodState" AS ENUM ('OPEN', 'REVIEW', 'CLOSED');

-- DropIndex
DROP INDEX "CourseAssignment_classroomId_areaId_key";

-- AlterTable
ALTER TABLE "CourseAssignment" ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CurricularArea" ADD COLUMN     "educationLevel" "EducationLevel",
ADD COLUMN     "kind" "CourseKind" NOT NULL DEFAULT 'OFFICIAL';

-- AlterTable
ALTER TABLE "CurricularCompetence" ADD COLUMN     "cnebNumber" INTEGER,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "StudyPlanCourse" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "educationLevel" "EducationLevel" NOT NULL,
    "grade" INTEGER NOT NULL,
    "areaId" TEXT NOT NULL,
    "weeklyHours" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyPlanCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAssignmentCriterion" (
    "id" TEXT NOT NULL,
    "courseAssignmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,

    CONSTRAINT "CourseAssignmentCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencePeriodResult" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseAssignmentId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "computedScore" DOUBLE PRECISION,
    "suggestedLetter" TEXT,
    "finalLetter" TEXT,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overriddenById" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetencePeriodResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPeriodStatus" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classroomId" TEXT,
    "periodNumber" INTEGER NOT NULL,
    "status" "PeriodState" NOT NULL DEFAULT 'OPEN',
    "gradingDeadline" TIMESTAMP(3),
    "reason" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicPeriodStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyPlanCourse_schoolId_academicYearId_idx" ON "StudyPlanCourse"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanCourse_academicYearId_educationLevel_grade_areaId_key" ON "StudyPlanCourse"("academicYearId", "educationLevel", "grade", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAssignmentCriterion_courseAssignmentId_criterionId_key" ON "CourseAssignmentCriterion"("courseAssignmentId", "criterionId");

-- CreateIndex
CREATE INDEX "CompetencePeriodResult_schoolId_courseAssignmentId_periodNu_idx" ON "CompetencePeriodResult"("schoolId", "courseAssignmentId", "periodNumber");

-- CreateIndex
CREATE INDEX "CompetencePeriodResult_enrollmentId_periodNumber_idx" ON "CompetencePeriodResult"("enrollmentId", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencePeriodResult_enrollmentId_courseAssignmentId_comp_key" ON "CompetencePeriodResult"("enrollmentId", "courseAssignmentId", "competenceId", "periodNumber");

-- CreateIndex
CREATE INDEX "AcademicPeriodStatus_schoolId_academicYearId_idx" ON "AcademicPeriodStatus"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriodStatus_academicYearId_classroomId_periodNumbe_key" ON "AcademicPeriodStatus"("academicYearId", "classroomId", "periodNumber");

-- CreateIndex
CREATE INDEX "CourseAssignment_schoolId_academicYearId_idx" ON "CourseAssignment"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAssignment_academicYearId_classroomId_areaId_key" ON "CourseAssignment"("academicYearId", "classroomId", "areaId");

-- CreateIndex
CREATE INDEX "CurricularArea_schoolId_educationLevel_idx" ON "CurricularArea"("schoolId", "educationLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CurricularCompetence_areaId_cnebNumber_key" ON "CurricularCompetence"("areaId", "cnebNumber");

-- AddForeignKey
ALTER TABLE "CourseAssignment" ADD CONSTRAINT "CourseAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanCourse" ADD CONSTRAINT "StudyPlanCourse_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanCourse" ADD CONSTRAINT "StudyPlanCourse_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanCourse" ADD CONSTRAINT "StudyPlanCourse_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "CurricularArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAssignmentCriterion" ADD CONSTRAINT "CourseAssignmentCriterion_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAssignmentCriterion" ADD CONSTRAINT "CourseAssignmentCriterion_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "EvaluationCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencePeriodResult" ADD CONSTRAINT "CompetencePeriodResult_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencePeriodResult" ADD CONSTRAINT "CompetencePeriodResult_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencePeriodResult" ADD CONSTRAINT "CompetencePeriodResult_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencePeriodResult" ADD CONSTRAINT "CompetencePeriodResult_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "CurricularCompetence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriodStatus" ADD CONSTRAINT "AcademicPeriodStatus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriodStatus" ADD CONSTRAINT "AcademicPeriodStatus_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriodStatus" ADD CONSTRAINT "AcademicPeriodStatus_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriodStatus" ADD CONSTRAINT "AcademicPeriodStatus_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Un solo estado por periodo a nivel de colegio (classroomId NULL)
CREATE UNIQUE INDEX "AcademicPeriodStatus_school_level_unique"
  ON "AcademicPeriodStatus" ("academicYearId", "periodNumber")
  WHERE "classroomId" IS NULL;
