# Cambios — Rediseño académico

## Estado inicial

- Vitest ejecutado en backend: 2 test files pasados (28 tests exitosos).
- Node v24.21.0 en Windows experimenta terminación anómala (código 3221225477 / EXCEPTION_ACCESS_VIOLATION) en ciertas invocaciones locales cuando no se utiliza `--transpile-only` o en buffers masivos. Se estabilizó la ejecución y las suites de compilación y pruebas ejecutan de forma limpia.

---

## Bloques

- **Bloque 0 — Preparación:**
  - Rama `academico/rediseno` creada desde `main`.
  - Instalación de dependencia `exceljs@4.4.0` en `back/package.json`.
  - Creación del documento de seguimiento `CAMBIOS_ACADEMICO.md`.

- **Bloque 1 — Parches urgentes en el código actual:**
  - Edición del currículo restringida a `SUPER_ADMIN` y `SCHOOL_ADMIN` (se eliminó `TEACHER` de permisos de modificación en áreas/competencias).
  - Bloqueo de eliminación física de asignaciones docentes con notas registradas; cambio a soft-delete (`deletedAt`).
  - Validación estricta de orden en escalas literales (`0 < B < A < AD <= 20`).
  - Corrección en consolidador SIAGIE para requerir explícitamente `classroomId`.

- **Bloque 2 — Catálogo CNEB único:**
  - Implementación de `back/src/modules/academic/cneb.catalog.ts` con las 31 competencias del Currículo Nacional peruano y mapeo por nivel (`INITIAL`, `PRIMARY`, `SECONDARY`).
  - Suite de pruebas unitarias `back/src/modules/academic/__tests__/cneb.catalog.test.ts` con cobertura completa.

- **Bloque 3 — Esquema: migración `academico_modelo`:**
  - Creación de modelos: `StudyPlanCourse`, `CompetencePeriodResult`, `AcademicPeriodStatus`.
  - Extensión de `CurricularArea` con campos `educationLevel`, `kind`, `parentAreaId`.
  - Extensión de `CurricularCompetence` con `cnebNumber`, `weight`.
  - Extensión de `CourseAssignment` con `academicYearId`, `deletedAt`.
  - Migración `20261110220000_academico_modelo` aplicada y regeneración de Prisma Client.

- **Bloque 4 — Motor de cálculo `grade-engine.ts`:**
  - Motor de notas en `back/src/modules/academic/grade-engine.ts`: conversión numérica-literal, ponderación por criterios, regla de nota sugerida vs juicio docente (`isOverridden`), cálculo anual por último periodo o promedio.
  - Suite de pruebas unitarias `back/src/modules/academic/__tests__/grade-engine.test.ts` (14 pruebas pasando).

- **Bloque 5 — Script de normalización de datos:**
  - Script `back/scripts/academic-normalize.ts` con soporte `--dry-run` y `--apply`.
  - Detección de inconsistencias, vinculación de asignaciones docentes al año lectivo activo, creación de estados de periodo iniciales y saneamiento de competencias oficiales.

- **Bloque 6 — Backend: plan de estudios:**
  - `back/src/modules/academic/curriculum.service.ts`: aplicación de plantilla oficial CNEB, subdivisión de áreas oficiales en sub-cursos (ej. Matemática -> Aritmética, Álgebra, Geometría), validación de cobertura de competencias y talleres propios.
  - Funciones de contexto y seguridad en `academic.context.ts`.

- **Bloque 7 — Backend: carga docente:**
  - `back/src/modules/academic/teaching-load.service.ts`: matriz de asignación docente por aula, protección contra desasignar cursos con notas (código 409), asignación en un clic por aula completa y sincronización automática del docente tutor para competencias transversales.

- **Bloque 8 — Backend: periodos:**
  - `back/src/modules/academic/period.service.ts`: máquina de estados (`OPEN` -> `REVIEW` -> `CLOSED`).
  - Bloqueo de edición docente en `REVIEW`, requerimiento de justificación para administradores en `REVIEW`, validación de notas pendientes al cerrar con override forzado auditado.

- **Bloque 9 — Backend: registro de notas y resultados:**
  - `back/src/modules/academic/results.service.ts` y `back/src/modules/academic/gradebook.service.ts`: consulta de registro auxiliar, persistencia de calificaciones detalladas por criterio, recálculo automático de notas sugeridas y resultados por competencia.
  - Script de recálculo manual `back/scripts/academic-recompute.ts`.

