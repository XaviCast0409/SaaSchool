-- Archivos ligados a un estudiante (justificaciones de inasistencia, constancias, fotos de quien recoge):
-- solo los ven quienes tienen acceso a ese estudiante.
ALTER TABLE "StoredFile" ADD COLUMN "studentId" TEXT;
CREATE INDEX "StoredFile_studentId_idx" ON "StoredFile"("studentId");
