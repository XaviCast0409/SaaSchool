-- Personal activo que no figura en ningún año (directora creada con el colegio antes de tener año,
-- cuentas creadas por otros caminos o con cambio de rol): queda en el año vigente de su colegio.
-- A quien ya tiene algún año registrado no se le toca.
INSERT INTO "StaffYear" ("id", "schoolId", "userId", "academicYearId", "createdAt")
SELECT gen_random_uuid()::text, u."schoolId", u."id", ay."id", CURRENT_TIMESTAMP
FROM "User" u
JOIN "AcademicYear" ay ON ay."schoolId" = u."schoolId" AND ay."isActive" = true
WHERE u."isActive" = true
  AND u."role" IN ('SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER')
  AND NOT EXISTS (SELECT 1 FROM "StaffYear" sy WHERE sy."userId" = u."id")
ON CONFLICT DO NOTHING;
