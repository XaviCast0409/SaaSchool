-- DropForeignKey
ALTER TABLE "CourseAssignment" DROP CONSTRAINT "CourseAssignment_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_competenceId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_gradeEntryId_fkey";

-- DropForeignKey
ALTER TABLE "GradeEntry" DROP CONSTRAINT "GradeEntry_courseAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "GradingPeriodLock" DROP CONSTRAINT "GradingPeriodLock_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "GradingPeriodLock" DROP CONSTRAINT "GradingPeriodLock_lockedById_fkey";

-- DropForeignKey
ALTER TABLE "GradingPeriodLock" DROP CONSTRAINT "GradingPeriodLock_schoolId_fkey";

-- AlterTable
ALTER TABLE "CourseAssignment" ALTER COLUMN "academicYearId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CurricularArea" DROP COLUMN "evaluatedCompetenceIds",
ALTER COLUMN "educationLevel" SET NOT NULL;

-- DropTable
DROP TABLE "Grade";

-- DropTable
DROP TABLE "GradeEntry";

-- DropTable
DROP TABLE "GradingPeriodLock";

-- DropEnum
DROP TYPE "AssessmentType";

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_schoolId_educationLevel_grade_section_shift_key" ON "Classroom"("schoolId", "educationLevel", "grade", "section", "shift");

-- AddForeignKey
ALTER TABLE "CourseAssignment" ADD CONSTRAINT "CourseAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un solo año lectivo activo por colegio
CREATE UNIQUE INDEX "AcademicYear_one_active_per_school" ON "AcademicYear" ("schoolId") WHERE "isActive" = true;
