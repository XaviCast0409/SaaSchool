-- Comunicados dirigidos a un nivel o a un grado completo (además de "todo el colegio" o "un aula").
ALTER TABLE "Announcement" ADD COLUMN "targetLevel" "EducationLevel";
ALTER TABLE "Announcement" ADD COLUMN "targetGrade" INTEGER;
