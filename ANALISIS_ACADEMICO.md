# Análisis del flujo académico-docente — SaaSchool

> Alcance: creación de cursos, competencias, carga docente, registro de notas, conclusiones, cierre de periodos, consolidado SIAGIE, libreta y reportes Excel, y la experiencia de uso de esas pantallas.
> Revisado sobre `main` (commit `0328723`). Fecha: 10/11/2026.
> Norma de referencia: RVM N.° 094-2020-MINEDU (evaluación de competencias) y su modificatoria RVM N.° 048-2024-MINEDU; Currículo Nacional de la Educación Básica (CNEB).

---

## 0. Resumen ejecutivo

El módulo tiene mucho trabajo hecho: matriz de notas tipo Excel, conclusiones descriptivas, criterios configurables, cierre de bimestres, consolidado hacia "áreas madre" y un inyector para la plantilla Excel del SIAGIE. El problema no es que falten funciones. El problema es que **el modelo de datos no expresa de forma explícita qué competencias oficiales evalúa cada curso**. Todo se adivina comparando nombres y palabras clave en cuatro catálogos distintos. De ahí vienen las "competencias mal combinadas".

**Los 6 problemas que más pesan**

1. **Cuatro catálogos curriculares distintos que no coinciden entre sí.** Las competencias se asignan buscando subcadenas en los nombres. Ejemplos reales:
   - "EPT – Computación" recibe las competencias de **Comunicación**.
   - Arte y Religión de Secundaria se crean **sin competencias**.
   - En Inicial, la competencia "forma, movimiento y localización" termina sumada a **"regularidad, equivalencia y cambio"** al consolidar.
2. **Las competencias son globales por colegio y cualquier docente puede apagarlas, renombrarlas, crearlas o borrarlas.** Ocurre en cualquier área, aunque no la dicte. Un docente de 3.° A cambia lo que ven todos los demás.
3. **Desmarcar un curso en la carga horaria borra todas sus notas** (cascada en base de datos), sin confirmación ni respaldo.
4. **Nada está atado al año lectivo:** aulas, carga docente y cierres de bimestre. Al pasar de 2026 a 2027, el 1.er bimestre de 2027 nace **cerrado** y la carga docente del año anterior se arrastra.
5. **La libreta, la matriz y el consolidado calculan distinto:**
   - usan escalas diferentes (fija frente a la configurada por el colegio);
   - las competencias de los sub-cursos no coinciden;
   - el cálculo anual difiere (promedio frente a último periodo).

   Un padre puede ver en la libreta un calificativo distinto al que se sube al SIAGIE.
6. **Las pantallas están sobrecargadas.** La matriz muestra competencias × criterios (fácilmente más de 20 columnas). Hay botones de configuración escolar dentro de la vista del docente, dos menús distintos para "mis cursos", tarjetas de estadísticas decorativas y textos de marketing ("Normativa Oficial · Currículo 2026") dentro de las herramientas de trabajo.

**La solución, en una frase:** un **catálogo CNEB único con número oficial de competencia**, un **plan de estudios por grado y año** (que define qué cursos y qué competencias tiene cada aula), una **carga docente que hereda las competencias automáticamente** y una **sola función de cálculo** que usan la matriz, la libreta, el consolidado y el Excel SIAGIE.

---

## 1. Cómo funciona hoy

```
Año lectivo (sin vínculo con aulas)
   │
Aulas (nivel, grado, sección)  ← no pertenecen a un año
   │
Áreas curriculares (por colegio, SIN nivel educativo; el nivel se deduce del nombre: "-INI", "primaria"…)
   ├─ Competencias (copias por área; código local "C1, C2…" que se repite en cada área)
   └─ Sub-cursos (parentAreaId + evaluatedCompetenceIds: String[] sin integridad referencial)
   │
Carga docente: CourseAssignment(aula, área, docente)  ← sin año, sin validar nivel, sin validar colegio
   │
Notas: DetailedGrade(matrícula, asignación, competencia, criterio, bimestre)
   │       (+ tablas legacy GradeEntry/Grade que siguen vivas)
   ├─ Matriz: competencias efectivas = del área o, si es sub-curso, las de la madre
   ├─ Libreta: competencias = solo las del área (NO hereda de la madre)
   └─ Consolidado SIAGIE: identifica el "área madre" por código, alias o palabras clave,
      y cada competencia por código local → nombre → palabras clave → **por defecto la C1**
```

---

## 2. Hallazgos críticos (corregir antes de usar con notas reales)

### C1. Cuatro catálogos curriculares en conflicto y asignación de competencias por subcadenas

