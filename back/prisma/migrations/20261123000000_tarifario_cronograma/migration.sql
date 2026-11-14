-- AlterTable
ALTER TABLE "PaymentObligation" ADD COLUMN     "period" TEXT;

-- CreateTable
CREATE TABLE "FeeSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "educationLevel" "EducationLevel" NOT NULL,
    "grade" INTEGER,
    "enrollmentFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "admissionFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "firstMonth" INTEGER NOT NULL DEFAULT 3,
    "lastMonth" INTEGER NOT NULL DEFAULT 12,
    "dueDay" INTEGER NOT NULL DEFAULT 31,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeSchedule_schoolId_academicYearId_idx" ON "FeeSchedule"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "PaymentObligation_enrollmentId_concept_period_idx" ON "PaymentObligation"("enrollmentId", "concept", "period");

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Rangos válidos del tarifario
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_months_check" CHECK ("firstMonth" BETWEEN 1 AND 12 AND "lastMonth" BETWEEN 1 AND 12 AND "firstMonth" <= "lastMonth");
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 31);
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_amounts_check" CHECK ("enrollmentFee" >= 0 AND "admissionFee" >= 0 AND "monthlyFee" >= 0);

-- Un tarifario por (año, nivel, grado); grado NULL = todo el nivel
CREATE UNIQUE INDEX "FeeSchedule_year_level_grade_key" ON "FeeSchedule" ("academicYearId", "educationLevel", "grade") WHERE "grade" IS NOT NULL;
CREATE UNIQUE INDEX "FeeSchedule_year_level_all_key" ON "FeeSchedule" ("academicYearId", "educationLevel") WHERE "grade" IS NULL;

-- Rellena el periodo de las pensiones y matrículas existentes (si hay duplicados en un mismo
-- periodo, solo la más antigua recibe la clave; las demás quedan sin periodo).
WITH candidates AS (
  SELECT o."id",
         CASE
           WHEN o."concept" = 'PENSION' THEN to_char(o."dueDate", 'YYYY-MM')
           ELSE 'MATRICULA-' || ay."year"::text
         END AS "period",
         o."enrollmentId",
         o."concept",
         o."createdAt"
  FROM "PaymentObligation" o
  JOIN "Enrollment" e ON e."id" = o."enrollmentId"
  JOIN "AcademicYear" ay ON ay."id" = e."academicYearId"
  WHERE o."status" <> 'CANCELLED' AND o."concept" IN ('PENSION', 'MATRICULA') AND o."period" IS NULL
),
ranked AS (
  SELECT "id", "period",
         row_number() OVER (PARTITION BY "enrollmentId", "concept", "period" ORDER BY "createdAt", "id") AS rn
  FROM candidates
)
UPDATE "PaymentObligation" o SET "period" = r."period"
FROM ranked r
WHERE o."id" = r."id" AND r.rn = 1;

-- Una sola cuota vigente por (matrícula, concepto, periodo)
CREATE UNIQUE INDEX "PaymentObligation_enrollment_concept_period_key"
  ON "PaymentObligation" ("enrollmentId", "concept", "period")
  WHERE "status" <> 'CANCELLED' AND "period" IS NOT NULL;
