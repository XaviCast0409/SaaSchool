-- Página de ingreso propia de cada colegio: código (slug), fondo y mensaje
ALTER TABLE "School"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "loginBackgroundUrl" TEXT,
  ADD COLUMN "loginTitle" TEXT,
  ADD COLUMN "loginMessage" TEXT;

-- Código inicial de los colegios existentes, derivado del nombre (sin tildes, en minúsculas, con guiones).
-- Los nombres repetidos reciben un sufijo -2, -3...
WITH base AS (
  SELECT
    "id",
    "createdAt",
    NULLIF(
      trim(BOTH '-' FROM left(
        regexp_replace(
          translate(lower("name"), 'áéíóúäëïöüàèìòùâêîôûñç', 'aeiouaeiouaeiouaeiounc'),
          '[^a-z0-9]+', '-', 'g'
        ),
        36
      )),
      ''
    ) AS s
  FROM "School"
),
ranked AS (
  SELECT
    "id",
    CASE WHEN s IS NULL OR length(s) < 3 THEN 'colegio' ELSE s END AS s,
    row_number() OVER (
      PARTITION BY CASE WHEN s IS NULL OR length(s) < 3 THEN 'colegio' ELSE s END
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM base
)
UPDATE "School" AS sc
SET "slug" = CASE WHEN r.rn = 1 THEN r.s ELSE r.s || '-' || r.rn END
FROM ranked AS r
WHERE r."id" = sc."id";

CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