| Catálogo | Archivo | Problema |
|---|---|---|
| `COURSE_CATALOG` (selector de cursos) | [catalog.data.ts](back/src/modules/catalog/catalog.data.ts) | Mezcla áreas oficiales con sub-cursos (Álgebra, Historia del Perú) y talleres. En Inicial **no existe Matemática** y usa "Descubrimiento del Mundo", que es del currículo anterior al CNEB. Incluye Tutoría como curso calificable. |
| `MINEDU_OFFICIAL_CURRICULUM` (carga "oficial") | [curricular-area.service.ts:11](back/src/modules/curricular-areas/curricular-area.service.ts:11) | Códigos distintos al selector (`ART-SEC` frente a `AYC-SEC`, `REL-SEC` frente a `ER-SEC`, `PS-INI` frente a `INI-PS`). Numeración **local** por área (C1…C5) en lugar del número oficial CNEB. |
| Alias de `getDefaultCompetencesForCode` | [curricular-area.service.ts:302](back/src/modules/curricular-areas/curricular-area.service.ts:302) | Busca con `code.includes(...)` en cascada. Crea competencias **sin código oficial** y con nombres recortados. |
| `MINEDU_MOTHER_AREAS` (consolidador) | [siagie-consolidator.service.ts:34](back/src/modules/grades/siagie-consolidator.service.ts:34) | Un solo juego de áreas para todos los niveles. Empareja por palabras clave. |

**Errores concretos que esto produce:**

- **`EPT-COM` ("EPT – Computación / TIC") recibe las 3 competencias de Comunicación.** El código contiene "COM" y la condición `code.includes('COM')` ([línea 407](back/src/modules/curricular-areas/curricular-area.service.ts:407)) se evalúa antes que la de EPT.
- **`AYC-SEC` (Arte) y `ER-SEC` (Religión) de Secundaria, creados desde el selector, quedan con 0 competencias.** No coinciden con `ART-SEC` y `REL-SEC` ni con ningún alias.
- **Se inventan competencias que no existen en el CNEB:**
  - "Aplica habilidades técnicas en computación" (EPT);
  - "Desarrolla habilidades socioemocionales y orientación vocacional" (TOE);
  - "Resuelve problemas de cantidad y forma en su entorno" (Inicial, dentro de Ciencia y Tecnología).
- **Inicial queda incompleto según desde dónde se cree el curso.** Por el selector, Personal Social pierde la competencia religiosa y Comunicación pierde "Escribe".
- **El consolidado SIAGIE asigna calificativos a la competencia equivocada en Inicial.** Ocurre porque `mapToOfficialCompetence` busca primero por el número del código local ([línea 453](back/src/modules/grades/siagie-consolidator.service.ts:453)):
  - Matemática Inicial C2 ("forma, movimiento y localización") cae en Matemática **C2 = "regularidad, equivalencia y cambio"**;
  - Personal Social Inicial C3 ("…amada por Dios") cae en **C3 = "Construye interpretaciones históricas"**;
  - Comunicación Inicial C4 ("Crea proyectos desde los lenguajes artísticos") no coincide con ninguna y cae en el **valor por defecto C1 (Oralidad)** ([línea 494](back/src/modules/grades/siagie-consolidator.service.ts:494)).
- **El valor por defecto `return mother.competences[0]` es peligroso en general.** Cualquier competencia que no se reconozca se promedia **en silencio** dentro de la C1 del área, sin alerta.

### C2. Docentes pueden modificar el currículo de todo el colegio

En [curricular-area.routes.ts](back/src/modules/curricular-areas/curricular-area.routes.ts), el rol `TEACHER` puede ejecutar estas acciones:

- `PATCH /competences/:id/toggle`: apagar o prender;
- `PATCH /competences/:id`: renombrar;
- `POST /competences`: crear en **cualquier área**;
- `DELETE /competences/:id`;
- `POST /:id/load-default-competences`.

El servicio solo valida que la competencia sea del colegio, no que el docente dicte esa área. Como `CurricularCompetence.isActive` es **global**, el botón "Prender / Apagar Competencias" de la matriz afecta **a todas las aulas y grados** que usan esa área.

### C3. Desmarcar un curso borra sus notas

`syncTeacherAssignments` ([course-assignment.repository.ts:173](back/src/modules/course-assignments/course-assignment.repository.ts:173)) elimina las asignaciones desmarcadas. Por `onDelete: Cascade` se pierden en cascada:

- `DetailedGrade` (notas);
- `CompetenceConclusion` (conclusiones);
- contenidos del aula virtual;
- asistencia por curso.

Lo mismo ocurre con `DELETE /course-assignments/:id`. Un clic equivocado en "Guardar Carga Horaria" puede borrar un bimestre completo, y no queda rastro ni hay forma de deshacerlo.

### C4. Sin vínculo con el año lectivo

