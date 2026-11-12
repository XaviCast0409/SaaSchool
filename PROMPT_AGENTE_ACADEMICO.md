# Prompt para el agente — Rediseño del flujo académico (cursos, competencias, carga docente, notas, reportes y SIAGIE)

> **Cómo usarlo:** copia todo lo que está entre `=== INICIO DEL PROMPT ===` y `=== FIN DEL PROMPT ===` y pégalo a un agente de código con acceso al repositorio `SaaSchool`.
> Base: rama `main` (commit `0328723` o posterior). Diagnóstico de origen: `ANALISIS_ACADEMICO.md`.

=== INICIO DEL PROMPT ===

Eres un agente de desarrollo trabajando en el monorepo **SaaSchool**:
- `back/`: Express 4 + Prisma 5 + PostgreSQL + Zod 3 + vitest;
- `front/`: React 18 + Vite 5 + Tailwind + TanStack Query + zustand + react-router v6 + sonner.

Vas a rediseñar el flujo académico completo. **No investigues alternativas ni rediseñes por tu cuenta:** este documento indica exactamente qué crear, modificar y borrar. Si algo de este documento no coincide con el código (un nombre o una ruta distinta), adapta lo mínimo para que compile y anótalo en `CAMBIOS_ACADEMICO.md`. No cambies el diseño.

## Reglas obligatorias

1. **Rama:**
   ```bash
   git checkout main
   git pull --ff-only
   git checkout -b academico/rediseno
   ```
   Trabaja solo en `academico/rediseno`. **No hagas `git push`.**
2. **Un commit por bloque**, con el mensaje indicado en cada bloque y terminando con la línea:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
3. **Al cerrar cada bloque**, antes del commit, ejecuta:
   - `cd back && npx tsc --noEmit && npx vitest run`;
   - `cd front && npx tsc --noEmit` (y `npx vite build` en los bloques de frontend).

   Si algo falla, corrígelo dentro del mismo bloque.
4. **Base de datos:**
   - Nunca ejecutes `prisma migrate reset`, `prisma db push --force-reset` ni borres datos sin preguntar primero al usuario y esperar un "sí" explícito.
   - Las migraciones se crean con `npx prisma migrate dev --create-only --name <nombre>`, se revisa y edita el SQL y después se aplican con `npx prisma migrate dev`.
5. **Secretos:** no leas ni imprimas el contenido de `.env`. No subas archivos a Google Drive en las pruebas.
6. **Textos de la interfaz** en español neutro peruano, sin palabras de marketing ("Torre de control", "Normativa 2026", "100 %"), en tono directo y breve.
7. **Desarrollo con datos:** el sistema aún no está en producción (piloto pendiente). Los datos actuales son de `prisma/seed.ts` y pruebas manuales. Aun así, los scripts de normalización deben ser idempotentes y tener modo `--dry-run`.
8. **Al final:**
   - escribe `CAMBIOS_ACADEMICO.md` con lo hecho, lo pendiente y cualquier desviación;
   - deja el árbol limpio (`git status` sin cambios);
   - no toques los archivos `CAMBIOS_REALIZADOS.md`, `DEPLOY.md` ni `front/src/lib/brandColor.ts` si solo tienen cambios de salto de línea final.

## Mapa de bloques

| Fase | Bloque | Tema |
|---|---|---|
| A | 0 | Preparación |
| A | 1 | Parches urgentes en el código actual |
| B | 2 | Catálogo CNEB único |
| B | 3 | Esquema: migración `academico_modelo` |
| B | 4 | Motor de cálculo `grade-engine.ts` |
| B | 5 | Script de normalización de datos |
| B | 6 | Backend: plan de estudios |
| B | 7 | Backend: carga docente |
| B | 8 | Backend: periodos |
| B | 9 | Backend: registro de notas y resultados |
| B | 10 | Backend: consolidado, libreta y avance |
| B | 11 | Backend: exportaciones Excel |
| B | 12 | Reconexión de módulos existentes |
| C | 13 | Frontend: componentes base |
| C | 14 | Frontend: tipos y hooks |
| C | 15 | Frontend: Inicio académico y Plan de estudios |
| C | 16 | Frontend: Carga docente |
| C | 17 | Frontend: Mis cursos y Registrar notas |
| C | 18 | Frontend: Avance y cierre de periodos |
| D | 19 | Frontend: libreta, reportes y SIAGIE |
| D | 20 | Navegación y rutas |
| D | 21 | Retiro del código antiguo y migración `academico_restricciones` |
| D | 22 | Seed |
| D | 23 | Pruebas integrales e informe |

---

## BLOQUE 0 — Preparación

1. Crea la rama según la regla 1.
2. Verifica el estado inicial: ejecuta `cd back && npx tsc --noEmit && npx vitest run` y `cd front && npx tsc --noEmit`. Si algo falla **antes** de tocar código, anótalo en `CAMBIOS_ACADEMICO.md` (sección "Estado inicial") y continúa.
3. Instala ExcelJS en el backend:
   ```bash
   cd back
   pnpm add exceljs@4.4.0
   ```
4. Crea `CAMBIOS_ACADEMICO.md` en la raíz con el título `# Cambios — Rediseño académico` y las secciones vacías `## Estado inicial`, `## Bloques`, `## Desviaciones` y `## Pendientes`.

Commit: `chore(academico): bloque 0 - preparacion`

---

## BLOQUE 1 — Parches urgentes en el código actual (Fase A)

Estos parches protegen los datos mientras se construye el sistema nuevo. Los bloques 21 y siguientes retiran este código antiguo.

### 1.1 Quitar a los docentes la edición del currículo

Archivo `back/src/modules/curricular-areas/curricular-area.routes.ts`. En estas cinco rutas, reemplaza `authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')` por `authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN')`:
- `PATCH /competences/:id/toggle`
- `PATCH /competences/:id`
- `DELETE /competences/:id`
- `POST /competences`
- `POST /:id/load-default-competences`

En el frontend, `front/src/features/grades/components/TeacherAdminGradesView.tsx` y `GradesMatrixGrid.tsx`: el botón con el texto "Prender / Apagar Competencias" se muestra solo si `user?.role !== 'TEACHER'` (obtén `user` con `useAuthStore()` si el componente no lo tiene).

### 1.2 No borrar notas al quitar un curso

Archivo `back/src/modules/course-assignments/course-assignment.repository.ts`.

En `delete(assignmentId, schoolId)`, al inicio de la transacción:
```ts
const gradeCount =
  (await tx.detailedGrade.count({ where: { courseAssignmentId: assignmentId } })) +
  (await tx.competenceConclusion.count({ where: { courseAssignmentId: assignmentId } }));
if (gradeCount > 0) {
  throw new AppError(
    'Este curso ya tiene notas registradas. No se puede quitar; cambia el docente en lugar de eliminar la asignación.',
    409,
  );
}
```

En `syncTeacherAssignments`, justo después de calcular `toDeleteIds` y antes de cualquier `deleteMany`:
```ts
if (toDeleteIds.length > 0) {
  const withGrades = await tx.detailedGrade.groupBy({
    by: ['courseAssignmentId'],
    where: { courseAssignmentId: { in: toDeleteIds } },
  });
  const withConclusions = await tx.competenceConclusion.groupBy({
    by: ['courseAssignmentId'],
    where: { courseAssignmentId: { in: toDeleteIds } },
  });
  if (withGrades.length > 0 || withConclusions.length > 0) {
    throw new AppError(
      'Uno o más cursos desmarcados ya tienen notas registradas. No se pueden quitar; asígnalos a otro docente.',
      409,
    );
  }
}
```
Importa `AppError` desde `'../../core/errors/app-error'` si no está importado.

### 1.3 Validar las notas que se guardan en la matriz actual

Archivo `back/src/modules/grades/grade.repository.ts`, método `batchUpsertDetailedGrades`.

1. Cambia el `select` de la asignación a:
   ```ts
   select: {
     classroomId: true,
     classroom: { select: { educationLevel: true } },
     area: {
       select: {
         parentAreaId: true,
         evaluatedCompetenceIds: true,
         competences: { select: { id: true, isActive: true } },
         parentArea: { select: { competences: { select: { id: true, isActive: true } } } },
       },
     },
   },
   ```
2. Después del control de periodo cerrado y de `if (grades.length === 0) return 0;`, agrega:
   ```ts
   const ownIds = assignment.area.competences.filter((c) => c.isActive !== false).map((c) => c.id);
   const parentIds = (assignment.area.parentArea?.competences ?? []).filter((c) => c.isActive !== false).map((c) => c.id);
   const effectiveIds = new Set(
     assignment.area.parentAreaId
       ? (assignment.area.evaluatedCompetenceIds.length > 0
           ? parentIds.filter((id) => assignment.area.evaluatedCompetenceIds.includes(id))
           : parentIds)
       : ownIds,
   );
   if (grades.some((g) => !effectiveIds.has(g.competenceId))) {
     throw new AppError('Hay notas para competencias que no pertenecen a este curso.', 400);
   }
   const criterionIds = [...new Set(grades.map((g) => g.criterionId))];
   const validCriteria = await prisma.evaluationCriterion.count({ where: { id: { in: criterionIds }, schoolId } });
   if (validCriteria !== criterionIds.length) {
     throw new AppError('Hay criterios de evaluación que no pertenecen al colegio.', 400);
   }
   ```
3. En la consulta `activeEnrollments`, agrega `classroomId: assignment.classroomId` al `where`.
4. Reemplaza la conversión fija de número a letra (`if (numericScore >= 17.5) literalScore = 'AD'; …`) por:
   ```ts
   literalScore = scoreToLetter(numericScore, thresholds);
   ```
   Calcula una vez, antes del `$transaction`:
   ```ts
   const thresholds = await this.getLetterThresholds(schoolId, assignment.classroom.educationLevel);
   ```
   Importa `scoreToLetter` desde `'./letter-scale'` si no está importado.

### 1.4 El consolidado deja de asignar competencias desconocidas a la C1

Archivo `back/src/modules/grades/siagie-consolidator.service.ts`, método `mapToOfficialCompetence`:
- reemplaza la última línea `return mother.competences[0] || null;` por `return null;`;
- en el bloque `if (mother.code === 'CYT')`, elimina la línea final `return mother.competences[0];`.

Ejecuta las verificaciones y luego haz el commit.

Commit: `fix(academico): bloque 1 - parches urgentes de permisos, borrado y validacion de notas`

---

## BLOQUE 2 — Catálogo CNEB único

Crea la carpeta `back/src/modules/academic/` y en ella el archivo `cneb.catalog.ts` con **exactamente** este contenido:

```ts
/**
 * Catálogo único del Currículo Nacional de la Educación Básica (CNEB) para EBR.
 * Es la ÚNICA fuente de verdad de áreas y competencias oficiales en todo el sistema.
 * La numeración de competencias es la oficial del CNEB (1 a 31).
 *
 * VALIDAR cada año contra la plantilla de registro del SIAGIE: el orden de las competencias
 * dentro de cada área es el orden de las columnas de la plantilla.
 */
export type EducationLevel = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

export const CNEB_COMPETENCES: Record<number, { name: string; shortName: string }> = {
  1: { name: 'Construye su identidad', shortName: 'Identidad' },
  2: { name: 'Se desenvuelve de manera autónoma a través de su motricidad', shortName: 'Motricidad' },
  3: { name: 'Asume una vida saludable', shortName: 'Vida saludable' },
  4: { name: 'Interactúa a través de sus habilidades sociomotrices', shortName: 'Sociomotricidad' },
  5: { name: 'Aprecia de manera crítica manifestaciones artístico-culturales', shortName: 'Aprecia' },
  6: { name: 'Crea proyectos desde los lenguajes artísticos', shortName: 'Crea proyectos' },
  7: { name: 'Se comunica oralmente en su lengua materna', shortName: 'Oralidad' },
  8: { name: 'Lee diversos tipos de textos escritos en su lengua materna', shortName: 'Lectura' },
  9: { name: 'Escribe diversos tipos de textos en su lengua materna', shortName: 'Escritura' },
  10: { name: 'Se comunica oralmente en castellano como segunda lengua', shortName: 'Oralidad L2' },
  11: { name: 'Lee diversos tipos de textos escritos en castellano como segunda lengua', shortName: 'Lectura L2' },
  12: { name: 'Escribe diversos tipos de textos en castellano como segunda lengua', shortName: 'Escritura L2' },
  13: { name: 'Se comunica oralmente en inglés como lengua extranjera', shortName: 'Speaking' },
  14: { name: 'Lee diversos tipos de textos escritos en inglés como lengua extranjera', shortName: 'Reading' },
  15: { name: 'Escribe diversos tipos de textos en inglés como lengua extranjera', shortName: 'Writing' },
  16: { name: 'Convive y participa democráticamente en la búsqueda del bien común', shortName: 'Convivencia' },
  17: { name: 'Construye interpretaciones históricas', shortName: 'Historia' },
  18: { name: 'Gestiona responsablemente el espacio y el ambiente', shortName: 'Espacio y ambiente' },
  19: { name: 'Gestiona responsablemente los recursos económicos', shortName: 'Recursos económicos' },
  20: { name: 'Indaga mediante métodos científicos para construir sus conocimientos', shortName: 'Indaga' },
  21: {
    name: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo',
    shortName: 'Explica el mundo físico',
  },
  22: { name: 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', shortName: 'Soluciones tecnológicas' },
  23: { name: 'Resuelve problemas de cantidad', shortName: 'Cantidad' },
  24: { name: 'Resuelve problemas de regularidad, equivalencia y cambio', shortName: 'Regularidad y cambio' },
  25: { name: 'Resuelve problemas de forma, movimiento y localización', shortName: 'Forma y movimiento' },
  26: { name: 'Resuelve problemas de gestión de datos e incertidumbre', shortName: 'Datos e incertidumbre' },
  27: { name: 'Gestiona proyectos de emprendimiento económico o social', shortName: 'Emprendimiento' },
  28: { name: 'Se desenvuelve en entornos virtuales generados por las TIC', shortName: 'Entornos virtuales (TIC)' },
  29: { name: 'Gestiona su aprendizaje de manera autónoma', shortName: 'Aprendizaje autónomo' },
  30: {
    name: 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas',
    shortName: 'Identidad religiosa',
  },
  31: {
    name: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa',
    shortName: 'Encuentro con Dios',
  },
};

export interface CnebArea {
  code: string;            // Código interno estable del área (no cambiar)
  name: string;
  competences: number[];   // Números CNEB en el orden de la plantilla SIAGIE
  optional?: boolean;      // No se incluye por defecto al aplicar la plantilla
  isTransversal?: boolean; // Competencias transversales: las registra el tutor o tutora
}

export const CNEB_AREAS: Record<EducationLevel, CnebArea[]> = {
  INITIAL: [
    { code: 'PS', name: 'Personal Social', competences: [1, 16, 30] },
    { code: 'PSI', name: 'Psicomotriz', competences: [2] },
    { code: 'COM', name: 'Comunicación', competences: [7, 8, 9, 6] },
    { code: 'C2L', name: 'Castellano como segunda lengua', competences: [10], optional: true },
    { code: 'MAT', name: 'Matemática', competences: [23, 25] },
    { code: 'CYT', name: 'Ciencia y Tecnología', competences: [20] },
    { code: 'TRANS', name: 'Competencias transversales', competences: [28, 29], isTransversal: true },
  ],
  PRIMARY: [
    { code: 'PS', name: 'Personal Social', competences: [1, 16, 17, 18, 19] },
    { code: 'EF', name: 'Educación Física', competences: [2, 3, 4] },
    { code: 'COM', name: 'Comunicación', competences: [7, 8, 9] },
    { code: 'ART', name: 'Arte y Cultura', competences: [5, 6] },
    { code: 'C2L', name: 'Castellano como segunda lengua', competences: [10, 11, 12], optional: true },
    { code: 'ING', name: 'Inglés como lengua extranjera', competences: [13, 14, 15], optional: true },
    { code: 'MAT', name: 'Matemática', competences: [23, 24, 25, 26] },
    { code: 'CYT', name: 'Ciencia y Tecnología', competences: [20, 21, 22] },
    { code: 'REL', name: 'Educación Religiosa', competences: [30, 31] },
    { code: 'TRANS', name: 'Competencias transversales', competences: [28, 29], isTransversal: true },
  ],
  SECONDARY: [
    { code: 'DPCC', name: 'Desarrollo Personal, Ciudadanía y Cívica', competences: [1, 16] },
    { code: 'CCSS', name: 'Ciencias Sociales', competences: [17, 18, 19] },
    { code: 'EF', name: 'Educación Física', competences: [2, 3, 4] },
    { code: 'ART', name: 'Arte y Cultura', competences: [5, 6] },
    { code: 'COM', name: 'Comunicación', competences: [7, 8, 9] },
    { code: 'C2L', name: 'Castellano como segunda lengua', competences: [10, 11, 12], optional: true },
    { code: 'ING', name: 'Inglés como lengua extranjera', competences: [13, 14, 15] },
    { code: 'MAT', name: 'Matemática', competences: [23, 24, 25, 26] },
    { code: 'CYT', name: 'Ciencia y Tecnología', competences: [20, 21, 22] },
    { code: 'EPT', name: 'Educación para el Trabajo', competences: [27] },
    { code: 'REL', name: 'Educación Religiosa', competences: [30, 31] },
    { code: 'TRANS', name: 'Competencias transversales', competences: [28, 29], isTransversal: true },
  ],
};

export const LEVEL_GRADES: Record<EducationLevel, number[]> = {
  INITIAL: [3, 4, 5],
  PRIMARY: [1, 2, 3, 4, 5, 6],
  SECONDARY: [1, 2, 3, 4, 5],
};

export const LEVEL_LABEL: Record<EducationLevel, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export function gradeLabel(level: EducationLevel, grade: number): string {
  return level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL_LABEL[level]}`;
}

export function getOfficialArea(level: EducationLevel, code: string): CnebArea | undefined {
  return CNEB_AREAS[level].find((a) => a.code === code.toUpperCase());
}

export function competenceName(cnebNumber: number): string {
  return CNEB_COMPETENCES[cnebNumber]?.name ?? `Competencia ${cnebNumber}`;
}

export function isValidGrade(level: EducationLevel, grade: number): boolean {
  return LEVEL_GRADES[level].includes(grade);
}

/** Normaliza texto para comparaciones (solo para migración de datos antiguos). */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * SOLO PARA MIGRAR DATOS ANTIGUOS (scripts/academic-normalize.ts). Ningún flujo en tiempo de
 * ejecución puede usar esta función: el vínculo oficial es CurricularCompetence.cnebNumber.
 */
export function matchCnebNumberByName(name: string): number | null {
  const n = normalizeText(name);
  const has = (s: string) => n.includes(s);
  if (has('amada por dios')) return 30;
  if (has('encuentro personal')) return 31;
  if (has('entornos virtuales')) return 28;
  if (has('gestiona su aprendizaje')) return 29;
  if (has('ingles')) {
    if (has('oralmente')) return 13;
    if (has('lee')) return 14;
    if (has('escribe')) return 15;
  }
  if (has('segunda lengua')) {
    if (has('oralmente')) return 10;
    if (has('lee')) return 11;
    if (has('escribe')) return 12;
  }
  if (has('construye su identidad')) return 1;
  if (has('motricidad')) return 2;
  if (has('vida saludable')) return 3;
  if (has('sociomotri')) return 4;
  if (has('aprecia de manera critica')) return 5;
  if (has('crea proyectos')) return 6;
  if (has('se comunica oralmente')) return 7;
  if (has('lee diversos tipos de textos')) return 8;
  if (has('escribe diversos tipos de textos')) return 9;
  if (has('convive y participa')) return 16;
  if (has('interpretaciones historicas')) return 17;
  if (has('espacio y el ambiente')) return 18;
  if (has('recursos economicos')) return 19;
  if (has('indaga')) return 20;
  if (has('explica el mundo fisico')) return 21;
  if (has('disena y construye soluciones')) return 22;
  if (has('problemas de cantidad')) return 23;
  if (has('regularidad')) return 24;
  if (has('forma movimiento')) return 25;
  if (has('gestion de datos')) return 26;
  if (has('emprendimiento')) return 27;
  return null;
}

/** SOLO PARA MIGRACIÓN: deduce el código de área oficial a partir de códigos antiguos. */
export function legacyAreaCode(officialCode?: string | null, officialAreaCode?: string | null, name?: string | null): string | null {
  const candidates = [officialAreaCode, officialCode].filter(Boolean).map((c) => String(c).toUpperCase());
  const map: Array<[RegExp, string]> = [
    [/^TRANS|TRANS-/, 'TRANS'],
    [/^DPCC/, 'DPCC'],
    [/^CCSS/, 'CCSS'],
    [/^(PSI|INI-PSI)/, 'PSI'],
    [/^(PS|INI-PS|PRI-PS)\b|^PS-/, 'PS'],
    [/^(EF|PRI-EF)\b|^EF-/, 'EF'],
    [/^(ART|AYC|PRI-AYC)\b|^(ART|AYC)-/, 'ART'],
    [/^(ING|PRI-ING)\b|^ING-/, 'ING'],
    [/^(REL|ER|PRI-ER)\b|^(REL|ER)-/, 'REL'],
    [/^EPT$|^EPT-(EMP|SEC)$/, 'EPT'],
    [/^(MAT|PRI-MAT)\b|^MAT-/, 'MAT'],
    [/^(CYT|CT|PRI-CYT|INI-CT)\b|^(CYT|CT)-/, 'CYT'],
    [/^(COM|PRI-COM|INI-COM)\b|^COM-/, 'COM'],
  ];
  for (const code of candidates) {
    for (const [re, value] of map) if (re.test(code)) return value;
  }
  const n = normalizeText(name ?? '');
  if (n.includes('transversal')) return 'TRANS';
  if (n.startsWith('matematica')) return 'MAT';
  if (n.startsWith('comunicacion')) return 'COM';
  if (n.startsWith('ciencia y tecnologia')) return 'CYT';
  if (n.startsWith('personal social')) return 'PS';
  if (n.startsWith('psicomotri')) return 'PSI';
  if (n.startsWith('educacion fisica')) return 'EF';
  if (n.startsWith('arte')) return 'ART';
  if (n.startsWith('ingles')) return 'ING';
  if (n.startsWith('educacion religiosa')) return 'REL';
  if (n.startsWith('desarrollo personal')) return 'DPCC';
  if (n.startsWith('ciencias sociales')) return 'CCSS';
  if (n.startsWith('educacion para el trabajo')) return 'EPT';
  return null;
}
```

> Nota: `EPT-COM` (Computación) **no** se mapea a EPT con el regex anterior; se trata como taller en el bloque 5, salvo que la Dirección decida lo contrario.

Crea `back/src/modules/academic/__tests__/cneb.catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CNEB_AREAS, CNEB_COMPETENCES, matchCnebNumberByName, legacyAreaCode, getOfficialArea } from '../cneb.catalog';

describe('Catálogo CNEB', () => {
  it('tiene las 31 competencias numeradas', () => {
    expect(Object.keys(CNEB_COMPETENCES)).toHaveLength(31);
  });

  it('cada área referencia competencias existentes y no repite competencias en el mismo nivel', () => {
    for (const level of ['INITIAL', 'PRIMARY', 'SECONDARY'] as const) {
      const seen = new Set<number>();
      for (const area of CNEB_AREAS[level]) {
        for (const n of area.competences) {
          expect(CNEB_COMPETENCES[n]).toBeDefined();
          expect(seen.has(n)).toBe(false);
          seen.add(n);
        }
      }
    }
  });

  it('Inicial: Matemática tiene cantidad y forma; Comunicación incluye Crea proyectos', () => {
    expect(getOfficialArea('INITIAL', 'MAT')?.competences).toEqual([23, 25]);
    expect(getOfficialArea('INITIAL', 'COM')?.competences).toContain(6);
  });

  it('empareja nombres antiguos con el número CNEB', () => {
    expect(matchCnebNumberByName('Lee diversos tipos de textos escritos')).toBe(8);
    expect(matchCnebNumberByName('Construye su identidad, como persona humana, amada por Dios')).toBe(30);
    expect(matchCnebNumberByName('Construye su identidad')).toBe(1);
    expect(matchCnebNumberByName('Lee diversos tipos de textos escritos en inglés')).toBe(14);
    expect(matchCnebNumberByName('Resuelve problemas de forma, movimiento y localización')).toBe(25);
    expect(matchCnebNumberByName('Aplica habilidades técnicas en computación')).toBeNull();
  });

  it('deduce el área oficial de códigos antiguos sin confundir EPT-COM con Comunicación', () => {
    expect(legacyAreaCode('EPT-COM')).toBeNull();
    expect(legacyAreaCode('AYC-SEC')).toBe('ART');
    expect(legacyAreaCode('ER-SEC')).toBe('REL');
    expect(legacyAreaCode('MAT-ALG')).toBe('MAT');
    expect(legacyAreaCode('PS-INI')).toBe('PS');
    expect(legacyAreaCode('PSI-INI')).toBe('PSI');
    expect(legacyAreaCode(null, null, 'Ciencias Sociales (Secundaria)')).toBe('CCSS');
  });
});
```

Si algún caso de `legacyAreaCode` falla, ajusta **solo** las expresiones regulares hasta que todas las pruebas pasen.

Commit: `feat(academico): bloque 2 - catalogo CNEB unico`

---

## BLOQUE 3 — Esquema: migración `academico_modelo`

Archivo `back/prisma/schema.prisma`. Haz **exactamente** estos cambios.

### 3.1 Enums nuevos (junto a los demás enums)

```prisma
enum CourseKind {
  OFFICIAL   // Área oficial CNEB completa
  SUBCOURSE  // Curso interno que tributa a un área oficial (Álgebra -> Matemática)
  WORKSHOP   // Taller propio: no va al SIAGIE
}

enum PeriodState {
  OPEN
  REVIEW
  CLOSED
}
```

### 3.2 `CurricularArea`

Agrega estos campos (los existentes se mantienen; `evaluatedCompetenceIds` se elimina en el bloque 21):
```prisma
  educationLevel   EducationLevel?
  kind             CourseKind      @default(OFFICIAL)
  studyPlanCourses StudyPlanCourse[]

  @@index([schoolId, educationLevel])
```

### 3.3 `CurricularCompetence`

```prisma
  cnebNumber     Int?     // Número oficial CNEB (1..31). Null solo en talleres.
  weight         Float    @default(1) // Peso al combinar sub-cursos en el área oficial
  periodResults  CompetencePeriodResult[]

  @@unique([areaId, cnebNumber])
```

### 3.4 `CourseAssignment`

Reemplaza el modelo completo por:
```prisma
model CourseAssignment {
  id             String    @id @default(uuid())
  schoolId       String
  academicYearId String?   // Requerido en la migración academico_restricciones (bloque 21)
  classroomId    String
  areaId         String
  teacherId      String
  deletedAt      DateTime? // Borrado lógico: nunca se borra una asignación con notas
  createdAt      DateTime  @default(now())

  school         School         @relation(fields: [schoolId], references: [id])
  academicYear   AcademicYear?  @relation(fields: [academicYearId], references: [id])
  classroom      Classroom      @relation(fields: [classroomId], references: [id])
  area           CurricularArea @relation(fields: [areaId], references: [id])
  teacher        User           @relation(fields: [teacherId], references: [id])

  gradeEntries             GradeEntry[]
  detailedGrades           DetailedGrade[]
  competenceConclusions    CompetenceConclusion[]
  contents                 CourseContent[]
  courseAttendanceSessions CourseAttendanceSession[]
  criteria                 CourseAssignmentCriterion[]
  periodResults            CompetencePeriodResult[]

  @@unique([academicYearId, classroomId, areaId])
  @@index([schoolId, teacherId])
  @@index([schoolId, academicYearId])
}
```

### 3.5 Modelos nuevos (al final de la sección de calificaciones)

```prisma
model StudyPlanCourse {
  id             String         @id @default(uuid())
  schoolId       String
  academicYearId String
  educationLevel EducationLevel
  grade          Int
  areaId         String
  weeklyHours    Int?
  order          Int            @default(0)
  createdAt      DateTime       @default(now())

  school         School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  academicYear   AcademicYear   @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  area           CurricularArea @relation(fields: [areaId], references: [id])

  @@unique([academicYearId, educationLevel, grade, areaId])
  @@index([schoolId, academicYearId])
}

model CourseAssignmentCriterion {
  id                 String              @id @default(uuid())
  courseAssignmentId String
  criterionId        String
  weight             Float?              // Si es null se usa el peso del criterio

  assignment         CourseAssignment    @relation(fields: [courseAssignmentId], references: [id], onDelete: Cascade)
  criterion          EvaluationCriterion @relation(fields: [criterionId], references: [id], onDelete: Cascade)

  @@unique([courseAssignmentId, criterionId])
}

model CompetencePeriodResult {
  id                 String               @id @default(uuid())
  schoolId           String
  enrollmentId       String
  courseAssignmentId String
  competenceId       String
  periodNumber       Int
  computedScore      Float?               // Promedio ponderado de criterios (0-20)
  suggestedLetter    String?              // AD | A | B | C | EXO
  finalLetter        String?              // Lo que se publica (nota de juicio del docente)
  isOverridden       Boolean              @default(false)
  overriddenById     String?
  overriddenAt       DateTime?
  updatedAt          DateTime             @updatedAt

  school             School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  enrollment         Enrollment           @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  assignment         CourseAssignment     @relation(fields: [courseAssignmentId], references: [id], onDelete: Cascade)
  competence         CurricularCompetence @relation(fields: [competenceId], references: [id], onDelete: Cascade)

  @@unique([enrollmentId, courseAssignmentId, competenceId, periodNumber])
  @@index([schoolId, courseAssignmentId, periodNumber])
  @@index([enrollmentId, periodNumber])
}

model AcademicPeriodStatus {
  id              String       @id @default(uuid())
  schoolId        String
  academicYearId  String
  classroomId     String?      // null = todo el colegio
  periodNumber    Int
  status          PeriodState  @default(OPEN)
  gradingDeadline DateTime?
  reason          String?
  changedById     String?
  changedAt       DateTime     @default(now())

  school          School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  classroom       Classroom?   @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  changedBy       User?        @relation("PeriodStatusChangedBy", fields: [changedById], references: [id])

  @@unique([academicYearId, classroomId, periodNumber])
  @@index([schoolId, academicYearId])
}
```

### 3.6 Relaciones inversas obligatorias

- `School`: `studyPlanCourses StudyPlanCourse[]`, `competencePeriodResults CompetencePeriodResult[]`, `academicPeriodStatuses AcademicPeriodStatus[]`.
- `AcademicYear`: `studyPlanCourses StudyPlanCourse[]`, `courseAssignments CourseAssignment[]`, `periodStatuses AcademicPeriodStatus[]`.
- `Classroom`: `periodStatuses AcademicPeriodStatus[]`.
- `Enrollment`: `competencePeriodResults CompetencePeriodResult[]`.
- `EvaluationCriterion`: `assignmentLinks CourseAssignmentCriterion[]`.
- `User`: `periodStatusChanges AcademicPeriodStatus[] @relation("PeriodStatusChangedBy")`.

### 3.7 Crear y aplicar la migración

```bash
cd back
npx prisma migrate dev --create-only --name academico_modelo
```

Abre el `migration.sql` generado y agrega **al final**:
```sql
-- Un solo estado por periodo a nivel de colegio (classroomId NULL)
CREATE UNIQUE INDEX "AcademicPeriodStatus_school_level_unique"
  ON "AcademicPeriodStatus" ("academicYearId", "periodNumber")
  WHERE "classroomId" IS NULL;
```

Aplica con `npx prisma migrate dev` y después `npx prisma generate`.

### 3.8 Arreglar la compilación por el cambio de clave única

El índice `classroomId_areaId` ya no existe. Corrige sus dos usos:

1. `back/src/modules/classrooms/classroom.service.ts`: **elimina** el método `syncTransversalAssignment` y sus dos llamadas. El bloque 7 lo reemplaza.
2. `back/src/modules/course-assignments/course-assignment.repository.ts`, en `syncTeacherAssignments`: reemplaza el `upsert` del paso 2 por:
   ```ts
   const activeYear = await tx.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });
   for (const item of desiredAssignments) {
     const existing = await tx.courseAssignment.findFirst({
       where: { schoolId, classroomId: item.classroomId, areaId: item.areaId, academicYearId: activeYear?.id ?? null },
     });
     if (existing) {
       await tx.courseAssignment.update({ where: { id: existing.id }, data: { teacherId, deletedAt: null } });
     } else {
       await tx.courseAssignment.create({
         data: { schoolId, classroomId: item.classroomId, areaId: item.areaId, teacherId, academicYearId: activeYear?.id ?? null },
       });
     }
   }
   ```
3. En `create` y `bulkCreate` del mismo repositorio, agrega `academicYearId` del año activo (`findFirst({ where: { schoolId, isActive: true } })`).

Commit: `feat(academico): bloque 3 - esquema de plan de estudios, resultados y periodos`

---

## BLOQUE 4 — Motor de cálculo `grade-engine.ts`

Crea `back/src/modules/academic/grade-engine.ts`:

```ts
import { scoreToLetter, type LetterScaleThresholds } from '../grades/letter-scale';

export type Letter = 'AD' | 'A' | 'B' | 'C';
export type ResultLetter = Letter | 'EXO';
export type AnnualMode = 'LAST_PERIOD' | 'AVERAGE';

/** Valor numérico de cada nivel de logro al combinar calificativos literales. Único en todo el sistema. */
export const LETTER_NUMERIC_VALUE: Record<Letter, number> = { AD: 19, A: 15, B: 12, C: 8 };

/** Máximo de caracteres de la conclusión descriptiva. VALIDAR con la plantilla SIAGIE vigente. */
export const CONCLUSION_MAX_LENGTH = 300;

export const LETTERS_REQUIRING_CONCLUSION: Letter[] = ['B', 'C'];

export const isLetter = (value: unknown): value is Letter =>
  value === 'AD' || value === 'A' || value === 'B' || value === 'C';

export const isResultLetter = (value: unknown): value is ResultLetter => isLetter(value) || value === 'EXO';

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface CriterionScoreInput {
  weight: number;
  numericScore: number | null;
  literalScore: string | null;
  isExonerated: boolean;
}

/** Calificativo sugerido de una competencia en un periodo a partir de sus criterios. */
export function computeCompetencePeriod(
  scores: CriterionScoreInput[],
  thresholds: LetterScaleThresholds,
): { computedScore: number | null; suggestedLetter: ResultLetter | null } {
  if (scores.some((s) => s.isExonerated || s.literalScore === 'EXO')) {
    return { computedScore: null, suggestedLetter: 'EXO' };
  }
  const values = scores
    .map((s) => ({
      value: s.numericScore ?? (isLetter(s.literalScore) ? LETTER_NUMERIC_VALUE[s.literalScore] : null),
      weight: s.weight > 0 ? s.weight : 1,
    }))
    .filter((v): v is { value: number; weight: number } => v.value !== null && !Number.isNaN(v.value));
  if (values.length === 0) return { computedScore: null, suggestedLetter: null };
  const totalWeight = values.reduce((acc, v) => acc + v.weight, 0);
  const score = round1(values.reduce((acc, v) => acc + v.value * v.weight, 0) / totalWeight);
  return { computedScore: score, suggestedLetter: scoreToLetter(score, thresholds) };
}

/** La nota de juicio del docente prevalece sobre la sugerida. */
export function resolveFinalLetter(
  suggested: ResultLetter | null,
  override: ResultLetter | null | undefined,
): ResultLetter | null {
  return override ?? suggested;
}

export interface ConsolidationPart {
  finalLetter: ResultLetter | null;
  computedScore: number | null;
  isOverridden: boolean;
  weight: number;
}

