-- CreateTable
CREATE TABLE "StaffYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffYear_schoolId_academicYearId_idx" ON "StaffYear"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffYear_userId_academicYearId_key" ON "StaffYear"("userId", "academicYearId");

-- AddForeignKey
ALTER TABLE "StaffYear" ADD CONSTRAINT "StaffYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffYear" ADD CONSTRAINT "StaffYear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffYear" ADD CONSTRAINT "StaffYear_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Relleno: todo el personal activo queda contratado en el año vigente
INSERT INTO "StaffYear" ("id", "schoolId", "userId", "academicYearId", "createdAt")
SELECT gen_random_uuid()::text, u."schoolId", u."id", ay."id", CURRENT_TIMESTAMP
FROM "User" u
JOIN "AcademicYear" ay ON ay."schoolId" = u."schoolId" AND ay."isActive" = true
WHERE u."isActive" = true AND u."role" IN ('SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER')
ON CONFLICT DO NOTHING;

-- Años anteriores: los docentes que tuvieron carga docente ese año
INSERT INTO "StaffYear" ("id", "schoolId", "userId", "academicYearId", "createdAt")
SELECT DISTINCT ON (ca."teacherId", ca."academicYearId")
       gen_random_uuid()::text, ca."schoolId", ca."teacherId", ca."academicYearId", CURRENT_TIMESTAMP
FROM "CourseAssignment" ca
WHERE ca."deletedAt" IS NULL
ON CONFLICT DO NOTHING;