- `Classroom`, `CourseAssignment` y `GradingPeriodLock` no tienen `academicYearId`.
- **`GradingPeriodLock` es único por `(schoolId, classroomId, periodNumber)`:** el cierre del 1.er bimestre de 2026 **bloquea el 1.er bimestre de 2027**.
- La matriz lista las matrículas del aula con `isActive: true` sin filtrar por año. Si las matrículas del año anterior no se desactivan (ningún proceso lo hace), aparecen alumnos de 2026 en la matriz de 2027.
- `AcademicYear.isActive` tiene `default(true)` y nada impide que haya **dos años activos**. El código usa `findFirst({ isActive: true })`, así que depende del orden.
- `GradingPeriodLock` con `classroomId = null` (cierre de todo el colegio) **no es único en PostgreSQL**, porque los NULL se consideran distintos y pueden duplicarse.

### C5. La matriz acepta notas que no corresponden al curso

`batchUpsertDetailedGrades` ([grade.repository.ts:380](back/src/modules/grades/grade.repository.ts:380)) no valida:

- que el `competenceId` sea una de las competencias efectivas del curso; con la API se puede calificar la competencia de otra área;
- que el `criterionId` sea del colegio y del nivel;
- que la matrícula pertenezca **al aula de esa asignación**; solo verifica colegio y estado.

Tampoco valida la carga docente al crearla ([course-assignment.repository.ts:100](back/src/modules/course-assignments/course-assignment.repository.ts:100)):

- que el aula, el área y el docente sean del mismo colegio;
- que el usuario tenga rol docente;
- que el nivel del área coincida con el del aula (hoy se puede asignar un área de Secundaria a un aula de Inicial);
- que no se asigne en la misma aula el área madre **y** sus sub-cursos, lo que duplica competencias en el consolidado.

### C6. Tres cálculos distintos del mismo calificativo

| Dónde | Escala usada | Competencias | Cálculo anual |
|---|---|---|---|
| Matriz (guardado) | **Fija** 17.5 / 13.5 / 10.5 ([grade.repository.ts:454](back/src/modules/grades/grade.repository.ts:454)) | Heredadas de la madre | — |
| Libreta | **Fija** `convertScoreToSiagie` ([grade.service.ts:29](back/src/modules/grades/grade.service.ts:29)) | **Solo las del área** ([grade.service.ts:208](back/src/modules/grades/grade.service.ts:208)): un sub-curso sale vacío o con otras competencias | **Siempre promedio** |
| Consolidado SIAGIE | **La del colegio** (`GradingScale`) | Heredadas y mapeadas por palabras clave | `LAST_PERIOD` o `AVERAGE` según el año lectivo |

**Consecuencias:**

- Si el colegio cambia su escala, la libreta y la matriz no se enteran.
- Los sub-cursos guardan notas con los IDs de competencia de la madre, pero la libreta busca con los IDs propios del sub-curso, así que no las encuentra.
- El cálculo anual de la libreta contradice al del SIAGIE cuando el año está en `LAST_PERIOD`, que es el valor por defecto.

**Otras inconsistencias:**

- Conclusiones descriptivas: el backend las recorta a **300** caracteres y el inyector Excel a **350**.
- Conversión de literal a número (`AD=19, A=15, B=12, C=8`): está duplicada en dos sitios y no es configurable.

---

## 3. Hallazgos de prioridad alta y media

| # | Hallazgo | Dónde |
|---|---|---|
| A1 | `CurricularArea` no tiene **nivel educativo**; se deduce del texto (`getAreaLevel`) y por defecto cae en PRIMARY. | [curricular-area.repository.ts:17](back/src/modules/curricular-areas/curricular-area.repository.ts:17) |
| A2 | `evaluatedCompetenceIds String[]`: no tiene llave foránea; si se borra o reemplaza la competencia madre, el sub-curso apunta a la nada. | schema `CurricularArea` |
| A3 | Coexisten dos sistemas de notas: legacy `GradeEntry/Grade` y `DetailedGrade`. `countGrades` solo cuenta las legacy. | [curricular-area.repository.ts:170](back/src/modules/curricular-areas/curricular-area.repository.ts:170) |
| A4 | Los criterios (`EvaluationCriterion`) son globales por nivel y se aplican **a todas las competencias de todos los cursos**. Si el colegio crea "Conducta", esta se promedia dentro de "Resuelve problemas de cantidad", lo que va contra el enfoque por competencias. | `findCriteria` |
| A5 | El calificativo de la competencia en el periodo es **solo un promedio aritmético**. La RVM 094-2020 pide que el docente determine el nivel de logro a partir de la evidencia. Falta una "nota de juicio" (el docente confirma o ajusta el calificativo sugerido). | matriz, libreta |
| A6 | La Dirección puede editar periodos cerrados sin que quede registro de qué cambió (el cierre solo bloquea a docentes). | `batchUpsertDetailedGrades` |
| A7 | El inyector SIAGIE empareja alumnos por DNI y nombre; debería usar primero el **código de estudiante SIAGIE (14 dígitos)**. Además, escribir con SheetJS puede perder validaciones, protección y formato de la plantilla oficial. Hay que probarlo con la plantilla real del año. | [siagieTemplateInjector.ts](front/src/features/grades/utils/siagieTemplateInjector.ts) |
| A8 | Aulas: `grade` admite de 1 a 6 en todos los niveles (existiría 6.° de Secundaria) y no hay restricción única de nivel + grado + sección + turno, así que se pueden duplicar. | [classroom.schema.ts](back/src/modules/classrooms/classroom.schema.ts) |
| A9 | Las competencias transversales (TIC y Gestiona su aprendizaje) se manejan como un "área" más asignable a un docente. En la práctica las evalúan todos los docentes y las registra el tutor o tutora. | catálogo |
| A10 | La matriz muestra conteos de incidencias (incluidas de convivencia) a cualquier docente del curso; referencia `acoso`, que el backend no envía. Es un dato sensible: debería verlo solo el tutor o tutora y la Dirección. | GradesMatrixGrid.tsx:1112 |
| M1 | Hay componentes muertos: `ExcelGradesGrid.tsx` (616 líneas) no se importa en ningún lado. | front |
| M2 | La exportación Excel de reportes pesa 1 922 líneas en el cliente; cada reporte construye su libro a mano y los estilos no son consistentes. | reportExcelExport.ts |
| M3 | El docente ve "Mis Cursos y Notas" en Gestión Académica **y** "Mis Cursos Asignados" en Configuración Escolar. | DashboardLayout.tsx:180 y 239 |