/**
 * Combina los resultados de los cursos que tributan a UNA competencia oficial.
 * - Un solo curso: se usa su calificativo final tal cual.
 * - Varios cursos: promedio ponderado (puntaje calculado si no hubo ajuste; valor del nivel si hubo ajuste).
 */
export function consolidateOfficialCompetence(
  parts: ConsolidationPart[],
  thresholds: LetterScaleThresholds,
): { letter: ResultLetter | null; score: number | null } {
  const withLetter = parts.filter((p) => p.finalLetter !== null);
  if (withLetter.length === 0) return { letter: null, score: null };
  const graded = withLetter.filter((p) => p.finalLetter !== 'EXO');
  if (graded.length === 0) return { letter: 'EXO', score: null };
  if (graded.length === 1) {
    const only = graded[0];
    return { letter: only.finalLetter, score: only.computedScore };
  }
  const values = graded.map((p) => ({
    value: !p.isOverridden && p.computedScore !== null ? p.computedScore : LETTER_NUMERIC_VALUE[p.finalLetter as Letter],
    weight: p.weight > 0 ? p.weight : 1,
  }));
  const totalWeight = values.reduce((acc, v) => acc + v.weight, 0);
  const score = round1(values.reduce((acc, v) => acc + v.value * v.weight, 0) / totalWeight);
  return { letter: scoreToLetter(score, thresholds), score };
}

/** Calificativo anual de una competencia a partir de los calificativos de cada periodo (en orden). */
export function computeAnnual(
  periodLetters: Array<ResultLetter | null>,
  mode: AnnualMode,
  thresholds: LetterScaleThresholds,
): ResultLetter | null {
  const present = periodLetters.filter((l): l is ResultLetter => l !== null);
  if (present.length === 0) return null;
  if (mode === 'LAST_PERIOD') return present[present.length - 1];
  const graded = present.filter(isLetter);
  if (graded.length === 0) return 'EXO';
  const avg = graded.reduce((acc, l) => acc + LETTER_NUMERIC_VALUE[l], 0) / graded.length;
  return scoreToLetter(round1(avg), thresholds);
}

/** Limpia una conclusión descriptiva para el SIAGIE: una línea, sin espacios dobles, recortada. */
export function sanitizeConclusion(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, CONCLUSION_MAX_LENGTH);
}

export function needsConclusion(letter: ResultLetter | null): boolean {
  return isLetter(letter) && LETTERS_REQUIRING_CONCLUSION.includes(letter);
}
```

Crea `back/src/modules/academic/__tests__/grade-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  computeCompetencePeriod, consolidateOfficialCompetence, computeAnnual, resolveFinalLetter,
  sanitizeConclusion, needsConclusion, CONCLUSION_MAX_LENGTH,
} from '../grade-engine';

const T = { AD: 17.5, A: 13.5, B: 10.5 };

describe('computeCompetencePeriod', () => {
  it('promedia con pesos y convierte con la escala del colegio', () => {
    const r = computeCompetencePeriod(
      [
        { weight: 1, numericScore: 16, literalScore: null, isExonerated: false },
        { weight: 3, numericScore: 18, literalScore: null, isExonerated: false },
      ],
      T,
    );
    expect(r.computedScore).toBe(17.5);
    expect(r.suggestedLetter).toBe('AD');
  });
  it('respeta una escala distinta', () => {
    const r = computeCompetencePeriod([{ weight: 1, numericScore: 17.5, literalScore: null, isExonerated: false }], { AD: 18, A: 14, B: 11 });
    expect(r.suggestedLetter).toBe('A');
  });
  it('usa el valor del nivel cuando el criterio se registró en letras', () => {
    const r = computeCompetencePeriod([{ weight: 1, numericScore: null, literalScore: 'B', isExonerated: false }], T);
    expect(r.computedScore).toBe(12);
    expect(r.suggestedLetter).toBe('B');
  });
  it('exonerado gana', () => {
    expect(computeCompetencePeriod([{ weight: 1, numericScore: 10, literalScore: 'EXO', isExonerated: true }], T).suggestedLetter).toBe('EXO');
  });
  it('sin notas devuelve null', () => {
    expect(computeCompetencePeriod([], T)).toEqual({ computedScore: null, suggestedLetter: null });
  });
});

describe('resolveFinalLetter', () => {
  it('el ajuste del docente prevalece', () => {
    expect(resolveFinalLetter('B', 'A')).toBe('A');
    expect(resolveFinalLetter('B', null)).toBe('B');
  });
});

describe('consolidateOfficialCompetence', () => {
  it('un solo curso conserva su calificativo final', () => {
    expect(consolidateOfficialCompetence([{ finalLetter: 'A', computedScore: 17.4, isOverridden: false, weight: 1 }], T).letter).toBe('A');
  });
  it('varios cursos: promedio ponderado de puntajes', () => {
    const r = consolidateOfficialCompetence(
      [
        { finalLetter: 'A', computedScore: 17.4, isOverridden: false, weight: 1 },
        { finalLetter: 'AD', computedScore: 17.6, isOverridden: false, weight: 1 },
      ],
      T,
    );
    expect(r.score).toBe(17.5);
    expect(r.letter).toBe('AD');
  });
  it('si un curso fue ajustado se usa el valor del nivel', () => {
    const r = consolidateOfficialCompetence(
      [
        { finalLetter: 'C', computedScore: 12, isOverridden: true, weight: 1 },
        { finalLetter: 'B', computedScore: 12, isOverridden: false, weight: 1 },
      ],
      T,
    );
    expect(r.score).toBe(10);
    expect(r.letter).toBe('C');
  });
  it('todos exonerados', () => {
    expect(consolidateOfficialCompetence([{ finalLetter: 'EXO', computedScore: null, isOverridden: false, weight: 1 }], T).letter).toBe('EXO');
  });
});

describe('computeAnnual', () => {
  it('LAST_PERIOD toma el último periodo con calificativo', () => {
    expect(computeAnnual(['C', 'B', 'A', null], 'LAST_PERIOD', T)).toBe('A');
  });
  it('AVERAGE promedia los valores de los niveles', () => {
    expect(computeAnnual(['C', 'A', 'A', 'AD'], 'AVERAGE', T)).toBe('A');
  });
});

describe('conclusiones', () => {
  it('limpia y recorta', () => {
    expect(sanitizeConclusion('  Hola\n\nmundo  ')).toBe('Hola mundo');
    expect(sanitizeConclusion('x'.repeat(400))).toHaveLength(CONCLUSION_MAX_LENGTH);
  });
  it('B y C exigen conclusión', () => {
    expect(needsConclusion('B')).toBe(true);
    expect(needsConclusion('C')).toBe(true);
    expect(needsConclusion('A')).toBe(false);
    expect(needsConclusion('EXO')).toBe(false);
  });
});
```

Commit: `feat(academico): bloque 4 - motor de calculo unico con pruebas`

---
## BLOQUE 5 — Script de normalización de datos

Crea `back/scripts/academic-normalize.ts` con **exactamente** este contenido:

```ts
/**
 * Normaliza los datos académicos existentes al modelo nuevo:
 * año activo único, nivel y tipo de cada curso, número CNEB de cada competencia, sub-cursos con
 * competencias propias, año en la carga docente, plan de estudios, estados de periodo.
 *
 * Uso:
 *   npx ts-node --transpile-only scripts/academic-normalize.ts           (simulación, no guarda nada)
 *   npx ts-node --transpile-only scripts/academic-normalize.ts --apply   (aplica los cambios)
 */
import { PrismaClient, Prisma, type EducationLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  CNEB_AREAS, competenceName, getOfficialArea, isValidGrade, legacyAreaCode, matchCnebNumberByName,
} from '../src/modules/academic/cneb.catalog';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const lines: string[] = [];
const blocking: string[] = [];
const log = (msg: string) => { lines.push(msg); console.log(msg); };
const block = (msg: string) => { blocking.push(msg); log(`  ⛔ ${msg}`); };

class DryRunRollback extends Error {}

const SUBCOURSE_CODE = /^(MAT|COM|CT|CYT|CCSS)-(ALG|GEO|ARI|TRI|EST|LIT|LEN|BIO|QUI|FIS|HP|HU)$/i;
const LEVEL_ORDER: EducationLevel[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

function levelFromLegacy(area: { name: string; officialCode: string | null }): EducationLevel | null {
  const code = (area.officialCode ?? '').toUpperCase();
  const name = area.name.toLowerCase();
  if (code.includes('-INI') || code.startsWith('INI-') || name.includes('inicial')) return 'INITIAL';
  if (code.includes('-PRI') || code.startsWith('PRI-') || name.includes('primaria')) return 'PRIMARY';
  if (code.includes('-SEC') || code.startsWith('SEC-') || name.includes('secundaria')) return 'SECONDARY';
  return null;
}

async function remapCompetence(tx: Prisma.TransactionClient, assignmentIds: string[], fromCompetenceId: string, toCompetenceId: string) {
  if (assignmentIds.length === 0 || fromCompetenceId === toCompetenceId) return;
  const rows = await tx.detailedGrade.findMany({ where: { courseAssignmentId: { in: assignmentIds }, competenceId: fromCompetenceId } });
  for (const r of rows) {
    const clash = await tx.detailedGrade.findFirst({
      where: { enrollmentId: r.enrollmentId, courseAssignmentId: r.courseAssignmentId, competenceId: toCompetenceId, criterionId: r.criterionId, periodNumber: r.periodNumber },
    });
    if (clash) { log(`    · Nota duplicada descartada (${r.id})`); await tx.detailedGrade.delete({ where: { id: r.id } }); }
    else await tx.detailedGrade.update({ where: { id: r.id }, data: { competenceId: toCompetenceId } });
  }
  const concs = await tx.competenceConclusion.findMany({ where: { courseAssignmentId: { in: assignmentIds }, competenceId: fromCompetenceId } });
  for (const c of concs) {
    const clash = await tx.competenceConclusion.findFirst({
      where: { enrollmentId: c.enrollmentId, courseAssignmentId: c.courseAssignmentId, competenceId: toCompetenceId, periodNumber: c.periodNumber },
    });
    if (clash) await tx.competenceConclusion.delete({ where: { id: c.id } });
    else await tx.competenceConclusion.update({ where: { id: c.id }, data: { competenceId: toCompetenceId } });
  }
  await tx.grade.updateMany({ where: { competenceId: fromCompetenceId, entry: { courseAssignmentId: { in: assignmentIds } } }, data: { competenceId: toCompetenceId } });
}

async function ensureOfficialArea(tx: Prisma.TransactionClient, schoolId: string, level: EducationLevel, code: string) {
  const spec = getOfficialArea(level, code)!;
  let area = await tx.curricularArea.findFirst({
    where: { schoolId, educationLevel: level, officialAreaCode: code, kind: 'OFFICIAL' },
    include: { competences: true },
  });
  if (!area) {
    area = await tx.curricularArea.create({
      data: {
        schoolId, name: spec.name, educationLevel: level, kind: 'OFFICIAL', officialAreaCode: code,
        officialCode: `${code}-${level}`, isTransversal: !!spec.isTransversal, isActive: true,
        competences: { create: spec.competences.map((n) => ({ name: competenceName(n), cnebNumber: n })) },
      },
      include: { competences: true },
    });
    log(`    + Área oficial creada: ${spec.name} (${level})`);
  }
  return area;
}

async function normalizeSchool(tx: Prisma.TransactionClient, schoolId: string, schoolName: string) {
  log(`\n=== Colegio: ${schoolName} (${schoolId}) ===`);

  // 1. Año lectivo activo único
  const years = await tx.academicYear.findMany({ where: { schoolId }, orderBy: { year: 'desc' } });
  const actives = years.filter((y) => y.isActive);
  let activeYear = actives[0] ?? null;
  if (actives.length > 1) {
    log(`  • ${actives.length} años activos: se deja activo ${actives[0].year}`);
    await tx.academicYear.updateMany({ where: { id: { in: actives.slice(1).map((y) => y.id) } }, data: { isActive: false } });
  }
  if (!activeYear && years.length > 0) {
    activeYear = years[0];
    await tx.academicYear.update({ where: { id: activeYear.id }, data: { isActive: true } });
    log(`  • No había año activo: se activa ${activeYear.year}`);
  }
  if (!activeYear) { log('  • Sin años lectivos: nada que normalizar.'); return; }

  // 2. Aulas: duplicados y grados inválidos (no se corrigen automáticamente)
  const classrooms = await tx.classroom.findMany({ where: { schoolId } });
  const seen = new Map<string, string>();
  for (const c of classrooms) {
    const key = `${c.educationLevel}|${c.grade}|${c.section.trim().toUpperCase()}|${c.shift}`;
    if (seen.has(key)) block(`Aula duplicada: ${c.educationLevel} ${c.grade} "${c.section}" ${c.shift} (${seen.get(key)} y ${c.id}). Fusiónalas a mano antes de la migración final.`);
    else seen.set(key, c.id);
    if (!isValidGrade(c.educationLevel as EducationLevel, c.grade)) block(`Aula con grado inválido: ${c.educationLevel} ${c.grade} "${c.section}" (${c.id}).`);
  }

  // 3. Nivel de cada curso (clonando cursos usados en varios niveles)
  const areas = await tx.curricularArea.findMany({
    where: { schoolId },
    include: {
      competences: true,
      assignments: { include: { classroom: true } },
      subAreas: { include: { assignments: { include: { classroom: true } } } },
    },
  });
  for (const area of areas) {
    if (area.educationLevel) continue;
    const ownLevels = area.assignments.map((a) => a.classroom.educationLevel as EducationLevel);
    const subLevels = area.subAreas.flatMap((s) => s.assignments.map((a) => a.classroom.educationLevel as EducationLevel));
    const used = [...new Set(ownLevels.length > 0 ? ownLevels : subLevels)].sort(
      (a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b),
    );
    if (used.length === 0) {
      const lvl = levelFromLegacy(area);
      if (!lvl) {
        const compIds = area.competences.map((c) => c.id);
        const refs =
          (await tx.detailedGrade.count({ where: { competenceId: { in: compIds } } })) +
          (await tx.competenceConclusion.count({ where: { competenceId: { in: compIds } } })) +
          (await tx.grade.count({ where: { competenceId: { in: compIds } } }));
        if (refs > 0) {
          block(`"${area.name}" no tiene nivel y sus competencias tienen notas: asígnale nivel a mano.`);
          continue;
        }
        log(`  • Curso sin uso y sin nivel, se elimina: "${area.name}"`);
        await tx.curricularArea.updateMany({ where: { parentAreaId: area.id }, data: { parentAreaId: null } });
        await tx.curricularCompetence.deleteMany({ where: { areaId: area.id } });
        await tx.curricularArea.delete({ where: { id: area.id } });
        continue;
      }
      await tx.curricularArea.update({ where: { id: area.id }, data: { educationLevel: lvl } });
      continue;
    }
    const legacy = levelFromLegacy(area);
    const primary = legacy && used.includes(legacy) ? legacy : used[0];
    await tx.curricularArea.update({ where: { id: area.id }, data: { educationLevel: primary } });
    for (const lvl of used.filter((l) => l !== primary)) {
      const clone = await tx.curricularArea.create({
        data: {
          schoolId, name: area.name, officialCode: area.officialCode, officialAreaCode: area.officialAreaCode,
          isTransversal: area.isTransversal, parentAreaId: area.parentAreaId, evaluatedCompetenceIds: area.evaluatedCompetenceIds,
          isActive: area.isActive, educationLevel: lvl,
        },
      });
      const moved = area.assignments.filter((a) => a.classroom.educationLevel === lvl).map((a) => a.id);
      for (const comp of area.competences) {
        const newComp = await tx.curricularCompetence.create({
          data: { areaId: clone.id, name: comp.name, description: comp.description, officialCompetenceCode: comp.officialCompetenceCode, isActive: comp.isActive },
        });
        await remapCompetence(tx, moved, comp.id, newComp.id);
      }
      await tx.courseAssignment.updateMany({ where: { id: { in: moved } }, data: { areaId: clone.id } });
      log(`  • "${area.name}" se usaba en varios niveles: se creó una copia para ${lvl} (${moved.length} asignaciones movidas)`);
    }
  }

  // 3b. Tipo y código oficial
  const leveled = await tx.curricularArea.findMany({ where: { schoolId }, include: { parentArea: true } });
  for (const area of leveled) {
    const level = area.educationLevel as EducationLevel;
    const ownCode = legacyAreaCode(area.officialCode, area.officialAreaCode, area.name);
    const parentCode = area.parentArea ? legacyAreaCode(area.parentArea.officialCode, area.parentArea.officialAreaCode, area.parentArea.name) : null;
    let kind: 'OFFICIAL' | 'SUBCOURSE' | 'WORKSHOP' = 'WORKSHOP';
    let code: string | null = null;
    const subCode = parentCode ?? ownCode;
    if (area.parentAreaId && subCode && getOfficialArea(level, subCode)) {
      kind = 'SUBCOURSE'; code = subCode;
    } else if (ownCode && getOfficialArea(level, ownCode)) {
      kind = area.officialCode && SUBCOURSE_CODE.test(area.officialCode) ? 'SUBCOURSE' : 'OFFICIAL';
      code = ownCode;
    }
    await tx.curricularArea.update({ where: { id: area.id }, data: { kind, officialAreaCode: code, isTransversal: code === 'TRANS' } });
    if (kind === 'WORKSHOP') log(`  • "${area.name}" (${level}) queda como TALLER (no va al SIAGIE). Revisar con Dirección.`);
  }

  // 4. Número CNEB de cada competencia
  const typed = await tx.curricularArea.findMany({ where: { schoolId }, include: { competences: true } });
  for (const area of typed) {
    const level = area.educationLevel as EducationLevel;
    if (area.kind === 'WORKSHOP') {
      await tx.curricularCompetence.updateMany({ where: { areaId: area.id }, data: { cnebNumber: null } });
      if (area.competences.length === 0) await tx.curricularCompetence.create({ data: { areaId: area.id, name: 'Desempeño en el taller' } });
      continue;
    }
    const spec = getOfficialArea(level, area.officialAreaCode!)!;
    const used = new Set<number>();
    for (const comp of area.competences) {
      if (comp.cnebNumber) { used.add(comp.cnebNumber); continue; }
      const codeMatch = /(28|29)$/.exec(comp.officialCompetenceCode ?? '');
      const n = codeMatch ? Number(codeMatch[1]) : matchCnebNumberByName(comp.name);
      if (!n || !spec.competences.includes(n)) {
        log(`  • Competencia "${comp.name}" no corresponde a ${spec.name} (${level}): se desactiva.`);
        await tx.curricularCompetence.update({ where: { id: comp.id }, data: { isActive: false, cnebNumber: null } });
        continue;
      }
      if (used.has(n)) {
        log(`  • Competencia repetida "${comp.name}" en "${area.name}": se desactiva la copia.`);
        await tx.curricularCompetence.update({ where: { id: comp.id }, data: { isActive: false } });
        continue;
      }
      used.add(n);
      await tx.curricularCompetence.update({ where: { id: comp.id }, data: { cnebNumber: n, name: competenceName(n), isActive: true } });
    }
    if (area.kind === 'OFFICIAL') {
      for (const n of spec.competences.filter((x) => !used.has(x))) {
        await tx.curricularCompetence.create({ data: { areaId: area.id, name: competenceName(n), cnebNumber: n } });
        log(`    + Competencia faltante agregada a ${spec.name} (${level}): ${competenceName(n)}`);
      }
    }
  }

  // 5. Sub-cursos con competencias propias y notas reubicadas
  const subs = await tx.curricularArea.findMany({
    where: { schoolId, kind: 'SUBCOURSE' },
    include: { competences: true, parentArea: { include: { competences: true } }, assignments: { select: { id: true } } },
  });
  for (const sub of subs) {
    const level = sub.educationLevel as EducationLevel;
    const code = sub.officialAreaCode!;
    const official = await ensureOfficialArea(tx, schoolId, level, code);
    const oldParentComps = sub.parentArea?.competences ?? [];
    let desired: number[] = sub.evaluatedCompetenceIds
      .map((id) => {
        const pc = oldParentComps.find((c) => c.id === id);
        return pc ? pc.cnebNumber ?? matchCnebNumberByName(pc.name) : null;
      })
      .filter((n): n is number => typeof n === 'number');
    if (desired.length === 0) desired = sub.competences.filter((c) => c.isActive && c.cnebNumber).map((c) => c.cnebNumber!);
    if (desired.length === 0) desired = getOfficialArea(level, code)!.competences;
    const own = new Map<number, string>();
    for (const c of sub.competences) if (c.isActive && c.cnebNumber) own.set(c.cnebNumber, c.id);
    for (const n of desired) {
      if (!own.has(n)) {
        const created = await tx.curricularCompetence.create({ data: { areaId: sub.id, name: competenceName(n), cnebNumber: n } });
        own.set(n, created.id);
      }
    }
    const assignmentIds = sub.assignments.map((a) => a.id);
    const foreign = [
      ...(await tx.detailedGrade.findMany({
        where: { courseAssignmentId: { in: assignmentIds }, competence: { areaId: { not: sub.id } } },
        select: { competenceId: true, competence: { select: { cnebNumber: true, name: true } } },
        distinct: ['competenceId'],
      })),
      ...(await tx.competenceConclusion.findMany({
        where: { courseAssignmentId: { in: assignmentIds }, competence: { areaId: { not: sub.id } } },
        select: { competenceId: true, competence: { select: { cnebNumber: true, name: true } } },
        distinct: ['competenceId'],
      })),
    ];
    for (const f of foreign) {
      const n = f.competence.cnebNumber ?? matchCnebNumberByName(f.competence.name);
      const target = n ? own.get(n) : undefined;
      if (!target) { block(`Notas de "${sub.name}" en una competencia que el sub-curso no evalúa ("${f.competence.name}"). Revisar a mano.`); continue; }
      await remapCompetence(tx, assignmentIds, f.competenceId, target);
    }
    await tx.curricularArea.update({ where: { id: sub.id }, data: { parentAreaId: official.id } });
    log(`  • Sub-curso "${sub.name}" (${level}) → ${code}: competencias ${desired.join(', ')}`);
  }

  // 6. Año lectivo en la carga docente
  const updatedAssignments = await tx.courseAssignment.updateMany({
    where: { schoolId, academicYearId: null },
    data: { academicYearId: activeYear.id },
  });
  log(`  • Carga docente: ${updatedAssignments.count} asignaciones vinculadas al año ${activeYear.year}`);

  // 7. Plan de estudios a partir de la carga docente actual
  const assignments = await tx.courseAssignment.findMany({
    where: { schoolId, academicYearId: activeYear.id, deletedAt: null },
    include: { classroom: true },
  });
  for (const a of assignments) {
    await tx.studyPlanCourse.upsert({
      where: {
        academicYearId_educationLevel_grade_areaId: {
          academicYearId: activeYear.id, educationLevel: a.classroom.educationLevel, grade: a.classroom.grade, areaId: a.areaId,
        },
      },
      update: {},
      create: { schoolId, academicYearId: activeYear.id, educationLevel: a.classroom.educationLevel, grade: a.classroom.grade, areaId: a.areaId },
    });
  }
  const plans = await tx.studyPlanCourse.findMany({
    where: { schoolId, academicYearId: activeYear.id },
    include: { area: { include: { competences: true } } },
  });
  const groups = new Map<string, typeof plans>();
  for (const p of plans) {
    const key = `${p.educationLevel}|${p.grade}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  for (const [key, rows] of groups) {
    const [level] = key.split('|') as [EducationLevel];
    for (const spec of CNEB_AREAS[level]) {
      const contrib = rows.filter((r) => r.area.officialAreaCode === spec.code && r.area.kind !== 'WORKSHOP');
      if (contrib.length === 0) continue;
      if (contrib.some((r) => r.area.kind === 'OFFICIAL') && contrib.some((r) => r.area.kind === 'SUBCOURSE')) {
        log(`  ⚠ Plan ${key}: ${spec.name} está como área completa y también dividida. Corregir en "Plan de estudios".`);
      }
      const covered = new Set(contrib.flatMap((r) => r.area.competences.filter((c) => c.isActive && c.cnebNumber).map((c) => c.cnebNumber!)));
      const missing = spec.competences.filter((n) => !covered.has(n));
      if (missing.length) log(`  ⚠ Plan ${key}: ${spec.name} no cubre ${missing.map(competenceName).join('; ')}`);
    }
  }

  // 8. Cierres antiguos -> estados de periodo
  const locks = await tx.gradingPeriodLock.findMany({ where: { schoolId, isLocked: true } });
  for (const l of locks) {
    const exists = await tx.academicPeriodStatus.findFirst({
      where: { academicYearId: activeYear.id, classroomId: l.classroomId, periodNumber: l.periodNumber },
    });
    if (!exists) {
      await tx.academicPeriodStatus.create({
        data: {
          schoolId, academicYearId: activeYear.id, classroomId: l.classroomId, periodNumber: l.periodNumber,
          status: 'CLOSED', reason: l.reason, changedById: l.lockedById, changedAt: l.lockedAt,
        },
      });
    }
  }
  log(`  • Cierres migrados: ${locks.length}`);

  // 9. Matrículas de años no activos
  const deactivated = await tx.enrollment.updateMany({
    where: { schoolId, academicYearId: { not: activeYear.id }, isActive: true },
    data: { isActive: false },
  });
  log(`  • Matrículas de otros años desactivadas: ${deactivated.count}`);
}

async function main() {
  log(`Normalización académica — modo ${APPLY ? 'APLICAR' : 'SIMULACIÓN'} — ${new Date().toISOString()}`);
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  for (const s of schools) {
    try {
      await prisma.$transaction(async (tx) => {
        await normalizeSchool(tx, s.id, s.name);
        if (!APPLY) throw new DryRunRollback();
      }, { timeout: 300_000, maxWait: 30_000 });
    } catch (e) {
      if (!(e instanceof DryRunRollback)) throw e;
    }
  }
  log(`\nBloqueantes para la migración final: ${blocking.length}`);
  blocking.forEach((b) => log(` - ${b}`));
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `academic-normalize-${Date.now()}.txt`);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log(`\nInforme: ${file}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
```

Pasos:
1. En `back/package.json`, dentro de `scripts`, agrega:
   ```json
   "academic:normalize": "ts-node --transpile-only scripts/academic-normalize.ts",
   "academic:recompute": "ts-node --transpile-only scripts/academic-recompute.ts",
   ```
   (`academic-recompute.ts` se crea en el bloque 9).
2. Agrega `scripts/output/` a `back/.gitignore`. Crea el archivo si no existe.
3. Ejecuta `cd back && pnpm academic:normalize` (simulación) y revisa el informe.
4. Si no hay errores de ejecución, ejecuta `pnpm academic:normalize --apply`.
   - Si el informe lista **bloqueantes** (aulas duplicadas, grados inválidos), **no los corrijas tú**: anótalos en `CAMBIOS_ACADEMICO.md` (Pendientes) y continúa.
   - El bloque 22 rehace el seed. La base de desarrollo se puede regenerar con `pnpm prisma db seed` **solo si el usuario lo autoriza**.

Commit: `feat(academico): bloque 5 - script de normalizacion de datos academicos`

---

## BLOQUE 6 — Backend: contexto común y plan de estudios

### 6.1 `back/src/modules/academic/academic.context.ts`

```ts
import type { AcademicYear, EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { thresholdsFromGradingScale, type LetterScaleThresholds } from '../grades/letter-scale';
import { CNEB_AREAS, CNEB_COMPETENCES } from './cneb.catalog';

export interface AcademicUser {
  userId: string;
  role: string;
  schoolId: string;
  studentId?: string;
}

export const isAdmin = (u: { role: string }) => u.role === 'SCHOOL_ADMIN' || u.role === 'SUPER_ADMIN';

export async function getActiveYear(schoolId: string): Promise<AcademicYear> {
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, orderBy: { year: 'desc' } });
  if (!year) throw new AppError('No hay un año lectivo activo. Actívalo en Configuración > Años lectivos.', 409);
  return year;
}

export async function resolveYear(schoolId: string, academicYearId?: string | null): Promise<AcademicYear> {
  if (!academicYearId) return getActiveYear(schoolId);
  const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } });
  if (!year) throw new AppError('Año lectivo no encontrado.', 404);
  return year;
}

export const periodCount = (year: { periodType: string }) => (year.periodType === 'TRIMESTER' ? 3 : 4);

export function assertPeriod(year: { periodType: string }, periodNumber: number): void {
  if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > periodCount(year)) {
    throw new AppError('Periodo no válido para este año lectivo.', 400);
  }
}

export function periodName(year: { periodType: string; periodsConfig: unknown }, n: number): string {
  const cfg = Array.isArray(year.periodsConfig) ? (year.periodsConfig as Array<{ periodNumber: number; name?: string }>) : [];
  const found = cfg.find((p) => Number(p.periodNumber) === n);
  if (found?.name) return found.name;
  return `${n}.° ${year.periodType === 'TRIMESTER' ? 'trimestre' : 'bimestre'}`;
}

const thresholdCache = new Map<string, { value: LetterScaleThresholds; expiresAt: number }>();

export async function getThresholds(schoolId: string, level: EducationLevel): Promise<LetterScaleThresholds> {
  const key = `${schoolId}:${level}`;
  const hit = thresholdCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const rows = await prisma.gradingScale.findMany({ where: { schoolId, level }, select: { letterGrade: true, minNumeric: true } });
  const value = thresholdsFromGradingScale(rows);
  thresholdCache.set(key, { value, expiresAt: Date.now() + 60_000 });
  return value;
}

export function clearThresholds(schoolId: string): void {
  for (const key of thresholdCache.keys()) if (key.startsWith(`${schoolId}:`)) thresholdCache.delete(key);
}

/** Ordena competencias según el orden oficial del área (orden de columnas del SIAGIE). Talleres al final. */
export function sortCompetences<T extends { cnebNumber: number | null; name: string }>(
  level: EducationLevel,
  officialAreaCode: string | null,
  competences: T[],
): T[] {
  const order = CNEB_AREAS[level].find((a) => a.code === officialAreaCode)?.competences ?? [];
  const idx = (c: T) => (c.cnebNumber !== null && order.includes(c.cnebNumber) ? order.indexOf(c.cnebNumber) : 999);
  return [...competences].sort((a, b) => idx(a) - idx(b) || a.name.localeCompare(b.name, 'es'));
}

export const shortNameOf = (c: { cnebNumber: number | null; name: string }) =>
  c.cnebNumber ? CNEB_COMPETENCES[c.cnebNumber]?.shortName ?? c.name : c.name;

export const fullNameOf = (s: { lastNamePaternal: string; lastNameMaternal?: string | null; firstNames: string }) =>
  `${`${s.lastNamePaternal} ${s.lastNameMaternal ?? ''}`.trim()}, ${s.firstNames}`;