- **Bloque 10 — Backend: consolidado, libreta y avance:**
  - `back/src/modules/academic/consolidation.service.ts`: consolidado oficial fusionando sub-cursos en sus áreas madre CNEB correspondientes y evaluación de situación final (`FINAL`).
  - `back/src/modules/academic/report-card.service.ts`: libreta oficial de información con visibilidad restringida para padres a periodos cerrados y aislamiento estricto por matrícula familiar.
  - `back/src/modules/academic/progress.service.ts`: cálculo de avance de llenado por aula y docente con recordatorios de notificación.
  - Rutas y controladores API en `academic.routes.ts` y `academic.controller.ts`.

- **Bloque 11 — Backend: exportaciones Excel:**
  - `back/src/modules/academic/academic-excel.service.ts`: generación de libros Excel profesionales con `exceljs`.
  - Exportación del Registro Auxiliar docente por curso y periodo.
  - Exportación del Consolidado de Calificaciones por aula y periodo oficial.

- **Bloque 12 — Reconexión de módulos existentes:**
  - Adaptación de `AcademicYearService` con activación exclusiva de año lectivo (`activateExclusively`) y desactivación en cascada de matrículas de años anteriores.
  - Adaptación de reportes académicos, ranking de mérito y asistencia por curso para operar sobre asignaciones no eliminadas del año activo.

- **Bloque 13 — Frontend: componentes base:**
  - Componentes UI modulares en `front/src/components/ui/`: `page-header.tsx`, `modal.tsx`, `select.tsx`, `tabs.tsx`, `empty-state.tsx`, `letter-badge.tsx`.

- **Bloque 14 — Frontend: tipos y hooks:**
  - Definición completa de tipos de dominio en `front/src/features/academic/types.ts`.
  - Hooks TanStack Query en `front/src/features/academic/api.ts` con invalidación quirúrgica de caché.

- **Bloque 15 — Frontend: Inicio académico y Plan de estudios:**
  - Página de inicio académico `front/src/features/academic/pages/AcademicHomePage.tsx`.
  - Gestión visual de planes curriculares en `StudyPlanPage.tsx` con modales para aplicar plantilla CNEB, dividir áreas en sub-cursos y añadir talleres (`PlanModals.tsx`).

- **Bloque 16 — Frontend: Carga docente:**
  - Vista de matriz de asignación docente por nivel y grado en `TeachingLoadPage.tsx`.
  - Soporte de asignación individual por celda, asignación masiva de aula completa al tutor y copia de carga horaria desde años anteriores.

- **Bloque 17 — Frontend: Mis cursos y Registrar notas:**
  - Vista del docente `MyCoursesPage.tsx` con tarjetas de cursos y avance de notas.
  - Registro de notas tipo hoja de cálculo en `GradebookPage.tsx`, `GradebookGrid.tsx`, `GradebookPanels.tsx` con validación en vivo de notas (0-20 o literales) y atajos de teclado (`gradeInput.ts`).

- **Bloque 18 — Frontend: Avance y cierre de periodos:**
  - Vista de auditoría de dirección en `PeriodProgressPage.tsx`: semáforo de completitud por curso y aula, cambio de estados de periodo (`OPEN`, `REVIEW`, `CLOSED`) y diálogo para forzar cierre con motivo auditado.

- **Bloque 19 — Frontend: libreta, reportes y SIAGIE:**
  - Vista de libreta de calificaciones con soporte para impresión (`@media print`) en `ReportCardView.tsx` y `ReportCardsPrintPage.tsx`.
  - Generador/inyector de plantillas oficiales SIAGIE en `siagieTemplateInjector.ts` con limitación a 300 caracteres en conclusiones y panel exportador `SiagieExportPanel.tsx`.
  - Página consolidada `AcademicReportsPage.tsx` y simplificación de la vista familiar `ParentGradesView.tsx`.

- **Bloque 20 — Navegación y rutas:**
  - Configuración de rutas perezosas (lazy loading) en `front/src/router/index.tsx`.
  - Unificación de accesos en `DashboardLayout.tsx` bajo la sección "Académico".
  - Redirecciones automáticas basadas en rol en `GradesPage.tsx`.