---

## 4. Modelo objetivo (cómo debería quedar)

### 4.1 Catálogo CNEB único e inmutable (código, no base de datos editable)

Un solo archivo, `back/src/modules/curriculum/cneb.catalog.ts`, del que dependen el selector, la carga oficial, el consolidador y el frontend (vía `/api/catalog`):

```ts
// Cada competencia tiene su número oficial CNEB (global, no por área)
export const CNEB_COMPETENCES = {
  1:  'Construye su identidad',
  2:  'Se desenvuelve de manera autónoma a través de su motricidad',
  3:  'Asume una vida saludable',
  4:  'Interactúa a través de sus habilidades sociomotrices',
  5:  'Aprecia de manera crítica manifestaciones artístico-culturales',
  6:  'Crea proyectos desde los lenguajes artísticos',
  7:  'Se comunica oralmente en su lengua materna',
  // … hasta 29 (28 = TIC, 29 = Gestiona su aprendizaje)
} as const;

// Plan oficial por nivel: qué áreas existen y qué competencias tiene cada una
export const CNEB_AREAS: Record<EducationLevel, OfficialArea[]> = {
  INITIAL:   [{ code: 'PS', name: 'Personal Social', competences: [/* números CNEB del área */] }, /* … */],
  PRIMARY:   [/* … */],
  SECONDARY: [/* … */],
};
```

> ⚠️ Los números exactos y la lista por nivel deben copiarse del CNEB y de la plantilla SIAGIE vigente. Hay que validarlos con la Dirección o la UGEL antes de implementar. El objetivo es que **exista una sola tabla**.

Reglas:
- Las áreas oficiales y sus competencias **no se editan ni se apagan** desde la aplicación. Solo se elige qué áreas usa cada grado.
- Tutoría **no** es un área calificable.
- Las competencias transversales no se asignan a un docente: las registra el tutor o tutora del aula, con la opción de tomar los aportes de los demás docentes.

### 4.2 Plan de estudios por grado y año (lo que falta hoy)

Nuevas tablas (resumen):

```
AcademicYear 1─* StudyPlan (nivel, grado)            ← "3.° Secundaria 2026"
StudyPlan    1─* StudyPlanCourse                     ← cada curso que se dicta en ese grado
                 - officialAreaCode   (MAT, COM, …)  ← obligatorio: a qué área SIAGIE tributa
                 - name               ("Álgebra" o "Matemática")
                 - kind               OFFICIAL | SUBCOURSE | WORKSHOP (taller sin SIAGIE)
                 - weeklyHours
StudyPlanCourse 1─* StudyPlanCourseCompetence        ← qué competencias oficiales evalúa (FK real)
                 - cnebNumber (1..29)
                 - weight (para combinar sub-cursos; por defecto 1)
```

- Al crear el plan se elige **"Usar plantilla CNEB"**: se crean las áreas oficiales del grado con sus competencias, sin escribir nada.
- Para dividir un área (Matemática → Aritmética, Álgebra, Geometría, Trigonometría) se usa **"Dividir en sub-cursos"**: se marcan con casillas qué competencias de la madre evalúa cada sub-curso.
- **Validación en tiempo real:**
  - cada competencia oficial del área debe estar cubierta por al menos un sub-curso; si queda alguna sin cubrir, se ve en rojo y el plan no se puede publicar;
  - no puede coexistir el área completa con sus sub-cursos;
  - los talleres (`WORKSHOP`) no tributan al SIAGIE y salen solo en la libreta interna.