/** Carga una asignación vigente validando colegio y propiedad del docente. */
export async function loadAssignmentForUser(
  schoolId: string,
  user: AcademicUser,
  assignmentId: string,
  opts: { write?: boolean } = {},
) {
  if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'].includes(user.role)) {
    throw new AppError('No tienes permiso para ver este curso.', 403);
  }
  if (opts.write && user.role === 'ADMINISTRATIVE') {
    throw new AppError('No tienes permiso para registrar notas.', 403);
  }
  const assignment = await prisma.courseAssignment.findFirst({
    where: { id: assignmentId, schoolId, deletedAt: null },
    include: {
      classroom: { select: { id: true, educationLevel: true, grade: true, section: true, tutorTeacherId: true } },
      area: { include: { competences: { where: { isActive: true } } } },
      teacher: { select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true } },
      academicYear: true,
    },
  });
  if (!assignment || !assignment.academicYear || !assignment.academicYearId) throw new AppError('Curso no encontrado.', 404);
  if (user.role === 'TEACHER' && assignment.teacherId !== user.userId) {
    throw new AppError('Este curso no está asignado a ti.', 403);
  }
  return assignment as typeof assignment & { academicYear: AcademicYear; academicYearId: string };
}
```

### 6.2 `back/src/modules/academic/curriculum.service.ts`

```ts
import type { EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import {
  CNEB_AREAS, CNEB_COMPETENCES, LEVEL_GRADES, competenceName, getOfficialArea, isValidGrade,
} from './cneb.catalog';
import { resolveYear, shortNameOf, sortCompetences } from './academic.context';

type Tx = Prisma.TransactionClient;

export interface SubcourseInput {
  name: string;
  cnebNumbers: number[];
  weight?: number;
}

export async function ensureOfficialArea(tx: Tx, schoolId: string, level: EducationLevel, code: string) {
  const spec = getOfficialArea(level, code);
  if (!spec) throw new AppError(`El área ${code} no existe en este nivel.`, 400);
  let area = await tx.curricularArea.findFirst({
    where: { schoolId, educationLevel: level, officialAreaCode: spec.code, kind: 'OFFICIAL' },
    include: { competences: true },
  });
  if (!area) {
    return tx.curricularArea.create({
      data: {
        schoolId, name: spec.name, educationLevel: level, kind: 'OFFICIAL', officialAreaCode: spec.code,
        officialCode: `${spec.code}-${level}`, isTransversal: !!spec.isTransversal, isActive: true,
        competences: { create: spec.competences.map((n) => ({ name: competenceName(n), cnebNumber: n })) },
      },
      include: { competences: true },
    });
  }
  for (const n of spec.competences) {
    const existing = area.competences.find((c) => c.cnebNumber === n);
    if (!existing) await tx.curricularCompetence.create({ data: { areaId: area.id, name: competenceName(n), cnebNumber: n } });
    else if (!existing.isActive) await tx.curricularCompetence.update({ where: { id: existing.id }, data: { isActive: true } });
  }
  area = await tx.curricularArea.findUniqueOrThrow({ where: { id: area.id }, include: { competences: true } });
  return area;
}

async function assignmentsWithGrades(tx: Tx, assignmentIds: string[]): Promise<Set<string>> {
  if (assignmentIds.length === 0) return new Set();
  const [g, r] = await Promise.all([
    tx.detailedGrade.groupBy({ by: ['courseAssignmentId'], where: { courseAssignmentId: { in: assignmentIds } } }),
    tx.competencePeriodResult.groupBy({ by: ['courseAssignmentId'], where: { courseAssignmentId: { in: assignmentIds } } }),
  ]);
  return new Set([...g, ...r].map((x) => x.courseAssignmentId));
}

/** Quita un curso del plan de un grado: bloquea si hay notas; si no, borra lógicamente sus asignaciones. */
async function removeAreaFromGrade(tx: Tx, schoolId: string, academicYearId: string, level: EducationLevel, grade: number, areaId: string, label: string) {
  const assignments = await tx.courseAssignment.findMany({
    where: { schoolId, academicYearId, areaId, deletedAt: null, classroom: { educationLevel: level, grade } },
    select: { id: true },
  });
  const graded = await assignmentsWithGrades(tx, assignments.map((a) => a.id));
  if (graded.size > 0) {
    throw new AppError(`"${label}" ya tiene notas registradas en este grado: no se puede quitar del plan.`, 409);
  }
  if (assignments.length) {
    await tx.courseAssignment.updateMany({ where: { id: { in: assignments.map((a) => a.id) } }, data: { deletedAt: new Date() } });
  }
  await tx.studyPlanCourse.deleteMany({ where: { academicYearId, educationLevel: level, grade, areaId } });
}

export class CurriculumService {
  getCatalog() {
    return { competences: CNEB_COMPETENCES, areas: CNEB_AREAS, grades: LEVEL_GRADES };
  }

  async getStudyPlan(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grade: number) {
    if (!isValidGrade(level, grade)) throw new AppError('Grado no válido para el nivel.', 400);
    const year = await resolveYear(schoolId, academicYearId);
    const rows = await prisma.studyPlanCourse.findMany({
      where: { schoolId, academicYearId: year.id, educationLevel: level, grade },
      include: { area: { include: { competences: { where: { isActive: true } } } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, deletedAt: null, areaId: { in: rows.map((r) => r.areaId) }, classroom: { educationLevel: level, grade } },
      select: { id: true, areaId: true },
    });
    const graded = await assignmentsWithGrades(prisma as unknown as Tx, assignments.map((a) => a.id));

    const courses = rows.map((r) => ({
      planCourseId: r.id,
      areaId: r.areaId,
      name: r.area.name,
      kind: r.area.kind,
      officialAreaCode: r.area.officialAreaCode,
      parentAreaId: r.area.parentAreaId,
      weeklyHours: r.weeklyHours,
      order: r.order,
      competences: sortCompetences(level, r.area.officialAreaCode, r.area.competences).map((c) => ({
        id: c.id, cnebNumber: c.cnebNumber, name: c.name, shortName: shortNameOf(c), weight: c.weight,
      })),
      assignedClassrooms: assignments.filter((a) => a.areaId === r.areaId).length,
      hasGrades: assignments.some((a) => a.areaId === r.areaId && graded.has(a.id)),
    }));

    const coverage = CNEB_AREAS[level].map((spec) => {
      const contributing = courses.filter((c) => c.officialAreaCode === spec.code && c.kind !== 'WORKSHOP');
      const covered = new Set(contributing.flatMap((c) => c.competences.map((k) => k.cnebNumber).filter((n): n is number => n !== null)));
      return {
        code: spec.code,
        name: spec.name,
        optional: !!spec.optional,
        isTransversal: !!spec.isTransversal,
        inPlan: contributing.length > 0,
        required: spec.competences,
        covered: spec.competences.filter((n) => covered.has(n)),
        missing: contributing.length > 0 ? spec.competences.filter((n) => !covered.has(n)) : [],
        conflict: contributing.some((c) => c.kind === 'OFFICIAL') && contributing.some((c) => c.kind === 'SUBCOURSE'),
      };
    });
    const requiredMissing = coverage.filter((c) => !c.optional && !c.inPlan).map((c) => c.name);
    const isValid = coverage.every((c) => c.missing.length === 0 && !c.conflict) && requiredMissing.length === 0;
    return { academicYearId: year.id, level, grade, courses, coverage, requiredMissing, isValid };
  }

  async applyTemplate(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grades: number[], includeOptional: string[] = []) {
    const year = await resolveYear(schoolId, academicYearId);
    grades.forEach((g) => { if (!isValidGrade(level, g)) throw new AppError(`Grado ${g} no válido para el nivel.`, 400); });
    await prisma.$transaction(async (tx) => {
      for (const grade of grades) {
        let order = 0;
        for (const spec of CNEB_AREAS[level]) {
          order += 1;
          if (spec.optional && !includeOptional.includes(spec.code)) continue;
          const hasSub = await tx.studyPlanCourse.findFirst({
            where: { academicYearId: year.id, educationLevel: level, grade, area: { officialAreaCode: spec.code, kind: 'SUBCOURSE' } },
          });
          if (hasSub) continue;
          const area = await ensureOfficialArea(tx, schoolId, level, spec.code);
          await tx.studyPlanCourse.upsert({
            where: { academicYearId_educationLevel_grade_areaId: { academicYearId: year.id, educationLevel: level, grade, areaId: area.id } },
            update: {},
            create: { schoolId, academicYearId: year.id, educationLevel: level, grade, areaId: area.id, order },
          });
        }
      }
    }, { timeout: 60_000 });
    return { applied: grades.length };
  }

  async createSubcourses(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grades: number[], officialAreaCode: string, subcourses: SubcourseInput[]) {
    const year = await resolveYear(schoolId, academicYearId);
    const spec = getOfficialArea(level, officialAreaCode);
    if (!spec || spec.isTransversal) throw new AppError('Esta área no se puede dividir.', 400);
    if (subcourses.length < 2) throw new AppError('Para dividir un área necesitas al menos dos cursos.', 400);
    const names = subcourses.map((s) => s.name.trim().toLowerCase());
    if (names.some((n) => n.length < 2)) throw new AppError('Escribe el nombre de cada curso.', 400);
    if (new Set(names).size !== names.length) throw new AppError('Hay cursos con el mismo nombre.', 400);
    for (const s of subcourses) {
      if (s.cnebNumbers.length === 0) throw new AppError(`"${s.name}" debe evaluar al menos una competencia.`, 400);
      if (s.cnebNumbers.some((n) => !spec.competences.includes(n))) throw new AppError(`"${s.name}" tiene competencias que no son de ${spec.name}.`, 400);
    }
    const covered = new Set(subcourses.flatMap((s) => s.cnebNumbers));
    const missing = spec.competences.filter((n) => !covered.has(n));
    if (missing.length) {
      throw new AppError(`Faltan competencias por cubrir: ${missing.map((n) => CNEB_COMPETENCES[n].shortName).join(', ')}.`, 400);
    }
    grades.forEach((g) => { if (!isValidGrade(level, g)) throw new AppError(`Grado ${g} no válido para el nivel.`, 400); });

    await prisma.$transaction(async (tx) => {
      const official = await ensureOfficialArea(tx, schoolId, level, spec.code);
      const subAreaIds: string[] = [];
      for (const s of subcourses) {
        const name = s.name.trim();
        const desired = [...new Set(s.cnebNumbers)].sort((a, b) => a - b);
        const existing = await tx.curricularArea.findFirst({
          where: { schoolId, educationLevel: level, kind: 'SUBCOURSE', officialAreaCode: spec.code, name: { equals: name, mode: 'insensitive' } },
          include: { competences: { where: { isActive: true } } },
        });
        if (existing) {
          const current = existing.competences.map((c) => c.cnebNumber).filter((n): n is number => n !== null).sort((a, b) => a - b);
          if (current.join(',') !== desired.join(',')) {
            throw new AppError(`Ya existe el curso "${name}" con otras competencias. Usa otro nombre o edítalo desde su ficha.`, 409);
          }
          subAreaIds.push(existing.id);
          continue;
        }
        const created = await tx.curricularArea.create({
          data: {
            schoolId, name, educationLevel: level, kind: 'SUBCOURSE', officialAreaCode: spec.code, parentAreaId: official.id, isActive: true,
            competences: { create: desired.map((n) => ({ name: competenceName(n), cnebNumber: n, weight: s.weight && s.weight > 0 ? s.weight : 1 })) },
          },
        });
        subAreaIds.push(created.id);
      }
      for (const grade of grades) {
        const officialRow = await tx.studyPlanCourse.findFirst({
          where: { academicYearId: year.id, educationLevel: level, grade, areaId: official.id },
        });
        if (officialRow) await removeAreaFromGrade(tx, schoolId, year.id, level, grade, official.id, spec.name);
        let order = officialRow?.order ?? 50;
        for (const areaId of subAreaIds) {
          await tx.studyPlanCourse.upsert({
            where: { academicYearId_educationLevel_grade_areaId: { academicYearId: year.id, educationLevel: level, grade, areaId } },
            update: {},
            create: { schoolId, academicYearId: year.id, educationLevel: level, grade, areaId, order: order++ },
          });
        }
      }
    }, { timeout: 60_000 });
    return { created: subcourses.length };
  }

  async addWorkshop(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grades: number[], name: string, weeklyHours?: number | null) {
    const year = await resolveYear(schoolId, academicYearId);
    const clean = name.trim();
    if (clean.length < 2) throw new AppError('Escribe el nombre del taller.', 400);
    grades.forEach((g) => { if (!isValidGrade(level, g)) throw new AppError(`Grado ${g} no válido para el nivel.`, 400); });
    await prisma.$transaction(async (tx) => {
      let area = await tx.curricularArea.findFirst({
        where: { schoolId, educationLevel: level, kind: 'WORKSHOP', name: { equals: clean, mode: 'insensitive' } },
      });
      if (!area) {
        area = await tx.curricularArea.create({
          data: { schoolId, name: clean, educationLevel: level, kind: 'WORKSHOP', isActive: true, competences: { create: [{ name: 'Desempeño en el taller' }] } },
        });
      }
      for (const grade of grades) {
        await tx.studyPlanCourse.upsert({
          where: { academicYearId_educationLevel_grade_areaId: { academicYearId: year.id, educationLevel: level, grade, areaId: area.id } },
          update: { weeklyHours: weeklyHours ?? null },
          create: { schoolId, academicYearId: year.id, educationLevel: level, grade, areaId: area.id, weeklyHours: weeklyHours ?? null, order: 90 },
        });
      }
    });
    return { added: grades.length };
  }

  async updatePlanCourse(schoolId: string, planCourseId: string, data: { weeklyHours?: number | null; order?: number }) {
    const row = await prisma.studyPlanCourse.findFirst({ where: { id: planCourseId, schoolId } });
    if (!row) throw new AppError('Curso del plan no encontrado.', 404);
    return prisma.studyPlanCourse.update({ where: { id: row.id }, data });
  }

  async removePlanCourse(schoolId: string, planCourseId: string) {
    const row = await prisma.studyPlanCourse.findFirst({ where: { id: planCourseId, schoolId }, include: { area: true } });
    if (!row) throw new AppError('Curso del plan no encontrado.', 404);
    await prisma.$transaction((tx) => removeAreaFromGrade(tx, schoolId, row.academicYearId, row.educationLevel, row.grade, row.areaId, row.area.name));
    return { removed: true };
  }

  async copyPlan(schoolId: string, fromAcademicYearId: string, toAcademicYearId: string) {
    const from = await resolveYear(schoolId, fromAcademicYearId);
    const to = await resolveYear(schoolId, toAcademicYearId);
    if (from.id === to.id) throw new AppError('Elige dos años distintos.', 400);
    const rows = await prisma.studyPlanCourse.findMany({ where: { academicYearId: from.id } });
    const result = await prisma.studyPlanCourse.createMany({
      data: rows.map((r) => ({
        schoolId, academicYearId: to.id, educationLevel: r.educationLevel, grade: r.grade, areaId: r.areaId, weeklyHours: r.weeklyHours, order: r.order,
      })),
      skipDuplicates: true,
    });
    return { copied: result.count };
  }

  async updateCourseCompetences(schoolId: string, areaId: string, items: Array<{ cnebNumber: number; weight?: number }>) {
    const area = await prisma.curricularArea.findFirst({ where: { id: areaId, schoolId }, include: { competences: true } });
    if (!area) throw new AppError('Curso no encontrado.', 404);
    if (area.kind !== 'SUBCOURSE') throw new AppError('Solo se pueden editar las competencias de un curso dividido.', 400);
    const spec = getOfficialArea(area.educationLevel as EducationLevel, area.officialAreaCode ?? '');
    if (!spec) throw new AppError('El curso no tiene un área oficial válida.', 400);
    if (items.length === 0) throw new AppError('El curso debe evaluar al menos una competencia.', 400);
    if (items.some((i) => !spec.competences.includes(i.cnebNumber))) throw new AppError(`Hay competencias que no son de ${spec.name}.`, 400);
    const desired = new Set(items.map((i) => i.cnebNumber));
    const toRemove = area.competences.filter((c) => c.isActive && c.cnebNumber !== null && !desired.has(c.cnebNumber));
    for (const c of toRemove) {
      const used = (await prisma.detailedGrade.count({ where: { competenceId: c.id } })) + (await prisma.competencePeriodResult.count({ where: { competenceId: c.id } }));
      if (used > 0) throw new AppError(`"${shortNameOf(c)}" ya tiene notas en este curso: no se puede quitar.`, 409);
    }
    await prisma.$transaction(async (tx) => {
      for (const c of toRemove) await tx.curricularCompetence.update({ where: { id: c.id }, data: { isActive: false } });
      for (const i of items) {
        const existing = area.competences.find((c) => c.cnebNumber === i.cnebNumber);
        const weight = i.weight && i.weight > 0 ? i.weight : 1;
        if (existing) await tx.curricularCompetence.update({ where: { id: existing.id }, data: { isActive: true, weight } });
        else await tx.curricularCompetence.create({ data: { areaId: area.id, name: competenceName(i.cnebNumber), cnebNumber: i.cnebNumber, weight } });
      }
    });
    return { updated: true };
  }

  async renameCourse(schoolId: string, areaId: string, name: string) {
    const area = await prisma.curricularArea.findFirst({ where: { id: areaId, schoolId } });
    if (!area) throw new AppError('Curso no encontrado.', 404);
    if (area.kind === 'OFFICIAL') throw new AppError('Las áreas oficiales no se renombran.', 400);
    if (name.trim().length < 2) throw new AppError('Escribe un nombre válido.', 400);
    return prisma.curricularArea.update({ where: { id: area.id }, data: { name: name.trim() } });
  }

  /** Lista de verificación para "Inicio académico". */
  async getSetupStatus(schoolId: string, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const [classrooms, plans, assignments, teachers] = await Promise.all([
      prisma.classroom.findMany({ where: { schoolId }, select: { id: true, educationLevel: true, grade: true, section: true, tutorTeacherId: true } }),
      prisma.studyPlanCourse.findMany({ where: { academicYearId: year.id }, select: { educationLevel: true, grade: true, areaId: true } }),
      prisma.courseAssignment.findMany({ where: { schoolId, academicYearId: year.id, deletedAt: null }, select: { classroomId: true, areaId: true, teacherId: true } }),
      prisma.user.findMany({ where: { schoolId, role: 'TEACHER', isActive: true }, select: { id: true } }),
    ]);
    const gradesInUse = [...new Set(classrooms.map((c) => `${c.educationLevel}|${c.grade}`))];
    const invalidPlans: Array<{ level: EducationLevel; grade: number }> = [];
    for (const key of gradesInUse) {
      const [level, g] = key.split('|') as [EducationLevel, string];
      if (!isValidGrade(level, Number(g))) continue;
      const plan = await this.getStudyPlan(schoolId, year.id, level, Number(g));
      if (!plan.isValid || plan.courses.length === 0) invalidPlans.push({ level, grade: Number(g) });
    }
    let coursesWithoutTeacher = 0;
    for (const c of classrooms) {
      const planAreas = plans.filter((p) => p.educationLevel === c.educationLevel && p.grade === c.grade).map((p) => p.areaId);
      coursesWithoutTeacher += planAreas.filter((areaId) => !assignments.some((a) => a.classroomId === c.id && a.areaId === areaId)).length;
    }
    const withLoad = new Set(assignments.map((a) => a.teacherId));
    return {
      academicYear: {
        id: year.id, year: year.year, periodType: year.periodType,
        hasPeriods: Array.isArray(year.periodsConfig) && (year.periodsConfig as unknown[]).length > 0,
      },
      gradesInUse: gradesInUse.length,
      invalidPlans,
      classrooms: classrooms.length,
      classroomsWithoutTutor: classrooms.filter((c) => !c.tutorTeacherId).length,
      coursesWithoutTeacher,
      teachers: teachers.length,
      teachersWithoutLoad: teachers.filter((t) => !withLoad.has(t.id)).length,
    };
  }
}
```

Commit: `feat(academico): bloque 6 - servicio de plan de estudios`

---

## BLOQUE 7 — Backend: carga docente

Crea `back/src/modules/academic/teaching-load.service.ts`:

```ts
import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getActiveYear, resolveYear } from './academic.context';

export interface TeachingLoadChange {
  classroomId: string;
  areaId: string;
  teacherId: string | null;
}

export class TeachingLoadService {
  async getMatrix(schoolId: string, academicYearId: string | undefined, level: EducationLevel) {
    const year = await resolveYear(schoolId, academicYearId);
    const [classrooms, plan, assignments, teachers] = await Promise.all([
      prisma.classroom.findMany({
        where: { schoolId, educationLevel: level },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }],
        select: { id: true, grade: true, section: true, shift: true, tutorTeacherId: true },
      }),
      prisma.studyPlanCourse.findMany({
        where: { schoolId, academicYearId: year.id, educationLevel: level },
        include: { area: { select: { id: true, name: true, kind: true, officialAreaCode: true, isTransversal: true } } },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.courseAssignment.findMany({
        where: { schoolId, academicYearId: year.id, deletedAt: null, classroom: { educationLevel: level } },
        select: { id: true, classroomId: true, areaId: true, teacherId: true },
      }),
      prisma.user.findMany({
        where: { schoolId, role: 'TEACHER', isActive: true },
        select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true },
        orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
      }),
    ]);
    const gradedIds = new Set(
      (await prisma.detailedGrade.groupBy({ by: ['courseAssignmentId'], where: { courseAssignmentId: { in: assignments.map((a) => a.id) } } }))
        .map((g) => g.courseAssignmentId),
    );
    const rows = classrooms.map((c) => ({
      ...c,
      courses: plan
        .filter((p) => p.grade === c.grade)
        .map((p) => {
          const a = assignments.find((x) => x.classroomId === c.id && x.areaId === p.areaId);
          return {
            areaId: p.areaId, name: p.area.name, kind: p.area.kind, isTransversal: p.area.isTransversal,
            weeklyHours: p.weeklyHours, assignmentId: a?.id ?? null, teacherId: a?.teacherId ?? null,
            hasGrades: a ? gradedIds.has(a.id) : false,
          };
        }),
    }));
    const teacherLoad = teachers.map((t) => {
      const mine = rows.flatMap((r) => r.courses.filter((c) => c.teacherId === t.id));
      return { teacherId: t.id, courses: mine.length, weeklyHours: mine.reduce((acc, c) => acc + (c.weeklyHours ?? 0), 0) };
    });
    return { academicYearId: year.id, level, teachers, classrooms: rows, teacherLoad };
  }

  async saveChanges(schoolId: string, academicYearId: string | undefined, changes: TeachingLoadChange[]) {
    const year = await resolveYear(schoolId, academicYearId);
    if (changes.length === 0) return { updated: 0 };
    const classroomIds = [...new Set(changes.map((c) => c.classroomId))];
    const classrooms = await prisma.classroom.findMany({ where: { id: { in: classroomIds }, schoolId } });
    if (classrooms.length !== classroomIds.length) throw new AppError('Una o más aulas no pertenecen al colegio.', 400);
    const teacherIds = [...new Set(changes.map((c) => c.teacherId).filter((t): t is string => !!t))];
    const validTeachers = await prisma.user.count({ where: { id: { in: teacherIds }, schoolId, role: 'TEACHER', isActive: true } });
    if (validTeachers !== teacherIds.length) throw new AppError('Uno o más docentes no son válidos o están inactivos.', 400);
    const plan = await prisma.studyPlanCourse.findMany({
      where: { academicYearId: year.id, areaId: { in: [...new Set(changes.map((c) => c.areaId))] } },
      include: { area: { select: { name: true } } },
    });
    for (const ch of changes) {
      const c = classrooms.find((x) => x.id === ch.classroomId)!;
      if (!plan.some((p) => p.areaId === ch.areaId && p.educationLevel === c.educationLevel && p.grade === c.grade)) {
        throw new AppError(`Un curso no pertenece al plan de estudios de ${c.grade}.° "${c.section}". Revisa el plan primero.`, 400);
      }
    }
    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const ch of changes) {
        const existing = await tx.courseAssignment.findFirst({
          where: { schoolId, academicYearId: year.id, classroomId: ch.classroomId, areaId: ch.areaId },
        });
        if (ch.teacherId === null) {
          if (!existing || existing.deletedAt) continue;
          const graded =
            (await tx.detailedGrade.count({ where: { courseAssignmentId: existing.id } })) +
            (await tx.competencePeriodResult.count({ where: { courseAssignmentId: existing.id } })) +
            (await tx.competenceConclusion.count({ where: { courseAssignmentId: existing.id } }));
          if (graded > 0) {
            const c = classrooms.find((x) => x.id === ch.classroomId)!;
            const name = plan.find((p) => p.areaId === ch.areaId)?.area.name ?? 'El curso';
            throw new AppError(`"${name}" de ${c.grade}.° "${c.section}" ya tiene notas: no se puede dejar sin docente. Asigna otro docente.`, 409);
          }
          await tx.courseAssignment.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
        } else if (existing) {
          await tx.courseAssignment.update({ where: { id: existing.id }, data: { teacherId: ch.teacherId, deletedAt: null } });
        } else {
          await tx.courseAssignment.create({
            data: { schoolId, academicYearId: year.id, classroomId: ch.classroomId, areaId: ch.areaId, teacherId: ch.teacherId },
          });
        }
        updated += 1;
      }
    }, { timeout: 60_000 });
    return { updated };
  }

  async assignWholeClassroom(schoolId: string, academicYearId: string | undefined, classroomId: string, teacherId: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId } });
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    const plan = await prisma.studyPlanCourse.findMany({
      where: { academicYearId: year.id, educationLevel: classroom.educationLevel, grade: classroom.grade },
      include: { area: { select: { isTransversal: true } } },
    });
    const changes = plan
      .filter((p) => !(p.area.isTransversal && classroom.tutorTeacherId))
      .map((p) => ({ classroomId, areaId: p.areaId, teacherId }));
    return this.saveChanges(schoolId, year.id, changes);
  }

  async copyFromYear(schoolId: string, fromAcademicYearId: string, toAcademicYearId: string) {
    const from = await resolveYear(schoolId, fromAcademicYearId);
    const to = await resolveYear(schoolId, toAcademicYearId);
    if (from.id === to.id) throw new AppError('Elige dos años distintos.', 400);
    const [source, targetPlan, existing] = await Promise.all([
      prisma.courseAssignment.findMany({
        where: { schoolId, academicYearId: from.id, deletedAt: null, teacher: { isActive: true } },
        include: { classroom: true },
      }),
      prisma.studyPlanCourse.findMany({ where: { academicYearId: to.id } }),
      prisma.courseAssignment.findMany({ where: { academicYearId: to.id, deletedAt: null }, select: { classroomId: true, areaId: true } }),
    ]);
    const pending = source
      .filter((a) => targetPlan.some((p) => p.areaId === a.areaId && p.educationLevel === a.classroom.educationLevel && p.grade === a.classroom.grade))
      .filter((a) => !existing.some((e) => e.classroomId === a.classroomId && e.areaId === a.areaId))
      .map((a) => ({ classroomId: a.classroomId, areaId: a.areaId, teacherId: a.teacherId }));
    return this.saveChanges(schoolId, to.id, pending);
  }

  /** El tutor o tutora registra las competencias transversales del aula. */
  async syncTutorTransversal(schoolId: string, classroomId: string): Promise<void> {
    const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId } });
    if (!classroom?.tutorTeacherId) return;
    const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!year) return;
    const trans = await prisma.studyPlanCourse.findFirst({
      where: { academicYearId: year.id, educationLevel: classroom.educationLevel, grade: classroom.grade, area: { isTransversal: true } },
    });
    if (!trans) return;
    await this.saveChanges(schoolId, year.id, [{ classroomId, areaId: trans.areaId, teacherId: classroom.tutorTeacherId }]);
  }

  async getMyCourses(schoolId: string, teacherId: string) {
    const year = await getActiveYear(schoolId);
    return prisma.courseAssignment.findMany({
      where: { schoolId, teacherId, academicYearId: year.id, deletedAt: null },
      include: {
        classroom: { select: { id: true, educationLevel: true, grade: true, section: true, tutorTeacherId: true } },
        area: { select: { id: true, name: true, kind: true, officialAreaCode: true, isTransversal: true } },
      },
      orderBy: [{ classroom: { educationLevel: 'asc' } }, { classroom: { grade: 'asc' } }, { classroom: { section: 'asc' } }],
    });
  }
}
```

### 7.1 Tutor y competencias transversales

En `back/src/modules/classrooms/classroom.service.ts`:
- importa `TeachingLoadService` desde `'../academic/teaching-load.service'`;
- crea `const teachingLoad = new TeachingLoadService();` a nivel de módulo;
- en `createClassroom` y `updateClassroom`, donde antes se llamaba a `syncTransversalAssignment` (eliminado en el bloque 3), agrega después de guardar:
  ```ts
  if (dto.tutorTeacherId) await teachingLoad.syncTutorTransversal(schoolId, <id del aula>);
  ```
  (`dto` es `createClassroomDto` o `updateClassroomDto` según el método).

### 7.2 Grado válido por nivel

En `back/src/modules/classrooms/classroom.schema.ts`, separa el objeto base y agrega la validación:
```ts
import { z } from 'zod';
import { isValidGrade } from '../academic/cneb.catalog';

const classroomBase = z.object({
  educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']),
  grade: z.number().int().min(1).max(6),
  section: z.string().trim().min(1, 'La sección es requerida').max(10),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).default('MORNING'),
  capacity: z.number().int().min(1).max(60).default(30),
  tutorTeacherId: z.string().uuid().nullable().optional(),
});

export const createClassroomSchema = classroomBase.superRefine((v, ctx) => {
  if (!isValidGrade(v.educationLevel, v.grade)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grade'], message: 'El grado no corresponde al nivel (Inicial 3-5, Primaria 1-6, Secundaria 1-5).' });
  }
});

export const updateClassroomSchema = classroomBase.partial();

export type CreateClassroomDto = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomDto = z.infer<typeof updateClassroomSchema>;
```

En `ClassroomService.updateClassroom`, después de `getClassroomById`:
```ts
const current = await this.getClassroomById(classroomId, schoolId);
const level = updateClassroomDto.educationLevel ?? current.educationLevel;
const grade = updateClassroomDto.grade ?? current.grade;
if (!isValidGrade(level, grade)) throw new AppError('El grado no corresponde al nivel.', 400);
```
(Reemplaza la llamada existente a `getClassroomById` por esta, sin duplicarla).

Commit: `feat(academico): bloque 7 - carga docente por anio con borrado logico`

---

## BLOQUE 8 — Backend: periodos

Crea `back/src/modules/academic/period.service.ts`:

```ts
import type { PeriodState } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getPeriodDateRange } from '../../utils/period-dates.util';
import { assertPeriod, periodCount, periodName, resolveYear } from './academic.context';

export interface SetPeriodStatusInput {
  academicYearId?: string;
  periodNumber: number;
  classroomId?: string | null;
  status: PeriodState;
  reason?: string | null;
  gradingDeadline?: string | null;
  force?: boolean;
}

export class PeriodService {
  async list(schoolId: string, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const statuses = await prisma.academicPeriodStatus.findMany({
      where: { academicYearId: year.id },
      include: { classroom: { select: { grade: true, section: true, educationLevel: true } } },
    });
    return {
      academicYearId: year.id,
      year: year.year,
      annualCalculationMode: year.annualCalculationMode,
      periods: Array.from({ length: periodCount(year) }, (_, i) => {
        const n = i + 1;
        const school = statuses.find((s) => s.classroomId === null && s.periodNumber === n);
        const range = getPeriodDateRange(year, n);
        return {
          periodNumber: n,
          name: periodName(year, n),
          startDate: range.startDate,
          endDate: range.endDate,
          status: (school?.status ?? 'OPEN') as PeriodState,
          gradingDeadline: school?.gradingDeadline ?? null,
          reason: school?.reason ?? null,
          changedAt: school?.changedAt ?? null,
          overrides: statuses
            .filter((s) => s.classroomId !== null && s.periodNumber === n)
            .map((s) => ({ classroomId: s.classroomId!, classroom: s.classroom, status: s.status, reason: s.reason })),
        };
      }),
    };
  }

  async getEffectiveStatus(academicYearId: string, periodNumber: number, classroomId: string): Promise<PeriodState> {
    const rows = await prisma.academicPeriodStatus.findMany({
      where: { academicYearId, periodNumber, OR: [{ classroomId }, { classroomId: null }] },
    });
    return rows.find((r) => r.classroomId === classroomId)?.status ?? rows.find((r) => r.classroomId === null)?.status ?? 'OPEN';
  }

  async setStatus(
    schoolId: string,
    userId: string,
    input: SetPeriodStatusInput,
    pending?: { missingGrades: number; missingConclusions: number },
  ) {
    const year = await resolveYear(schoolId, input.academicYearId);
    assertPeriod(year, input.periodNumber);
    if (input.classroomId) {
      const classroom = await prisma.classroom.findFirst({ where: { id: input.classroomId, schoolId } });
      if (!classroom) throw new AppError('Aula no encontrada.', 404);
    }
    if (input.force && !input.reason?.trim()) throw new AppError('Indica el motivo para cerrar con pendientes.', 400);
    if (input.status === 'CLOSED' && pending && (pending.missingGrades > 0 || pending.missingConclusions > 0) && !input.force) {
      throw new AppError(
        `No se puede cerrar: faltan ${pending.missingGrades} calificativos y ${pending.missingConclusions} conclusiones. Revisa el avance o cierra indicando el motivo.`,
        409,
      );
    }
    const data = {
      status: input.status,
      reason: input.reason?.trim() || null,
      changedById: userId,
      changedAt: new Date(),
      ...(input.gradingDeadline !== undefined ? { gradingDeadline: input.gradingDeadline ? new Date(input.gradingDeadline) : null } : {}),
    };
    const existing = await prisma.academicPeriodStatus.findFirst({
      where: { academicYearId: year.id, periodNumber: input.periodNumber, classroomId: input.classroomId ?? null },
    });
    return existing
      ? prisma.academicPeriodStatus.update({ where: { id: existing.id }, data })
      : prisma.academicPeriodStatus.create({
          data: { schoolId, academicYearId: year.id, periodNumber: input.periodNumber, classroomId: input.classroomId ?? null, ...data },
        });
  }
}
```

Commit: `feat(academico): bloque 8 - estados de periodo por anio`

---

## BLOQUE 9 — Backend: registro de notas y resultados

### 9.1 `back/src/modules/academic/results.service.ts`

```ts
import type { EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { computeCompetencePeriod, type ResultLetter } from './grade-engine';
import { getThresholds, periodCount } from './academic.context';

export interface ResultDto {
  enrollmentId: string;
  competenceId: string;
  computedScore: number | null;
  suggestedLetter: ResultLetter | null;
  finalLetter: ResultLetter | null;
  isOverridden: boolean;
}

const keyOf = (enrollmentId: string, competenceId: string) => `${enrollmentId}|${competenceId}`;

export class ResultsService {
  /** Peso efectivo de cada criterio en un curso: el del curso si existe, si no el del criterio. */
  async criterionWeights(courseAssignmentId: string): Promise<Map<string, number>> {
    const links = await prisma.courseAssignmentCriterion.findMany({
      where: { courseAssignmentId },
      include: { criterion: { select: { id: true, weight: true } } },
    });
    const map = new Map<string, number>();
    links.forEach((l) => map.set(l.criterionId, l.weight ?? l.criterion.weight ?? 1));
    if (map.size === 0) {
      const assignment = await prisma.courseAssignment.findUnique({ where: { id: courseAssignmentId }, select: { schoolId: true } });
      const criteria = await prisma.evaluationCriterion.findMany({ where: { schoolId: assignment?.schoolId }, select: { id: true, weight: true } });
      criteria.forEach((c) => map.set(c.id, c.weight ?? 1));
    }
    return map;
  }

  /** Recalcula los resultados de un curso y periodo. Conserva los ajustes manuales del docente. */
  async recompute(
    schoolId: string,
    courseAssignmentId: string,
    periodNumber: number,
    pairs?: Array<{ enrollmentId: string; competenceId: string }>,
  ): Promise<ResultDto[]> {
    const assignment = await prisma.courseAssignment.findUnique({
      where: { id: courseAssignmentId },
      select: { id: true, schoolId: true, classroom: { select: { educationLevel: true } } },
    });
    if (!assignment || assignment.schoolId !== schoolId) throw new AppError('Curso no encontrado.', 404);
    const thresholds = await getThresholds(schoolId, assignment.classroom.educationLevel as EducationLevel);
    const weights = await this.criterionWeights(courseAssignmentId);
    const pairFilter = pairs && pairs.length > 0
      ? { OR: pairs.map((p) => ({ enrollmentId: p.enrollmentId, competenceId: p.competenceId })) }
      : {};
    const where = { courseAssignmentId, periodNumber, ...pairFilter };
    const [grades, existing] = await Promise.all([
      prisma.detailedGrade.findMany({
        where,
        select: { enrollmentId: true, competenceId: true, criterionId: true, numericScore: true, literalScore: true, isExonerated: true },
      }),
      prisma.competencePeriodResult.findMany({ where }),
    ]);
    const keys = new Set<string>([
      ...grades.map((g) => keyOf(g.enrollmentId, g.competenceId)),
      ...existing.map((r) => keyOf(r.enrollmentId, r.competenceId)),
      ...(pairs ?? []).map((p) => keyOf(p.enrollmentId, p.competenceId)),
    ]);
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    const out: ResultDto[] = [];
    for (const key of keys) {
      const [enrollmentId, competenceId] = key.split('|');
      const mine = grades.filter((g) => g.enrollmentId === enrollmentId && g.competenceId === competenceId);
      const { computedScore, suggestedLetter } = computeCompetencePeriod(
        mine.map((g) => ({ weight: weights.get(g.criterionId) ?? 1, numericScore: g.numericScore, literalScore: g.literalScore, isExonerated: g.isExonerated })),
        thresholds,
      );
      const prev = existing.find((r) => r.enrollmentId === enrollmentId && r.competenceId === competenceId);
      if (!prev && suggestedLetter === null) continue;
      if (prev && suggestedLetter === null && !prev.isOverridden) {
        ops.push(prisma.competencePeriodResult.delete({ where: { id: prev.id } }));
        out.push({ enrollmentId, competenceId, computedScore: null, suggestedLetter: null, finalLetter: null, isOverridden: false });
        continue;
      }
      const keepOverride = !!prev?.isOverridden && prev.finalLetter !== suggestedLetter;
      const finalLetter = (keepOverride ? prev!.finalLetter : suggestedLetter) as ResultLetter | null;
      ops.push(
        prisma.competencePeriodResult.upsert({
          where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: { enrollmentId, courseAssignmentId, competenceId, periodNumber } },
          update: {
            computedScore, suggestedLetter, finalLetter, isOverridden: keepOverride,
            ...(keepOverride ? {} : { overriddenById: null, overriddenAt: null }),
          },
          create: { schoolId, enrollmentId, courseAssignmentId, competenceId, periodNumber, computedScore, suggestedLetter, finalLetter, isOverridden: false },
        }),
      );
      out.push({ enrollmentId, competenceId, computedScore, suggestedLetter, finalLetter, isOverridden: keepOverride });
    }
    if (ops.length > 0) await prisma.$transaction(ops);
    return out;
  }

  async recomputeAssignment(schoolId: string, courseAssignmentId: string): Promise<void> {
    const a = await prisma.courseAssignment.findUnique({ where: { id: courseAssignmentId }, include: { academicYear: true } });
    if (!a?.academicYear) return;
    for (let p = 1; p <= periodCount(a.academicYear); p++) await this.recompute(schoolId, courseAssignmentId, p);
  }

  /** Recalcula todo un nivel del año activo (por ejemplo, al cambiar la escala del colegio). */
  async recomputeSchoolLevel(schoolId: string, level: EducationLevel): Promise<number> {
    const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!year) return 0;
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, deletedAt: null, classroom: { educationLevel: level } },
      select: { id: true },
    });
    for (const a of assignments) await this.recomputeAssignment(schoolId, a.id);
    return assignments.length;
  }
}
```

### 9.2 `back/src/modules/academic/gradebook.service.ts`

```ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { CONCLUSION_MAX_LENGTH, isResultLetter, sanitizeConclusion, type ResultLetter } from './grade-engine';
import {
  assertPeriod, fullNameOf, getThresholds, isAdmin, loadAssignmentForUser, shortNameOf, sortCompetences, type AcademicUser,
} from './academic.context';
import { PeriodService } from './period.service';
import { ResultsService } from './results.service';

export interface ScoreItem {
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  numericScore: number | null;
  literalScore: 'AD' | 'A' | 'B' | 'C' | 'EXO' | null;
}

