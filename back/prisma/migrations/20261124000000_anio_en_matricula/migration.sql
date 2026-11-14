-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "enrollmentOpen" BOOLEAN NOT NULL DEFAULT false;


-- Solo un año con matrícula abierta por colegio
CREATE UNIQUE INDEX "AcademicYear_one_enrollment_open_per_school" ON "AcademicYear" ("schoolId") WHERE "enrollmentOpen" = true;