- **"Copiar plan de 2026 a 2027"** con un clic.

### 4.3 Carga docente atada al año y al plan

```
CourseAssignment
  + academicYearId
  + studyPlanCourseId   (reemplaza areaId)
  + deletedAt           (borrado lógico)
  @@unique([academicYearId, classroomId, studyPlanCourseId])
```

- Cada aula hereda los cursos de su plan de estudios. **La carga docente solo dice quién dicta cada curso** y no puede crear combinaciones nuevas.
- Cambiar de docente conserva las notas, que pertenecen al curso del aula y no al docente.
- Quitar un curso que ya tiene notas: se bloquea. Si no tiene notas, se aplica borrado lógico.
- Se mantiene la opción de unidocencia: "Asignar todo el aula a un docente".
- Validaciones: que todo sea del mismo colegio, que el rol sea docente y que el nivel coincida.

### 4.4 Notas: un solo motor de cálculo

Crear `back/src/modules/grades/grade-engine.ts`, con funciones puras y pruebas unitarias. Lo usan la matriz, la libreta, el consolidado, el Excel y el portal de padres:

```ts
computeCompetencePeriod(scores, criteriaWeights, scale)   → { suggested: Letter, score }
resolveCompetencePeriod(suggested, teacherOverride)       → Letter  // la nota de juicio manda
consolidateOfficialCompetence(subcourseResults, weights)  → Letter  // por cnebNumber, sin palabras clave
computeAnnual(periodLetters, mode: LAST_PERIOD|AVERAGE)   → Letter
evaluateFinalSituation(...)                               → (ya existe en promotion-rules.ts)
```

- Se elimina todo emparejamiento por nombre o palabra clave. El vínculo es `StudyPlanCourseCompetence.cnebNumber`.
- La escala siempre viene de `GradingScale` del colegio (una sola función `scoreToLetter`).
- Nueva tabla `CompetencePeriodResult(enrollmentId, assignmentId, cnebNumber, periodNumber, suggestedLetter, finalLetter, overriddenById, conclusion)`. Guarda lo que **se publica** y desacopla la libreta y el SIAGIE de los recálculos.
- Si el calificativo final es **B o C**, la conclusión descriptiva es obligatoria (el docente no puede cerrar sin ella). El límite de caracteres queda en una sola constante, con el valor que exija la plantilla SIAGIE vigente.
- Los criterios pasan a ser **por curso** (el docente elige cuáles usa, a partir de un banco del colegio). "Conducta" sale de las competencias académicas y pasa al comportamiento o a la tutoría.
- Se migra y elimina el sistema legacy `GradeEntry/Grade`.

### 4.5 Periodos y cierre

```
AcademicPeriod (academicYearId, number, name, startDate, endDate, gradingDeadline, status: OPEN|REVIEW|CLOSED)
GradingPeriodLock → reemplazado por AcademicPeriod.status + excepciones por aula
```

Flujo de cierre:
1. **Abierto:** los docentes registran notas.
2. **En revisión:** los docentes ya no editan; la Dirección revisa el tablero de avance.
3. **Cerrado:** se publica en la libreta.

Cualquier edición posterior al cierre exige un motivo y queda en `AuditLog`, con el valor anterior y el nuevo.

---

## 5. Flujo ideal de punta a punta

```
1. Año lectivo ─► 2. Plan de estudios ─► 3. Aulas ─► 4. Carga docente ─► 5. Notas ─► 6. Cierre ─► 7. Salidas
   (periodos,        (plantilla CNEB,       (por año)    (matriz aula ×      (por         (avance,     libreta, consolidado,
    fechas,           sub-cursos,                         curso)              competencia) revisión)    Excel SIAGIE, acta)
    modo anual)       validación)
```

**Asistente de inicio de año (Dirección):** un solo flujo guiado de 5 pasos con barra de progreso.
1. "Crea el año 2027": periodos con fechas y modo de cálculo anual.
2. "Revisa tu plan de estudios": se copia del año anterior o de la plantilla CNEB, con validación de competencias cubiertas.
3. "Crea o copia tus aulas".
4. "Asigna docentes": una tabla con aulas en filas y cursos en columnas, donde cada celda es un selector de docente. Las celdas sin docente salen resaltadas.
5. "Listo": resumen de pendientes.

Al terminar, el sistema muestra un **tablero de salud académica** con:
- cursos sin docente;
- aulas sin tutor o tutora;
- competencias sin cubrir;
- docentes sin carga.

---

## 6. Rediseño de pantallas (limpio y ordenado)