type LoadedAssignment = Awaited<ReturnType<typeof loadAssignmentForUser>>;

export class GradebookService {
  private readonly periods = new PeriodService();
  private readonly results = new ResultsService();

  async getCourseCriteria(schoolId: string, assignment: LoadedAssignment) {
    const links = await prisma.courseAssignmentCriterion.findMany({
      where: { courseAssignmentId: assignment.id, criterion: { isActive: true } },
      include: { criterion: true },
      orderBy: { criterion: { order: 'asc' } },
    });
    if (links.length > 0) {
      return links.map((l) => ({ id: l.criterion.id, name: l.criterion.name, shortName: l.criterion.shortName, weight: l.weight ?? l.criterion.weight, isCustom: true }));
    }
    const criteria = await prisma.evaluationCriterion.findMany({
      where: { schoolId, isActive: true, OR: [{ educationLevel: null }, { educationLevel: assignment.classroom.educationLevel }] },
      orderBy: { order: 'asc' },
    });
    return criteria.map((c) => ({ id: c.id, name: c.name, shortName: c.shortName, weight: c.weight, isCustom: false }));
  }

  private async activeEnrollmentIds(schoolId: string, a: LoadedAssignment): Promise<Set<string>> {
    const rows = await prisma.enrollment.findMany({
      where: { schoolId, classroomId: a.classroomId, academicYearId: a.academicYearId, isActive: true, enrollmentState: 'REGISTERED' },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  private async assertEditable(user: AcademicUser, a: LoadedAssignment, periodNumber: number, reason?: string | null) {
    assertPeriod(a.academicYear, periodNumber);
    const status = await this.periods.getEffectiveStatus(a.academicYearId, periodNumber, a.classroomId);
    if (status === 'OPEN') return status;
    if (!isAdmin(user)) {
      throw new AppError(
        `El periodo está ${status === 'REVIEW' ? 'en revisión' : 'cerrado'}. Pide a la Dirección que lo reabra si necesitas corregir.`,
        403,
      );
    }
    if (!reason?.trim()) throw new AppError('El periodo no está abierto: indica el motivo de la corrección.', 409);
    return status;
  }

  async getGradebook(schoolId: string, user: AcademicUser, assignmentId: string, periodNumber: number) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId);
    assertPeriod(a.academicYear, periodNumber);
    const level = a.classroom.educationLevel;
    const competences = sortCompetences(level, a.area.officialAreaCode, a.area.competences);
    const [enrollments, criteria, scores, results, conclusions, status, thresholds] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          schoolId, classroomId: a.classroomId, academicYearId: a.academicYearId,
          OR: [{ isActive: true }, { enrollmentState: { in: ['TRANSFERRED', 'WITHDRAWN'] } }],
        },
        select: {
          id: true, enrollmentState: true,
          student: { select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true, studentCode: true, documentId: true } },
        },
        orderBy: [{ student: { lastNamePaternal: 'asc' } }, { student: { lastNameMaternal: 'asc' } }, { student: { firstNames: 'asc' } }],
      }),
      this.getCourseCriteria(schoolId, a),
      prisma.detailedGrade.findMany({
        where: { courseAssignmentId: a.id, periodNumber },
        select: { enrollmentId: true, competenceId: true, criterionId: true, numericScore: true, literalScore: true, isExonerated: true },
      }),
      prisma.competencePeriodResult.findMany({
        where: { courseAssignmentId: a.id, periodNumber },
        select: { enrollmentId: true, competenceId: true, computedScore: true, suggestedLetter: true, finalLetter: true, isOverridden: true },
      }),
      prisma.competenceConclusion.findMany({
        where: { courseAssignmentId: a.id, periodNumber },
        select: { enrollmentId: true, competenceId: true, conclusion: true },
      }),
      this.periods.getEffectiveStatus(a.academicYearId, periodNumber, a.classroomId),
      getThresholds(schoolId, level),
    ]);
    return {
      assignment: {
        id: a.id,
        academicYearId: a.academicYearId,
        classroom: { id: a.classroom.id, educationLevel: level, grade: a.classroom.grade, section: a.classroom.section },
        area: { id: a.area.id, name: a.area.name, kind: a.area.kind, officialAreaCode: a.area.officialAreaCode },
        teacher: a.teacher,
      },
      periodNumber,
      periodCount: a.academicYear.periodType === 'TRIMESTER' ? 3 : 4,
      periodStatus: status,
      canEdit: user.role !== 'ADMINISTRATIVE' && (status === 'OPEN' || isAdmin(user)),
      requiresReason: status !== 'OPEN',
      competences: competences.map((c) => ({ id: c.id, cnebNumber: c.cnebNumber, name: c.name, shortName: shortNameOf(c) })),
      criteria,
      students: enrollments.map((e) => ({
        enrollmentId: e.id, state: e.enrollmentState, fullName: fullNameOf(e.student), studentCode: e.student.studentCode, documentId: e.student.documentId,
      })),
      scores,
      results,
      conclusions,
      conclusionMaxLength: CONCLUSION_MAX_LENGTH,
      thresholds,
    };
  }

  async saveScores(schoolId: string, user: AcademicUser, assignmentId: string, periodNumber: number, items: ScoreItem[], reason?: string | null) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    await this.assertEditable(user, a, periodNumber, reason);
    if (items.length === 0) return { saved: 0, results: [] };
    const compIds = new Set(a.area.competences.map((c) => c.id));
    const critIds = new Set((await this.getCourseCriteria(schoolId, a)).map((c) => c.id));
    const enrollmentIds = await this.activeEnrollmentIds(schoolId, a);
    for (const it of items) {
      if (!compIds.has(it.competenceId)) throw new AppError('Hay notas para competencias que no pertenecen a este curso.', 400);
      if (!critIds.has(it.criterionId)) throw new AppError('Hay notas para criterios que no se usan en este curso.', 400);
      if (!enrollmentIds.has(it.enrollmentId)) throw new AppError('Hay notas para estudiantes que no están matriculados en esta aula.', 400);
      if (it.numericScore !== null && (it.numericScore < 0 || it.numericScore > 20)) throw new AppError('Las notas numéricas van de 0 a 20.', 400);
    }
    await prisma.$transaction(
      items.map((it) => {
        const key = { enrollmentId: it.enrollmentId, courseAssignmentId: a.id, competenceId: it.competenceId, criterionId: it.criterionId, periodNumber };
        if (it.numericScore === null && it.literalScore === null) return prisma.detailedGrade.deleteMany({ where: key });
        const isExo = it.literalScore === 'EXO';
        const data = { numericScore: isExo ? null : it.numericScore, literalScore: it.literalScore, isExonerated: isExo };
        return prisma.detailedGrade.upsert({
          where: { enrollmentId_courseAssignmentId_competenceId_criterionId_periodNumber: key },
          update: data,
          create: { schoolId, ...key, ...data },
        });
      }),
    );
    const pairs = [...new Map(items.map((i) => [`${i.enrollmentId}|${i.competenceId}`, { enrollmentId: i.enrollmentId, competenceId: i.competenceId }])).values()];
    const results = await this.results.recompute(schoolId, a.id, periodNumber, pairs);
    return { saved: items.length, results };
  }

  async setFinalLetter(
    schoolId: string,
    user: AcademicUser,
    assignmentId: string,
    periodNumber: number,
    input: { enrollmentId: string; competenceId: string; finalLetter: ResultLetter | null },
    reason?: string | null,
  ) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    await this.assertEditable(user, a, periodNumber, reason);
    if (!a.area.competences.some((c) => c.id === input.competenceId)) throw new AppError('La competencia no pertenece a este curso.', 400);
    if (!(await this.activeEnrollmentIds(schoolId, a)).has(input.enrollmentId)) throw new AppError('El estudiante no está matriculado en esta aula.', 400);
    if (input.finalLetter !== null && !isResultLetter(input.finalLetter)) throw new AppError('Calificativo no válido.', 400);
    const key = { enrollmentId: input.enrollmentId, courseAssignmentId: a.id, competenceId: input.competenceId, periodNumber };
    const prev = await prisma.competencePeriodResult.findUnique({ where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key } });
    if (input.finalLetter === null) {
      if (!prev) return null;
      if (prev.suggestedLetter === null) {
        await prisma.competencePeriodResult.delete({ where: { id: prev.id } });
        return null;
      }
      return prisma.competencePeriodResult.update({
        where: { id: prev.id },
        data: { finalLetter: prev.suggestedLetter, isOverridden: false, overriddenById: null, overriddenAt: null },
      });
    }
    const isOverridden = input.finalLetter !== (prev?.suggestedLetter ?? null);
    return prisma.competencePeriodResult.upsert({
      where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key },
      update: { finalLetter: input.finalLetter, isOverridden, overriddenById: isOverridden ? user.userId : null, overriddenAt: isOverridden ? new Date() : null },
      create: { schoolId, ...key, finalLetter: input.finalLetter, isOverridden: true, overriddenById: user.userId, overriddenAt: new Date() },
    });
  }

  async saveConclusions(
    schoolId: string,
    user: AcademicUser,
    assignmentId: string,
    periodNumber: number,
    items: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>,
    reason?: string | null,
  ) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    await this.assertEditable(user, a, periodNumber, reason);
    const compIds = new Set(a.area.competences.map((c) => c.id));
    const enrollmentIds = await this.activeEnrollmentIds(schoolId, a);
    for (const it of items) {
      if (!compIds.has(it.competenceId)) throw new AppError('La competencia no pertenece a este curso.', 400);
      if (!enrollmentIds.has(it.enrollmentId)) throw new AppError('El estudiante no está matriculado en esta aula.', 400);
    }
    await prisma.$transaction(
      items.map((it) => {
        const key = { enrollmentId: it.enrollmentId, courseAssignmentId: a.id, competenceId: it.competenceId, periodNumber };
        const text = sanitizeConclusion(it.conclusion);
        if (!text) return prisma.competenceConclusion.deleteMany({ where: key });
        return prisma.competenceConclusion.upsert({
          where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key },
          update: { conclusion: text },
          create: { schoolId, ...key, conclusion: text },
        });
      }),
    );
    return { saved: items.length };
  }

  async setCourseCriteria(schoolId: string, user: AcademicUser, assignmentId: string, criteria: Array<{ criterionId: string; weight?: number | null }>) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    const ids = criteria.map((c) => c.criterionId);
    if (new Set(ids).size !== ids.length) throw new AppError('Hay criterios repetidos.', 400);
    const valid = await prisma.evaluationCriterion.count({
      where: { id: { in: ids }, schoolId, isActive: true, OR: [{ educationLevel: null }, { educationLevel: a.classroom.educationLevel }] },
    });
    if (valid !== ids.length) throw new AppError('Hay criterios que no pertenecen al colegio o al nivel.', 400);
    const current = await this.getCourseCriteria(schoolId, a);
    const removed = current.filter((c) => !ids.includes(c.id)).map((c) => c.id);
    if (ids.length > 0 && removed.length > 0) {
      const used = await prisma.detailedGrade.count({ where: { courseAssignmentId: a.id, criterionId: { in: removed } } });
      if (used > 0) throw new AppError('Algún criterio que quitaste ya tiene notas en este curso. Borra esas notas primero.', 409);
    }
    await prisma.$transaction([
      prisma.courseAssignmentCriterion.deleteMany({ where: { courseAssignmentId: a.id } }),
      prisma.courseAssignmentCriterion.createMany({
        data: criteria.map((c) => ({ courseAssignmentId: a.id, criterionId: c.criterionId, weight: c.weight && c.weight > 0 ? c.weight : null })),
      }),
    ]);
    await this.results.recomputeAssignment(schoolId, a.id);
    return { saved: criteria.length };
  }
}
```

### 9.3 Script de recálculo

Crea `back/scripts/academic-recompute.ts`:

```ts
/** Recalcula CompetencePeriodResult para todas las asignaciones vigentes de todos los colegios. */
import { prisma } from '../src/config/prisma';
import { ResultsService } from '../src/modules/academic/results.service';

