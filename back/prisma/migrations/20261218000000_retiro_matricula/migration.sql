-- Retiro / traslado de alumnos: fecha efectiva (último día que estudió), motivo y colegio de destino.
-- Con la fecha, las notas y la asistencia anteriores al retiro siguen contando (SIAGIE, consolidado).
ALTER TABLE "Enrollment" ADD COLUMN "withdrawalDate" DATE;
ALTER TABLE "Enrollment" ADD COLUMN "withdrawalReason" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN "transferSchool" TEXT;