### Principios
1. **Una pantalla, una tarea.** La configuración (competencias, criterios, escala) sale de la vista del docente.
2. **Jerarquía visual:** un título, un subtítulo de una línea y **una** acción principal por pantalla. Fuera las tarjetas de estadísticas decorativas ("Total Áreas Registradas", "Normativa Oficial · Currículo 2026") y los textos de marketing.
3. **Divulgación progresiva:** el detalle (criterios, incidencias, historial) se abre bajo demanda en un panel lateral, no en la tabla.
4. **Lenguaje del docente, no del sistema:**
   - "Mis cursos", no "Carga Horaria Activa";
   - "Registrar notas", no "Matriz de Calificaciones (Cubicol / Excel)";
   - "Cerrar bimestre", no "Cierre y Bloqueo de Periodos / Actas".
5. **Estados explícitos** en todo: borrador, guardado, cerrado, con faltantes.
6. **Teclado primero** en la grilla de notas: Enter baja, Tab avanza, se puede pegar desde Excel y escribir "AD/A/B/C" o números.

### Navegación propuesta

| Rol | Menú "Académico" |
|---|---|
| Dirección / Admin | Inicio académico (tablero) · Plan de estudios · Aulas · Carga docente · Avance de notas · Cierre de periodos · Reportes · Configuración de evaluación (escala, criterios, reglas de promoción) |
| Docente | Mis cursos · Registrar notas · Mis reportes |
| Tutor o tutora (docente con aula) | lo anterior + Mi aula (transversales, comportamiento, libretas del aula) |
| Padre / Alumno | Libreta (solo periodos cerrados) |

"Años lectivos" y "Rúbricas de evaluación" pasan dentro de **Configuración**, no al menú principal.

### Pantalla por pantalla

**Plan de estudios** (reemplaza "Cursos CNEB", 1 212 líneas):
- Selector de nivel y grado arriba.
- Debajo, la lista de áreas oficiales del grado. Cada área se expande y muestra sus competencias (solo lectura) y sus sub-cursos, si los tiene.
- Botón "Dividir en sub-cursos" con casillas de competencias, e indicador "4/4 competencias cubiertas ✓".
- Fuera: el botón "Cargar Oficiales MINEDU", la creación de competencias a mano y la paginación de 8 en 8.

**Carga docente** (reemplaza la vista centrada en el docente):
- Vista principal: matriz **aulas × cursos** del nivel; cada celda tiene un selector de docente con búsqueda.
- Vista alternativa: "por docente", con horas semanales totales y alerta si se pasa de lo configurado.
- Cambios en borrador con un "Guardar (3 cambios)" explícito.
- Quitar un curso con notas está bloqueado, y la pantalla explica por qué.

**Mis cursos (docente):**
- Tarjetas por curso: aula, curso, avance de notas del periodo en % y estado del periodo.
- Un clic lleva directo a registrar notas del periodo abierto.

**Registrar notas** (reemplaza la matriz de más de 20 columnas). Tres modos en pestañas:
1. **Por competencia** (por defecto):
   - se elige una competencia;
   - las columnas son los criterios de *esa* competencia y su calificativo sugerido;
   - se muestra la columna "Final", editable, con un indicador cuando difiere de la sugerida.
   - Quedan 5 a 7 columnas en vez de 20 o más.
2. **Resumen:** alumnos × competencias, solo con el calificativo final. Es la vista para revisar antes de cerrar.
3. **Conclusiones:** solo los alumnos con B o C; plantillas de frases del banco del colegio; contador de caracteres con el límite SIAGIE.

Además:
- Barra inferior fija: "Guardado hace 5 s · 3 alumnos sin nota · 2 conclusiones pendientes" y el botón "Marcar curso como completo".
- Importación de tareas del aula virtual como botón secundario dentro del menú "⋯".
- Las incidencias salen de la grilla; solo el tutor o tutora las ve en "Mi aula".

**Avance de notas (Dirección):**
- Tabla de aulas × cursos con semáforo: % de notas registradas y conclusiones faltantes.
- Botón "Recordar a docentes con pendientes" (notificación in-app).
- Desde aquí se pasa el periodo a revisión o a cerrado.

**Reportes:**
- Una sola página con buscador y tarjetas agrupadas: Oficiales SIAGIE · Libretas · Registros docentes · Estadística · Familias.
- Cada tarjeta indica qué filtros necesita y en qué formatos se descarga.
- Una vista previa uniforme con la misma barra de acciones: PDF, Excel, imprimir.

---

## 7. Reportes que debe generar (con un solo motor de datos)

