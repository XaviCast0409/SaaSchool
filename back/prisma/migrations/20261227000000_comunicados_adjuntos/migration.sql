-- Archivos adjuntos de un comunicado (circular en PDF, afiche, formulario): [{ fileId, name, size, type }]
ALTER TABLE "Announcement" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';
