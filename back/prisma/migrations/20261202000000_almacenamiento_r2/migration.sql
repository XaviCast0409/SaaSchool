-- Archivos en Cloudflare R2 (compatible con S3). Los archivos existentes en Drive no cambian.
ALTER TYPE "FileStorage" ADD VALUE 'R2';

ALTER TABLE "StoredFile" ADD COLUMN "objectKey" TEXT;

CREATE UNIQUE INDEX "StoredFile_objectKey_key" ON "StoredFile"("objectKey");
