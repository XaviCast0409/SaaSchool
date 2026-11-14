-- CreateEnum
CREATE TYPE "TeacherReplacementKind" AS ENUM ('PERMANENT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "TeacherReplacementStatus" AS ENUM ('ACTIVE', 'ENDED');

-- AlterTable
ALTER TABLE "CourseContent" ADD COLUMN     "originalTeacherId" TEXT;

-- CreateTable
CREATE TABLE "CourseAssignmentTeacher" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "courseAssignmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE,
    "replacementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseAssignmentTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherReplacement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "outgoingTeacherId" TEXT NOT NULL,
    "incomingTeacherId" TEXT NOT NULL,
    "kind" "TeacherReplacementKind" NOT NULL,
    "status" "TeacherReplacementStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveDate" DATE NOT NULL,
    "untilDate" DATE,
    "reason" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherReplacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseAssignmentTeacher_courseAssignmentId_idx" ON "CourseAssignmentTeacher"("courseAssignmentId");

-- CreateIndex
CREATE INDEX "CourseAssignmentTeacher_schoolId_teacherId_idx" ON "CourseAssignmentTeacher"("schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "TeacherReplacement_schoolId_academicYearId_idx" ON "TeacherReplacement"("schoolId", "academicYearId");

-- AddForeignKey
ALTER TABLE "CourseAssignmentTeacher" ADD CONSTRAINT "CourseAssignmentTeacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAssignmentTeacher" ADD CONSTRAINT "CourseAssignmentTeacher_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAssignmentTeacher" ADD CONSTRAINT "CourseAssignmentTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAssignmentTeacher" ADD CONSTRAINT "CourseAssignmentTeacher_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "TeacherReplacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReplacement" ADD CONSTRAINT "TeacherReplacement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReplacement" ADD CONSTRAINT "TeacherReplacement_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReplacement" ADD CONSTRAINT "TeacherReplacement_outgoingTeacherId_fkey" FOREIGN KEY ("outgoingTeacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReplacement" ADD CONSTRAINT "TeacherReplacement_incomingTeacherId_fkey" FOREIGN KEY ("incomingTeacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReplacement" ADD CONSTRAINT "TeacherReplacement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherReplacement" ADD CONSTRAINT "TeacherReplacement_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Historial inicial: el docente actual de cada curso, desde el inicio de su año
INSERT INTO "CourseAssignmentTeacher" ("id", "schoolId", "courseAssignmentId", "teacherId", "fromDate", "createdAt")
SELECT gen_random_uuid()::text, ca."schoolId", ca."id", ca."teacherId", ay."startDate"::date, CURRENT_TIMESTAMP
FROM "CourseAssignment" ca
JOIN "AcademicYear" ay ON ay."id" = ca."academicYearId"
WHERE ca."deletedAt" IS NULL;
