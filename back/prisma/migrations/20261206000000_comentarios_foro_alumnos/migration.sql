-- Los alumnos inician sesión con su registro Student (no User): sus respuestas en foros se guardan en studentId
ALTER TABLE "ForumComment" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ForumComment" ADD COLUMN "studentId" TEXT;
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
