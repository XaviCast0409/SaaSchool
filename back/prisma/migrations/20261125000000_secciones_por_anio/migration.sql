-- CreateTable
CREATE TABLE "ClassroomYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "tutorTeacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomYear_schoolId_academicYearId_idx" ON "ClassroomYear"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomYear_classroomId_academicYearId_key" ON "ClassroomYear"("classroomId", "academicYearId");

-- AddForeignKey
ALTER TABLE "ClassroomYear" ADD CONSTRAINT "ClassroomYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomYear" ADD CONSTRAINT "ClassroomYear_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomYear" ADD CONSTRAINT "ClassroomYear_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomYear" ADD CONSTRAINT "ClassroomYear_tutorTeacherId_fkey" FOREIGN KEY ("tutorTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Un docente es tutor de una sola sección por año
CREATE UNIQUE INDEX "ClassroomYear_one_tutor_per_year" ON "ClassroomYear" ("academicYearId", "tutorTeacherId") WHERE "tutorTeacherId" IS NOT NULL;

-- Relleno: en el año vigente están abiertas todas las aulas (con su capacidad y tutor actuales)
INSERT INTO "ClassroomYear" ("id", "schoolId", "classroomId", "academicYearId", "capacity", "tutorTeacherId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."schoolId", c."id", ay."id", c."capacity", c."tutorTeacherId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Classroom" c
JOIN "AcademicYear" ay ON ay."schoolId" = c."schoolId" AND ay."isActive" = true
ON CONFLICT DO NOTHING;

-- Años siguientes al vigente (en preparación): todas las aulas abiertas, sin tutor
INSERT INTO "ClassroomYear" ("id", "schoolId", "classroomId", "academicYearId", "capacity", "tutorTeacherId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."schoolId", c."id", ay."id", c."capacity", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Classroom" c
JOIN "AcademicYear" ay ON ay."schoolId" = c."schoolId" AND ay."isActive" = false
WHERE ay."year" > COALESCE((SELECT a2."year" FROM "AcademicYear" a2 WHERE a2."schoolId" = c."schoolId" AND a2."isActive" = true LIMIT 1), 0)
ON CONFLICT DO NOTHING;

-- Años anteriores: las aulas que tuvieron matrículas (sin tutor: el de entonces no se guardaba)
INSERT INTO "ClassroomYear" ("id", "schoolId", "classroomId", "academicYearId", "capacity", "tutorTeacherId", "createdAt", "updatedAt")
SELECT DISTINCT ON (e."classroomId", e."academicYearId")
       gen_random_uuid()::text, c."schoolId", c."id", e."academicYearId", c."capacity", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Enrollment" e
JOIN "Classroom" c ON c."id" = e."classroomId"
ON CONFLICT DO NOTHING;