| Reporte | Quién | Contenido | Formato |
|---|---|---|---|
| **Informe de progreso oficial (libreta CNEB)** | Tutor o tutora, Dirección, padres | Áreas **oficiales** y competencias con calificativo, conclusión descriptiva (B/C), competencias transversales, asistencia (faltas e inasistencias justificadas), comentario del tutor o tutora y firmas | PDF A4, lote por aula (un PDF por alumno o uno combinado) |
| **Libreta interna** | Colegio (opcional) | Sub-cursos y talleres con su detalle; nunca reemplaza a la oficial | PDF |
| **Registro auxiliar del docente** | Docente | Por curso y periodo: criterios, calificativo sugerido y final, conclusiones. Que se pueda imprimir y firmar | Excel con estilo y PDF |
| **Consolidado del aula** | Dirección | Alumnos × áreas oficiales × competencias, situación final provisional, alertas de competencias sin cubrir o sin nota | Excel y PDF horizontal |
| **Archivo para SIAGIE** | Secretaría | Relleno de la plantilla descargada del SIAGIE, emparejando por código de estudiante, con **pre-validación** (alumnos no encontrados, competencias vacías, conclusiones que exceden el límite o faltan en B/C) | Excel (plantilla oficial) |
| **Acta consolidada de evaluación** | Dirección | Fin de año: calificativos finales y situación (promovido, requiere recuperación, permanece) | PDF para firma |
| **Estadística** | Dirección | Distribución AD/A/B/C por área, aula y docente; alumnos con 2 o más competencias en C (riesgo académico); comparación entre periodos | Pantalla y Excel |
| Orden de mérito | Colegio | Interno y con nota aclaratoria (el CNEB no usa promedios numéricos) | PDF |

**Detalles técnicos:**
- Generar los Excel en el **backend** con ExcelJS, usando una plantilla de estilos común (encabezado del colegio, logo, fuente, bordes, ancho de columnas, filas congeladas, impresión horizontal ajustada a una página de ancho). Así se aligera el bundle del frontend y se puede generar en lote.
- Todos los reportes consumen el mismo servicio de datos (`grade-engine` + `CompetencePeriodResult`). Ninguno recalcula por su cuenta.
- La libreta para padres solo muestra **periodos cerrados**. Recordatorio legal: por la Ley 27665 no se puede retener la libreta por deuda; solo los certificados.

---

## 8. Vinculación con el SIAGIE (lo realista)

- El SIAGIE **no tiene una API pública** para colegios privados. La vía es la **plantilla Excel** que se descarga del SIAGIE y se vuelve a cargar.
- Lo que el sistema puede garantizar:
  1. Que el código de estudiante SIAGIE (14 dígitos) esté registrado y validado en la matrícula. Debe ser obligatorio para la exportación, con un reporte de alumnos sin código.
  2. Que las áreas y competencias exportadas coincidan **exactamente** con las de la plantilla del grado. Con el catálogo CNEB único es directo.
  3. Una **pre-validación** antes de generar el archivo, con una lista de errores accionables en lenguaje claro.
  4. Que el archivo final conserve la estructura de la plantilla. Hay que probarlo cada año con la plantilla real; si SheetJS daña el formato, usar ExcelJS en el backend o escribir solo las celdas de valor.
  5. Un historial de exportaciones: quién, cuándo y de qué periodo (`AuditLog`).
- Hay que mantener las reglas de situación final como **configurables y provisionales**, como ya están, y revisarlas contra la RVM 094-2020 con su modificatoria RVM 048-2024.

---

## 9. Plan de trabajo por fases

### Fase A — Correcciones urgentes (1 a 2 semanas, sin rediseño)
1. Quitar al rol `TEACHER` las rutas de crear, editar, apagar y borrar competencias, y la de cargar competencias por defecto.
2. `syncTeacherAssignments` y `delete`: bloquear si hay notas o conclusiones; si no las hay, borrado lógico. Pedir confirmación en el frontend.
3. Validaciones de carga docente: mismo colegio, rol docente, nivel compatible, no mezclar área madre con sub-cursos.
4. Validaciones de `batchUpsertDetailedGrades`: competencia del curso, criterio del colegio y nivel, matrícula del aula.
5. Usar la escala del colegio en todos lados (matriz, libreta) y respetar `annualCalculationMode` en la libreta.
6. Libreta: usar las competencias efectivas, heredadas de la madre, igual que la matriz.
7. Consolidador: eliminar el valor por defecto `competences[0]` y mostrar la competencia no reconocida como alerta. Corregir el mapeo de Inicial.
8. Corregir el orden de `getDefaultCompetencesForCode` (EPT-COM) y los códigos `AYC-SEC` y `ER-SEC`. Esto es temporal hasta la Fase B.
9. `GradingPeriodLock`: agregar `academicYearId` y un índice único que trate correctamente el NULL.
10. Impedir dos años lectivos activos. Al activar un año, desactivar las matrículas de años anteriores.
11. Unificar el límite de caracteres de las conclusiones.

### Fase B — Modelo curricular correcto (2 a 3 semanas)
1. Catálogo CNEB único y servicio `/api/catalog/cneb`.
2. Tablas `StudyPlan`, `StudyPlanCourse` y `StudyPlanCourseCompetence`. Migración de datos que convierta las áreas actuales en cursos del plan.
3. Agregar `academicYearId` y `studyPlanCourseId` a `CourseAssignment`; año en aulas o en la relación aula-año.
4. `grade-engine.ts` con pruebas, más la tabla `CompetencePeriodResult` y la nota de juicio.
5. Eliminar el sistema legacy `GradeEntry/Grade`, la detección por palabras clave y `ExcelGradesGrid`.