async function main() {
  const service = new ResultsService();
  const assignments = await prisma.courseAssignment.findMany({
    where: { deletedAt: null, academicYear: { isActive: true } },
    select: { id: true, schoolId: true },
  });
  for (const a of assignments) await service.recomputeAssignment(a.schoolId, a.id);
  console.log(`Recalculadas ${assignments.length} asignaciones.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
```

Ejecuta `cd back && pnpm academic:recompute` y verifica que termine sin errores.

### 9.4 La escala del colegio recalcula los resultados

En `back/src/modules/grades/grade.service.ts`, método `updateGradingScale(schoolId, level, thresholds)`, después de guardar la escala:
```ts
clearThresholds(schoolId);
await new ResultsService().recomputeSchoolLevel(schoolId, level);
```
Importa `clearThresholds` desde `'../academic/academic.context'` y `ResultsService` desde `'../academic/results.service'`.

Commit: `feat(academico): bloque 9 - registro de notas con nota de juicio y resultados`

---

## BLOQUE 10 — Backend: consolidado, libreta, avance y API

### 10.1 `back/src/modules/academic/consolidation.service.ts`

```ts
import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { evaluateFinalSituation, type Letter, type PromotionRuleOverrides } from '../grades/promotion-rules';
import { CNEB_AREAS, CNEB_COMPETENCES, competenceName, gradeLabel } from './cneb.catalog';
import {
  computeAnnual, consolidateOfficialCompetence, isLetter, isResultLetter, needsConclusion, sanitizeConclusion,
  type AnnualMode, type ResultLetter,
} from './grade-engine';
import { assertPeriod, fullNameOf, getThresholds, periodCount, resolveYear } from './academic.context';

export type ConsolidationPeriod = number | 'FINAL';

export interface ConsolidationIssue {
  type: 'COURSE_WITHOUT_TEACHER' | 'MISSING_GRADE' | 'MISSING_CONCLUSION' | 'MISSING_STUDENT_CODE';
  message: string;
  enrollmentId?: string;
  areaCode?: string;
  cnebNumber?: number;
}

export class ConsolidationService {
  async getClassroomConsolidation(schoolId: string, classroomId: string, period: ConsolidationPeriod, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: { tutorTeacher: { select: { firstName: true, lastNamePaternal: true, lastNameMaternal: true } } },
    });
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    const level = classroom.educationLevel as EducationLevel;
    if (period !== 'FINAL') assertPeriod(year, period);
    const periods = period === 'FINAL' ? Array.from({ length: periodCount(year) }, (_, i) => i + 1) : [period];
    const thresholds = await getThresholds(schoolId, level);

    const [school, plan, assignments, enrollments] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, modularCode: true, documentId: true, address: true, logoUrl: true } }),
      prisma.studyPlanCourse.findMany({
        where: { academicYearId: year.id, educationLevel: level, grade: classroom.grade },
        include: { area: { select: { id: true, name: true, kind: true, officialAreaCode: true } } },
      }),
      prisma.courseAssignment.findMany({
        where: { schoolId, classroomId, academicYearId: year.id, deletedAt: null },
        include: {
          area: { include: { competences: { where: { isActive: true } } } },
          teacher: { select: { firstName: true, lastNamePaternal: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: { schoolId, classroomId, academicYearId: year.id },
        include: { student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true, studentCode: true, documentId: true } } },
        orderBy: [{ student: { lastNamePaternal: 'asc' } }, { student: { lastNameMaternal: 'asc' } }, { student: { firstNames: 'asc' } }],
      }),
    ]);
    const official = assignments.filter((a) => a.area.kind !== 'WORKSHOP' && a.area.officialAreaCode);
    const [results, conclusions] = await Promise.all([
      prisma.competencePeriodResult.findMany({ where: { courseAssignmentId: { in: official.map((a) => a.id) }, periodNumber: { in: periods } } }),
      prisma.competenceConclusion.findMany({ where: { courseAssignmentId: { in: official.map((a) => a.id) }, periodNumber: { in: periods } } }),
    ]);

    const planCodes = new Set(plan.filter((p) => p.area.kind !== 'WORKSHOP').map((p) => p.area.officialAreaCode));
    const areas = CNEB_AREAS[level].filter((a) => planCodes.has(a.code));
    const consolidatedAreas = areas.map((area) => {
      const tributary = official.filter((a) => a.area.officialAreaCode === area.code);
      return {
        id: area.code,
        code: area.code,
        name: area.name,
        isSubdivided: tributary.some((t) => t.area.kind === 'SUBCOURSE'),
        tributaryCourses: tributary.map((t) => t.area.name),
        competences: area.competences.map((n) => ({ id: `${area.code}_C${n}`, number: n, name: competenceName(n), shortName: CNEB_COMPETENCES[n].shortName })),
      };
    });

    const issues: ConsolidationIssue[] = [];
    for (const p of plan) {
      if (!assignments.some((a) => a.areaId === p.areaId)) {
        issues.push({ type: 'COURSE_WITHOUT_TEACHER', message: `"${p.area.name}" no tiene docente asignado en esta aula.` });
      }
    }

    const mode = (year.annualCalculationMode === 'AVERAGE' ? 'AVERAGE' : 'LAST_PERIOD') as AnnualMode;
    const students = enrollments.map((enr, idx) => {
      const fullName = fullNameOf(enr.student);
      const inactive = enr.enrollmentState !== 'REGISTERED';
      const consolidatedGrades: Record<string, { periodScore: null; letter: null; competences: Record<string, { score: number | null; letter: ResultLetter | null; conclusion: string }> }> = {};
      const areasForRules: Array<{ areaCode: string; letters: Letter[] }> = [];

      for (const area of areas) {
        const comps: Record<string, { score: number | null; letter: ResultLetter | null; conclusion: string }> = {};
        const letters: Letter[] = [];
        for (const n of area.competences) {
          const key = `${area.code}_C${n}`;
          if (inactive) { comps[key] = { score: null, letter: null, conclusion: '' }; continue; }
          const perPeriod = periods.map((p) => {
            const parts: Array<{ finalLetter: ResultLetter | null; computedScore: number | null; isOverridden: boolean; weight: number }> = [];
            const texts: string[] = [];
            for (const a of official.filter((x) => x.area.officialAreaCode === area.code)) {
              const comp = a.area.competences.find((c) => c.cnebNumber === n);
              if (!comp) continue;
              const r = results.find((x) => x.enrollmentId === enr.id && x.courseAssignmentId === a.id && x.competenceId === comp.id && x.periodNumber === p);
              parts.push({
                finalLetter: isResultLetter(r?.finalLetter) ? (r!.finalLetter as ResultLetter) : null,
                computedScore: r?.computedScore ?? null,
                isOverridden: r?.isOverridden ?? false,
                weight: comp.weight,
              });
              const c = conclusions.find((x) => x.enrollmentId === enr.id && x.courseAssignmentId === a.id && x.competenceId === comp.id && x.periodNumber === p);
              if (c?.conclusion?.trim()) texts.push(c.conclusion.trim());
            }
            const res = consolidateOfficialCompetence(parts, thresholds);
            return { ...res, conclusion: sanitizeConclusion(texts.join(' ')) };
          });
          const letter = period === 'FINAL' ? computeAnnual(perPeriod.map((x) => x.letter), mode, thresholds) : perPeriod[0].letter;
          const score = period === 'FINAL' ? null : perPeriod[0].score;
          const conclusion = perPeriod[perPeriod.length - 1]?.conclusion ?? '';
          comps[key] = { score, letter, conclusion };
          if (isLetter(letter)) letters.push(letter);
          if (letter === null) {
            issues.push({ type: 'MISSING_GRADE', enrollmentId: enr.id, areaCode: area.code, cnebNumber: n, message: `${fullName}: falta el calificativo de "${CNEB_COMPETENCES[n].shortName}" (${area.name}).` });
          } else if (needsConclusion(letter) && !conclusion) {
            issues.push({ type: 'MISSING_CONCLUSION', enrollmentId: enr.id, areaCode: area.code, cnebNumber: n, message: `${fullName}: falta la conclusión descriptiva de "${CNEB_COMPETENCES[n].shortName}" (${area.name}, ${letter}).` });
          }
        }
        consolidatedGrades[area.code] = { periodScore: null, letter: null, competences: comps };
        areasForRules.push({ areaCode: area.code, letters });
      }
      if (!inactive && !/^\d{14}$/.test(enr.student.studentCode ?? '')) {
        issues.push({ type: 'MISSING_STUDENT_CODE', enrollmentId: enr.id, message: `${fullName}: no tiene código de estudiante SIAGIE válido (14 dígitos).` });
      }
      const evaluation = period === 'FINAL'
        ? evaluateFinalSituation(
            { educationLevel: level, grade: classroom.grade, enrollmentState: enr.enrollmentState, areas: areasForRules },
            (year.promotionRulesConfig ?? null) as PromotionRuleOverrides | null,
          )
        : null;
      return {
        enrollmentId: enr.id,
        enrollmentState: enr.enrollmentState,
        orderIndex: idx + 1,
        documentId: enr.student.documentId ?? '',
        studentCode: enr.student.studentCode,
        fullName,
        courseGrades: {},
        consolidatedGrades,
        generalScore: null,
        generalLetter: null,
        finalSituation: evaluation?.situation ?? null,
        failedAreasCount: evaluation?.failedAreasCount ?? 0,
        finalSituationIsProvisional: true,
      };
    });

    const tutor = classroom.tutorTeacher;
    return {
      school,
      classroom: {
        id: classroom.id, educationLevel: level, grade: classroom.grade, section: classroom.section,
        label: `${gradeLabel(level, classroom.grade)} "${classroom.section}"`,
        tutor: tutor ? `${tutor.firstName} ${tutor.lastNamePaternal} ${tutor.lastNameMaternal ?? ''}`.trim() : null,
      },
      academicYear: { id: year.id, year: year.year, annualCalculationMode: mode },
      period,
      matrix: { courses: [], students, consolidatedAreas },
      issues,
      summary: {
        totalStudents: students.filter((s) => s.enrollmentState === 'REGISTERED').length,
        missingGrades: issues.filter((i) => i.type === 'MISSING_GRADE').length,
        missingConclusions: issues.filter((i) => i.type === 'MISSING_CONCLUSION').length,
        missingStudentCodes: issues.filter((i) => i.type === 'MISSING_STUDENT_CODE').length,
        coursesWithoutTeacher: issues.filter((i) => i.type === 'COURSE_WITHOUT_TEACHER').length,
      },
    };
  }
}
```

### 10.2 `back/src/modules/academic/report-card.service.ts`

```ts
import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getPeriodDateRange } from '../../utils/period-dates.util';
import { gradeLabel } from './cneb.catalog';
import { isResultLetter, type ResultLetter } from './grade-engine';
import { fullNameOf, isAdmin, periodCount, periodName, shortNameOf, sortCompetences, type AcademicUser } from './academic.context';
import { ConsolidationService } from './consolidation.service';
import { PeriodService } from './period.service';

const SCALE_LEGEND = [
  { letter: 'AD', label: 'Logro destacado' },
  { letter: 'A', label: 'Logro esperado' },
  { letter: 'B', label: 'En proceso' },
  { letter: 'C', label: 'En inicio' },
];

export class ReportCardService {
  private readonly consolidation = new ConsolidationService();
  private readonly periods = new PeriodService();

  async getReportCard(schoolId: string, user: AcademicUser, enrollmentId: string) {
    const enr = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: { include: { familyRelations: { select: { userId: true } } } },
        classroom: { include: { tutorTeacher: { select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true } } } },
        academicYear: true,
      },
    });
    if (!enr) throw new AppError('Matrícula no encontrada.', 404);

    // Permisos
    if (user.role === 'STUDENT' && enr.studentId !== (user.studentId || user.userId)) throw new AppError('No tienes permisos para ver esta libreta.', 403);
    if (user.role === 'PARENT' && !enr.student.familyRelations.some((r) => r.userId === user.userId)) throw new AppError('No tienes permisos para ver esta libreta.', 403);
    if (user.role === 'TEACHER') {
      const teaches = await prisma.courseAssignment.count({ where: { classroomId: enr.classroomId, academicYearId: enr.academicYearId, teacherId: user.userId, deletedAt: null } });
      if (enr.classroom.tutorTeacherId !== user.userId && teaches === 0) throw new AppError('No tienes permisos para ver esta libreta.', 403);
    }
    if (!['STUDENT', 'PARENT', 'TEACHER', 'ADMINISTRATIVE'].includes(user.role) && !isAdmin(user)) throw new AppError('No tienes permisos para ver esta libreta.', 403);

    const year = enr.academicYear;
    const level = enr.classroom.educationLevel as EducationLevel;
    const total = periodCount(year);
    const statuses = await Promise.all(
      Array.from({ length: total }, (_, i) => this.periods.getEffectiveStatus(year.id, i + 1, enr.classroomId)),
    );
    const familyView = user.role === 'PARENT' || user.role === 'STUDENT';
    const visiblePeriods = statuses.map((s, i) => ({ n: i + 1, s })).filter((x) => !familyView || x.s === 'CLOSED').map((x) => x.n);
    const allClosed = statuses.every((s) => s === 'CLOSED');

    // Áreas oficiales (por periodo visible y final)
    const perPeriod = await Promise.all(visiblePeriods.map((p) => this.consolidation.getClassroomConsolidation(schoolId, enr.classroomId, p, year.id)));
    const final = allClosed || !familyView ? await this.consolidation.getClassroomConsolidation(schoolId, enr.classroomId, 'FINAL', year.id) : null;
    const base = final ?? perPeriod[0] ?? null;
    const officialAreas = (base?.matrix.consolidatedAreas ?? []).map((area) => ({
      code: area.code,
      name: area.name,
      competences: area.competences.map((c) => {
        const letters: Record<number, ResultLetter | null> = {};
        const conclusions: Record<number, string> = {};
        visiblePeriods.forEach((p, i) => {
          const st = perPeriod[i].matrix.students.find((s) => s.enrollmentId === enr.id);
          const g = st?.consolidatedGrades[area.code]?.competences[c.id];
          letters[p] = g?.letter ?? null;
          conclusions[p] = g?.conclusion ?? '';
        });
        const fst = final?.matrix.students.find((s) => s.enrollmentId === enr.id);
        return {
          number: c.number,
          name: c.name,
          shortName: c.shortName,
          letters,
          conclusions,
          finalLetter: allClosed ? fst?.consolidatedGrades[area.code]?.competences[c.id]?.letter ?? null : null,
        };
      }),
    }));
    const finalStudent = final?.matrix.students.find((s) => s.enrollmentId === enr.id);

    // Cursos internos (sub-cursos y talleres)
    const internal = await prisma.courseAssignment.findMany({
      where: { classroomId: enr.classroomId, academicYearId: year.id, deletedAt: null, area: { kind: { in: ['SUBCOURSE', 'WORKSHOP'] } } },
      include: {
        area: { include: { competences: { where: { isActive: true } } } },
        teacher: { select: { firstName: true, lastNamePaternal: true } },
      },
      orderBy: { area: { name: 'asc' } },
    });
    const internalResults = await prisma.competencePeriodResult.findMany({
      where: { enrollmentId: enr.id, courseAssignmentId: { in: internal.map((a) => a.id) }, periodNumber: { in: visiblePeriods } },
    });
    const internalCourses = internal.map((a) => ({
      name: a.area.name,
      kind: a.area.kind,
      teacher: `${a.teacher.firstName} ${a.teacher.lastNamePaternal}`,
      competences: sortCompetences(level, a.area.officialAreaCode, a.area.competences).map((c) => {
        const letters: Record<number, ResultLetter | null> = {};
        visiblePeriods.forEach((p) => {
          const r = internalResults.find((x) => x.courseAssignmentId === a.id && x.competenceId === c.id && x.periodNumber === p);
          letters[p] = isResultLetter(r?.finalLetter) ? (r!.finalLetter as ResultLetter) : null;
        });
        return { name: shortNameOf(c), letters };
      }),
    }));

    // Asistencia por periodo
    const attendance = await Promise.all(
      visiblePeriods.map(async (p) => {
        const range = getPeriodDateRange(year, p);
        const rows = await prisma.attendance.groupBy({
          by: ['status'],
          where: { enrollmentId: enr.id, date: { gte: range.startDate, lte: range.endDate } },
          _count: { _all: true },
        });
        const count = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
        return {
          periodNumber: p,
          absentJustified: count('ABSENT_JUSTIFIED'),
          absentUnjustified: count('ABSENT_UNJUSTIFIED'),
          lateJustified: count('LATE_JUSTIFIED'),
          lateUnjustified: count('LATE_UNJUSTIFIED'),
        };
      }),
    );

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, modularCode: true, documentId: true, address: true, logoUrl: true } });
    const tutor = enr.classroom.tutorTeacher;
    return {
      school,
      student: { fullName: fullNameOf(enr.student), studentCode: enr.student.studentCode, documentId: enr.student.documentId },
      classroom: { educationLevel: level, grade: enr.classroom.grade, section: enr.classroom.section, label: `${gradeLabel(level, enr.classroom.grade)} "${enr.classroom.section}"` },
      academicYear: { year: year.year, annualCalculationMode: year.annualCalculationMode },
      tutor: tutor ? `${tutor.firstName} ${tutor.lastNamePaternal} ${tutor.lastNameMaternal ?? ''}`.trim() : null,
      periods: statuses.map((s, i) => ({ periodNumber: i + 1, name: periodName(year, i + 1), status: s })),
      visiblePeriods,
      officialAreas,
      internalCourses,
      attendance,
      finalSituation: allClosed ? finalStudent?.finalSituation ?? null : null,
      scaleLegend: SCALE_LEGEND,
    };
  }

  /** Libretas de todo un aula (vista de impresión). */
  async getClassroomReportCards(schoolId: string, user: AcademicUser, classroomId: string) {
    const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!year) throw new AppError('No hay un año lectivo activo.', 409);
    const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId } });
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    if (user.role === 'TEACHER' && classroom.tutorTeacherId !== user.userId) throw new AppError('Solo el tutor o tutora del aula puede imprimir sus libretas.', 403);
    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, classroomId, academicYearId: year.id, enrollmentState: 'REGISTERED' },
      include: { student: { select: { lastNamePaternal: true, lastNameMaternal: true, firstNames: true } } },
      orderBy: [{ student: { lastNamePaternal: 'asc' } }, { student: { lastNameMaternal: 'asc' } }, { student: { firstNames: 'asc' } }],
    });
    const cards = [];
    for (const e of enrollments) cards.push(await this.getReportCard(schoolId, user, e.id));
    return cards;
  }
}
```

### 10.3 `back/src/modules/academic/progress.service.ts`

```ts
import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { notificationService } from '../notifications/notification.routes';
import { isResultLetter, needsConclusion } from './grade-engine';
import { assertPeriod, resolveYear } from './academic.context';

export class ProgressService {
  async getProgress(schoolId: string, academicYearId: string | undefined, periodNumber: number, filters: { level?: EducationLevel; classroomId?: string | null; teacherId?: string } = {}) {
    const year = await resolveYear(schoolId, academicYearId);
    assertPeriod(year, periodNumber);
    const assignments = await prisma.courseAssignment.findMany({
      where: {
        schoolId, academicYearId: year.id, deletedAt: null,
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
        ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
        ...(filters.level ? { classroom: { educationLevel: filters.level } } : {}),
      },
      include: {
        classroom: { select: { id: true, educationLevel: true, grade: true, section: true } },
        area: { select: { name: true, kind: true, competences: { where: { isActive: true }, select: { id: true } } } },
        teacher: { select: { id: true, firstName: true, lastNamePaternal: true } },
      },
      orderBy: [{ classroom: { educationLevel: 'asc' } }, { classroom: { grade: 'asc' } }, { classroom: { section: 'asc' } }],
    });
    const classroomIds = [...new Set(assignments.map((a) => a.classroomId))];
    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, academicYearId: year.id, classroomId: { in: classroomIds }, isActive: true, enrollmentState: 'REGISTERED' },
      select: { id: true, classroomId: true },
    });
    const activeIds = new Set(enrollments.map((e) => e.id));
    const [results, conclusions] = await Promise.all([
      prisma.competencePeriodResult.findMany({
        where: { courseAssignmentId: { in: assignments.map((a) => a.id) }, periodNumber, finalLetter: { not: null } },
        select: { courseAssignmentId: true, enrollmentId: true, competenceId: true, finalLetter: true },
      }),
      prisma.competenceConclusion.findMany({
        where: { courseAssignmentId: { in: assignments.map((a) => a.id) }, periodNumber },
        select: { courseAssignmentId: true, enrollmentId: true, competenceId: true, conclusion: true },
      }),
    ]);
    const rows = assignments.map((a) => {
      const students = enrollments.filter((e) => e.classroomId === a.classroomId).length;
      const compIds = new Set(a.area.competences.map((c) => c.id));
      const expected = students * compIds.size;
      const mine = results.filter((r) => r.courseAssignmentId === a.id && activeIds.has(r.enrollmentId) && compIds.has(r.competenceId));
      const needConc = mine.filter((r) => isResultLetter(r.finalLetter) && needsConclusion(r.finalLetter));
      const missingConclusions = needConc.filter(
        (r) => !conclusions.some((c) => c.courseAssignmentId === a.id && c.enrollmentId === r.enrollmentId && c.competenceId === r.competenceId && c.conclusion.trim()),
      ).length;
      return {
        assignmentId: a.id,
        classroom: a.classroom,
        course: a.area.name,
        kind: a.area.kind,
        teacher: { id: a.teacher.id, name: `${a.teacher.firstName} ${a.teacher.lastNamePaternal}` },
        students,
        expected,
        filled: mine.length,
        percent: expected > 0 ? Math.round((mine.length * 100) / expected) : 100,
        missingGrades: Math.max(expected - mine.length, 0),
        missingConclusions,
      };
    });
    const totals = rows.reduce(
      (acc, r) => ({ expected: acc.expected + r.expected, filled: acc.filled + r.filled, missingGrades: acc.missingGrades + r.missingGrades, missingConclusions: acc.missingConclusions + r.missingConclusions }),
      { expected: 0, filled: 0, missingGrades: 0, missingConclusions: 0 },
    );
    return { academicYearId: year.id, periodNumber, rows, totals: { ...totals, percent: totals.expected ? Math.round((totals.filled * 100) / totals.expected) : 100 } };
  }

  async remindPending(schoolId: string, academicYearId: string | undefined, periodNumber: number) {
    const { rows } = await this.getProgress(schoolId, academicYearId, periodNumber);
    const byTeacher = new Map<string, { grades: number; conclusions: number }>();
    rows.forEach((r) => {
      if (r.missingGrades === 0 && r.missingConclusions === 0) return;
      const acc = byTeacher.get(r.teacher.id) ?? { grades: 0, conclusions: 0 };
      acc.grades += r.missingGrades;
      acc.conclusions += r.missingConclusions;
      byTeacher.set(r.teacher.id, acc);
    });
    for (const [teacherId, p] of byTeacher) {
      await notificationService.createNotification(schoolId, {
        userId: teacherId,
        title: 'Notas pendientes',
        message: `Tienes ${p.grades} calificativos y ${p.conclusions} conclusiones pendientes del ${periodNumber}.° periodo.`,
        type: 'ACADEMIC',
        link: '/my-courses',
      });
    }
    return { notified: byTeacher.size };
  }
}
```

> Si importar `notificationService` desde `notification.routes` genera una dependencia circular en tiempo de ejecución, crea la instancia localmente:
> ```ts
> new NotificationService(new NotificationRepository())
> ```
> con los mismos imports que usa `notification.routes.ts`.

### 10.4 `back/src/modules/academic/academic.schema.ts`

```ts
import { z } from 'zod';

const level = z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']);
const uuid = z.string().uuid();
const optionalYear = z.string().uuid().optional();
const letter = z.enum(['AD', 'A', 'B', 'C', 'EXO']);

export const studyPlanQuery = z.object({ academicYearId: optionalYear, level, grade: z.coerce.number().int() });
export const applyTemplateBody = z.object({
  academicYearId: optionalYear, level, grades: z.array(z.number().int()).min(1), includeOptional: z.array(z.string()).default([]),
});
export const subcoursesBody = z.object({
  academicYearId: optionalYear, level, grades: z.array(z.number().int()).min(1), officialAreaCode: z.string().min(2),
  subcourses: z.array(z.object({ name: z.string().trim().min(2).max(80), cnebNumbers: z.array(z.number().int()).min(1), weight: z.number().positive().max(10).optional() })).min(2),
});
export const workshopBody = z.object({
  academicYearId: optionalYear, level, grades: z.array(z.number().int()).min(1), name: z.string().trim().min(2).max(80), weeklyHours: z.number().int().min(0).max(40).nullable().optional(),
});
export const planCourseUpdateBody = z.object({ weeklyHours: z.number().int().min(0).max(40).nullable().optional(), order: z.number().int().min(0).max(999).optional() });
export const copyYearBody = z.object({ fromAcademicYearId: uuid, toAcademicYearId: uuid });
export const courseCompetencesBody = z.object({ competences: z.array(z.object({ cnebNumber: z.number().int().min(1).max(31), weight: z.number().positive().max(10).optional() })).min(1) });
export const renameCourseBody = z.object({ name: z.string().trim().min(2).max(80) });

export const teachingLoadQuery = z.object({ academicYearId: optionalYear, level });
export const teachingLoadBody = z.object({
  academicYearId: optionalYear,
  changes: z.array(z.object({ classroomId: uuid, areaId: uuid, teacherId: uuid.nullable() })).max(500),
});
export const wholeClassroomBody = z.object({ academicYearId: optionalYear, classroomId: uuid, teacherId: uuid });

export const yearQuery = z.object({ academicYearId: optionalYear });
export const periodStatusBody = z.object({
  academicYearId: optionalYear,
  periodNumber: z.number().int().min(1).max(4),
  classroomId: uuid.nullable().optional(),
  status: z.enum(['OPEN', 'REVIEW', 'CLOSED']),
  reason: z.string().trim().max(500).nullable().optional(),
  gradingDeadline: z.string().nullable().optional(),
  force: z.boolean().optional(),
});

export const gradebookQuery = z.object({ periodNumber: z.coerce.number().int().min(1).max(4) });
export const scoresBody = z.object({
  periodNumber: z.number().int().min(1).max(4),
  reason: z.string().trim().max(500).nullable().optional(),
  items: z.array(z.object({
    enrollmentId: uuid, competenceId: uuid, criterionId: uuid,
    numericScore: z.number().min(0).max(20).nullable(),
    literalScore: letter.nullable(),
  })).max(2000),
});
export const finalLetterBody = z.object({
  periodNumber: z.number().int().min(1).max(4),
  reason: z.string().trim().max(500).nullable().optional(),
  enrollmentId: uuid, competenceId: uuid, finalLetter: letter.nullable(),
});
export const conclusionsBody = z.object({
  periodNumber: z.number().int().min(1).max(4),
  reason: z.string().trim().max(500).nullable().optional(),
  items: z.array(z.object({ enrollmentId: uuid, competenceId: uuid, conclusion: z.string().max(2000) })).max(500),
});
export const courseCriteriaBody = z.object({ criteria: z.array(z.object({ criterionId: uuid, weight: z.number().positive().max(10).nullable().optional() })).max(20) });

export const progressQuery = z.object({ academicYearId: optionalYear, periodNumber: z.coerce.number().int().min(1).max(4), level: level.optional() });
export const remindBody = z.object({ academicYearId: optionalYear, periodNumber: z.number().int().min(1).max(4) });
export const consolidationQuery = z.object({
  academicYearId: optionalYear,
  classroomId: uuid,
  period: z.union([z.literal('FINAL'), z.coerce.number().int().min(1).max(4)]),
});
export const classroomQuery = z.object({ classroomId: uuid });
export const gradebookExportQuery = z.object({ assignmentId: uuid, periodNumber: z.coerce.number().int().min(1).max(4) });
```

### 10.5 `back/src/modules/academic/academic.controller.ts`

```ts
import type { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import { AppError } from '../../core/errors/app-error';
import * as S from './academic.schema';
import type { AcademicUser } from './academic.context';
import { CurriculumService } from './curriculum.service';
import { TeachingLoadService } from './teaching-load.service';
import { PeriodService } from './period.service';
import { GradebookService } from './gradebook.service';
import { ConsolidationService } from './consolidation.service';
import { ReportCardService } from './report-card.service';
import { ProgressService } from './progress.service';

const curriculum = new CurriculumService();
const load = new TeachingLoadService();
const periods = new PeriodService();
const gradebook = new GradebookService();
const consolidation = new ConsolidationService();
const reportCards = new ReportCardService();
const progress = new ProgressService();

const ctx = (req: Request) => {
  const u = req.user!;
  return { schoolId: u.schoolId, user: { userId: u.userId, role: u.role, schoolId: u.schoolId, studentId: u.studentId } as AcademicUser };
};
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ status: 'success', data });

export const academicController = {
  catalog: (_req: Request, res: Response) => ok(res, curriculum.getCatalog()),

  studyPlan: async (req: Request, res: Response) => {
    const q = S.studyPlanQuery.parse(req.query);
    ok(res, await curriculum.getStudyPlan(ctx(req).schoolId, q.academicYearId, q.level, q.grade));
  },
  applyTemplate: async (req: Request, res: Response) => {
    const b = S.applyTemplateBody.parse(req.body);
    const data = await curriculum.applyTemplate(ctx(req).schoolId, b.academicYearId, b.level, b.grades, b.includeOptional);
    recordAudit(req, { action: 'ACADEMIC_PLAN_TEMPLATE', entity: 'StudyPlan', after: b });
    ok(res, data);
  },
  createSubcourses: async (req: Request, res: Response) => {
    const b = S.subcoursesBody.parse(req.body);
    const data = await curriculum.createSubcourses(ctx(req).schoolId, b.academicYearId, b.level, b.grades, b.officialAreaCode, b.subcourses);
    recordAudit(req, { action: 'ACADEMIC_SUBCOURSES', entity: 'StudyPlan', after: b });
    ok(res, data, 201);
  },
  addWorkshop: async (req: Request, res: Response) => {
    const b = S.workshopBody.parse(req.body);
    const data = await curriculum.addWorkshop(ctx(req).schoolId, b.academicYearId, b.level, b.grades, b.name, b.weeklyHours);
    recordAudit(req, { action: 'ACADEMIC_WORKSHOP', entity: 'StudyPlan', after: b });
    ok(res, data, 201);
  },
  updatePlanCourse: async (req: Request, res: Response) => {
    const b = S.planCourseUpdateBody.parse(req.body);
    ok(res, await curriculum.updatePlanCourse(ctx(req).schoolId, String(req.params.planCourseId), b));
  },
  removePlanCourse: async (req: Request, res: Response) => {
    const data = await curriculum.removePlanCourse(ctx(req).schoolId, String(req.params.planCourseId));
    recordAudit(req, { action: 'ACADEMIC_PLAN_REMOVE', entity: 'StudyPlanCourse', entityId: String(req.params.planCourseId) });
    ok(res, data);
  },
  copyPlan: async (req: Request, res: Response) => {
    const b = S.copyYearBody.parse(req.body);
    const data = await curriculum.copyPlan(ctx(req).schoolId, b.fromAcademicYearId, b.toAcademicYearId);
    recordAudit(req, { action: 'ACADEMIC_PLAN_COPY', entity: 'StudyPlan', after: b });
    ok(res, data);
  },
  updateCourseCompetences: async (req: Request, res: Response) => {
    const b = S.courseCompetencesBody.parse(req.body);
    const data = await curriculum.updateCourseCompetences(ctx(req).schoolId, String(req.params.areaId), b.competences);
    recordAudit(req, { action: 'ACADEMIC_COURSE_COMPETENCES', entity: 'CurricularArea', entityId: String(req.params.areaId), after: b });
    ok(res, data);
  },
  renameCourse: async (req: Request, res: Response) => {
    const b = S.renameCourseBody.parse(req.body);
    ok(res, await curriculum.renameCourse(ctx(req).schoolId, String(req.params.areaId), b.name));
  },
  setupStatus: async (req: Request, res: Response) => {
    const q = S.yearQuery.parse(req.query);
    ok(res, await curriculum.getSetupStatus(ctx(req).schoolId, q.academicYearId));
  },

  teachingLoad: async (req: Request, res: Response) => {
    const q = S.teachingLoadQuery.parse(req.query);
    ok(res, await load.getMatrix(ctx(req).schoolId, q.academicYearId, q.level));
  },
  saveTeachingLoad: async (req: Request, res: Response) => {
    const b = S.teachingLoadBody.parse(req.body);
    const data = await load.saveChanges(ctx(req).schoolId, b.academicYearId, b.changes);
    recordAudit(req, { action: 'TEACHING_LOAD_SAVE', entity: 'CourseAssignment', after: b });
    ok(res, data);
  },
  wholeClassroom: async (req: Request, res: Response) => {
    const b = S.wholeClassroomBody.parse(req.body);
    const data = await load.assignWholeClassroom(ctx(req).schoolId, b.academicYearId, b.classroomId, b.teacherId);
    recordAudit(req, { action: 'TEACHING_LOAD_SAVE', entity: 'CourseAssignment', after: b });
    ok(res, data);
  },
  copyTeachingLoad: async (req: Request, res: Response) => {
    const b = S.copyYearBody.parse(req.body);
    const data = await load.copyFromYear(ctx(req).schoolId, b.fromAcademicYearId, b.toAcademicYearId);
    recordAudit(req, { action: 'TEACHING_LOAD_COPY', entity: 'CourseAssignment', after: b });
    ok(res, data);
  },
  myCourses: async (req: Request, res: Response) => {
    const { schoolId, user } = ctx(req);
    const courses = await load.getMyCourses(schoolId, user.userId);
    const year = courses[0]?.academicYearId;
    ok(res, { courses, academicYearId: year ?? null });
  },

  periods: async (req: Request, res: Response) => {
    const q = S.yearQuery.parse(req.query);
    ok(res, await periods.list(ctx(req).schoolId, q.academicYearId));
  },
  setPeriodStatus: async (req: Request, res: Response) => {
    const b = S.periodStatusBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    let pending: { missingGrades: number; missingConclusions: number } | undefined;
    if (b.status === 'CLOSED') {
      const p = await progress.getProgress(schoolId, b.academicYearId, b.periodNumber, { classroomId: b.classroomId ?? undefined });
      pending = { missingGrades: p.totals.missingGrades, missingConclusions: p.totals.missingConclusions };
    }
    const data = await periods.setStatus(schoolId, user.userId, b, pending);
    recordAudit(req, { action: 'PERIOD_STATUS', entity: 'AcademicPeriodStatus', entityId: data.id, after: b });
    ok(res, data);
  },

  gradebook: async (req: Request, res: Response) => {
    const q = S.gradebookQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    ok(res, await gradebook.getGradebook(schoolId, user, String(req.params.assignmentId), q.periodNumber));
  },
  saveScores: async (req: Request, res: Response) => {
    const b = S.scoresBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.saveScores(schoolId, user, String(req.params.assignmentId), b.periodNumber, b.items, b.reason);
    recordAudit(req, { action: 'GRADES_SAVE', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: { periodNumber: b.periodNumber, count: b.items.length, reason: b.reason ?? null } });
    ok(res, data);
  },
  setFinalLetter: async (req: Request, res: Response) => {
    const b = S.finalLetterBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.setFinalLetter(schoolId, user, String(req.params.assignmentId), b.periodNumber, b, b.reason);
    recordAudit(req, { action: 'GRADES_FINAL_LETTER', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: b });
    ok(res, data);
  },
  saveConclusions: async (req: Request, res: Response) => {
    const b = S.conclusionsBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.saveConclusions(schoolId, user, String(req.params.assignmentId), b.periodNumber, b.items, b.reason);
    recordAudit(req, { action: 'GRADES_CONCLUSIONS', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: { periodNumber: b.periodNumber, count: b.items.length, reason: b.reason ?? null } });
    ok(res, data);
  },
  setCourseCriteria: async (req: Request, res: Response) => {
    const b = S.courseCriteriaBody.parse(req.body);
    const { schoolId, user } = ctx(req);
    const data = await gradebook.setCourseCriteria(schoolId, user, String(req.params.assignmentId), b.criteria);
    recordAudit(req, { action: 'COURSE_CRITERIA', entity: 'CourseAssignment', entityId: String(req.params.assignmentId), after: b });
    ok(res, data);
  },

  progress: async (req: Request, res: Response) => {
    const q = S.progressQuery.parse(req.query);
    ok(res, await progress.getProgress(ctx(req).schoolId, q.academicYearId, q.periodNumber, { level: q.level }));
  },
  myProgress: async (req: Request, res: Response) => {
    const q = S.progressQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    ok(res, await progress.getProgress(schoolId, q.academicYearId, q.periodNumber, { teacherId: user.userId }));
  },
  remind: async (req: Request, res: Response) => {
    const b = S.remindBody.parse(req.body);
    ok(res, await progress.remindPending(ctx(req).schoolId, b.academicYearId, b.periodNumber));
  },

  consolidation: async (req: Request, res: Response) => {
    const q = S.consolidationQuery.parse(req.query);
    ok(res, await consolidation.getClassroomConsolidation(ctx(req).schoolId, q.classroomId, q.period, q.academicYearId));
  },
  reportCard: async (req: Request, res: Response) => {
    const { schoolId, user } = ctx(req);
    ok(res, await reportCards.getReportCard(schoolId, user, String(req.params.enrollmentId)));
  },
  classroomReportCards: async (req: Request, res: Response) => {
    const q = S.classroomQuery.parse(req.query);
    const { schoolId, user } = ctx(req);
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'].includes(user.role)) throw new AppError('No autorizado.', 403);
    ok(res, await reportCards.getClassroomReportCards(schoolId, user, q.classroomId));
  },
};
```

### 10.6 `back/src/modules/academic/academic.routes.ts`

```ts
import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { requirePlan } from '../../core/middlewares/plan.middleware';
import { academicController as c } from './academic.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

const ADMIN = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN');
const STAFF = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER');
const GRADERS = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
const OFFICE = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE');
const ALL = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT');
const PRO = requirePlan('PRO', 'ENTERPRISE');

// Configuración académica
router.get('/catalog', STAFF, c.catalog);
router.get('/setup-status', ADMIN, c.setupStatus);
router.get('/study-plan', STAFF, c.studyPlan);
router.post('/study-plan/apply-template', ADMIN, c.applyTemplate);
router.post('/study-plan/subcourses', ADMIN, c.createSubcourses);
router.post('/study-plan/workshops', ADMIN, c.addWorkshop);
router.post('/study-plan/copy', ADMIN, c.copyPlan);
router.patch('/study-plan/courses/:planCourseId', ADMIN, c.updatePlanCourse);
router.delete('/study-plan/courses/:planCourseId', ADMIN, c.removePlanCourse);
router.put('/courses/:areaId/competences', ADMIN, c.updateCourseCompetences);
router.patch('/courses/:areaId', ADMIN, c.renameCourse);

// Carga docente
router.get('/teaching-load', ADMIN, c.teachingLoad);
router.put('/teaching-load', ADMIN, c.saveTeachingLoad);
router.post('/teaching-load/whole-classroom', ADMIN, c.wholeClassroom);
router.post('/teaching-load/copy', ADMIN, c.copyTeachingLoad);
router.get('/my-courses', authorizeRoles('TEACHER'), c.myCourses);

// Periodos
router.get('/periods', STAFF, c.periods);
router.put('/periods/status', ADMIN, c.setPeriodStatus);

// Evaluación (plan PRO)
router.get('/gradebook/:assignmentId', STAFF, PRO, c.gradebook);
router.put('/gradebook/:assignmentId/scores', GRADERS, PRO, c.saveScores);
router.put('/gradebook/:assignmentId/final-letter', GRADERS, PRO, c.setFinalLetter);
router.put('/gradebook/:assignmentId/conclusions', GRADERS, PRO, c.saveConclusions);
router.put('/gradebook/:assignmentId/criteria', GRADERS, PRO, c.setCourseCriteria);
router.get('/progress', ADMIN, PRO, c.progress);
router.get('/my-progress', authorizeRoles('TEACHER'), PRO, c.myProgress);
router.post('/progress/remind', ADMIN, PRO, c.remind);
router.get('/consolidation', OFFICE, PRO, c.consolidation);
router.get('/report-card/:enrollmentId', ALL, PRO, c.reportCard);
router.get('/report-cards', STAFF, PRO, c.classroomReportCards);

export { router as academicRouter };
```

En `back/src/app.ts`:
- agrega `import { academicRouter } from './modules/academic/academic.routes';` junto a los demás imports de routers;
- agrega `app.use(\`${API_PREFIX}/academic\`, academicRouter);` justo después de la línea de `course-attendance`.

Verifica que `express-async-errors` ya está importado en `app.ts`, para que los errores de los handlers `async` lleguen al manejador de errores.

Commit: `feat(academico): bloque 10 - consolidado, libreta, avance y API academica`

---

## BLOQUE 11 — Backend: exportaciones Excel

Crea `back/src/modules/academic/academic-excel.service.ts`:

```ts
import ExcelJS from 'exceljs';
import type { ConsolidationService } from './consolidation.service';
import type { GradebookService } from './gradebook.service';

type Consolidation = Awaited<ReturnType<ConsolidationService['getClassroomConsolidation']>>;
type Gradebook = Awaited<ReturnType<GradebookService['getGradebook']>>;

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};
const LETTER_FILL: Record<string, string> = { AD: 'FFDCFCE7', A: 'FFE0F2FE', B: 'FFFEF3C7', C: 'FFFEE2E2' };

function titleBlock(ws: ExcelJS.Worksheet, lines: string[], width: number) {
  lines.forEach((text, i) => {
    const row = ws.addRow([text]);
    ws.mergeCells(row.number, 1, row.number, Math.max(width, 2));
    row.font = i === 0 ? { bold: true, size: 13 } : { size: 10, color: { argb: 'FF475569' } };
  });
  ws.addRow([]);
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });
  row.height = 42;
}

function setup(ws: ExcelJS.Worksheet) {
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
}

export async function buildConsolidationWorkbook(data: Consolidation): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool';
  const ws = wb.addWorksheet('Consolidado');
  setup(ws);
  const comps = data.matrix.consolidatedAreas.flatMap((a) => a.competences.map((c) => ({ area: a, comp: c })));
  const periodLabel = data.period === 'FINAL' ? 'Calificativo final' : `Periodo ${data.period}`;
  titleBlock(ws, [
    data.school?.name ?? 'Colegio',
    `Consolidado de evaluación — ${data.classroom.label} — ${data.academicYear.year} — ${periodLabel}`,
    `Código modular: ${data.school?.modularCode ?? '—'} · Tutor(a): ${data.classroom.tutor ?? '—'}`,
  ], comps.length + 4);

  const areaRow = ws.addRow(['N.°', 'Código', 'Apellidos y nombres', ...comps.map((x) => x.area.name), ...(data.period === 'FINAL' ? ['Situación'] : [])]);
  let col = 4;
  for (const area of data.matrix.consolidatedAreas) {
    if (area.competences.length > 1) ws.mergeCells(areaRow.number, col, areaRow.number, col + area.competences.length - 1);
    col += area.competences.length;
  }
  styleHeader(areaRow);
  const compRow = ws.addRow(['', '', '', ...comps.map((x) => x.comp.shortName), ...(data.period === 'FINAL' ? [''] : [])]);
  styleHeader(compRow);
  ws.mergeCells(areaRow.number, 1, compRow.number, 1);
  ws.mergeCells(areaRow.number, 2, compRow.number, 2);
  ws.mergeCells(areaRow.number, 3, compRow.number, 3);

  const situationLabel: Record<string, string> = { PROMOTED: 'Promovido', RECOVERY: 'Recuperación', RETAINED: 'Permanece', TRANSFERRED: 'Trasladado', WITHDRAWN: 'Retirado' };
  data.matrix.students.forEach((s, i) => {
    const values = comps.map((x) => s.consolidatedGrades[x.area.code]?.competences[x.comp.id]?.letter ?? '');
    const row = ws.addRow([i + 1, s.studentCode ?? '', s.fullName, ...values, ...(data.period === 'FINAL' ? [s.finalSituation ? situationLabel[s.finalSituation] : ''] : [])]);
    row.eachCell((cell, n) => {
      cell.border = BORDER;
      cell.font = { size: 9, color: s.enrollmentState !== 'REGISTERED' ? { argb: 'FF94A3B8' } : undefined };
      if (n > 3) cell.alignment = { horizontal: 'center' };
      const v = String(cell.value ?? '');
      if (LETTER_FILL[v]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LETTER_FILL[v] } };
    });
  });
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 36;
  for (let i = 4; i <= comps.length + 4; i++) ws.getColumn(i).width = 9;
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: compRow.number }];

  if (data.issues.length > 0) {
    const wi = wb.addWorksheet('Observaciones');
    wi.addRow(['Observación']).font = { bold: true };
    data.issues.forEach((i) => wi.addRow([i.message]));
    wi.getColumn(1).width = 110;
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildGradebookWorkbook(data: Gradebook, schoolName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool';
  for (const comp of data.competences) {
    const ws = wb.addWorksheet(comp.shortName.slice(0, 28).replace(/[\\/?*[\]:]/g, ' '));
    setup(ws);
    const cols = data.criteria.length + 5;
    titleBlock(ws, [
      schoolName,
      `Registro auxiliar — ${data.assignment.area.name} — ${data.assignment.classroom.grade}.° "${data.assignment.classroom.section}" — Periodo ${data.periodNumber}`,
      `Competencia: ${comp.name}`,
      `Docente: ${data.assignment.teacher.firstName} ${data.assignment.teacher.lastNamePaternal}`,
    ], cols);
    const header = ws.addRow(['N.°', 'Apellidos y nombres', ...data.criteria.map((c) => `${c.shortName}\n(peso ${c.weight})`), 'Sugerido', 'Final', 'Conclusión descriptiva']);
    styleHeader(header);
    data.students.forEach((s, i) => {
      const scores = data.criteria.map((cr) => {
        const g = data.scores.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === comp.id && x.criterionId === cr.id);
        return g ? (g.literalScore && g.numericScore === null ? g.literalScore : g.numericScore ?? '') : '';
      });
      const r = data.results.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === comp.id);
      const c = data.conclusions.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === comp.id);
      const row = ws.addRow([i + 1, s.fullName, ...scores, r?.suggestedLetter ?? '', r?.finalLetter ?? '', c?.conclusion ?? '']);
      row.eachCell((cell, n) => {
        cell.border = BORDER;
        cell.font = { size: 9, color: s.state !== 'REGISTERED' ? { argb: 'FF94A3B8' } : undefined };
        if (n > 2 && n < cols + 1) cell.alignment = { horizontal: 'center' };
        const v = String(cell.value ?? '');
        if (n >= data.criteria.length + 3 && LETTER_FILL[v]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LETTER_FILL[v] } };
      });
    });
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 36;
    for (let i = 3; i <= data.criteria.length + 4; i++) ws.getColumn(i).width = 10;
    ws.getColumn(data.criteria.length + 5).width = 60;
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: header.number }];
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
```

En `academic.controller.ts`:
1. Importa `prisma` desde `'../../config/prisma'` y `{ buildConsolidationWorkbook, buildGradebookWorkbook }` desde `'./academic-excel.service'`.
2. Agrega estos handlers al objeto `academicController`:
   ```ts
   exportConsolidation: async (req: Request, res: Response) => {
     const q = S.consolidationQuery.parse(req.query);
     const data = await consolidation.getClassroomConsolidation(ctx(req).schoolId, q.classroomId, q.period, q.academicYearId);
     const buffer = await buildConsolidationWorkbook(data);
     const name = `consolidado-${data.classroom.grade}${data.classroom.section}-${q.period}.xlsx`.replace(/\s+/g, '');
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
     res.send(buffer);
   },
   exportGradebook: async (req: Request, res: Response) => {
     const q = S.gradebookExportQuery.parse(req.query);
     const { schoolId, user } = ctx(req);
     const data = await gradebook.getGradebook(schoolId, user, q.assignmentId, q.periodNumber);
     const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
     const buffer = await buildGradebookWorkbook(data, school?.name ?? 'Colegio');
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', `attachment; filename="registro-auxiliar-p${q.periodNumber}.xlsx"`);
     res.send(buffer);
   },
   ```
3. En `academic.routes.ts`, antes del `export`:
   ```ts
   router.get('/exports/consolidation.xlsx', OFFICE, PRO, c.exportConsolidation);
   router.get('/exports/gradebook.xlsx', STAFF, PRO, c.exportGradebook);
   ```

Si `import ExcelJS from 'exceljs'` falla en la compilación por la configuración de módulos, usa `import * as ExcelJS from 'exceljs'`.

Commit: `feat(academico): bloque 11 - exportaciones Excel de consolidado y registro auxiliar`

---

## BLOQUE 12 — Reconexión de módulos existentes

### 12.1 Solo asignaciones vigentes en todo el backend

Busca todas las consultas a asignaciones:
```bash
cd back
grep -rn "courseAssignment\.\(findMany\|findFirst\|findUnique\|count\)" src --include=*.ts | grep -v "src/modules/academic/"
```
En **cada** resultado de los módulos `course-contents`, `course-attendance`, `enrollments`, `academic-reports`, `course-assignments` y `grades`, agrega `deletedAt: null` al `where`.
- En `findUnique`, cámbialo a `findFirst` con `{ id, deletedAt: null }`.
- Donde se listan cursos "del docente" o "del aula" para trabajar hoy (por ejemplo, `findByTeacher`, `findAllBySchool` en `course-assignment.repository.ts`, y los listados de aula virtual y asistencia por curso), agrega además `academicYear: { isActive: true }`.

### 12.2 Año lectivo activo único

En `back/src/modules/academic-years/academic-year.schema.ts`, cambia `isActive: z.boolean().default(true)` por `isActive: z.boolean().default(false)`.

En `back/src/modules/academic-years/academic-year.service.ts`, agrega este método privado y llámalo en `createAcademicYear` (después de crear) y en `updateAcademicYear` (después de actualizar) cuando el DTO traiga `isActive === true`:
```ts
private async activateExclusively(schoolId: string, academicYearId: string): Promise<void> {
  await prisma.$transaction([
    prisma.academicYear.updateMany({ where: { schoolId, id: { not: academicYearId } }, data: { isActive: false } }),
    prisma.academicYear.update({ where: { id: academicYearId }, data: { isActive: true } }),
    prisma.enrollment.updateMany({ where: { schoolId, academicYearId: { not: academicYearId }, isActive: true }, data: { isActive: false } }),
  ]);
}
```
(Importa `prisma` desde `'../../config/prisma'`). En el frontend de años lectivos, el interruptor "Activo" debe mostrar antes un `ConfirmDialog` con este texto: "Al activar {año}, el año actual quedará inactivo y sus matrículas pasarán a solo lectura. ¿Continuar?".

### 12.3 Reportes antiguos que calculan notas

En `back/src/modules/academic-reports/academic-report.repository.ts`, en `findConsolidatedGradesRaw` y `findMeritGradeRaw`:
- filtra las asignaciones con `deletedAt: null, academicYear: { isActive: true }`;
- agrega al resultado los resultados del periodo:
  ```ts
  const periodResults = await prisma.competencePeriodResult.findMany({
    where: { courseAssignmentId: { in: assignmentIds }, periodNumber },
    select: { enrollmentId: true, courseAssignmentId: true, competenceId: true, computedScore: true, finalLetter: true, isOverridden: true },
  });
  ```
  donde `assignmentIds` son los IDs de las asignaciones cargadas. Devuélvelo junto a lo existente.

En `back/src/modules/academic-reports/academic-report.service.ts`, en `getConsolidatedGrades` y en el cálculo equivalente de `getMeritGrade`:
1. Construye el mapa de puntajes por competencia desde `periodResults`, en lugar de promediar criterios:
   ```ts
   import { LETTER_NUMERIC_VALUE, isLetter } from '../academic/grade-engine';
   const resultScore = new Map<string, number>();
   periodResults.forEach((r) => {
     const value = !r.isOverridden && r.computedScore !== null
       ? r.computedScore
       : isLetter(r.finalLetter) ? LETTER_NUMERIC_VALUE[r.finalLetter] : null;
     if (value !== null) resultScore.set(`${r.enrollmentId}_${r.courseAssignmentId}_${r.competenceId}`, value);
   });
   ```
2. Dentro de `assignment.area.competences.forEach((comp) => { … })`, reemplaza el cálculo de `compScore` por `const compScore = resultScore.get(key) ?? null;` (con `key = \`${enr.id}_${assignment.id}_${comp.id}\``). Conserva la detección del criterio `COND` usando `gradesMap` como estaba.
3. Reemplaza `const motherAreaId = assignment.area.parentAreaId || assignment.area.id;` por `const motherAreaId = assignment.area.officialAreaCode ?? assignment.area.id;`.
4. Reemplaza `const motherAreaName = assignment.area.parentArea?.name || assignment.area.name;` por `const motherAreaName = assignment.area.parentArea?.name ?? assignment.area.name;`.
5. Si `assignment.area.kind === 'WORKSHOP'`, no lo sumes a `motherAreaScoresMap` (sí a `courseScores`).
6. Elimina la conversión local de letras `AD=18 / A=15 / B=12 / C=9`.

### 12.4 Importar tareas del aula virtual a las notas

En `back/src/modules/grades/grade.repository.ts`, método `syncHomeworkToMatrix`:
1. Agrega `deletedAt: null` al `where` de la asignación. En `classroom.enrollments.where`, agrega `academicYearId: assignment.academicYearId`; como depende de la asignación, primero carga la asignación y después las matrículas en una segunda consulta con `{ schoolId, classroomId, academicYearId, isActive: true, enrollmentState: 'REGISTERED' }`.
2. Reemplaza el bloque `if (teacherId) { const isLocked = await this.isPeriodLocked(…) … }` por:
   ```ts
   if (teacherId) {
     const status = await new PeriodService().getEffectiveStatus(assignment.academicYearId!, dto.periodNumber, assignment.classroomId);
     if (status !== 'OPEN') throw new AppError('El periodo no está abierto para registrar notas.', 403);
   }
   ```
3. Reemplaza todo el cálculo de `targetCompIds` (el bloque con `parentAreaId` y `evaluatedCompetenceIds`) por:
   ```ts
   targetCompIds = requestedCompId
     ? [requestedCompId]
     : assignment.area.competences.filter((c) => c.isActive).map((c) => c.id);
   ```
   Si `requestedCompId` no está en las competencias activas del área, lanza `AppError('La competencia no pertenece a este curso.', 400)`.
4. Al final, antes del `return`:
   ```ts
   await new ResultsService().recompute(schoolId, assignment.id, dto.periodNumber);
   ```
5. En el `include` de la asignación, cambia `area: { include: { competences: true, parentArea: {…} } }` por `area: { include: { competences: true } }`.

Importa `PeriodService` desde `'../academic/period.service'` y `ResultsService` desde `'../academic/results.service'`.

Commit: `refactor(academico): bloque 12 - reconexion de modulos al modelo nuevo`

---

## BLOQUE 13 — Frontend: componentes base

Principios visuales que debes respetar en **todas** las pantallas nuevas:
- **Una sola acción principal por pantalla**, con `Button` `variant="default"`; el resto, `outline` o `ghost`.
- **Sin tarjetas de estadísticas decorativas ni textos de marketing.** Solo títulos, una descripción de una línea y el contenido.
- **Tablas densas y legibles:** `text-sm`, encabezados `text-xs font-semibold text-muted-foreground`, filas con `border-b border-border`.
- **Colores de nivel de logro (fijos en toda la app):** AD verde, A azul, B ámbar, C rojo, EXO gris.
- Estados vacíos con `EmptyState`; errores con `toast.error(mensaje del backend)`.

Crea estos archivos en `front/src/components/ui/`.

### 13.1 `page-header.tsx`

```tsx
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
    <div className="min-w-0">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
```

### 13.2 `modal.tsx`

```tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative w-full rounded-xl border border-border bg-card shadow-xl flex flex-col max-h-[90vh]', SIZES[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};
```

### 13.3 `select.tsx`

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
```

### 13.4 `tabs.tsx`

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, items, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex rounded-lg border border-border bg-muted/40 p-1', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === item.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
          {item.count !== undefined && item.count > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 text-xs text-amber-700 dark:text-amber-300">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
```

### 13.5 `empty-state.tsx`

```tsx
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
    {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
    <p className="text-sm font-medium">{title}</p>
    {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
```

### 13.6 `letter-badge.tsx`

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

const LETTER_STYLES: Record<string, string> = {
  AD: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  A: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  B: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  C: 'bg-red-500/15 text-red-700 dark:text-red-300',
  EXO: 'bg-muted text-muted-foreground',
};

export const LetterBadge: React.FC<{ letter?: string | null; className?: string; title?: string }> = ({ letter, className, title }) => {
  if (!letter) return <span className={cn('text-muted-foreground', className)}>—</span>;
  return (
    <span title={title} className={cn('inline-flex min-w-[2rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold', LETTER_STYLES[letter] ?? 'bg-muted', className)}>
      {letter}
    </span>
  );
};

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  REVIEW: { label: 'En revisión', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  CLOSED: { label: 'Cerrado', cls: 'bg-muted text-muted-foreground' },
};

export const PeriodStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS[status]?.cls)}>{STATUS[status]?.label ?? status}</span>
);

export const ProgressBar: React.FC<{ percent: number }> = ({ percent }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full', percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-sky-500' : 'bg-amber-500')}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
    <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
  </div>
);
```

Commit: `feat(academico): bloque 13 - componentes base de interfaz`

---

## BLOQUE 14 — Frontend: tipos y hooks

### 14.1 `front/src/features/academic/types.ts`

```ts
import type { SiagieMatrixData } from '@/features/grades/types';

export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
export type CourseKind = 'OFFICIAL' | 'SUBCOURSE' | 'WORKSHOP';
export type Letter = 'AD' | 'A' | 'B' | 'C';
export type ResultLetter = Letter | 'EXO';
export type PeriodState = 'OPEN' | 'REVIEW' | 'CLOSED';

