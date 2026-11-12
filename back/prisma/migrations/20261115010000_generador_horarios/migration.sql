-- AlterTable
ALTER TABLE "StudyPlanCourse" ADD COLUMN     "maxHoursPerDay" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "preferDoubleBlock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "preferEarly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TimetableTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "educationLevel" "EducationLevel" NOT NULL,
    "days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "slots" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAvailability" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "unavailable" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimetableTemplate_academicYearId_educationLevel_key" ON "TimetableTemplate"("academicYearId", "educationLevel");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAvailability_academicYearId_teacherId_key" ON "TeacherAvailability"("academicYearId", "teacherId");

-- AddForeignKey
ALTER TABLE "TimetableTemplate" ADD CONSTRAINT "TimetableTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableTemplate" ADD CONSTRAINT "TimetableTemplate_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

