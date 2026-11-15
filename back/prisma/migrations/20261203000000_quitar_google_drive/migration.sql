-- Se deja de usar Google Drive: todos los archivos van a Cloudflare R2.
-- Los archivos que había en Drive eran de prueba y se eliminan sus registros.
DELETE FROM "StoredFile" WHERE "storage" = 'GOOGLE_DRIVE';

DROP INDEX IF EXISTS "StoredFile_driveFileId_key";
ALTER TABLE "StoredFile" DROP COLUMN "driveFileId";

-- Postgres no permite quitar un valor de un enum: se recrea el tipo sin GOOGLE_DRIVE
ALTER TYPE "FileStorage" RENAME TO "FileStorage_old";
CREATE TYPE "FileStorage" AS ENUM ('LOCAL', 'R2');
ALTER TABLE "StoredFile" ALTER COLUMN "storage" TYPE "FileStorage" USING ("storage"::text::"FileStorage");
DROP TYPE "FileStorage_old";