### Fase C — Rediseño de experiencia (2 a 3 semanas)
1. Asistente de inicio de año y tablero de salud académica.
2. Nuevas pantallas: Plan de estudios, Carga docente en matriz, Mis cursos, Registrar notas (3 modos), Avance de notas.
3. Navegación por rol (sección 6).
4. Periodos con estados Abierto, En revisión y Cerrado.

### Fase D — Reportes (1 a 2 semanas)
1. Motor de Excel en el backend con plantilla de estilos común.
2. Libreta oficial CNEB en PDF por lote, registro auxiliar, consolidado, acta y estadística.
3. Exportación SIAGIE con pre-validación e historial.

> Todo con pruebas: unitarias del motor de cálculo (cada nivel, sub-cursos, LAST_PERIOD frente a AVERAGE, exonerados) y pruebas de integración del flujo completo: crear año → plan → carga → notas → cierre → libreta = consolidado = Excel.

---

## 10. Mejoras y sugerencias adicionales

1. **Pegar desde Excel** en la grilla de notas: muchos docentes ya trabajan en su propia hoja.
2. **Banco de conclusiones descriptivas** por competencia y nivel de logro, con variables (`{nombre}`), para no escribir 30 veces lo mismo. El banco ya existe en parte (`PredefinedCommentsModal`); conviene llevarlo al banco del colegio.
3. **Plazos de registro** por periodo con recordatorio automático a los docentes con pendientes (3 días y 1 día antes).
4. **Modo sin conexión** para registrar notas (borrador local, que ya existe en parte) con sincronización y aviso claro de conflictos.
5. **Alerta temprana académica:** alumnos con 2 o más competencias en C en el periodo, avisados al tutor o tutora. Se reutiliza el patrón de alertas de asistencia ya construido.
6. **Vista del padre:** la libreta con explicación de qué significa cada nivel de logro y qué puede hacer en casa; nada de promedios numéricos.
7. **Historial por alumno:** la evolución de cada competencia a lo largo de los periodos y años, que alimenta la evaluación de recuperación.
8. **Recuperación y competencias pendientes:** registrar el resultado de la evaluación de recuperación o del portafolio y reflejarlo en la situación final.
9. **Permisos finos:** coordinador o coordinadora académica por nivel (ve el avance de su nivel y no toca pagos).
10. **Rendimiento:** la matriz y el consolidado hacen varias consultas grandes y filtros en memoria; con `CompetencePeriodResult` los reportes leen resultados ya calculados.

---

## 11. Decisiones que debes validar con la Dirección del colegio piloto

1. ¿El colegio divide áreas en sub-cursos? ¿Cuáles, en qué grados y cómo se combinan (promedio simple o con peso)?
2. ¿Usa calificación numérica interna (0–20) que luego convierte a AD/A/B/C, o califica directamente en letras? ¿Con qué rangos?
3. ¿El calificativo anual es el del último periodo (por defecto en la norma) o un promedio?
4. ¿Quién registra las competencias transversales: el tutor o tutora, o todos los docentes?
5. ¿Qué criterios de evaluación usa cada área (prácticas, exposiciones, proyectos…)?
6. ¿Qué reportes imprime hoy y con qué formato? Pedir una libreta y un registro auxiliar reales como modelo.
7. Descargar la **plantilla SIAGIE del año** de cada grado para validar el mapeo de áreas y competencias, y el límite de caracteres de las conclusiones.

---

## Fuentes

- [Andina: así será la calificación por competencias en secundaria](https://andina.pe/agencia/noticia-minedu-asi-sera-calificacion-competencias-secundaria-740989.aspx)
- [La República: Minedu usará calificaciones con letras en toda la secundaria](https://larepublica.pe/sociedad/2020/02/11/minedu-deesde-este-ano-usarian-calificaciones-con-letras-para-todo-secundaria)
- [Oficio Múltiple 00112-2025-MINEDU (UGEL 07), registro en SIAGIE, cita la RVM 094-2020 y la RVM 048-2024](https://cdn.www.gob.pe/uploads/document/file/8203688/6858079-oficio_multiple-00112-2025-minedu-vmgi-drelm-ugel07-dir-asgese.pdf)
- [MINEDU: orientaciones de promoción guiada](https://formacionenservicio.minedu.gob.pe/sifods/2026/centrorecursos/promocion-guiada-orientaciones.pdf)
- [RVM N.° 193-2020-MINEDU, anexo de la norma técnica de evaluación](https://grade.org.pe/creer/archivos/RVM_N°_193-2020-MINEDU_NT_Evaluaicón_ANEXO.pdf)