- **Bloque 21 — Retiro del código antiguo y migración `academico_restricciones`:**
  - Eliminación de controladores, rutas y repositorios en desuso en backend (`curricular-areas`, `catalog`, endpoints obsoletos de `course-assignments` y `grades`).
  - Eliminación de pantallas y componentes retirados en frontend (`features/curricular-areas`, `features/catalog`, componentes deprecados de `grades`).
  - Migración `20261110230000_academico_restricciones`:
    - `CurricularArea.educationLevel` obligatorio; eliminación de `evaluatedCompetenceIds`.
    - `CourseAssignment.academicYearId` obligatorio; eliminación de `GradeEntry` y `Grade`.
    - Eliminación de tabla `GradingPeriodLock` y enum `AssessmentType`.
    - Creación de restricción única en `Classroom(schoolId, educationLevel, grade, section, shift)`.
    - Creación de índice único condicional: un solo año lectivo activo por colegio (`AcademicYear(schoolId) WHERE isActive = true`).

- **Bloque 22 — Seed:**
  - Actualización de `back/prisma/seed.ts` para sembrar planes de estudios con el catálogo CNEB oficial, sub-cursos de Matemática en Secundaria, asignaciones docentes vinculadas al año activo y precálculo de notas con `ResultsService`.

- **Bloque 23 — Pruebas integrales e informe:**
  - Verificación estática con TypeScript y Vite build en frontend (0 errores).
  - Verificación unitaria con Vitest en backend (47 tests pasando).
  - Ejecución de la batería de 11 pruebas funcionales en vivo contra la base de datos de desarrollo (11/11 aprobadas).

---

## Resultados de las 11 pruebas en vivo

Las 11 pruebas fueron ejecutadas con el script de verificación `tmp-academic-check.ts` sobre el servidor de desarrollo activo:

1. **Plan de estudios: OK**
   - `GET /api/academic/study-plan?level=SECONDARY&grade=2` respondió `isValid: true` con Matemática dividida exactamente en 3 sub-cursos (`Aritmética y Estadística`, `Álgebra`, `Geometría y Trigonometría`).
   - `POST /api/academic/study-plan/subcourses` dejando competencias CNEB obligatorias sin cubrir respondió `400 Bad Request` con el mensaje: `"Faltan competencias por cubrir: Datos e incertidumbre."`.

2. **Permisos del currículo: OK**
   - Un usuario con rol `TEACHER` intentó modificar competencias vía `PUT /api/academic/courses/:id/competences` y fue rechazado con `403 Forbidden`.

3. **Carga docente: OK**
   - Se cambió el docente de un curso con calificaciones existentes; la petición respondió `200 OK` y el conteo de notas se conservó intacto (68/68).
   - Se intentó desasignar al docente dejándolo en `null`; la petición respondió `409 Conflict` rechazando la operación por tener notas registradas. El docente original fue restaurado limpiamente.

4. **Notas válidas: OK**
   - Intento de registrar calificación en una competencia que no pertenece al curso: respondió `400 Bad Request`.
   - Intento de registrar calificación para un estudiante de otra aula: respondió `400 Bad Request`.

5. **Nota de juicio y recálculo de escala: OK**
   - Al guardar notas de criterios de un estudiante, el sistema calculó automáticamente `suggestedLetter = 'AD'`.
   - Se aplicó juicio docente con `PUT /final-letter` asignando `'B'`; el registro persistió con `isOverridden: true`.
   - El administrador modificó la escala institucional del nivel vía `PUT /api/grades/grading-scale` elevando el umbral de AD a 19.5; el sistema recalculó el nivel actualizando `suggestedLetter = 'A'`, conservando `isOverridden: true` y `finalLetter: 'B'`.
   - La escala y nota de prueba fueron revertidas a su estado original al culminar.

6. **Periodos en REVIEW y auditoría: OK**
   - Con el periodo en estado `REVIEW`, el docente recibió `403 Forbidden` al intentar guardar notas.
   - El administrador recibió `409 Conflict` al intentar guardar sin justificación.
   - El administrador envió motivo de reapertura y recibió `200 OK`; se constató en base de datos la creación del `AuditLog` con acción `GRADES_SAVE` y la justificación correspondiente.
   - El periodo fue devuelto a estado `OPEN`.

7. **Cierre de periodos y override con force: OK**
   - Intento de pasar periodo a `CLOSED` con evaluaciones pendientes respondió `409 Conflict`.
   - Envío con `force: true` y justificación de dirección respondió `200 OK` completando el cierre forzado.
   - El periodo fue devuelto a estado `OPEN`.

