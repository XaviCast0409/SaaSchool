-- Mensajería: chat interno del personal y archivado por participante
CREATE TYPE "ConversationKind" AS ENUM ('FAMILY', 'STAFF');

ALTER TABLE "Conversation" ADD COLUMN "kind" "ConversationKind" NOT NULL DEFAULT 'FAMILY';
ALTER TABLE "Conversation" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "Conversation" ADD COLUMN "staffPairKey" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "parentArchivedAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN "staffArchivedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Conversation_staffPairKey_key" ON "Conversation"("staffPairKey");
