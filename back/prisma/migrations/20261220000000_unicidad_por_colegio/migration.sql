-- Correo del usuario y código SIAGIE del alumno: únicos por colegio en vez de en toda la plataforma.
-- Un apoderado con hijos en varios colegios tiene una cuenta en cada uno; un alumno trasladado
-- entre dos colegios de la plataforma conserva su código en ambos.

DROP INDEX "User_email_key";
CREATE UNIQUE INDEX "User_schoolId_email_key" ON "User"("schoolId", "email");
CREATE INDEX "User_email_idx" ON "User"("email");

DROP INDEX "Student_studentCode_key";
CREATE UNIQUE INDEX "Student_schoolId_studentCode_key" ON "Student"("schoolId", "studentCode");
CREATE INDEX "Student_studentCode_idx" ON "Student"("studentCode");