export const LEVEL_LABEL: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
export const gradeLabel = (level: Level, grade: number) => (level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL_LABEL[level]}`);
export const classroomLabel = (c: { educationLevel: Level; grade: number; section: string }) => `${gradeLabel(c.educationLevel, c.grade)} "${c.section}"`;

export interface CnebArea { code: string; name: string; competences: number[]; optional?: boolean; isTransversal?: boolean }
export interface Catalog {
  competences: Record<number, { name: string; shortName: string }>;
  areas: Record<Level, CnebArea[]>;
  grades: Record<Level, number[]>;
}

export interface PlanCompetence { id: string; cnebNumber: number | null; name: string; shortName: string; weight: number }
export interface PlanCourse {
  planCourseId: string; areaId: string; name: string; kind: CourseKind; officialAreaCode: string | null; parentAreaId: string | null;
  weeklyHours: number | null; order: number; competences: PlanCompetence[]; assignedClassrooms: number; hasGrades: boolean;
}
export interface PlanCoverage {
  code: string; name: string; optional: boolean; isTransversal: boolean; inPlan: boolean;
  required: number[]; covered: number[]; missing: number[]; conflict: boolean;
}
export interface StudyPlan {
  academicYearId: string; level: Level; grade: number; courses: PlanCourse[]; coverage: PlanCoverage[]; requiredMissing: string[]; isValid: boolean;
}

export interface TeacherLite { id: string; firstName: string; lastNamePaternal: string; lastNameMaternal?: string | null }
export const teacherName = (t: TeacherLite) => `${t.lastNamePaternal} ${t.lastNameMaternal ?? ''}`.trim() + `, ${t.firstName}`;
export interface LoadCell {
  areaId: string; name: string; kind: CourseKind; isTransversal: boolean; weeklyHours: number | null;
  assignmentId: string | null; teacherId: string | null; hasGrades: boolean;
}
export interface LoadClassroom { id: string; grade: number; section: string; shift: string; tutorTeacherId: string | null; courses: LoadCell[] }
export interface TeachingLoad {
  academicYearId: string; level: Level; teachers: TeacherLite[]; classrooms: LoadClassroom[];
  teacherLoad: Array<{ teacherId: string; courses: number; weeklyHours: number }>;
}

export interface MyCourse {
  id: string; academicYearId: string;
  classroom: { id: string; educationLevel: Level; grade: number; section: string; tutorTeacherId: string | null };
  area: { id: string; name: string; kind: CourseKind; officialAreaCode: string | null; isTransversal: boolean };
}

export interface PeriodInfo {
  periodNumber: number; name: string; startDate: string; endDate: string; status: PeriodState;
  gradingDeadline: string | null; reason: string | null; changedAt: string | null;
  overrides: Array<{ classroomId: string; status: PeriodState; reason: string | null; classroom: { grade: number; section: string; educationLevel: Level } | null }>;
}
export interface PeriodsResponse { academicYearId: string; year: number; annualCalculationMode: string; periods: PeriodInfo[] }

export interface SetupStatus {
  academicYear: { id: string; year: number; periodType: string; hasPeriods: boolean };
  gradesInUse: number; invalidPlans: Array<{ level: Level; grade: number }>; classrooms: number; classroomsWithoutTutor: number;
  coursesWithoutTeacher: number; teachers: number; teachersWithoutLoad: number;
}

export interface GradebookStudent { enrollmentId: string; state: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN'; fullName: string; studentCode: string | null; documentId: string }
export interface GradebookScore { enrollmentId: string; competenceId: string; criterionId: string; numericScore: number | null; literalScore: string | null; isExonerated: boolean }
export interface GradebookResult { enrollmentId: string; competenceId: string; computedScore: number | null; suggestedLetter: ResultLetter | null; finalLetter: ResultLetter | null; isOverridden: boolean }
export interface GradebookData {
  assignment: {
    id: string; academicYearId: string;
    classroom: { id: string; educationLevel: Level; grade: number; section: string };
    area: { id: string; name: string; kind: CourseKind; officialAreaCode: string | null };
    teacher: TeacherLite;
  };
  periodNumber: number; periodCount: number; periodStatus: PeriodState; canEdit: boolean; requiresReason: boolean;
  competences: Array<{ id: string; cnebNumber: number | null; name: string; shortName: string }>;
  criteria: Array<{ id: string; name: string; shortName: string; weight: number; isCustom: boolean }>;
  students: GradebookStudent[]; scores: GradebookScore[]; results: GradebookResult[];
  conclusions: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>;
  conclusionMaxLength: number;
  thresholds: { AD: number; A: number; B: number };
}

export interface ProgressRow {
  assignmentId: string; classroom: { id: string; educationLevel: Level; grade: number; section: string }; course: string; kind: CourseKind;
  teacher: { id: string; name: string }; students: number; expected: number; filled: number; percent: number; missingGrades: number; missingConclusions: number;
}
export interface ProgressResponse {
  academicYearId: string; periodNumber: number; rows: ProgressRow[];
  totals: { expected: number; filled: number; missingGrades: number; missingConclusions: number; percent: number };
}

export interface ConsolidationIssue { type: string; message: string; enrollmentId?: string; areaCode?: string; cnebNumber?: number }
export interface ConsolidationResponse {
  school: { name: string; modularCode: string | null; documentId: string; address: string | null; logoUrl: string | null } | null;
  classroom: { id: string; educationLevel: Level; grade: number; section: string; label: string; tutor: string | null };
  academicYear: { id: string; year: number; annualCalculationMode: string };
  period: number | 'FINAL';
  matrix: SiagieMatrixData;
  issues: ConsolidationIssue[];
  summary: { totalStudents: number; missingGrades: number; missingConclusions: number; missingStudentCodes: number; coursesWithoutTeacher: number };
}

export interface ReportCard {
  school: { name: string; modularCode: string | null; documentId: string; address: string | null; logoUrl: string | null } | null;
  student: { fullName: string; studentCode: string | null; documentId: string };
  classroom: { educationLevel: Level; grade: number; section: string; label: string };
  academicYear: { year: number; annualCalculationMode: string };
  tutor: string | null;
  periods: Array<{ periodNumber: number; name: string; status: PeriodState }>;
  visiblePeriods: number[];
  officialAreas: Array<{
    code: string; name: string;
    competences: Array<{ number: number; name: string; shortName: string; letters: Record<number, ResultLetter | null>; conclusions: Record<number, string>; finalLetter: ResultLetter | null }>;
  }>;
  internalCourses: Array<{ name: string; kind: CourseKind; teacher: string; competences: Array<{ name: string; letters: Record<number, ResultLetter | null> }> }>;
  attendance: Array<{ periodNumber: number; absentJustified: number; absentUnjustified: number; lateJustified: number; lateUnjustified: number }>;
  finalSituation: string | null;
  scaleLegend: Array<{ letter: string; label: string }>;
}
```

En `front/src/features/grades/types.ts`, amplía los tipos de letra de `SiagieMatrixStudent` para aceptar exoneración. En `courseGrades` y en `consolidatedGrades`, cambia `letter: 'AD' | 'A' | 'B' | 'C' | null;` por `letter: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '-' | null;` (en los niveles de periodo y de competencia).

### 14.2 `front/src/features/academic/api.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import type {
  Catalog, ConsolidationResponse, GradebookData, GradebookResult, Level, MyCourse, PeriodsResponse, PeriodState,
  ProgressResponse, ReportCard, ResultLetter, SetupStatus, StudyPlan, TeachingLoad,
} from './types';

interface Envelope<T> { status: string; data: T }
const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get<Envelope<T>>(url, { params })).data.data;

export const apiErrorMessage = (e: unknown, fallback = 'No se pudo completar la acción.') => {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg || fallback;
};

const useInvalidate = () => {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: ['academic', k] }));
};

// ── Catálogo y plan de estudios
export const useCatalog = () => useQuery({ queryKey: ['academic', 'catalog'], queryFn: () => get<Catalog>('/academic/catalog'), staleTime: Infinity });

export const useSetupStatus = () => useQuery({ queryKey: ['academic', 'setup'], queryFn: () => get<SetupStatus>('/academic/setup-status') });

export const useStudyPlan = (level: Level, grade: number | null) =>
  useQuery({
    queryKey: ['academic', 'plan', level, grade],
    queryFn: () => get<StudyPlan>('/academic/study-plan', { level, grade }),
    enabled: grade !== null,
  });

const planMutation = <V,>(fn: (v: V) => Promise<unknown>, success: string) => () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { invalidate('plan', 'setup', 'load'); toast.success(success); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useApplyTemplate = planMutation(
  (v: { level: Level; grades: number[]; includeOptional: string[] }) => api.post('/academic/study-plan/apply-template', v),
  'Plantilla aplicada',
);
export const useCreateSubcourses = planMutation(
  (v: { level: Level; grades: number[]; officialAreaCode: string; subcourses: Array<{ name: string; cnebNumbers: number[]; weight?: number }> }) =>
    api.post('/academic/study-plan/subcourses', v),
  'Área dividida en cursos',
);
export const useAddWorkshop = planMutation(
  (v: { level: Level; grades: number[]; name: string; weeklyHours?: number | null }) => api.post('/academic/study-plan/workshops', v),
  'Taller agregado',
);
export const useRemovePlanCourse = planMutation((planCourseId: string) => api.delete(`/academic/study-plan/courses/${planCourseId}`), 'Curso quitado del plan');
export const useUpdateCourseCompetences = planMutation(
  (v: { areaId: string; competences: Array<{ cnebNumber: number; weight?: number }> }) => api.put(`/academic/courses/${v.areaId}/competences`, { competences: v.competences }),
  'Competencias actualizadas',
);
export const useCopyPlan = planMutation((v: { fromAcademicYearId: string; toAcademicYearId: string }) => api.post('/academic/study-plan/copy', v), 'Plan copiado');

export const useUpdatePlanCourse = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { planCourseId: string; weeklyHours?: number | null; order?: number }) =>
      api.patch(`/academic/study-plan/courses/${v.planCourseId}`, { weeklyHours: v.weeklyHours, order: v.order }),
    onSuccess: () => invalidate('plan', 'load'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

// ── Carga docente
export const useTeachingLoad = (level: Level) =>
  useQuery({ queryKey: ['academic', 'load', level], queryFn: () => get<TeachingLoad>('/academic/teaching-load', { level }) });

export const useSaveTeachingLoad = planMutation(
  (changes: Array<{ classroomId: string; areaId: string; teacherId: string | null }>) => api.put('/academic/teaching-load', { changes }),
  'Carga docente guardada',
);
export const useAssignWholeClassroom = planMutation(
  (v: { classroomId: string; teacherId: string }) => api.post('/academic/teaching-load/whole-classroom', v),
  'Aula asignada',
);
export const useCopyTeachingLoad = planMutation(
  (v: { fromAcademicYearId: string; toAcademicYearId: string }) => api.post('/academic/teaching-load/copy', v),
  'Carga docente copiada',
);

export const useMyCourses = () =>
  useQuery({ queryKey: ['academic', 'my-courses'], queryFn: () => get<{ courses: MyCourse[]; academicYearId: string | null }>('/academic/my-courses') });

// ── Periodos y avance
export const usePeriods = () => useQuery({ queryKey: ['academic', 'periods'], queryFn: () => get<PeriodsResponse>('/academic/periods') });

export const useSetPeriodStatus = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { periodNumber: number; status: PeriodState; reason?: string | null; gradingDeadline?: string | null; force?: boolean; classroomId?: string | null }) =>
      api.put('/academic/periods/status', v),
    onSuccess: () => { invalidate('periods', 'progress', 'gradebook'); toast.success('Periodo actualizado'); },
  });
};

export const useProgress = (periodNumber: number | null, level?: Level) =>
  useQuery({
    queryKey: ['academic', 'progress', periodNumber, level ?? 'ALL'],
    queryFn: () => get<ProgressResponse>('/academic/progress', { periodNumber, level }),
    enabled: periodNumber !== null,
  });

export const useMyProgress = (periodNumber: number | null) =>
  useQuery({
    queryKey: ['academic', 'progress', 'mine', periodNumber],
    queryFn: () => get<ProgressResponse>('/academic/my-progress', { periodNumber }),
    enabled: periodNumber !== null,
  });

