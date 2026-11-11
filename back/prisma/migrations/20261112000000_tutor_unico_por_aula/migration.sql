-- Un docente solo puede ser tutor de una aula a la vez
CREATE UNIQUE INDEX "Classroom_tutorTeacherId_unique" ON "Classroom" ("tutorTeacherId") WHERE "tutorTeacherId" IS NOT NULL;