8. **Consolidado oficial: OK**
   - `GET /api/academic/consolidation?classroomId=<2.° Sec>&period=1` respondió `200 OK`; el área Matemática oficial figura con sus 4 competencias CNEB completas fusionando las notas de sus sub-cursos tributarios.
   - `GET /api/academic/consolidation?...&period=FINAL` respondió `200 OK` con la situación final calculada.

9. **Libreta de información y autorización familiar: OK**
   - Con el periodo 1 cerrado, el padre del alumno consultó su libreta vía `GET /api/academic/report-card/:enrollmentId` recibiendo `200 OK` y visualizando únicamente el periodo cerrado (`visiblePeriods: [1]`).
   - El padre de otro estudiante intentó consultar la libreta de dicho alumno y fue bloqueado con `403 Forbidden`.
   - El periodo fue devuelto a estado `OPEN`.

10. **Exportaciones Excel: OK**
    - `GET /api/academic/consolidation/export` generó un libro binario Excel de 22,920 bytes con cabecera `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
    - `GET /api/academic/gradebook/export` generó un libro binario Excel de 11,096 bytes con cabecera oficial de hoja de cálculo.

11. **Un solo año lectivo activo por colegio: OK**
    - Se creó un nuevo año 2099 con `isActive: true`; el sistema desactivó automáticamente el año activo previo y respondió `201 Created`.
    - Se comprobó que el año anterior pasó a `isActive: false` y el 2099 a `isActive: true`.
    - Reversión inmediata: se eliminó el año 2099 de prueba, se reactivó el año lectivo 2026 y se reestablecieron las matrículas activas originales.

---

## Desviaciones

1. **Orden de rutas en Express para exportaciones Excel:**
   - En `academic.routes.ts`, la ruta `/gradebook/export` se encontraba registrada posterior a `/gradebook/:assignmentId`. En Express, esto causaba que la palabra `'export'` fuera capturada como parámetro `:assignmentId`, retornando 404. Se reordenó la ruta `/gradebook/export` por encima de la ruta parametrizada para resolver el conflicto de coincidencia.
2. **Creación de año lectivo con `isActive: true` respetando índice único parcial:**
   - La base de datos cuenta ahora con el índice único `CREATE UNIQUE INDEX "AcademicYear_one_active_per_school" ON "AcademicYear" ("schoolId") WHERE "isActive" = true`. Al invocar `createAcademicYear` con `isActive: true`, crear la fila directamente antes de desactivar los años previos violaba la restricción. Se ajustó `academic-year.service.ts` para crear el registro con `isActive: false` y ejecutar la activación atómica dentro de la transacción `activateExclusively`, garantizando consistencia y cero colisiones.

---

## Pendientes (Validación de usuario)

Lo que debe validar la Dirección del colegio antes de la puesta en marcha con datos reales:

1. **Plantilla SIAGIE del año lectivo:** Descargar la plantilla Excel oficial del SIAGIE para Inicial, Primaria y Secundaria y contrastar el orden y correlativo de las competencias en `back/src/modules/academic/cneb.catalog.ts` para certificar plena coincidencia de columnas.
2. **Límite de caracteres en conclusiones descriptivas:** Se fijó un tope de 300 caracteres según las especificaciones técnicas CNEB/SIAGIE vigentes. Validar si la UGEL o normativa local requiere un tope diferente en casos especiales.
3. **Talleres y cursos internos propios:** Definir con el equipo directivo qué cursos extracurriculares (ej. Robótica, Ajedrez, Francés) se registran como `WORKSHOP` (no reportables a SIAGIE) y cuáles tributan a áreas oficiales CNEB.
4. **Reglas de situación final:** Confirmar si el calificativo anual de las áreas para Secundaria se determinará por el último periodo lectivo o por el promedio de los periodos cerrados.
5. **Prueba piloto de inyección SIAGIE:** Cargar un archivo Excel descargado directamente del portal oficial de SIAGIE en el panel de exportación del sistema para verificar que las celdas y fórmulas inyectadas sean aceptadas sin observaciones por el validador del Ministerio.

---

## Lista de endpoints nuevos (`/api/academic`)

| Método | Endpoint | Roles autorizados | Descripción |
|---|---|---|---|
| `GET` | `/api/academic/catalog` | Directivos, Docentes, Admin | Catálogo oficial de áreas y competencias CNEB por nivel |
| `GET` | `/api/academic/setup-status` | Super Admin, School Admin | Estado de configuración del plan de estudios del colegio |
| `GET` | `/api/academic/study-plan` | Directivos, Docentes, Admin | Plan de estudios para un nivel y grado específico |
| `POST` | `/api/academic/study-plan/apply-template` | Super Admin, School Admin | Aplica la plantilla oficial CNEB a los grados seleccionados |
| `POST` | `/api/academic/study-plan/subcourses` | Super Admin, School Admin | Divide un área oficial en sub-cursos tributarios con validación de competencias |
| `POST` | `/api/academic/study-plan/workshops` | Super Admin, School Admin | Registra un taller propio institucional no oficial |
| `POST` | `/api/academic/study-plan/copy` | Super Admin, School Admin | Copia la estructura curricular completa de un año lectivo a otro |
| `PATCH` | `/api/academic/study-plan/courses/:id` | Super Admin, School Admin | Modifica horas semanales u orden visual de un curso en el plan |
| `DELETE` | `/api/academic/study-plan/courses/:id` | Super Admin, School Admin | Retira un curso del plan de estudios (si no tiene notas) |
| `PUT` | `/api/academic/courses/:id/competences` | Super Admin, School Admin | Configura las competencias evaluadas por un curso o sub-curso |
| `PATCH` | `/api/academic/courses/:id` | Super Admin, School Admin | Renombra un curso o sub-curso |
| `GET` | `/api/academic/teaching-load` | Super Admin, School Admin | Matriz completa de carga docente por nivel y grado |
| `PUT` | `/api/academic/teaching-load` | Super Admin, School Admin | Guarda cambios de asignación docente (protegido contra cursos con notas) |
| `POST` | `/api/academic/teaching-load/whole-classroom` | Super Admin, School Admin | Asigna en lote todos los cursos de un aula a un docente |
| `POST` | `/api/academic/teaching-load/copy` | Super Admin, School Admin | Copia la carga docente entre años lectivos |
| `GET` | `/api/academic/my-courses` | Docente | Lista los cursos asignados al docente autenticado en el año activo |
| `GET` | `/api/academic/periods` | Directivos, Docentes, Admin | Consulta los estados y fechas límite de los periodos del año |
| `PUT` | `/api/academic/periods/status` | Super Admin, School Admin | Modifica el estado de un periodo (`OPEN`, `REVIEW`, `CLOSED`) con soporte de forzado auditado |
| `GET` | `/api/academic/gradebook/export` | Directivos, Docentes, Admin | Exporta el Registro Auxiliar docente a formato Excel multi-hoja |
| `GET` | `/api/academic/gradebook/:assignmentId` | Directivos, Docentes, Admin | Consulta la sábana de notas y alumnos de un curso en un periodo |
| `PUT` | `/api/academic/gradebook/:assignmentId/scores` | Super Admin, School Admin, Docente | Guarda calificaciones de criterios evaluativos y recalcula sugeridas |
| `PUT` | `/api/academic/gradebook/:assignmentId/final-letter` | Super Admin, School Admin, Docente | Aplica nota final de juicio docente (`isOverridden`) sobre una competencia |
| `PUT` | `/api/academic/gradebook/:assignmentId/conclusions` | Super Admin, School Admin, Docente | Guarda conclusiones descriptivas por competencia (máx. 300 caracteres) |
| `PUT` | `/api/academic/gradebook/:assignmentId/criteria` | Super Admin, School Admin, Docente | Configura qué criterios de evaluación institucional utiliza el curso |
| `GET` | `/api/academic/progress` | Super Admin, School Admin | Semáforo y porcentaje de avance de llenado de notas de toda la institución |
| `GET` | `/api/academic/my-progress` | Docente | Porcentaje de avance de llenado propio del docente |
| `POST` | `/api/academic/progress/remind` | Super Admin, School Admin | Envía notificaciones de recordatorio a docentes con notas incompletas |
| `GET` | `/api/academic/consolidation/export` | Directivos, Personal Administrativo | Exporta el Consolidado Oficial de Calificaciones a Excel |
| `GET` | `/api/academic/consolidation` | Directivos, Personal Administrativo | Matriz consolidada de calificaciones y situación final por aula |
| `GET` | `/api/academic/report-card/:enrollmentId` | Todos (según vínculo familiar) | Consulta la Libreta Oficial de Calificaciones de un estudiante |
| `GET` | `/api/academic/report-cards` | Directivos, Docentes, Admin | Consulta en lote todas las libretas de un aula para impresión masiva |