export const useRemindPending = () =>
  useMutation({
    mutationFn: (periodNumber: number) => api.post<Envelope<{ notified: number }>>('/academic/progress/remind', { periodNumber }),
    onSuccess: (r) => toast.success(`Recordatorio enviado a ${r.data.data.notified} docentes`),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

// ── Registro de notas
export const useGradebook = (assignmentId: string | undefined, periodNumber: number) =>
  useQuery({
    queryKey: ['academic', 'gradebook', assignmentId, periodNumber],
    queryFn: () => get<GradebookData>(`/academic/gradebook/${assignmentId}`, { periodNumber }),
    enabled: !!assignmentId,
  });

export interface ScoreInput { enrollmentId: string; competenceId: string; criterionId: string; numericScore: number | null; literalScore: ResultLetter | null }

export const useSaveScores = (assignmentId: string) =>
  useMutation({
    mutationFn: async (v: { periodNumber: number; items: ScoreInput[]; reason?: string | null }) =>
      (await api.put<Envelope<{ saved: number; results: GradebookResult[] }>>(`/academic/gradebook/${assignmentId}/scores`, v)).data.data,
  });

export const useSetFinalLetter = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { periodNumber: number; enrollmentId: string; competenceId: string; finalLetter: ResultLetter | null; reason?: string | null }) =>
      api.put(`/academic/gradebook/${assignmentId}/final-letter`, v),
    onSuccess: () => invalidate('gradebook'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useSaveConclusions = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { periodNumber: number; items: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>; reason?: string | null }) =>
      api.put(`/academic/gradebook/${assignmentId}/conclusions`, v),
    onSuccess: () => invalidate('gradebook'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useSetCourseCriteria = (assignmentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (criteria: Array<{ criterionId: string; weight?: number | null }>) => api.put(`/academic/gradebook/${assignmentId}/criteria`, { criteria }),
    onSuccess: () => { invalidate('gradebook'); toast.success('Criterios del curso guardados'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

export const useImportHomework = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { courseAssignmentId: string; periodNumber: number }) => api.post('/grades/matrix/sync-homework', v),
    onSuccess: () => { invalidate('gradebook'); toast.success('Notas de tareas importadas'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
};

// ── Consolidado, libretas y exportaciones
export const useConsolidation = (classroomId: string | null, period: number | 'FINAL') =>
  useQuery({
    queryKey: ['academic', 'consolidation', classroomId, period],
    queryFn: () => get<ConsolidationResponse>('/academic/consolidation', { classroomId, period }),
    enabled: !!classroomId,
  });

export const useReportCard = (enrollmentId: string | null | undefined) =>
  useQuery({
    queryKey: ['academic', 'report-card', enrollmentId],
    queryFn: () => get<ReportCard>(`/academic/report-card/${enrollmentId}`),
    enabled: !!enrollmentId,
    retry: false,
  });

export const useClassroomReportCards = (classroomId: string | null) =>
  useQuery({
    queryKey: ['academic', 'report-cards', classroomId],
    queryFn: () => get<ReportCard[]>('/academic/report-cards', { classroomId }),
    enabled: !!classroomId,
  });

export async function downloadFile(url: string, params: Record<string, unknown>, filename: string): Promise<void> {
  try {
    const response = await api.get(url, { params, responseType: 'blob' });
    const href = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch (e) {
    toast.error(apiErrorMessage(e, 'No se pudo descargar el archivo.'));
  }
}
```

> Las funciones `planMutation(...)` devuelven hooks: se usan como `const applyTemplate = useApplyTemplate();`. Si el linter de hooks se queja de que se llaman dentro de una fábrica, no lo desactives globalmente: agrega `// eslint-disable-next-line react-hooks/rules-of-hooks` solo en las dos líneas internas de `planMutation`.

Commit: `feat(academico): bloque 14 - tipos y hooks de la API academica`

---

## BLOQUE 15 — Frontend: Inicio académico y Plan de estudios

### 15.1 `front/src/features/academic/pages/AcademicHomePage.tsx`

```tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademicYears } from '@/features/academic-years/api/useAcademicYears';
import { useCopyPlan, useCopyTeachingLoad, useSetupStatus } from '../api';
import { gradeLabel } from '../types';

export const AcademicHomePage: React.FC = () => {
  const { data, isLoading } = useSetupStatus();
  const { data: years = [] } = useAcademicYears();
  const copyPlan = useCopyPlan();
  const copyLoad = useCopyTeachingLoad();
  const [fromYearId, setFromYearId] = useState('');

  if (isLoading || !data) return <div className="space-y-3 p-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;

  const steps = [
    {
      title: 'Año lectivo y periodos',
      ok: data.academicYear.hasPeriods,
      detail: `Año ${data.academicYear.year} · ${data.academicYear.periodType === 'TRIMESTER' ? '3 trimestres' : '4 bimestres'}${data.academicYear.hasPeriods ? '' : ' · faltan las fechas de los periodos'}`,
      to: '/academic-years',
    },
    {
      title: 'Plan de estudios',
      ok: data.gradesInUse > 0 && data.invalidPlans.length === 0,
      detail: data.invalidPlans.length
        ? `Revisa: ${data.invalidPlans.map((p) => gradeLabel(p.level, p.grade)).join(', ')}`
        : 'Todos los grados con aulas tienen su plan completo',
      to: '/academic/study-plan',
    },
    {
      title: 'Aulas y tutores',
      ok: data.classrooms > 0 && data.classroomsWithoutTutor === 0,
      detail: `${data.classrooms} aulas · ${data.classroomsWithoutTutor} sin tutor(a)`,
      to: '/classrooms',
    },
    {
      title: 'Carga docente',
      ok: data.coursesWithoutTeacher === 0 && data.classrooms > 0,
      detail: `${data.coursesWithoutTeacher} cursos sin docente · ${data.teachersWithoutLoad} docentes sin cursos`,
      to: '/academic/teaching-load',
    },
    {
      title: 'Evaluación y cierre',
      ok: false,
      neutral: true,
      detail: 'Sigue el avance de notas y cierra cada periodo',
      to: '/academic/progress',
    },
  ];
  const otherYears = years.filter((y) => y.id !== data.academicYear.id);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Inicio académico" description={`Prepara el año ${data.academicYear.year} en cinco pasos.`} />
      <Card className="divide-y divide-border">
        {steps.map((s, i) => (
          <div key={s.title} className="flex items-center gap-4 px-5 py-4">
            {s.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i + 1}. {s.title}</p>
              <p className="text-sm text-muted-foreground">{s.detail}</p>
            </div>
            <Button asChild variant={s.ok || s.neutral ? 'ghost' : 'outline'} size="sm">
              <Link to={s.to}>{s.ok ? 'Ver' : 'Completar'} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        ))}
      </Card>

      {otherYears.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="text-sm font-medium">Copiar desde otro año</p>
          <p className="text-sm text-muted-foreground">Trae el plan de estudios y la carga docente de un año anterior. No reemplaza lo que ya existe.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={fromYearId} onChange={(e) => setFromYearId(e.target.value)}>
              <option value="">Elige un año…</option>
              {otherYears.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
            </Select>
            <Button variant="outline" size="sm" disabled={!fromYearId || copyPlan.isPending}
              onClick={() => copyPlan.mutate({ fromAcademicYearId: fromYearId, toAcademicYearId: data.academicYear.id })}>
              Copiar plan de estudios
            </Button>
            <Button variant="outline" size="sm" disabled={!fromYearId || copyLoad.isPending}
              onClick={() => copyLoad.mutate({ fromAcademicYearId: fromYearId, toAcademicYearId: data.academicYear.id })}>
              Copiar carga docente
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
```

### 15.2 Modales del plan: `front/src/features/academic/components/PlanModals.tsx`

```tsx
import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAddWorkshop, useApplyTemplate, useCreateSubcourses, useUpdateCourseCompetences } from '../api';
import type { Catalog, CnebArea, Level, PlanCourse } from '../types';
import { gradeLabel } from '../types';

const GradePicker: React.FC<{ level: Level; grades: number[]; value: number[]; onChange: (v: number[]) => void }> = ({ level, grades, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {grades.map((g) => {
      const on = value.includes(g);
      return (
        <button key={g} type="button" onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g].sort((a, b) => a - b))}
          className={cn('rounded-full border px-3 py-1 text-sm', on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
          {gradeLabel(level, g)}
        </button>
      );
    })}
  </div>
);

export const TemplateModal: React.FC<{ open: boolean; onClose: () => void; level: Level; currentGrade: number; catalog: Catalog }> = ({ open, onClose, level, currentGrade, catalog }) => {
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const [optional, setOptional] = useState<string[]>([]);
  const apply = useApplyTemplate();
  const optionalAreas = catalog.areas[level].filter((a) => a.optional);
  return (
    <Modal open={open} onClose={onClose} title="Aplicar plantilla CNEB" description="Agrega las áreas oficiales con sus competencias. No borra lo que ya existe."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={grades.length === 0 || apply.isPending} onClick={() => apply.mutate({ level, grades, includeOptional: optional }, { onSuccess: onClose })}>Aplicar</Button>
      </>}>
      <p className="mb-2 text-sm font-medium">Grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
      {optionalAreas.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-sm font-medium">Áreas opcionales</p>
          {optionalAreas.map((a) => (
            <label key={a.code} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" checked={optional.includes(a.code)} onChange={(e) => setOptional(e.target.checked ? [...optional, a.code] : optional.filter((c) => c !== a.code))} />
              {a.name}
            </label>
          ))}
        </>
      )}
    </Modal>
  );
};

interface SubRow { name: string; cnebNumbers: number[]; weight: number }

export const SubcourseModal: React.FC<{ open: boolean; onClose: () => void; level: Level; currentGrade: number; area: CnebArea; catalog: Catalog }> = ({ open, onClose, level, currentGrade, area, catalog }) => {
  const [rows, setRows] = useState<SubRow[]>([{ name: '', cnebNumbers: [], weight: 1 }, { name: '', cnebNumbers: [], weight: 1 }]);
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const create = useCreateSubcourses();
  const covered = useMemo(() => new Set(rows.flatMap((r) => r.cnebNumbers)), [rows]);
  const missing = area.competences.filter((n) => !covered.has(n));
  const valid = rows.length >= 2 && rows.every((r) => r.name.trim().length >= 2 && r.cnebNumbers.length > 0) && missing.length === 0 && grades.length > 0;
  const update = (i: number, patch: Partial<SubRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toggle = (i: number, n: number) => {
    const r = rows[i];
    update(i, { cnebNumbers: r.cnebNumbers.includes(n) ? r.cnebNumbers.filter((x) => x !== n) : [...r.cnebNumbers, n] });
  };
  return (
    <Modal open={open} onClose={onClose} size="xl" title={`Dividir ${area.name} en cursos`}
      description="Cada curso evalúa una o más competencias del área. Todas las competencias deben quedar cubiertas."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valid || create.isPending}
          onClick={() => create.mutate({ level, grades, officialAreaCode: area.code, subcourses: rows.map((r) => ({ name: r.name.trim(), cnebNumbers: r.cnebNumbers, weight: r.weight })) }, { onSuccess: onClose })}>
          Guardar división
        </Button>
      </>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 text-left font-semibold">Curso</th>
              {area.competences.map((n) => (
                <th key={n} className={cn('px-2 py-2 text-center font-semibold', !covered.has(n) && 'text-red-600')}>{catalog.competences[n].shortName}</th>
              ))}
              <th className="px-2 py-2 text-center font-semibold" title="Peso al combinar con otros cursos del área">Peso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2 pr-2"><Input value={r.name} placeholder="Ej.: Álgebra" onChange={(e) => update(i, { name: e.target.value })} /></td>
                {area.competences.map((n) => (
                  <td key={n} className="px-2 text-center"><input type="checkbox" aria-label={catalog.competences[n].name} checked={r.cnebNumbers.includes(n)} onChange={() => toggle(i, n)} /></td>
                ))}
                <td className="px-2"><Input type="number" min={0.5} max={10} step={0.5} className="w-20" value={r.weight} onChange={(e) => update(i, { weight: Number(e.target.value) || 1 })} /></td>
                <td>{rows.length > 2 && <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Quitar curso"><Trash2 className="h-4 w-4" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows([...rows, { name: '', cnebNumbers: [], weight: 1 }])}><Plus className="mr-1 h-4 w-4" />Agregar curso</Button>
      <p className={cn('mt-3 text-sm', missing.length ? 'text-red-600' : 'text-emerald-600')}>
        {missing.length ? `Faltan por cubrir: ${missing.map((n) => catalog.competences[n].shortName).join(', ')}` : 'Todas las competencias están cubiertas.'}
      </p>
      <p className="mb-2 mt-5 text-sm font-medium">Aplicar a los grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
    </Modal>
  );
};

export const WorkshopModal: React.FC<{ open: boolean; onClose: () => void; level: Level; currentGrade: number; catalog: Catalog }> = ({ open, onClose, level, currentGrade, catalog }) => {
  const [name, setName] = useState('');
  const [hours, setHours] = useState<string>('');
  const [grades, setGrades] = useState<number[]>([currentGrade]);
  const add = useAddWorkshop();
  return (
    <Modal open={open} onClose={onClose} title="Agregar taller" description="Los talleres aparecen en la libreta interna, no en el SIAGIE."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={name.trim().length < 2 || grades.length === 0 || add.isPending}
          onClick={() => add.mutate({ level, grades, name: name.trim(), weeklyHours: hours ? Number(hours) : null }, { onSuccess: onClose })}>Agregar</Button>
      </>}>
      <label className="text-sm font-medium">Nombre</label>
      <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Robótica" />
      <label className="mt-4 block text-sm font-medium">Horas semanales (opcional)</label>
      <Input className="mt-1 w-28" type="number" min={0} max={40} value={hours} onChange={(e) => setHours(e.target.value)} />
      <p className="mb-2 mt-4 text-sm font-medium">Grados</p>
      <GradePicker level={level} grades={catalog.grades[level]} value={grades} onChange={setGrades} />
    </Modal>
  );
};

export const CourseCompetencesModal: React.FC<{ open: boolean; onClose: () => void; course: PlanCourse; area: CnebArea; catalog: Catalog }> = ({ open, onClose, course, area, catalog }) => {
  const initial = Object.fromEntries(course.competences.filter((c) => c.cnebNumber).map((c) => [c.cnebNumber as number, c.weight]));
  const [selected, setSelected] = useState<Record<number, number>>(initial);
  const save = useUpdateCourseCompetences();
  const items = Object.entries(selected).map(([n, w]) => ({ cnebNumber: Number(n), weight: w }));
  return (
    <Modal open={open} onClose={onClose} title={`Competencias de ${course.name}`} description="El cambio aplica a todos los grados que usan este curso."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={items.length === 0 || save.isPending} onClick={() => save.mutate({ areaId: course.areaId, competences: items }, { onSuccess: onClose })}>Guardar</Button>
      </>}>
      {area.competences.map((n) => {
        const on = selected[n] !== undefined;
        return (
          <div key={n} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={on} onChange={(e) => {
                const next = { ...selected };
                if (e.target.checked) next[n] = 1; else delete next[n];
                setSelected(next);
              }} />
              {catalog.competences[n].name}
            </label>
            {on && <Input type="number" min={0.5} max={10} step={0.5} className="w-20" value={selected[n]} onChange={(e) => setSelected({ ...selected, [n]: Number(e.target.value) || 1 })} />}
          </div>
        );
      })}
    </Modal>
  );
};
```

### 15.3 `front/src/features/academic/pages/StudyPlanPage.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Lock, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useApplyTemplate, useCatalog, useRemovePlanCourse, useStudyPlan, useUpdatePlanCourse } from '../api';
import { CourseCompetencesModal, SubcourseModal, TemplateModal, WorkshopModal } from '../components/PlanModals';
import { LEVEL_LABEL, gradeLabel, type CnebArea, type Level, type PlanCourse } from '../types';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

const HoursInput: React.FC<{ course: PlanCourse }> = ({ course }) => {
  const update = useUpdatePlanCourse();
  const [value, setValue] = useState(course.weeklyHours?.toString() ?? '');
  useEffect(() => setValue(course.weeklyHours?.toString() ?? ''), [course.weeklyHours]);
  return (
    <Input type="number" min={0} max={40} className="h-8 w-16 text-center" aria-label={`Horas semanales de ${course.name}`} value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value === '' ? null : Number(value);
        if (next !== course.weeklyHours) update.mutate({ planCourseId: course.planCourseId, weeklyHours: next });
      }} />
  );
};

export const StudyPlanPage: React.FC = () => {
  const { data: catalog } = useCatalog();
  const [level, setLevel] = useState<Level>('PRIMARY');
  const [grade, setGrade] = useState<number | null>(null);
  const { data: plan, isLoading } = useStudyPlan(level, grade);
  const remove = useRemovePlanCourse();
  const applyTemplate = useApplyTemplate();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [splitArea, setSplitArea] = useState<CnebArea | null>(null);
  const [editCourse, setEditCourse] = useState<{ course: PlanCourse; area: CnebArea } | null>(null);
  const [toRemove, setToRemove] = useState<PlanCourse | null>(null);

  useEffect(() => { if (catalog) setGrade(catalog.grades[level][0]); }, [catalog, level]);

  if (!catalog || grade === null) return <Skeleton className="h-64 w-full" />;
  const areaSpec = (code: string | null) => catalog.areas[level].find((a) => a.code === code);
  const workshops = plan?.courses.filter((c) => c.kind === 'WORKSHOP') ?? [];
  const problems = plan ? [
    ...plan.requiredMissing.map((n) => `Falta el área ${n}.`),
    ...plan.coverage.filter((c) => c.missing.length).map((c) => `${c.name}: falta ${c.missing.map((n) => catalog.competences[n].shortName).join(', ')}.`),
    ...plan.coverage.filter((c) => c.conflict).map((c) => `${c.name} está como área completa y dividida a la vez. Quita una de las dos.`),
  ] : [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Plan de estudios"
        description="Qué cursos se dictan en cada grado. Las competencias vienen del Currículo Nacional y no se editan a mano."
        actions={<>
          <Button variant="outline" onClick={() => setWorkshopOpen(true)}>Agregar taller</Button>
          <Button onClick={() => setTemplateOpen(true)}>Aplicar plantilla CNEB</Button>
        </>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={level} onChange={setLevel} items={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
        <div className="flex flex-wrap gap-1.5">
          {catalog.grades[level].map((g) => (
            <button key={g} type="button" onClick={() => setGrade(g)}
              className={cn('rounded-full border px-3 py-1 text-sm', g === grade ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
              {gradeLabel(level, g)}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !plan ? <Skeleton className="h-64 w-full" /> : plan.courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title={`${gradeLabel(level, grade)} aún no tiene plan de estudios`}
          description="Aplica la plantilla del Currículo Nacional para crear las áreas oficiales con sus competencias."
          action={<Button onClick={() => applyTemplate.mutate({ level, grades: [grade], includeOptional: [] })}>Aplicar plantilla a este grado</Button>} />
      ) : (
        <>
          {problems.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />El plan de este grado está incompleto</p>
              <ul className="mt-1 list-disc pl-6">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <div className="space-y-3">
            {plan.coverage.filter((c) => c.inPlan).map((cov) => {
              const spec = areaSpec(cov.code)!;
              const courses = plan.courses.filter((c) => c.officialAreaCode === cov.code && c.kind !== 'WORKSHOP');
              const isSplit = courses.some((c) => c.kind === 'SUBCOURSE');
              return (
                <Card key={cov.code} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{cov.name}</h3>
                      {cov.isTransversal && <span className="text-xs text-muted-foreground">· las registra el tutor o tutora</span>}
                      {cov.missing.length === 0 && !cov.conflict
                        ? <span className="text-xs text-emerald-600">Completa</span>
                        : <span className="text-xs text-red-600">Incompleta</span>}
                    </div>
                    {!cov.isTransversal && !isSplit && (
                      <Button variant="ghost" size="sm" onClick={() => setSplitArea(spec)}>Dividir en cursos</Button>
                    )}
                  </div>
                  <div className="mt-3 divide-y divide-border">
                    {courses.map((course) => (
                      <div key={course.planCourseId} className="flex flex-wrap items-center gap-3 py-2">
                        <div className="min-w-[10rem] flex-1">
                          <p className="text-sm">{course.name}{course.kind === 'SUBCOURSE' && <span className="ml-2 text-xs text-muted-foreground">curso del área</span>}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {course.competences.map((k) => <span key={k.id} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{k.shortName}{k.weight !== 1 ? ` ×${k.weight}` : ''}</span>)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">h/sem <HoursInput course={course} /></div>
                        {course.hasGrades && <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Tiene notas: no se puede quitar"><Lock className="h-3.5 w-3.5" />Con notas</span>}
                        {course.kind === 'SUBCOURSE' && <Button variant="ghost" size="sm" onClick={() => setEditCourse({ course, area: spec })}>Competencias</Button>}
                        <Button variant="ghost" size="icon" disabled={course.hasGrades} onClick={() => setToRemove(course)} aria-label={`Quitar ${course.name}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}

            {plan.coverage.some((c) => !c.inPlan) && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Áreas que no están en el plan</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.coverage.filter((c) => !c.inPlan).map((c) => (
                    <Button key={c.code} variant="outline" size="sm" onClick={() => applyTemplate.mutate({ level, grades: [grade], includeOptional: [c.code] })}>
                      + {c.name}{c.optional ? ' (opcional)' : ''}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {workshops.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Talleres <span className="font-normal text-muted-foreground">· no van al SIAGIE</span></h3>
                <div className="mt-2 divide-y divide-border">
                  {workshops.map((w) => (
                    <div key={w.planCourseId} className="flex items-center gap-3 py-2">
                      <p className="flex-1 text-sm">{w.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">h/sem <HoursInput course={w} /></div>
                      <Button variant="ghost" size="icon" disabled={w.hasGrades} onClick={() => setToRemove(w)} aria-label={`Quitar ${w.name}`}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {templateOpen && <TemplateModal open onClose={() => setTemplateOpen(false)} level={level} currentGrade={grade} catalog={catalog} />}
      {workshopOpen && <WorkshopModal open onClose={() => setWorkshopOpen(false)} level={level} currentGrade={grade} catalog={catalog} />}
      {splitArea && <SubcourseModal open onClose={() => setSplitArea(null)} level={level} currentGrade={grade} area={splitArea} catalog={catalog} />}
      {editCourse && <CourseCompetencesModal open onClose={() => setEditCourse(null)} course={editCourse.course} area={editCourse.area} catalog={catalog} />}
      <ConfirmDialog
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.planCourseId, { onSettled: () => setToRemove(null) })}
        title={`Quitar ${toRemove?.name ?? ''} del plan`}
        description="Se quitará de este grado y sus asignaciones docentes quedarán inactivas. No se puede si ya tiene notas."
        confirmText="Quitar"
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
};
```

Commit: `feat(academico): bloque 15 - inicio academico y plan de estudios`

---

## BLOQUE 16 — Frontend: Carga docente

Crea `front/src/features/academic/pages/TeachingLoadPage.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAssignWholeClassroom, useSaveTeachingLoad, useTeachingLoad } from '../api';
import { LEVEL_LABEL, gradeLabel, teacherName, type Level, type LoadClassroom } from '../types';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];
const keyOf = (classroomId: string, areaId: string) => `${classroomId}|${areaId}`;

export const TeachingLoadPage: React.FC = () => {
  const [level, setLevel] = useState<Level>('PRIMARY');
  const { data, isLoading } = useTeachingLoad(level);
  const save = useSaveTeachingLoad();
  const whole = useAssignWholeClassroom();
  const [pending, setPending] = useState<Record<string, string | null>>({});

  const byGrade = useMemo(() => {
    const map = new Map<number, LoadClassroom[]>();
    (data?.classrooms ?? []).forEach((c) => map.set(c.grade, [...(map.get(c.grade) ?? []), c]));
    return [...map.entries()];
  }, [data]);
  const changes = Object.entries(pending).map(([k, teacherId]) => {
    const [classroomId, areaId] = k.split('|');
    return { classroomId, areaId, teacherId };
  });

  const changeLevel = (l: Level) => {
    if (changes.length && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    setPending({});
    setLevel(l);
  };

  return (
    <div className="pb-20">
      <PageHeader title="Carga docente" description="Elige el docente de cada curso por aula. Cambiar de docente conserva las notas." />
      <Tabs value={level} onChange={changeLevel} items={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} className="mb-4" />

      {isLoading || !data ? <Skeleton className="h-64 w-full" /> : data.classrooms.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title={`No hay aulas de ${LEVEL_LABEL[level]}`} description="Crea las aulas en Configuración > Aulas." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-4">
            {byGrade.map(([grade, rooms]) => {
              const courses = rooms[0].courses;
              if (courses.length === 0) {
                return (
                  <Card key={grade} className="p-4 text-sm text-muted-foreground">
                    {gradeLabel(level, grade)}: no tiene plan de estudios. Créalo en "Plan de estudios".
                  </Card>
                );
              }
              return (
                <Card key={grade} className="overflow-x-auto">
                  <div className="border-b border-border px-4 py-3 text-sm font-semibold">{gradeLabel(level, grade)}</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="sticky left-0 bg-card px-4 py-2 text-left font-semibold">Aula</th>
                        {courses.map((c) => <th key={c.areaId} className="min-w-[11rem] px-2 py-2 text-left font-semibold">{c.name}</th>)}
                        <th className="px-2 py-2 text-left font-semibold">Todo el aula</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id} className="border-b border-border last:border-0">
                          <td className="sticky left-0 bg-card px-4 py-2 font-medium">"{room.section}"</td>
                          {room.courses.map((cell) => {
                            const k = keyOf(room.id, cell.areaId);
                            const value = k in pending ? pending[k] : cell.teacherId;
                            const changed = k in pending;
                            return (
                              <td key={cell.areaId} className="px-2 py-1.5">
                                <Select
                                  aria-label={`${cell.name} de "${room.section}"`}
                                  className={cn('w-full', changed && 'border-amber-500 bg-amber-500/5', !value && 'text-muted-foreground')}
                                  value={value ?? ''}
                                  onChange={(e) => {
                                    const next = e.target.value || null;
                                    const copy = { ...pending };
                                    if (next === cell.teacherId) delete copy[k]; else copy[k] = next;
                                    setPending(copy);
                                  }}
                                >
                                  <option value="" disabled={cell.hasGrades}>{cell.hasGrades ? 'Sin docente (tiene notas)' : 'Sin docente'}</option>
                                  {data.teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{teacherName(t)}{cell.isTransversal && t.id === room.tutorTeacherId ? ' (tutor/a)' : ''}</option>
                                  ))}
                                </Select>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5">
                            <Select aria-label={`Asignar todo "${room.section}"`} value="" disabled={whole.isPending}
                              onChange={(e) => e.target.value && whole.mutate({ classroomId: room.id, teacherId: e.target.value })}>
                              <option value="">Asignar a…</option>
                              {data.teachers.map((t) => <option key={t.id} value={t.id}>{teacherName(t)}</option>)}
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit p-4 lg:sticky lg:top-4">
            <p className="text-sm font-semibold">Carga por docente</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {data.teachers.map((t) => {
                const load = data.teacherLoad.find((x) => x.teacherId === t.id);
                return (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span className={cn('truncate', !load?.courses && 'text-muted-foreground')}>{teacherName(t)}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{load?.courses ?? 0} · {load?.weeklyHours ?? 0} h</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      {changes.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm">{changes.length} cambio(s) sin guardar</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPending({})}>Descartar</Button>
              <Button disabled={save.isPending} onClick={() => save.mutate(changes, { onSuccess: () => setPending({}) })}>Guardar cambios</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

Commit: `feat(academico): bloque 16 - carga docente en matriz aulas por cursos`

---

## BLOQUE 17 — Frontend: Mis cursos y Registrar notas

### 17.1 `front/src/features/academic/pages/MyCoursesPage.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge, ProgressBar } from '@/components/ui/letter-badge';
import { useAuthStore } from '@/store/useAuthStore';
import { useMyCourses, useMyProgress, usePeriods } from '../api';
import { classroomLabel } from '../types';

export const MyCoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data, isLoading } = useMyCourses();
  const { data: periods } = usePeriods();
  const [period, setPeriod] = useState<number | null>(null);
  useEffect(() => {
    if (periods && period === null) setPeriod(periods.periods.find((p) => p.status === 'OPEN')?.periodNumber ?? periods.periods[periods.periods.length - 1]?.periodNumber ?? 1);
  }, [periods, period]);
  const { data: progress } = useMyProgress(period);
  const current = periods?.periods.find((p) => p.periodNumber === period);
  const tutorRooms = useMemo(
    () => [...new Map((data?.courses ?? []).filter((c) => c.classroom.tutorTeacherId === user?.id).map((c) => [c.classroom.id, c.classroom])).values()],
    [data, user],
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const courses = data?.courses ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Mis cursos"
        description={current ? <>Periodo: {current.name} <PeriodStatusBadge status={current.status} /></> : undefined}
        actions={periods && (
          <Select aria-label="Periodo" value={period ?? ''} onChange={(e) => setPeriod(Number(e.target.value))}>
            {periods.periods.map((p) => <option key={p.periodNumber} value={p.periodNumber}>{p.name}</option>)}
          </Select>
        )}
      />
      {courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title="Aún no tienes cursos asignados" description="La Dirección asigna los cursos en Carga docente." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const p = progress?.rows.find((r) => r.assignmentId === c.id);
            return (
              <Link key={c.id} to={`/gradebook/${c.id}?period=${period ?? 1}`} className="group">
                <Card className="h-full p-4 transition-colors group-hover:border-primary/50">
                  <p className="text-sm font-semibold">{c.area.name}</p>
                  <p className="text-sm text-muted-foreground">{classroomLabel(c.classroom)}</p>
                  <div className="mt-3"><ProgressBar percent={p?.percent ?? 0} /></div>
                  {p && (p.missingGrades > 0 || p.missingConclusions > 0) && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {p.missingGrades > 0 && `${p.missingGrades} calificativos pendientes`}
                      {p.missingGrades > 0 && p.missingConclusions > 0 && ' · '}
                      {p.missingConclusions > 0 && `${p.missingConclusions} conclusiones`}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {tutorRooms.length > 0 && (
        <Card className="mt-6 p-4">
          <p className="text-sm font-semibold">Mi aula</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tutorRooms.map((room) => (
              <Link key={room.id} to={`/academic/report-cards/print?classroomId=${room.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                Libretas de {classroomLabel(room)}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
```

### 17.2 Utilidades de la grilla: `front/src/features/academic/utils/gradeInput.ts`

```ts
import type { ResultLetter } from '../types';

export type ParsedCell = { numericScore: number | null; literalScore: ResultLetter | null } | 'invalid';

/** Acepta vacío, AD/A/B/C/EXO o un número de 0 a 20 (con coma o punto). */
export function parseCell(raw: string): ParsedCell {
  const v = raw.trim().toUpperCase();
  if (v === '') return { numericScore: null, literalScore: null };
  if (v === 'AD' || v === 'A' || v === 'B' || v === 'C' || v === 'EXO') return { numericScore: null, literalScore: v };
  const n = Number(v.replace(',', '.'));
  if (Number.isFinite(n) && n >= 0 && n <= 20) return { numericScore: Math.round(n * 10) / 10, literalScore: null };
  return 'invalid';
}

export function formatCell(score: { numericScore: number | null; literalScore: string | null } | undefined): string {
  if (!score) return '';
  if (score.numericScore !== null && score.numericScore !== undefined) return String(score.numericScore);
  return score.literalScore ?? '';
}

/** Convierte texto pegado desde Excel en una matriz de celdas. */
export function parseClipboard(text: string): string[][] {
  return text.replace(/\r/g, '').split('\n').filter((line, i, arr) => line !== '' || i < arr.length - 1).map((line) => line.split('\t'));
}
```

### 17.3 `front/src/features/academic/components/GradebookGrid.tsx`

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { LetterBadge } from '@/components/ui/letter-badge';
import { useSaveScores, useSetFinalLetter, apiErrorMessage, type ScoreInput } from '../api';
import type { GradebookData, GradebookResult, ResultLetter } from '../types';
import { formatCell, parseCell, parseClipboard } from '../utils/gradeInput';

interface Props {
  data: GradebookData;
  competenceId: string;
  reason: string | null;
  onNeedReason: () => void;
  onStatus: (s: 'idle' | 'saving' | 'saved' | 'error', msg?: string) => void;
}

const keyOf = (enrollmentId: string, criterionId: string) => `${enrollmentId}|${criterionId}`;

export const GradebookGrid: React.FC<Props> = ({ data, competenceId, reason, onNeedReason, onStatus }) => {
  const saveScores = useSaveScores(data.assignment.id);
  const setFinal = useSetFinalLetter(data.assignment.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<GradebookResult[]>(data.results);
  const tableRef = useRef<HTMLTableElement>(null);
  const editable = data.canEdit && (!data.requiresReason || !!reason);

  // Cargar valores al cambiar de competencia o al recibir datos nuevos
  useEffect(() => {
    const next: Record<string, string> = {};
    data.scores.filter((s) => s.competenceId === competenceId).forEach((s) => { next[keyOf(s.enrollmentId, s.criterionId)] = formatCell(s); });
    setDrafts(next);
    setDirty(new Set());
    setInvalid(new Set());
    setResults(data.results);
  }, [data, competenceId]);

  const flush = useCallback(async () => {
    if (dirty.size === 0) return;
    if (data.requiresReason && !reason) { onNeedReason(); return; }
    const items: ScoreInput[] = [];
    const bad = new Set<string>();
    dirty.forEach((k) => {
      const [enrollmentId, criterionId] = k.split('|');
      const parsed = parseCell(drafts[k] ?? '');
      if (parsed === 'invalid') { bad.add(k); return; }
      items.push({ enrollmentId, criterionId, competenceId, ...parsed });
    });
    setInvalid(bad);
    if (items.length === 0) return;
    onStatus('saving');
    try {
      const res = await saveScores.mutateAsync({ periodNumber: data.periodNumber, items, reason });
      setResults((prev) => {
        const map = new Map(prev.map((r) => [`${r.enrollmentId}|${r.competenceId}`, r]));
        res.results.forEach((r) => map.set(`${r.enrollmentId}|${r.competenceId}`, r));
        return [...map.values()];
      });
      setDirty((prev) => { const n = new Set(prev); items.forEach((i) => n.delete(keyOf(i.enrollmentId, i.criterionId))); return n; });
      onStatus('saved');
    } catch (e) {
      onStatus('error', apiErrorMessage(e, 'No se pudieron guardar las notas.'));
    }
  }, [dirty, drafts, competenceId, data, reason, saveScores, onNeedReason, onStatus]);

  // Guardado automático 1,2 s después del último cambio
  useEffect(() => {
    if (dirty.size === 0) return;
    const t = setTimeout(() => { void flush(); }, 1200);
    return () => clearTimeout(t);
  }, [dirty, drafts, flush]);

  const setCell = (k: string, value: string) => {
    setDrafts((d) => ({ ...d, [k]: value }));
    setDirty((s) => new Set(s).add(k));
  };

  const focusCell = (row: number, col: number) => {
    const el = tableRef.current?.querySelector<HTMLInputElement>(`input[data-row="${row}"][data-col="${col}"]`);
    el?.focus();
    el?.select();
  };

  const activeStudents = useMemo(() => data.students.filter((s) => s.state === 'REGISTERED'), [data.students]);

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const matrix = parseClipboard(text);
    matrix.forEach((cells, r) => cells.forEach((value, c) => {
      const student = activeStudents[row + r];
      const criterion = data.criteria[col + c];
      if (student && criterion) setCell(keyOf(student.enrollmentId, criterion.id), value);
    }));
  };

  const resultOf = (enrollmentId: string) => results.find((r) => r.enrollmentId === enrollmentId && r.competenceId === competenceId);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table ref={tableRef} className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-xs text-muted-foreground">
            <th className="w-10 px-2 py-2 text-left font-semibold">N.°</th>
            <th className="sticky left-0 bg-muted/40 px-2 py-2 text-left font-semibold">Estudiante</th>
            {data.criteria.map((c) => (
              <th key={c.id} className="px-1 py-2 text-center font-semibold" title={`${c.name} · peso ${c.weight}`}>{c.shortName}</th>
            ))}
            {data.criteria.length > 0 && <th className="px-2 py-2 text-center font-semibold">Sugerido</th>}
            <th className="px-2 py-2 text-center font-semibold">Final</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((s, idx) => {
            const active = s.state === 'REGISTERED';
            const row = activeStudents.findIndex((x) => x.enrollmentId === s.enrollmentId);
            const r = resultOf(s.enrollmentId);
            return (
              <tr key={s.enrollmentId} className={cn('border-t border-border', !active && 'opacity-50')}>
                <td className="px-2 py-1 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                <td className="sticky left-0 bg-card px-2 py-1">
                  <span className="whitespace-nowrap">{s.fullName}</span>
                  {!active && <span className="ml-2 text-xs text-muted-foreground">{s.state === 'WITHDRAWN' ? 'Retirado' : 'Trasladado'}</span>}
                </td>
                {data.criteria.map((c, col) => {
                  const k = keyOf(s.enrollmentId, c.id);
                  return (
                    <td key={c.id} className="px-1 py-1 text-center">
                      <input
                        data-row={row}
                        data-col={col}
                        aria-label={`${c.shortName} de ${s.fullName}`}
                        disabled={!active || !editable}
                        value={drafts[k] ?? ''}
                        onChange={(e) => setCell(k, e.target.value)}
                        onBlur={() => { void flush(); }}
                        onPaste={(e) => onPaste(e, row, col)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); focusCell(row + 1, col); }
                          if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(row - 1, col); }
                        }}
                        className={cn(
                          'h-8 w-14 rounded border border-transparent bg-transparent text-center tabular-nums focus:border-primary focus:bg-background focus:outline-none disabled:cursor-not-allowed',
                          dirty.has(k) && 'bg-amber-500/10',
                          invalid.has(k) && 'border-red-500 bg-red-500/10',
                        )}
                      />
                    </td>
                  );
                })}
                {data.criteria.length > 0 && (
                  <td className="px-2 py-1 text-center">
                    <LetterBadge letter={r?.suggestedLetter} title={r?.computedScore !== null && r?.computedScore !== undefined ? `Promedio ${r.computedScore}` : undefined} />
                  </td>
                )}
                <td className="px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <select
                      aria-label={`Calificativo final de ${s.fullName}`}
                      disabled={!active || !editable || setFinal.isPending}
                      value={r?.isOverridden ? r.finalLetter ?? '' : ''}
                      onChange={(e) => {
                        if (data.requiresReason && !reason) { onNeedReason(); return; }
                        const v = (e.target.value || null) as ResultLetter | null;
                        setFinal.mutate({ periodNumber: data.periodNumber, enrollmentId: s.enrollmentId, competenceId, finalLetter: v, reason });
                      }}
                      className="h-8 rounded border border-input bg-background px-1 text-sm"
                    >
                      <option value="">{r?.suggestedLetter ? `Usar ${r.suggestedLetter}` : '—'}</option>
                      {(['AD', 'A', 'B', 'C', 'EXO'] as const).map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <LetterBadge letter={r?.finalLetter} />
                    {r?.isOverridden && <span className="text-[10px] text-muted-foreground" title="Calificativo ajustado por el docente">ajustado</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
```

### 17.4 `front/src/features/academic/components/GradebookPanels.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LetterBadge } from '@/components/ui/letter-badge';
import { useEvaluationCriteria } from '@/features/grades/api/useGrades';
import { cn } from '@/lib/utils';
import { useSaveConclusions, useSetCourseCriteria } from '../api';
import type { GradebookData } from '../types';

export const SummaryTable: React.FC<{ data: GradebookData; onPick: (competenceId: string) => void }> = ({ data, onPick }) => (
  <div className="overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted/40">
        <tr className="text-xs text-muted-foreground">
          <th className="px-2 py-2 text-left font-semibold">Estudiante</th>
          {data.competences.map((c) => (
            <th key={c.id} className="px-2 py-2 text-center font-semibold">
              <button type="button" className="hover:underline" onClick={() => onPick(c.id)} title={c.name}>{c.shortName}</button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.students.map((s) => (
          <tr key={s.enrollmentId} className={cn('border-t border-border', s.state !== 'REGISTERED' && 'opacity-50')}>
            <td className="whitespace-nowrap px-2 py-1.5">{s.fullName}</td>
            {data.competences.map((c) => {
              const r = data.results.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === c.id);
              return <td key={c.id} className="px-2 py-1.5 text-center"><LetterBadge letter={r?.finalLetter} /></td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ConclusionItem: React.FC<{ value: string; max: number; disabled: boolean; onSave: (v: string) => void }> = ({ value, max, disabled, onSave }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div>
      <Textarea rows={2} value={text} disabled={disabled} maxLength={max} onChange={(e) => setText(e.target.value)} onBlur={() => text !== value && onSave(text)}
        placeholder="Describe el avance, las dificultades y qué hará para mejorar." />
      <p className={cn('mt-0.5 text-right text-xs', text.length > max * 0.9 ? 'text-amber-600' : 'text-muted-foreground')}>{text.length}/{max}</p>
    </div>
  );
};

export const ConclusionsPanel: React.FC<{ data: GradebookData; reason: string | null; onNeedReason: () => void }> = ({ data, reason, onNeedReason }) => {
  const save = useSaveConclusions(data.assignment.id);
  const [onlyRequired, setOnlyRequired] = useState(true);
  const items = useMemo(() => {
    const list: Array<{ enrollmentId: string; fullName: string; competenceId: string; competence: string; letter: string; conclusion: string }> = [];
    data.students.filter((s) => s.state === 'REGISTERED').forEach((s) => data.competences.forEach((c) => {
      const r = data.results.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === c.id);
      if (!r?.finalLetter) return;
      if (onlyRequired && r.finalLetter !== 'B' && r.finalLetter !== 'C') return;
      const conc = data.conclusions.find((x) => x.enrollmentId === s.enrollmentId && x.competenceId === c.id)?.conclusion ?? '';
      list.push({ enrollmentId: s.enrollmentId, fullName: s.fullName, competenceId: c.id, competence: c.shortName, letter: r.finalLetter, conclusion: conc });
    }));
    return list;
  }, [data, onlyRequired]);
  const editable = data.canEdit;

  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyRequired} onChange={(e) => setOnlyRequired(e.target.checked)} />
        Mostrar solo B y C (obligatorias)
      </label>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No hay conclusiones pendientes.</p> : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={`${it.enrollmentId}|${it.competenceId}`} className={cn('rounded-lg border p-3', !it.conclusion && (it.letter === 'B' || it.letter === 'C') ? 'border-amber-500/40' : 'border-border')}>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="font-medium">{it.fullName}</span>
                <span className="text-muted-foreground">· {it.competence}</span>
                <LetterBadge letter={it.letter} />
              </div>
              <ConclusionItem value={it.conclusion} max={data.conclusionMaxLength} disabled={!editable}
                onSave={(v) => {
                  if (data.requiresReason && !reason) { onNeedReason(); return; }
                  save.mutate({ periodNumber: data.periodNumber, reason, items: [{ enrollmentId: it.enrollmentId, competenceId: it.competenceId, conclusion: v }] });
                }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CriteriaModal: React.FC<{ open: boolean; onClose: () => void; data: GradebookData }> = ({ open, onClose, data }) => {
  const { data: all = [] } = useEvaluationCriteria(data.assignment.classroom.educationLevel);
  const save = useSetCourseCriteria(data.assignment.id);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.criteria.map((c) => [c.id, c.isCustom ? String(c.weight) : ''])));
  const list = (all as Array<{ id: string; name: string; shortName: string; weight: number; isActive?: boolean }>).filter((c) => c.isActive !== false);
  return (
    <Modal open={open} onClose={onClose} title="Criterios de este curso" description="Elige qué criterios usas y su peso. Si dejas el peso vacío, se usa el del colegio."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={save.isPending || Object.keys(selected).length === 0}
          onClick={() => save.mutate(Object.entries(selected).map(([criterionId, w]) => ({ criterionId, weight: w ? Number(w) : null })), { onSuccess: onClose })}>
          Guardar
        </Button>
      </>}>
      {list.map((c) => {
        const on = c.id in selected;
        return (
          <div key={c.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={on} onChange={(e) => {
                const next = { ...selected };
                if (e.target.checked) next[c.id] = ''; else delete next[c.id];
                setSelected(next);
              }} />
              {c.name} <span className="text-muted-foreground">({c.shortName} · peso {c.weight})</span>
            </label>
            {on && <Input type="number" min={0.5} max={10} step={0.5} className="w-20" placeholder={String(c.weight)} value={selected[c.id]} onChange={(e) => setSelected({ ...selected, [c.id]: e.target.value })} />}
          </div>
        );
      })}
    </Modal>
  );
};

export const ReasonModal: React.FC<{ open: boolean; onClose: () => void; onConfirm: (reason: string) => void }> = ({ open, onClose, onConfirm }) => {
  const [text, setText] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Motivo de la corrección" description="El periodo no está abierto. Tu motivo quedará en la bitácora."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={text.trim().length < 5} onClick={() => onConfirm(text.trim())}>Continuar</Button>
      </>}>
      <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: corrección solicitada por el docente el 12/06 por error de digitación." />
    </Modal>
  );
};
```

> Si `useEvaluationCriteria` devuelve otra forma (por ejemplo, `{ data: [...] }`), adapta solo la línea `const list = …`.

### 17.5 `front/src/features/academic/pages/GradebookPage.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, ListChecks, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge } from '@/components/ui/letter-badge';
import { cn } from '@/lib/utils';
import { downloadFile, useGradebook, useImportHomework } from '../api';
import { GradebookGrid } from '../components/GradebookGrid';
import { ConclusionsPanel, CriteriaModal, ReasonModal, SummaryTable } from '../components/GradebookPanels';
import { classroomLabel, teacherName } from '../types';

type Tab = 'competence' | 'summary' | 'conclusions';

export const GradebookPage: React.FC = () => {
  const { assignmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const period = Number(params.get('period') ?? 1) || 1;
  const { data, isLoading, error } = useGradebook(assignmentId, period);
  const importHomework = useImportHomework();
  const [tab, setTab] = useState<Tab>('competence');
  const [competenceId, setCompetenceId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [status, setStatus] = useState<{ s: 'idle' | 'saving' | 'saved' | 'error'; msg?: string }>({ s: 'idle' });

  useEffect(() => {
    if (data && (!competenceId || !data.competences.some((c) => c.id === competenceId))) setCompetenceId(data.competences[0]?.id ?? null);
  }, [data, competenceId]);
  useEffect(() => { setReason(null); }, [period]);
  useEffect(() => { if (status.s === 'error' && status.msg) toast.error(status.msg); }, [status]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <p className="text-sm text-red-600">No se pudo abrir el curso.</p>;

  const active = data.students.filter((s) => s.state === 'REGISTERED');
  const missingGrades = active.length * data.competences.length - data.results.filter((r) => r.finalLetter && active.some((s) => s.enrollmentId === r.enrollmentId)).length;
  const missingConclusions = data.results.filter((r) => (r.finalLetter === 'B' || r.finalLetter === 'C') && active.some((s) => s.enrollmentId === r.enrollmentId)
    && !data.conclusions.some((c) => c.enrollmentId === r.enrollmentId && c.competenceId === r.competenceId && c.conclusion.trim())).length;

  return (
    <div className="pb-16">
      <Link to="/my-courses" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Mis cursos</Link>
      <PageHeader
        title={`${data.assignment.area.name} · ${classroomLabel(data.assignment.classroom)}`}
        description={<>Docente: {teacherName(data.assignment.teacher)} · <PeriodStatusBadge status={data.periodStatus} /></>}
        actions={<>
          <Select aria-label="Periodo" value={period} onChange={(e) => setParams({ period: e.target.value })}>
            {Array.from({ length: data.periodCount }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Periodo {n}</option>)}
          </Select>
          {data.canEdit && <Button variant="outline" size="sm" onClick={() => setCriteriaOpen(true)}><ListChecks className="mr-1 h-4 w-4" />Criterios</Button>}
          {data.canEdit && data.periodStatus === 'OPEN' && (
            <Button variant="outline" size="sm" disabled={importHomework.isPending} onClick={() => importHomework.mutate({ courseAssignmentId: data.assignment.id, periodNumber: period })}>
              <Upload className="mr-1 h-4 w-4" />Importar tareas
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => downloadFile('/academic/exports/gradebook.xlsx', { assignmentId: data.assignment.id, periodNumber: period }, `registro-${data.assignment.area.name}-p${period}.xlsx`)}>
            <Download className="mr-1 h-4 w-4" />Excel
          </Button>
        </>}
      />

      {!data.canEdit && data.periodStatus !== 'OPEN' && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">Este periodo está {data.periodStatus === 'REVIEW' ? 'en revisión' : 'cerrado'}: solo lectura.</div>
      )}
      {data.canEdit && data.requiresReason && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Estás corrigiendo un periodo que no está abierto. {reason ? <>Motivo: <em>{reason}</em></> : <button type="button" className="underline" onClick={() => setReasonOpen(true)}>Indica el motivo para editar</button>}
        </div>
      )}

      <Tabs<Tab> value={tab} onChange={setTab} className="mb-4" items={[
        { value: 'competence', label: 'Por competencia' },
        { value: 'summary', label: 'Resumen' },
        { value: 'conclusions', label: 'Conclusiones', count: missingConclusions },
      ]} />

      {data.competences.length === 0 ? <p className="text-sm text-muted-foreground">Este curso no tiene competencias. Revisa el plan de estudios.</p> : (
        <>
          {tab === 'competence' && competenceId && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {data.competences.map((c) => (
                  <button key={c.id} type="button" title={c.name} onClick={() => setCompetenceId(c.id)}
                    className={cn('rounded-full border px-3 py-1 text-sm', c.id === competenceId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {c.shortName}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{data.competences.find((c) => c.id === competenceId)?.name}</p>
              {data.criteria.length === 0 && <p className="mb-3 text-sm text-muted-foreground">Este curso no usa criterios: registra directamente el calificativo final.</p>}
              <GradebookGrid data={data} competenceId={competenceId} reason={reason} onNeedReason={() => setReasonOpen(true)} onStatus={(s, msg) => setStatus({ s, msg })} />
              <p className="mt-2 text-xs text-muted-foreground">Escribe un número de 0 a 20 o AD, A, B, C, EXO. Puedes pegar columnas desde Excel. Enter baja a la siguiente fila.</p>
            </>
          )}
          {tab === 'summary' && <SummaryTable data={data} onPick={(id) => { setCompetenceId(id); setTab('competence'); }} />}
          {tab === 'conclusions' && <ConclusionsPanel data={data} reason={reason} onNeedReason={() => setReasonOpen(true)} />}
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
          <span className={cn(status.s === 'error' ? 'text-red-600' : 'text-muted-foreground')}>
            {status.s === 'saving' ? 'Guardando…' : status.s === 'saved' ? 'Guardado' : status.s === 'error' ? 'Error al guardar' : 'Los cambios se guardan solos'}
          </span>
          <span className="text-muted-foreground">
            {Math.max(missingGrades, 0)} calificativos pendientes · {missingConclusions} conclusiones pendientes
          </span>
        </div>
      </div>

      {criteriaOpen && <CriteriaModal open onClose={() => setCriteriaOpen(false)} data={data} />}
      <ReasonModal open={reasonOpen} onClose={() => setReasonOpen(false)} onConfirm={(r) => { setReason(r); setReasonOpen(false); }} />
    </div>
  );
};
```

Commit: `feat(academico): bloque 17 - mis cursos y registro de notas por competencia`

---

## BLOQUE 18 — Frontend: Avance y cierre de periodos

Crea `front/src/features/academic/pages/PeriodProgressPage.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge, ProgressBar } from '@/components/ui/letter-badge';
import { cn } from '@/lib/utils';
import { apiErrorMessage, usePeriods, useProgress, useRemindPending, useSetPeriodStatus } from '../api';
import { LEVEL_LABEL, classroomLabel, type Level, type PeriodState, type ProgressRow } from '../types';
import { toast } from 'sonner';

type LevelFilter = 'ALL' | Level;
const fmt = (d: string) => new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

export const PeriodProgressPage: React.FC = () => {
  const { data: periods, isLoading } = usePeriods();
  const [selected, setSelected] = useState<number | null>(null);
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const { data: progress } = useProgress(selected, level === 'ALL' ? undefined : level);
  const setStatus = useSetPeriodStatus();
  const remind = useRemindPending();
  const [forceOpen, setForceOpen] = useState<{ message: string } | null>(null);
  const [forceReason, setForceReason] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (periods && selected === null) setSelected(periods.periods.find((p) => p.status !== 'CLOSED')?.periodNumber ?? 1);
  }, [periods, selected]);
  const current = periods?.periods.find((p) => p.periodNumber === selected);
  useEffect(() => { setDeadline(current?.gradingDeadline ? current.gradingDeadline.slice(0, 10) : ''); }, [current]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProgressRow[]>();
    (progress?.rows ?? []).forEach((r) => map.set(r.classroom.id, [...(map.get(r.classroom.id) ?? []), r]));
    return [...map.values()];
  }, [progress]);

  if (isLoading || !periods) return <Skeleton className="h-64 w-full" />;

  const change = (status: PeriodState, extra: { force?: boolean; reason?: string } = {}) => {
    if (!selected) return;
    setStatus.mutate({ periodNumber: selected, status, ...extra }, {
      onSuccess: () => { setForceOpen(null); setForceReason(''); },
      onError: (e) => {
        const status409 = (e as { response?: { status?: number } })?.response?.status === 409;
        if (status === 'CLOSED' && status409 && !extra.force) setForceOpen({ message: apiErrorMessage(e) });
        else toast.error(apiErrorMessage(e));
      },
    });
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title="Avance y cierre de periodos" description="Revisa qué falta registrar y cierra cada periodo cuando esté completo."
        actions={selected && progress && progress.totals.missingGrades + progress.totals.missingConclusions > 0 && (
          <Button variant="outline" disabled={remind.isPending} onClick={() => remind.mutate(selected)}><Bell className="mr-1 h-4 w-4" />Recordar a docentes con pendientes</Button>
        )} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {periods.periods.map((p) => (
          <button key={p.periodNumber} type="button" onClick={() => setSelected(p.periodNumber)}
            className={cn('rounded-xl border p-4 text-left transition-colors', p.periodNumber === selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}>
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{p.name}</span><PeriodStatusBadge status={p.status} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{fmt(p.startDate)} – {fmt(p.endDate)}</p>
          </button>
        ))}
      </div>

      {current && (
        <Card className="mb-6 flex flex-wrap items-end gap-4 p-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">{current.name}</p>
            <p className="text-sm text-muted-foreground">
              {progress ? `${progress.totals.percent}% registrado · ${progress.totals.missingGrades} calificativos y ${progress.totals.missingConclusions} conclusiones pendientes` : 'Calculando…'}
            </p>
            {current.reason && <p className="mt-1 text-xs text-muted-foreground">Último motivo: {current.reason}</p>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fecha límite de registro</label>
            <div className="flex gap-2">
              <Input type="date" className="h-9 w-40" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ periodNumber: current.periodNumber, status: current.status, gradingDeadline: deadline || null })}>Guardar</Button>
            </div>
          </div>
          <div className="flex gap-2">
            {current.status === 'OPEN' && <Button variant="outline" onClick={() => change('REVIEW')}>Pasar a revisión</Button>}
            {current.status !== 'OPEN' && <Button variant="outline" onClick={() => change('OPEN')}>Reabrir</Button>}
            {current.status !== 'CLOSED' && <Button onClick={() => change('CLOSED')}>Cerrar periodo</Button>}
          </div>
        </Card>
      )}

      <Tabs<LevelFilter> value={level} onChange={setLevel} className="mb-3"
        items={[{ value: 'ALL', label: 'Todos' }, ...(['INITIAL', 'PRIMARY', 'SECONDARY'] as Level[]).map((l) => ({ value: l as LevelFilter, label: LEVEL_LABEL[l] }))]} />

      <div className="space-y-3">
        {grouped.map((rows) => (
          <Card key={rows[0].classroom.id} className="overflow-x-auto">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">{classroomLabel(rows[0].classroom)}</div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Curso</th><th className="px-2 py-2 text-left font-semibold">Docente</th>
                <th className="px-2 py-2 text-left font-semibold">Avance</th><th className="px-2 py-2 text-right font-semibold">Calificativos</th>
                <th className="px-2 py-2 text-right font-semibold">Conclusiones</th><th />
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.assignmentId} className="border-t border-border">
                    <td className="px-4 py-2">{r.course}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.teacher.name}</td>
                    <td className="px-2 py-2"><ProgressBar percent={r.percent} /></td>
                    <td className={cn('px-2 py-2 text-right tabular-nums', r.missingGrades > 0 && 'text-amber-700 dark:text-amber-300')}>{r.missingGrades || '—'}</td>
                    <td className={cn('px-2 py-2 text-right tabular-nums', r.missingConclusions > 0 && 'text-amber-700 dark:text-amber-300')}>{r.missingConclusions || '—'}</td>
                    <td className="px-2 py-2 text-right"><Link className="text-sm text-primary hover:underline" to={`/gradebook/${r.assignmentId}?period=${selected}`}>Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
        {grouped.length === 0 && <p className="text-sm text-muted-foreground">No hay cursos asignados para este filtro.</p>}
      </div>

      <Modal open={!!forceOpen} onClose={() => setForceOpen(null)} title="Cerrar con pendientes" description={forceOpen?.message}
        footer={<>
          <Button variant="ghost" onClick={() => setForceOpen(null)}>Cancelar</Button>
          <Button variant="destructive" disabled={forceReason.trim().length < 5 || setStatus.isPending} onClick={() => change('CLOSED', { force: true, reason: forceReason.trim() })}>Cerrar de todas formas</Button>
        </>}>
        <Textarea rows={3} value={forceReason} onChange={(e) => setForceReason(e.target.value)} placeholder="Motivo (queda en la bitácora)" />
      </Modal>
    </div>
  );
};
```

> `useSetPeriodStatus` no muestra el error por sí mismo: lo maneja esta página en el `onError` de cada `mutate`.

Commit: `feat(academico): bloque 18 - avance de notas y cierre de periodos`

---

## BLOQUE 19 — Frontend: libreta, reportes y SIAGIE

### 19.1 `front/src/features/academic/components/ReportCardView.tsx`

```tsx
import React from 'react';
import { LetterBadge } from '@/components/ui/letter-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportCard } from '../api';
import type { ReportCard } from '../types';

const SITUATION: Record<string, string> = { PROMOTED: 'Promovido(a)', RECOVERY: 'Requiere recuperación', RETAINED: 'Permanece en el grado', TRANSFERRED: 'Trasladado(a)', WITHDRAWN: 'Retirado(a)' };

export const ReportCardSheet: React.FC<{ card: ReportCard; printable?: boolean }> = ({ card, printable }) => {
  const periods = card.periods.filter((p) => card.visiblePeriods.includes(p.periodNumber));
  const showFinal = card.officialAreas.some((a) => a.competences.some((c) => c.finalLetter));
  return (
    <article className={printable ? 'break-after-page bg-white p-6 text-[12px] text-black' : 'rounded-xl border border-border bg-card p-5 text-sm'}>
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          {card.school?.logoUrl && <img src={card.school.logoUrl} alt="" className="h-12 w-12 object-contain" />}
          <div>
            <p className="font-semibold">{card.school?.name}</p>
            <p className="text-xs text-muted-foreground">Código modular: {card.school?.modularCode ?? '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">Informe de progreso del aprendizaje</p>
          <p className="text-xs text-muted-foreground">Año escolar {card.academicYear.year}</p>
        </div>
      </header>
      <div className="mb-4 grid gap-1 sm:grid-cols-2">
        <p><span className="text-muted-foreground">Estudiante:</span> {card.student.fullName}</p>
        <p><span className="text-muted-foreground">Código SIAGIE:</span> {card.student.studentCode ?? '—'}</p>
        <p><span className="text-muted-foreground">Grado y sección:</span> {card.classroom.label}</p>
        <p><span className="text-muted-foreground">Tutor(a):</span> {card.tutor ?? '—'}</p>
      </div>

      {periods.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay periodos publicados. La libreta se mostrará cuando el colegio cierre el primer periodo.</p>
      ) : (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-1.5 text-left font-semibold">Área</th>
                <th className="py-1.5 text-left font-semibold">Competencia</th>
                {periods.map((p) => <th key={p.periodNumber} className="px-1 py-1.5 text-center font-semibold">{p.name}</th>)}
                {showFinal && <th className="px-1 py-1.5 text-center font-semibold">Final</th>}
              </tr>
            </thead>
            <tbody>
              {card.officialAreas.map((area) => area.competences.map((c, i) => (
                <tr key={`${area.code}-${c.number}`} className="border-b border-border align-top">
                  {i === 0 && <td rowSpan={area.competences.length} className="py-1.5 pr-2 font-medium">{area.name}</td>}
                  <td className="py-1.5 pr-2">{c.name}</td>
                  {periods.map((p) => <td key={p.periodNumber} className="px-1 py-1.5 text-center"><LetterBadge letter={c.letters[p.periodNumber]} /></td>)}
                  {showFinal && <td className="px-1 py-1.5 text-center"><LetterBadge letter={c.finalLetter} /></td>}
                </tr>
              )))}
            </tbody>
          </table>

          {periods.map((p) => {
            const list = card.officialAreas.flatMap((a) => a.competences.filter((c) => c.conclusions[p.periodNumber]).map((c) => ({ area: a.name, comp: c.shortName, text: c.conclusions[p.periodNumber] })));
            if (list.length === 0) return null;
            return (
              <section key={p.periodNumber} className="mt-4">
                <p className="mb-1 font-semibold">Conclusiones descriptivas — {p.name}</p>
                <ul className="space-y-1">
                  {list.map((x) => <li key={`${x.area}-${x.comp}`}><span className="font-medium">{x.area} · {x.comp}:</span> {x.text}</li>)}
                </ul>
              </section>
            );
          })}

          {card.internalCourses.length > 0 && (
            <section className="mt-4">
              <p className="mb-1 font-semibold">Cursos y talleres del colegio <span className="font-normal text-muted-foreground">(referencial)</span></p>
              <table className="w-full border-collapse">
                <tbody>
                  {card.internalCourses.map((course) => course.competences.map((c, i) => (
                    <tr key={`${course.name}-${c.name}`} className="border-b border-border">
                      {i === 0 && <td rowSpan={course.competences.length} className="py-1 pr-2 font-medium">{course.name}</td>}
                      <td className="py-1 pr-2">{c.name}</td>
                      {periods.map((p) => <td key={p.periodNumber} className="px-1 py-1 text-center"><LetterBadge letter={c.letters[p.periodNumber]} /></td>)}
                    </tr>
                  )))}
                </tbody>
              </table>
            </section>
          )}

          <section className="mt-4">
            <p className="mb-1 font-semibold">Asistencia</p>
            <table className="w-full border-collapse text-xs">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="py-1 text-left font-semibold">Periodo</th><th className="py-1 text-center font-semibold">Faltas justificadas</th>
                <th className="py-1 text-center font-semibold">Faltas injustificadas</th><th className="py-1 text-center font-semibold">Tardanzas justificadas</th>
                <th className="py-1 text-center font-semibold">Tardanzas injustificadas</th>
              </tr></thead>
              <tbody>
                {card.attendance.map((a) => (
                  <tr key={a.periodNumber} className="border-b border-border">
                    <td className="py-1">{card.periods.find((p) => p.periodNumber === a.periodNumber)?.name}</td>
                    <td className="py-1 text-center">{a.absentJustified}</td><td className="py-1 text-center">{a.absentUnjustified}</td>
                    <td className="py-1 text-center">{a.lateJustified}</td><td className="py-1 text-center">{a.lateUnjustified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{card.scaleLegend.map((l) => `${l.letter}: ${l.label}`).join(' · ')}</span>
        {card.finalSituation && <span className="font-semibold text-foreground">Situación final: {SITUATION[card.finalSituation] ?? card.finalSituation}</span>}
      </footer>
      {printable && (
        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-xs">
          {['Tutor(a)', 'Dirección', 'Madre, padre o apoderado(a)'].map((s) => <div key={s} className="border-t border-black pt-1">{s}</div>)}
        </div>
      )}
    </article>
  );
};

export const ReportCardView: React.FC<{ enrollmentId: string | null | undefined }> = ({ enrollmentId }) => {
  const { data, isLoading, error } = useReportCard(enrollmentId);
  if (!enrollmentId) return <p className="text-sm text-muted-foreground">No hay matrícula activa.</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if ((error as { response?: { status?: number } })?.response?.status === 402) return <p className="text-sm text-muted-foreground">La libreta en línea está disponible en el plan PRO del colegio.</p>;
  if (error || !data) return <p className="text-sm text-red-600">No se pudo cargar la libreta.</p>;
  return <ReportCardSheet card={data} />;
};
```

### 19.2 `front/src/features/academic/pages/ReportCardsPrintPage.tsx`

```tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassroomReportCards } from '../api';
import { ReportCardSheet } from '../components/ReportCardView';

export const ReportCardsPrintPage: React.FC = () => {
  const [params] = useSearchParams();
  const classroomId = params.get('classroomId');
  const { data, isLoading, error } = useClassroomReportCards(classroomId);
  if (!classroomId) return <p className="text-sm">Falta elegir el aula.</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <p className="text-sm text-red-600">No se pudieron generar las libretas.</p>;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{data.length} libretas · usa "Guardar como PDF" en el diálogo de impresión.</p>
        <Button onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Imprimir / Guardar PDF</Button>
      </div>
      <div className="space-y-6 print:space-y-0">
        {data.map((card) => <ReportCardSheet key={card.student.fullName} card={card} printable />)}
      </div>
    </div>
  );
};
```

En `front/src/index.css`, al final:
```css
@media print {
  @page { size: A4; margin: 12mm; }
  body { background: white !important; }
  .break-after-page { break-after: page; }
}
```

En `front/src/layouts/DashboardLayout.tsx`:
- agrega la clase `print:hidden` al `<aside` (barra lateral), al `<header` de escritorio y al `div` de la barra móvil (`md:hidden flex items-center…`);
- en el contenedor `<main>` (o el `div` que envuelve `<Outlet />`), agrega `print:p-0 print:overflow-visible`.

### 19.3 SIAGIE: ajustes al inyector

En `front/src/features/grades/utils/siagieTemplateInjector.ts`:
1. En `sanitizeConclusion`, cambia `clean.slice(0, 350)` por `clean.slice(0, 300)`, y el comentario "Máximo 350" por "Máximo 300 (igual que el backend; validar con la plantilla vigente)".
2. En el bucle que empareja cada fila de la hoja con un estudiante (donde se leen `dniCell` y `nameCell`), cambia el orden de búsqueda:
   - primero `studentByCode.get(valor)`, con el valor de la celda de documento o de código;
   - luego `studentByDni.get(valor)`;
   - al final, por nombre normalizado.
   
   Si la estructura detectada tiene una columna de código distinta a la de DNI, úsala primero.

### 19.4 `front/src/features/academic/components/SiagieExportPanel.tsx`

```tsx
import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { injectGradesIntoSiagieTemplate, type SiagieInjectionResult } from '@/features/grades/utils/siagieTemplateInjector';
import type { ConsolidationResponse } from '../types';

export const SiagieExportPanel: React.FC<{ data: ConsolidationResponse }> = ({ data }) => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<SiagieInjectionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const blocking = data.summary.missingStudentCodes + data.summary.missingGrades + data.summary.missingConclusions;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await injectGradesIntoSiagieTemplate(file, data.matrix, []);
      setResult(r);
      const href = URL.createObjectURL(r.blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = r.fileName;
      a.click();
      URL.revokeObjectURL(href);
      toast.success('Archivo generado. Revísalo antes de subirlo al SIAGIE.');
    } catch {
      toast.error('No se pudo leer la plantilla. Usa el archivo descargado del SIAGIE sin modificar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Descarga del SIAGIE la plantilla de registro de notas de esta aula y periodo.</li>
        <li>Súbela aquí: se completan los calificativos y conclusiones por código de estudiante.</li>
        <li>Revisa el archivo y cárgalo en el SIAGIE.</li>
      </ol>
      <div className={blocking ? 'rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm' : 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm'}>
        {blocking
          ? `Antes de exportar: ${data.summary.missingStudentCodes} estudiantes sin código SIAGIE, ${data.summary.missingGrades} calificativos y ${data.summary.missingConclusions} conclusiones pendientes.`
          : 'Todo listo para exportar.'}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept=".xls,.xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} className="text-sm" />
        <Button disabled={!file || busy} onClick={run}><FileSpreadsheet className="mr-1 h-4 w-4" />Generar archivo para SIAGIE</Button>
      </div>
      {result && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p>{result.matchedStudents} de {result.totalStudentsInFile} estudiantes encontrados · {result.injectedGradesCount} calificativos · {result.injectedConclusionsCount} conclusiones.</p>
          {result.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-amber-700 dark:text-amber-300">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        </div>
      )}
    </div>
  );
};
```

### 19.5 `front/src/features/academic/pages/AcademicReportsPage.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LetterBadge } from '@/components/ui/letter-badge';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { downloadFile, useConsolidation, usePeriods } from '../api';
import { SiagieExportPanel } from '../components/SiagieExportPanel';
import { classroomLabel, type Level } from '../types';

type Tab = 'consolidated' | 'report-cards' | 'siagie';
const SITUATION: Record<string, string> = { PROMOTED: 'Promovido', RECOVERY: 'Recuperación', RETAINED: 'Permanece', TRANSFERRED: 'Trasladado', WITHDRAWN: 'Retirado' };

export const AcademicReportsPage: React.FC = () => {
  const { data: classrooms = [] } = useClassrooms();
  const { data: periods } = usePeriods();
  const [tab, setTab] = useState<Tab>('consolidated');
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [period, setPeriod] = useState<number | 'FINAL'>(1);
  useEffect(() => { if (!classroomId && classrooms.length) setClassroomId(classrooms[0].id); }, [classrooms, classroomId]);
  const { data, isLoading } = useConsolidation(tab === 'report-cards' ? null : classroomId, period);
  const sorted = [...classrooms].sort((a, b) => a.educationLevel.localeCompare(b.educationLevel) || a.grade - b.grade || a.section.localeCompare(b.section));

  return (
    <div>
      <PageHeader title="Reportes académicos" description="Consolidado del aula, libretas para imprimir y archivo para el SIAGIE." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs<Tab> value={tab} onChange={setTab} items={[
          { value: 'consolidated', label: 'Consolidado' },
          { value: 'report-cards', label: 'Libretas' },
          { value: 'siagie', label: 'SIAGIE' },
        ]} />
        <Select aria-label="Aula" value={classroomId ?? ''} onChange={(e) => setClassroomId(e.target.value)}>
          {sorted.map((c) => <option key={c.id} value={c.id}>{classroomLabel({ educationLevel: c.educationLevel as Level, grade: c.grade, section: c.section })}</option>)}
        </Select>
        {tab !== 'report-cards' && (
          <Select aria-label="Periodo" value={String(period)} onChange={(e) => setPeriod(e.target.value === 'FINAL' ? 'FINAL' : Number(e.target.value))}>
            {periods?.periods.map((p) => <option key={p.periodNumber} value={p.periodNumber}>{p.name}</option>)}
            <option value="FINAL">Calificativo final</option>
          </Select>
        )}
      </div>

      {tab === 'report-cards' && classroomId && (
        <Card className="p-5">
          <p className="text-sm">Genera las libretas de todos los estudiantes del aula en una sola vista lista para imprimir o guardar como PDF.</p>
          <Button asChild className="mt-3"><Link to={`/academic/report-cards/print?classroomId=${classroomId}`}>Abrir libretas del aula</Link></Button>
        </Card>
      )}

      {tab !== 'report-cards' && (isLoading || !data ? <Skeleton className="h-64 w-full" /> : tab === 'siagie' ? (
        <Card className="p-5"><SiagieExportPanel data={data} /></Card>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data.summary.totalStudents} estudiantes · {data.summary.missingGrades} calificativos y {data.summary.missingConclusions} conclusiones pendientes
            </p>
            <Button variant="outline" size="sm" onClick={() => downloadFile('/academic/exports/consolidation.xlsx', { classroomId, period }, `consolidado-${data.classroom.grade}${data.classroom.section}-${period}.xlsx`)}>
              <Download className="mr-1 h-4 w-4" />Excel
            </Button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th rowSpan={2} className="sticky left-0 bg-muted/40 px-3 py-2 text-left font-semibold">Estudiante</th>
                  {data.matrix.consolidatedAreas?.map((a) => <th key={a.code} colSpan={a.competences.length} className="border-l border-border px-2 py-1.5 text-center font-semibold">{a.name}</th>)}
                  {period === 'FINAL' && <th rowSpan={2} className="border-l border-border px-2 py-2 font-semibold">Situación</th>}
                </tr>
                <tr>
                  {data.matrix.consolidatedAreas?.map((a) => a.competences.map((c, i) => (
                    <th key={c.id} title={c.name} className={`px-1 py-1.5 text-center font-medium ${i === 0 ? 'border-l border-border' : ''}`}>{c.shortName}</th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {data.matrix.students.map((s) => (
                  <tr key={s.enrollmentId} className={`border-t border-border ${s.enrollmentState !== 'REGISTERED' ? 'opacity-50' : ''}`}>
                    <td className="sticky left-0 whitespace-nowrap bg-card px-3 py-1.5">{s.fullName}</td>
                    {data.matrix.consolidatedAreas?.map((a) => a.competences.map((c, i) => (
                      <td key={c.id} className={`px-1 py-1.5 text-center ${i === 0 ? 'border-l border-border' : ''}`}>
                        <LetterBadge letter={s.consolidatedGrades?.[a.code]?.competences?.[c.id]?.letter} />
                      </td>
                    )))}
                    {period === 'FINAL' && <td className="border-l border-border px-2 py-1.5 text-xs">{s.finalSituation ? SITUATION[s.finalSituation] : '—'} <span className="text-muted-foreground">(provisional)</span></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {data.issues.length > 0 && (
            <details className="mt-4 rounded-lg border border-border p-3 text-sm">
              <summary className="cursor-pointer font-medium">{data.issues.length} observaciones</summary>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted-foreground">{data.issues.map((i, idx) => <li key={idx}>{i.message}</li>)}</ul>
            </details>
          )}
        </>
      ))}
    </div>
  );
};
```

### 19.6 Libreta para familias

En `front/src/features/parent/components/ParentGradesView.tsx`:
- elimina el uso de `useReportCard` de `@/features/grades/api/useGrades`, `StudentGradeCard`, `GradeBadge`, los estados `searchQuery` y `viewMode`, los `useMemo` de `courses`, `filteredCourses` y `stats`, y todo el JSX que muestra cursos, KPIs, el buscador y la tabla;
- conserva la carga de hijos, el `ChildSwitcher` y el encabezado con el nombre del hijo o hija;
- debajo del encabezado, renderiza `<ReportCardView enrollmentId={enrollmentId} />`, importado desde `@/features/academic/components/ReportCardView`.

Commit: `feat(academico): bloque 19 - libreta oficial, consolidado, impresion y SIAGIE`

---

## BLOQUE 20 — Navegación y rutas

### 20.1 Rutas (`front/src/router/index.tsx`)

1. Agrega importaciones *lazy* siguiendo el patrón existente (`lazy(() => import(...).then((m) => ({ default: m.X })))`) para:
   - `AcademicHomePage`, `StudyPlanPage`, `TeachingLoadPage`, `PeriodProgressPage`, `AcademicReportsPage`, `ReportCardsPrintPage`, `MyCoursesPage` y `GradebookPage`, desde `@/features/academic/pages/<Nombre>`.
2. Agrega las rutas dentro del layout protegido:

| Ruta | Página | `RoleGuard allowedRoles` | `PlanGuard minPlan="PRO"` |
|---|---|---|---|
| `/academic` | AcademicHomePage | SUPER_ADMIN, SCHOOL_ADMIN | no |
| `/academic/study-plan` | StudyPlanPage | SUPER_ADMIN, SCHOOL_ADMIN | no |
| `/academic/teaching-load` | TeachingLoadPage | SUPER_ADMIN, SCHOOL_ADMIN | no |
| `/academic/progress` | PeriodProgressPage | SUPER_ADMIN, SCHOOL_ADMIN | sí |
| `/academic/reports` | AcademicReportsPage | SUPER_ADMIN, SCHOOL_ADMIN, ADMINISTRATIVE | sí |
| `/academic/report-cards/print` | ReportCardsPrintPage | SUPER_ADMIN, SCHOOL_ADMIN, ADMINISTRATIVE, TEACHER | sí |
| `/my-courses` | MyCoursesPage | TEACHER | no |
| `/gradebook/:assignmentId` | GradebookPage | SUPER_ADMIN, SCHOOL_ADMIN, ADMINISTRATIVE, TEACHER | sí |

3. Reemplaza las rutas antiguas:
   - `/curricular-areas` → `<Navigate to="/academic/study-plan" replace />`;
   - `/teacher-assignments` → un componente pequeño que redirige a `/my-courses` si el rol es `TEACHER` y a `/academic/teaching-load` en otro caso.
4. `/grades` se mantiene para PARENT y STUDENT. En `front/src/features/grades/pages/GradesPage.tsx`, reemplaza el retorno final (`<TeacherAdminGradesView />`) por redirecciones con `<Navigate replace />`:
   - TEACHER → `/my-courses`;
   - ADMINISTRATIVE → `/academic/reports`;
   - otros → `/academic/progress`.
   
   Elimina el import de `TeacherAdminGradesView`.

### 20.2 Menú (`front/src/layouts/DashboardLayout.tsx`)

En `schoolNavSections`:

1. Reemplaza la sección `'Gestión Académica'` por una sección `'Académico'` con estos ítems, en este orden:
   - `{ label: 'Inicio académico', path: '/academic', icon: GraduationCap, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'], minPlan: 'BASIC' }`
   - `{ label: 'Plan de estudios', path: '/academic/study-plan', icon: BookOpen, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'], minPlan: 'BASIC' }`
   - `{ label: 'Carga docente', path: '/academic/teaching-load', icon: Users, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'], minPlan: 'BASIC' }`
   - `{ label: 'Mis cursos', path: '/my-courses', icon: BookOpen, roles: ['TEACHER'], minPlan: 'BASIC' }`
   - `{ label: 'Avance y cierre', path: '/academic/progress', icon: ClipboardList, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'], minPlan: 'PRO' }`
   - `{ label: 'Reportes académicos', path: '/academic/reports', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'], minPlan: 'PRO' }`
   - los ítems existentes de **Matrícula SIAGIE (Alumnos)**, **Aula Virtual (Supervisión)** y **Bitácora**, sin cambios;
   - el ítem existente `/academic-reports`, con la etiqueta cambiada a `'Otros reportes'`.

   Elimina el ítem `/grades` ("Mis Cursos y Notas" / "Calificaciones y Actas") de esta sección.
2. En `'Configuración Escolar'`:
   - elimina los ítems `/curricular-areas` y `/teacher-assignments`;
   - cambia la etiqueta de `/evaluation-criteria` a `'Criterios y escala'`.
3. En `'Portal Familiar'`, deja `'Libreta de Calificaciones'` (`/grades`, rol PARENT) sin cambios.
4. Importa desde `lucide-react` los íconos que falten (`GraduationCap`, `BookOpen`, `Users`, `ClipboardList`, `FileSpreadsheet`). No dupliques imports existentes.

Commit: `feat(academico): bloque 20 - navegacion y rutas del flujo academico`

---

## BLOQUE 21 — Retiro del código antiguo y migración `academico_restricciones`

### 21.1 Backend

1. Elimina la carpeta `back/src/modules/curricular-areas/` y su registro en `app.ts` (el import y el `app.use`).
2. Elimina `back/src/modules/catalog/` y su registro en `app.ts`. Verifica antes con `grep -rn "/catalog'" front/src` que solo lo usaban `features/catalog` y `features/curricular-areas`.
3. `course-assignments`: deja solo las rutas `GET /my-courses` y `GET /`. Elimina las rutas `POST /`, `POST /bulk`, `POST /sync-teacher` y `DELETE /:id`, y sus métodos en el controller, el service, el repository y el schema. Las rutas que quedan filtran `deletedAt: null` y `academicYear: { isActive: true }` (bloque 12).
4. `grades`:
   - En `grade.routes.ts`, deja solo:
     - `GET` y `PUT /grading-scale`;
     - `GET`, `POST`, `PUT /:id` y `DELETE /:id` de `/criteria`;
     - `POST /matrix/sync-homework`.
   - Elimina de `grade.controller.ts`, `grade.service.ts`, `grade.repository.ts` y `grade.schema.ts` todo lo que solo usaban las rutas borradas: matriz, guardado por lotes, conclusiones, libreta, resumen SIAGIE, bloqueo de periodos, entradas y notas legacy, `convertScoreToSiagie` y `isPeriodLocked`.
   - Elimina `back/src/modules/grades/siagie-consolidator.service.ts`.
   - Conserva `letter-scale.ts`, `promotion-rules.ts` y su prueba.
5. Busca restos y corrígelos hasta que no queden resultados fuera de `scripts/academic-normalize.ts`:
   ```bash
   grep -rn "evaluatedCompetenceIds\|gradingPeriodLock\|gradeEntry\|prisma.grade\.\|tx.grade\.\|SiagieConsolidator\|getDefaultCompetencesForCode" back/src
   ```

### 21.2 Frontend

1. Elimina por completo `front/src/features/curricular-areas/` y `front/src/features/catalog/`.
2. Elimina `front/src/features/course-assignments/pages/TeacherAssignmentsPage.tsx` y `components/TeacherMyCoursesView.tsx`. Conserva `api/useCourseAssignments.ts` si lo usan otras pantallas (aula virtual, asistencia por curso); verifícalo con `grep`.
3. En `front/src/features/grades/`, conserva solo:
   - `pages/GradesPage.tsx` (con las redirecciones del bloque 20);
   - `pages/EvaluationCriteriaPage.tsx`;
   - `components/GradingScaleCard.tsx`;
   - `api/useGradingScale.ts`;
   - `types.ts`;
   - `utils/siagieTemplateInjector.ts`;
   - `api/useGrades.ts`, dejando dentro solo `useEvaluationCriteria`, `useCreateCriterion`, `useUpdateCriterion` y `useDeleteCriterion`.
   
   Borra los demás componentes de `grades/components/`.
4. Ejecuta `cd front && npx tsc --noEmit` y corrige cada import roto: elimina el uso si pertenece a una pantalla retirada, o cámbialo al equivalente en `features/academic`.

### 21.3 Migración final

Antes de tocar el esquema:
1. Ejecuta `cd back && pnpm academic:normalize --apply`. Es idempotente.
2. Si el informe muestra **bloqueantes**, **detente**. Muéstraselos al usuario y espera indicaciones: la migración fallaría con aulas duplicadas.

Cambios en `schema.prisma`:
- `CurricularArea`:
  - `educationLevel EducationLevel` pasa a ser requerido (sin `?`);
  - elimina `evaluatedCompetenceIds`.
- `CourseAssignment`:
  - `academicYearId String` pasa a ser requerido;
  - `academicYear AcademicYear @relation(...)` pasa a ser requerido;
  - elimina `gradeEntries GradeEntry[]`.
- Elimina los modelos `GradeEntry`, `Grade` y `GradingPeriodLock`, el enum `AssessmentType` (si no lo usa nadie más) y sus relaciones inversas:
  - `Enrollment.grades`;
  - `CurricularCompetence.grades`;
  - `Classroom.gradingPeriodLocks`;
  - la relación de `User` y de `School` con `GradingPeriodLock`.
- `Classroom`: agrega `@@unique([schoolId, educationLevel, grade, section, shift])`.

Crea la migración:
```bash
npx prisma migrate dev --create-only --name academico_restricciones
```

Agrega al final del SQL generado:
```sql
-- Un solo año lectivo activo por colegio
CREATE UNIQUE INDEX "AcademicYear_one_active_per_school" ON "AcademicYear" ("schoolId") WHERE "isActive" = true;
```

Aplica con `npx prisma migrate dev`.
- Si Prisma pide un valor por defecto para las columnas que pasan a requeridas, es que la normalización dejó filas en `NULL`: vuelve a ejecutar el script y revisa.
- **No** uses `--force-reset`.

Commit: `refactor(academico): bloque 21 - retiro del flujo antiguo y restricciones finales`

---

## BLOQUE 22 — Seed

Archivo `back/prisma/seed.ts`.

1. En el bloque de limpieza inicial:
   - elimina las líneas `prisma.gradingPeriodLock.deleteMany()`, `prisma.grade.deleteMany()` y `prisma.gradeEntry.deleteMany()`;
   - **antes** de `prisma.courseAssignment.deleteMany()`, agrega:
     ```ts
     await prisma.competencePeriodResult.deleteMany();
     await prisma.courseAssignmentCriterion.deleteMany();
     await prisma.academicPeriodStatus.deleteMany();
     await prisma.studyPlanCourse.deleteMany();
     ```
2. Agrega al inicio:
   ```ts
   import { CurriculumService } from '../src/modules/academic/curriculum.service';
   import { TeachingLoadService } from '../src/modules/academic/teaching-load.service';
   import { ResultsService } from '../src/modules/academic/results.service';
   ```
3. Reemplaza **toda** la sección "6. ÁREAS CURRICULARES Y COMPETENCIAS OFICIALES" y la sección "7. ASIGNACIÓN DE CURSOS A DOCENTES" (desde `const mineduAreas = [` hasta la creación de `asigMatematicaBasic`, inclusive) por:
   ```ts
   console.log('📚 Configurando plan de estudios CNEB...');
   const curriculum = new CurriculumService();
   const teachingLoad = new TeachingLoadService();
   await curriculum.applyTemplate(schoolPro.id, academicYearPro.id, 'INITIAL', [5]);
   await curriculum.applyTemplate(schoolPro.id, academicYearPro.id, 'PRIMARY', [1, 3]);
   await curriculum.applyTemplate(schoolPro.id, academicYearPro.id, 'SECONDARY', [2]);
   await curriculum.createSubcourses(schoolPro.id, academicYearPro.id, 'SECONDARY', [2], 'MAT', [
     { name: 'Aritmética y Estadística', cnebNumbers: [23, 26] },
     { name: 'Álgebra', cnebNumbers: [24] },
     { name: 'Geometría y Trigonometría', cnebNumbers: [25] },
   ]);
   await curriculum.applyTemplate(schoolBasic.id, academicYearBasic.id, 'PRIMARY', [2]);
   await curriculum.applyTemplate(schoolBasic.id, academicYearBasic.id, 'SECONDARY', [1]);

   const findArea = (schoolId: string, educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY', where: { officialAreaCode?: string; kind?: 'OFFICIAL' | 'SUBCOURSE'; name?: string }) =>
     prisma.curricularArea.findFirstOrThrow({ where: { schoolId, educationLevel, ...where }, include: { competences: true } });
   const assign = (schoolId: string, academicYearId: string, classroomId: string, areaId: string, teacherId: string) =>
     prisma.courseAssignment.create({ data: { schoolId, academicYearId, classroomId, areaId, teacherId } });
   const comp = (area: { competences: Array<{ id: string; cnebNumber: number | null }> }, n: number) => area.competences.find((c) => c.cnebNumber === n)!;

   const matPri = await findArea(schoolPro.id, 'PRIMARY', { officialAreaCode: 'MAT', kind: 'OFFICIAL' });
   const comPri = await findArea(schoolPro.id, 'PRIMARY', { officialAreaCode: 'COM', kind: 'OFFICIAL' });
   const aritSec = await findArea(schoolPro.id, 'SECONDARY', { name: 'Aritmética y Estadística' });
   const cytSec = await findArea(schoolPro.id, 'SECONDARY', { officialAreaCode: 'CYT', kind: 'OFFICIAL' });
   const matPriBasic = await findArea(schoolBasic.id, 'PRIMARY', { officialAreaCode: 'MAT', kind: 'OFFICIAL' });

   console.log('📌 Asignando Cursos a Docentes...');
   const asigMatematicaPrimariaPro = await assign(schoolPro.id, academicYearPro.id, aulaPrimaria3Pro.id, matPri.id, docentePro.id);
   const asigComunicacionPrimariaPro = await assign(schoolPro.id, academicYearPro.id, aulaPrimaria3Pro.id, comPri.id, docentePro.id);
   const asigMatematicaSecundariaPro = await assign(schoolPro.id, academicYearPro.id, aulaSecundaria2Pro.id, aritSec.id, docentePro2.id);
   const asigCienciaSecundariaPro = await assign(schoolPro.id, academicYearPro.id, aulaSecundaria2Pro.id, cytSec.id, docentePro2.id);
   const asigMatematicaBasic = await assign(schoolBasic.id, academicYearBasic.id, aulaPrimaria2Basic.id, matPriBasic.id, docenteBasic.id);
   for (const room of [aulaPrimaria3Pro, aulaSecundaria2Pro, aulaPrimaria2Basic]) {
     await teachingLoad.syncTutorTransversal(room.schoolId, room.id);
   }
   ```
4. En la sección de notas:
   - `const compMatematica1Pro = comp(matPri, 23);`
   - `const compMatematica2Pro = comp(matPri, 24);`
   - agrega `const compAritSec = comp(aritSec, 23);`
   - en **todas** las notas cuyo `courseAssignmentId` sea `asigMatematicaSecundariaPro.id` (Valeria y el bucle `studentsSecundaria2`), cambia `competenceId: compMatematica1Pro.id` por `competenceId: compAritSec.id`;
   - cambia `competenceId: areasPro[1].comps[0].id` por `competenceId: comp(comPri, 7).id`.
5. Después de `prisma.detailedGrade.createMany(...)`, agrega:
   ```ts
   const resultsService = new ResultsService();
   for (const a of [asigMatematicaPrimariaPro, asigComunicacionPrimariaPro, asigMatematicaSecundariaPro]) {
     await resultsService.recompute(schoolPro.id, a.id, 1);
   }
   ```
6. Busca con `grep -n "areasPro\|areasBasic\|mineduAreas\|setupAreas" prisma/seed.ts` y corrige cualquier referencia restante con `findArea`/`comp`.
7. Revisa los tipos del seed sin ejecutarlo:
   ```bash
   npx tsc --noEmit --skipLibCheck --esModuleInterop --resolveJsonModule --target es2020 --module commonjs prisma/seed.ts
   ```
   Corrige cualquier error.

**Ejecutar el seed borra toda la base de desarrollo.** Pregunta al usuario: "¿Autorizas ejecutar `pnpm prisma db seed`? Borrará y regenerará todos los datos de desarrollo". Ejecútalo solo con un "sí" explícito.

Commit: `chore(academico): bloque 22 - seed con plan de estudios CNEB`

---

## BLOQUE 23 — Pruebas integrales e informe

### 23.1 Pruebas automáticas

Ejecuta:
- `cd back && npx tsc --noEmit && npx vitest run` (deben pasar las pruebas del catálogo, del motor y de promoción);
- `cd front && npx tsc --noEmit && npx vite build`.

### 23.2 Pruebas en vivo

Levanta el backend con `pnpm dev` (en segundo plano) contra la base de desarrollo con datos del seed. Si el usuario no autorizó el seed, usa los datos existentes y adapta los nombres.

Haz las peticiones con `curl` o con un script en `back/scripts/tmp-academic-check.ts`, que **borrarás al final**. Inicia sesión con los usuarios del seed (admin y docentes del colegio PRO). Registra cada resultado en `CAMBIOS_ACADEMICO.md`.

1. **Plan:**
   - `GET /api/academic/study-plan?level=SECONDARY&grade=2` → `isValid: true` y Matemática dividida en 3 cursos;
   - `POST /study-plan/subcourses` dejando una competencia sin cubrir → 400 con el mensaje "Faltan competencias por cubrir".
2. **Permisos del currículo:** un docente intenta `PUT /api/academic/courses/:id/competences` → 403.
3. **Carga docente:**
   - cambiar el docente de un curso con notas → 200 y las notas se conservan;
   - dejarlo sin docente → 409.
4. **Notas válidas:** un docente guarda una nota en una competencia de otro curso → 400; con un estudiante de otra aula → 400.
5. **Nota de juicio:**
   - el docente guarda notas → `suggestedLetter` calculado;
   - `PUT final-letter` con otra letra → `isOverridden: true`;
   - el admin cambia la escala del nivel con `PUT /api/grades/grading-scale` → el resultado conserva el ajuste y actualiza `suggestedLetter`.
6. **Periodos:**
   - pasar el periodo 1 a `REVIEW` → el docente recibe 403 al guardar;
   - el admin sin motivo recibe 409; con motivo, 200, y existe un `AuditLog` `GRADES_SAVE` con el motivo.
7. **Cierre:** `CLOSED` con pendientes → 409; con `force: true` y motivo → 200. Vuelve a `OPEN` al terminar.
8. **Consolidado:**
   - `GET /consolidation?classroomId=<2.° Sec>&period=1` → el área MAT existe con 4 competencias, y "Cantidad" viene de "Aritmética y Estadística";
   - `period=FINAL` responde 200.
9. **Libreta:**
   - un padre de un alumno del aula ve `visiblePeriods` solo con los periodos cerrados;
   - el padre de otro alumno → 403.
10. **Excel:** `GET /exports/consolidation.xlsx` y `GET /exports/gradebook.xlsx` → 200, `Content-Type` de Excel y tamaño mayor que 0.
11. **Año activo único:** crear un año 2099 con `isActive: true` deja inactivo el anterior.
    - **Revierte de inmediato:** reactiva el año original y borra el 2099.
    - Las matrículas desactivadas del año original se reactivan con `UPDATE` solo si estaban activas antes. Para eso, guarda los IDs antes de la prueba.

Al terminar:
- detén el servidor;
- revierte todo cambio de datos hecho por las pruebas (periodos, escala, docentes, año);
- borra `scripts/tmp-academic-check.ts`.

### 23.3 Informe `CAMBIOS_ACADEMICO.md`

Complétalo con:
- un resumen por bloque (qué se hizo y en qué archivos);
- los resultados de las 11 pruebas en vivo (OK / FALLA, con el detalle);
- las desviaciones respecto a este documento y su motivo;
- en "Pendientes", lo que debe validar el usuario:
  - números y orden de competencias contra la plantilla SIAGIE del año;
  - límite de 300 caracteres de las conclusiones;
  - qué cursos propios quedaron como taller;
  - reglas de situación final;
  - prueba del archivo SIAGIE con una plantilla real;
- la lista de endpoints nuevos.

Haz el commit final y verifica que `git status` esté limpio.

Commit: `docs(academico): bloque 23 - pruebas integrales e informe`

=== FIN DEL PROMPT ===

---

## Para Xavier (no copiar al agente)

**Antes de ejecutarlo:**
1. Descarga del SIAGIE una plantilla de registro de notas de cada nivel. Compara el orden de las competencias de cada área con `CNEB_AREAS` (bloque 2) y el límite de caracteres de las conclusiones con `CONCLUSION_MAX_LENGTH` (bloque 4). Si algo difiere, corrige esos dos valores en el prompt antes de pasarlo.
2. Con la Dirección del colegio piloto, decide:
   - qué áreas divide en cursos y con qué peso;
   - si "Razonamiento Matemático", "Computación" o "Tutoría" son talleres (no van al SIAGIE) o forman parte de un área oficial;
   - si el calificativo anual es el del último periodo o el promedio;
   - quién registra las competencias transversales (el prompt asume que el tutor o tutora);
   - qué criterios de evaluación usa cada área.
3. Inglés en Primaria quedó como área **opcional**. Si el colegio la dicta y la reporta, se agrega desde el plan de estudios.

**Durante la ejecución:** el agente te pedirá permiso para regenerar la base con el seed (bloque 22). Si hay aulas duplicadas, se detendrá antes de la migración final (bloque 21).

**Después:** cuando termine la rama `academico/rediseno`, puedo revisarla como hicimos con la auditoría y la asistencia.
