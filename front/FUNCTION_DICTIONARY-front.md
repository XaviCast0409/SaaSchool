# SaaSchool Frontend — Diccionario de Funciones, Custom Hooks y Componentes 100% Exhaustivo (v1.3.0)

Este documento contiene la especificación quirúrgica de **cada Custom Hook (React Query), Store (Zustand), Componente, Modal, Esquema Zod y Utilidad** existente en el frontend de **SaaSchool**.

---

## Índice General

1. [Cliente HTTP & Interceptores](#1-cliente-http--interceptores)
2. [Stores Globales Zustand](#2-stores-globales-zustand)
3. [Hooks de Autenticación & Sesión](#3-hooks-de-autenticación--sesión)
4. [Hooks de Torre de Control SuperAdmin](#4-hooks-de-torre-de-control-superadmin)
5. [Hooks de Configuración Institucional](#5-hooks-de-configuración-institucional)
6. [Hooks de Directorio & Familias](#6-hooks-de-directorio--familias)
7. [Hooks de Alumnos & Matrícula SIAGIE](#7-hooks-de-alumnos--matrícula-siagie)
8. [Hooks de Aulas & Secciones](#8-hooks-de-aulas--secciones)
9. [Hooks de Años Lectivos](#9-hooks-de-años-lectivos)
10. [Hooks de Malla Curricular CNEB](#10-hooks-de-malla-curricular-cneb)
11. [Hooks de Carga Horaria Docente](#11-hooks-de-carga-horaria-docente)
12. [Hooks de Aula Virtual LMS](#12-hooks-de-aula-virtual-lms)
13. [Hooks de Calificaciones, Rúbricas & Libretas](#13-hooks-de-calificaciones-rúbricas--libretas)
14. [Hooks de Asistencia Escolar & Kiosco QR](#14-hooks-de-asistencia-escolar--kiosco-qr)
15. [Hooks de Pagos, Finanzas & Cobranzas](#15-hooks-de-pagos-finanzas--cobranzas)
16. [Hooks de Incidencias & Agenda Escolar](#16-hooks-de-incidencias--agenda-escolar)
17. [Hooks de Muro de Comunicados](#17-hooks-de-muro-de-comunicados)
18. [Hooks de Notificaciones In-App & Web Push](#18-hooks-de-notificaciones-in-app--web-push)
19. [Hooks de Reportes Oficiales MINEDU](#19-hooks-de-reportes-oficiales-minedu)
20. [Hooks de Catálogo & Matrículas](#20-hooks-de-catálogo--matrículas)
21. [Componentes UI, Modales & Vistas](#21-componentes-ui-modales--vistas)
22. [Utilidades de Exportación & Helpers](#22-utilidades-de-exportación--helpers)

---

## 1. Cliente HTTP & Interceptores

### `src/lib/axios.ts`

#### Instancia `api`
* **Qué hace:** Cliente HTTP Axios preconfigurado con `baseURL: import.meta.env.VITE_API_URL || '/api'` y cabecera `'Content-Type': 'application/json'`.

#### Interceptor de Petición (`api.interceptors.request`)
* **Qué hace:**
  1. Lee el token JWT y el colegio impersonado desde `useAuthStore.getState()`.
  2. Si existe `token`, inyecta la cabecera `Authorization: Bearer <token>`.
  3. Si el usuario es `SUPER_ADMIN` y ha seleccionado un colegio en modo soporte (`impersonatedSchool`), inyecta la cabecera `x-school-id: impersonatedSchool.id`.
* **Para que funcione bien:** El estado de `useAuthStore` debe sincronizarse con `localStorage`.

#### Interceptor de Respuesta (`api.interceptors.response`)
* **Qué hace:**
  1. Intercepta cualquier respuesta con código HTTP `401 Unauthorized`.
  2. Ejecuta `useAuthStore.getState().logout()`, eliminando tokens y limpiando la caché de React Query.
  3. Si la ruta actual es diferente de `/login`, redirige automáticamente a la pantalla de acceso.

---

## 2. Stores Globales Zustand

### 2.1 `src/store/useAuthStore.ts`

#### `setAuth(token: string, user: User): void`
* **Qué hace:** Guarda el token y el objeto de usuario en `localStorage` y en el estado reactivo de Zustand. Borra cualquier colegio en soporte previo (`impersonatedSchool: null`) y vacía la caché de React Query (`queryClient.clear()`) para prevenir fuga de datos entre sesiones.
* **Qué necesita:** `token` (JWT válido) y `user` (`id`, `email`, `role`, `firstName`, `lastNamePaternal`, `schoolId`, etc.).

#### `updateUser(updatedFields: Partial<User>): void`
* **Qué hace:** Modifica campos del usuario en memoria y actualiza la entrada `'user'` en `localStorage` (útil tras actualizar el número de DNI o completar el cambio obligatorio de contraseña).

#### `setImpersonatedSchool(school: ImpersonatedSchool | null): void`
* **Qué hace:** Conmuta el colegio activo para el `SUPER_ADMIN`. Guarda o elimina la clave `'impersonatedSchool'` en `localStorage`, purga la caché de React Query (`queryClient.clear()`) y actualiza el estado, provocando que todos los hooks de consulta recarguen con los datos del nuevo colegio.

#### `logout(): void`
* **Qué hace:** Remueve `'token'`, `'user'` e `'impersonatedSchool'` de `localStorage`, vacía toda la caché de React Query y fija todos los estados en `null`.

---

### 2.2 `src/store/useParentStore.ts`

#### `setSelectedChildId(id: string): void`
* **Qué hace:** Selecciona al estudiante activo en el portal de padres. Se sincroniza automáticamente con `localStorage` bajo la clave `'saaschool-parent-selected-child'`.

#### `setViewMode(mode: 'PARENT' | 'STUDENT'): void`
* **Qué hace:** Alterna la interfaz entre el modo apoderado (resumen de pagos, faltas, comunicados) y el modo estudiante (cursos, tareas, aula virtual).

---

## 3. Hooks de Autenticación & Sesión

### `src/features/auth/api/useLogin.ts`

#### `useLogin()`
* **Tipo:** `useMutation`
* **Qué hace:** Envía credenciales (`email` o DNI y `password`) a `POST /api/auth/login`. Al recibir éxito:
  1. Invoca `setAuth(data.token, data.user)`.
  2. Si `user.role === 'SUPER_ADMIN'`, redirige a `/super-admin`.
  3. Para los demás roles, redirige a `/dashboard`.
  4. Muestra toast de bienvenida con Sonner.
* **Manejo de Errores:** Emite toast de error mostrando el mensaje retornado por el backend (ej: `"Credenciales inválidas"` o `"Tu cuenta está desactivada"`).

### `src/features/auth/api/useChangePassword.ts`

#### `useChangePassword()`
* **Tipo:** `useMutation`
* **Qué hace:** Envía `{ currentPassword, newPassword }` a `POST /api/auth/change-password`.
* **Efecto:** Actualiza el store marcando `mustChangePassword: false` y cierra el modal forzado.

---

## 4. Hooks de Torre de Control SuperAdmin

### `src/features/super-admin/api/useSuperAdmin.ts`

* **`useGetAllSchools(enabled = true)`:**
  * **Query:** `GET /schools`
  * **QueryKey:** `['superadmin-schools']`
  * **Qué hace:** Consulta todos los colegios registrados en la plataforma con estadísticas de matrículas y plan contratado.
* **`useCreateSchool()`:**
  * **Mutation:** `POST /schools`
  * **Qué hace:** Da de alta un nuevo colegio cliente con su Administrador Inicial.
  * **Invalidación:** Invalida `['superadmin-schools']`.
* **`useUpdateSchoolPlan()`:**
  * **Mutation:** `PATCH /schools/:id` con `{ plan, planExpiresAt }`.
  * **Invalidación:** Invalida `['superadmin-schools']` y `['active-school']`.
* **`useDeactivateSchool()` / `useReactivateSchool()`:**
  * **Mutation:** `DELETE /schools/:id` / `PATCH /schools/:id/reactivate`.
  * **Qué hace:** Suspende o reactiva un colegio cliente.
* **`useUpdateSchoolInfo()`:**
  * **Mutation:** `PATCH /schools/:id` para actualizar datos de contacto, RUC o código modular.
* **`useResetAdminPassword()`:**
  * **Mutation:** `POST /schools/:id/reset-admin-password` con `{ newPassword }`.
  * **Qué hace:** Permite al SuperAdmin cambiar la clave del director del colegio en caso de bloqueo.

---

## 5. Hooks de Configuración Institucional

### `src/features/schools/api/useSchool.ts`

* **`useGetActiveSchool()`:**
  * **Query:** `GET /schools/:schoolId`
  * **QueryKey:** `['school', schoolId]`
  * **Qué hace:** Obtiene los datos del colegio del usuario autenticado (o del colegio impersonado si es `SUPER_ADMIN`). Si el colegio retorna `404`, ejecuta `logout()` automático para limpiar sesiones huérfanas.
* **`useUpdateSchool()`:**
  * **Mutation:** `PATCH /schools/:schoolId`
  * **Qué hace:** Guarda cambios en dirección, logo URL, teléfono y niveles educativos ofrecidos (`offeredLevels`).

---

## 6. Hooks de Directorio & Familias

### `src/features/users/api/useUsers.ts` y `useUserMutations.ts`

* **`useUsers(roleOrParams?)`:**
  * **Query:** `GET /users?role=...&staffOnly=true&search=...&page=...&limit=...`
  * **QueryKey:** `['users', queryParams]`
  * **Qué hace:** Retorna la lista de usuarios del colegio con soporte de búsqueda y filtros.
* **`useCreateUser()`:**
  * **Mutation:** `POST /users`
  * **Qué hace:** Crea un nuevo usuario. Si no se provee contraseña, autogenera una clave predeterminada con el DNI.
* **`useUpdateUser()`:**
  * **Mutation:** `PATCH /users/:id`
* **`useDeactivateUser()` / `useReactivateUser()`:**
  * **Mutation:** `DELETE /users/:id` / `PATCH /users/:id/reactivate` (Soft-delete y restauración).
* **`useResetUserPassword()`:**
  * **Mutation:** `POST /users/:id/reset-password`
  * **Qué hace:** Restablece en 1 clic la contraseña del usuario (docente, apoderado, administrativo) a su propio número de documento (DNI) hasheado con bcrypt. Muestra toast de confirmación.

### `src/features/users/family-relationships/api/useFamilyRelationships.ts`

* **`useStudentParents(studentId)`:** Consulta los apoderados vinculados a un alumno específico (`GET /students/:studentId/parents`).
* **`useParentStudents(userId)`:** Consulta los alumnos a cargo de un apoderado (`GET /users/:userId/students`).
* **`useFamilyRelationships()`:** Lista todos los vínculos familiares de la institución.
* **`useLinkParent()`:**
  * **Mutation:** `POST /family-relationships`
  * **Payload:** `{ studentId, userId, relationshipType, isLegalGuardian, isFinancialResponsible, livesWithStudent }`.
  * **Invalidación:** Invalida `['student-parents']`, `['parent-students']` y `['family-relationships']`.
* **`useDeleteRelationship(studentId?)`:**
  * **Mutation:** `DELETE /family-relationships/:id`

---

## 7. Hooks de Alumnos & Matrícula SIAGIE

### `src/features/students/api/useStudents.ts`

* **`useSiagieCatalogs()`:**
  * **Query:** `GET /students/catalogs`
  * **QueryKey:** `['siagie-catalogs']`
  * **Cache:** 1 hora de `staleTime`.
  * **Qué hace:** Descarga catálogos estáticos de Ubigeos INEI, tipos de discapacidad y lenguas maternas.
* **`useStudents(filters, enabledOverride?)`:**
  * **Query:** `GET /students` con `page`, `limit`, `search`, `classroomId`, `educationLevel`, `grade`, `section`.
  * **QueryKey:** `['students', filters]`
* **`useStudent(id?)`:**
  * **Query:** `GET /students/:id` (incluye datos familiares e historial de matrículas).
* **`useRegisterFichaMatricula()`:**
  * **Mutation:** `POST /students/ficha-matricula`
  * **Payload:** `RegisterFichaMatriculaPayload` (Estudiante con soporte de `DNI`, `CE`, `PTP`, `PASSPORT`, `BIRTH_CERTIFICATE` + Matrícula con `customPensionAmount`, `discountReason` y `finalSituation` + Apoderado nuevo/existente con o sin email).
  * **Feedback:** Sonner toast de éxito con nombre del alumno y contraseña temporal asignada al apoderado (su DNI).
  * **Invalidación:** Invalida `['students']`, `['enrollments']` y `['classrooms']`.
* **`useGetNominaMatricula(classroomId)`:**
  * **Query:** `GET /students/nomina-matricula/:classroomId`
  * **Qué hace:** Descarga los datos de la Nómina Oficial de Matrícula listos para exportar a Excel.
* **`useGetMyChildren()`:**
  * **Query:** `GET /students/my-children`
  * **QueryKey:** `['my-children']`
  * **Qué hace:** Carga los hijos del apoderado autenticado (`PARENT`), o el propio perfil académico del estudiante (`STUDENT`) omitiendo deudas por privacidad, con su aula actual y materias vigentes.
* **`useResetStudentPassword()`:**
  * **Mutation:** `POST /students/:id/reset-password`
  * **Qué hace:** Restablece en 1 clic la contraseña del estudiante a su propio número de documento (`documentId`) y marca `mustChangePassword: true`. Muestra toast de éxito.
* **`useEnrollmentCertificate(studentId: string)`:**
  * **Query:** `GET /students/:studentId/certificates/enrollment`
  * **QueryKey:** `['student-certificate-enrollment', studentId]`
  * **Qué hace:** Descarga la constancia oficial de matrícula para el estudiante y año lectivo activo con código de verificación institucional.
* **`useNoDebtCertificate(studentId: string)`:**
  * **Query:** `GET /students/:studentId/certificates/no-debt`
  * **QueryKey:** `['student-certificate-no-debt', studentId]`
  * **Qué hace:** Consulta y valida la constancia oficial de no adeudo. Si el estudiante posee deudas o cuotas pendientes, el backend rechaza con 400 y el hook expone el estado de error para bloquear la constancia y alertar al usuario.

---

## 8. Hooks de Aulas & Secciones

### `src/features/classrooms/api/useClassrooms.ts`

* **`useClassrooms()`:** `GET /classrooms` (con datos del tutor asignado).
* **`useCreateClassroom()`:** `POST /classrooms` (`educationLevel`, `grade`, `section`, `shift`, `capacity`, `tutorTeacherId`).
* **`useUpdateClassroom()`:** `PATCH /classrooms/:id`.
* **`useDeleteClassroom()`:** `DELETE /classrooms/:id`.

---

## 9. Hooks de Años Lectivos

### `src/features/academic-years/api/useAcademicYears.ts`

* **`useAcademicYears()`:** `GET /academic-years` (ordenados desc por año).
* **`useActiveAcademicYear()`:**
  * **Qué hace:** Hook selector reactivo que consulta `useAcademicYears()` y localiza el año lectivo que tenga `status === 'ACTIVE'` o `isActive: true`.
  * **Retorna:** `{ activeYear, isTrimester: activeYear?.periodType === 'TRIMESTER', maxPeriods: activeYear?.periodType === 'TRIMESTER' ? 3 : 4, isLoading }`.
  * **Uso:** Utilizado en todos los filtros académicos y vistas de notas para conmutar de forma transparente entre bimestres (1..4) y trimestres (1..3).
* **`useCreateAcademicYear()`:** `POST /academic-years` (soporta `periodType`: `'BIMESTER'` | `'TRIMESTER'`, `annualCalculationMode`: `'LAST_PERIOD'` | `'AVERAGE'`, y `periodsConfig` con fechas por periodo).
* **`useUpdateAcademicYear()`:** `PATCH /academic-years/:id` (actualiza estado, vigencias, `periodsConfig` y `annualCalculationMode`).
* **`useDeleteAcademicYear()`:** `DELETE /academic-years/:id` (falla si existen matrículas activas).

---

## 10. Hooks de Malla Curricular CNEB

### `src/features/curricular-areas/api/useCurricularAreas.ts`

* **`useCurricularAreasPaginated(page, limit, level)`:** Lista paginada con filtro por nivel educativo (`INITIAL`, `PRIMARY`, `SECONDARY`, `ALL`), incluyendo jerarquía completa (`parentAreaId`, `parentArea`, `subAreas`, `evaluatedCompetenceIds`).
* **`useCurricularAreas()`:** Lista completa sin paginar para selectores de asignación docente y jerarquía curricular.
* **`useCreateCurricularArea()`:** `POST /curricular-areas` (soporta creación de Áreas Oficiales Madre o Sub-cursos/Ramas vinculadas a un `parentAreaId` con array de `evaluatedCompetenceIds`).
* **`useSeedMineduCurriculum()`:** `POST /curricular-areas/seed-minedu` (siembra masiva oficial del Currículo Nacional CNEB diferenciada por nivel: Inicial Ciclo II, Primaria 1°-6° y Secundaria 1°-5°).
* **`useLoadDefaultCompetences()`:** `POST /curricular-areas/:id/load-default-competences`.
* **`useCreateCompetence()` / `useUpdateCompetence()` / `useToggleCompetence()` / `useDeleteCompetence()`:** Administración de competencias evaluativas dentro de las áreas.

---

## 11. Hooks de Carga Horaria Docente

### `src/features/course-assignments/api/useCourseAssignments.ts`

* **`useCourseAssignments()`:** Lista todas las asignaciones del colegio (para directores).
* **`useMyCourseAssignments()`:** Lista los cursos asignados al profesor autenticado (`GET /course-assignments/my-courses`).
* **`useCreateCourseAssignment()`:** `POST /course-assignments` (`classroomId`, `areaId`, `teacherId`).
* **`useBulkAssignUnidocente()`:** `POST /course-assignments/bulk` (asigna todas las áreas de un aula a un docente en 1 clic).
* **`useSyncTeacherAssignments()`:** `POST /course-assignments/sync-teacher` (sincroniza la carga completa de un docente).
* **`useDeleteCourseAssignment()`:** `DELETE /course-assignments/:id`.

---

## 12. Hooks de Aula Virtual LMS

### `src/features/course-contents/api/useCourseContents.ts` y `useSupervisionContents.ts`

* **`useGetCourseContents(courseAssignmentId, bimester?)`:** Consulta materiales, tareas y foros de un curso.
* **`useUploadMaterial()`:** Mutación con `multipart/form-data` contra `POST /uploads/materials` para subir archivos de hasta 30 MB a Google Drive / local.
* **`useCreateCourseContent()`:** `POST /course-contents` (`LESSON_MATERIAL`, `HOMEWORK`, `FORUM`).
* **`useDeleteCourseContent()`:** `DELETE /course-contents/:id`.
* **`useGetForumComments(courseContentId)`:** Consulta respuestas de un foro de debate.
* **`useAddForumComment()`:** `POST /course-contents/:id/comments`.
* **`useStudentCourses(studentId)`:** Asignaturas del alumno para su portal virtual.
* **`useStudentPendingTasks(studentId)`:** Tareas pendientes con fecha límite de entrega.
* **Entregas y Calificación de Tareas (`HomeworkSubmission`):**
  * **`useSubmitHomework()`:**
    * **Mutation:** `POST /course-contents/:id/submissions`
    * **Payload:** `{ courseContentId: string, fileUrl: string, fileName: string, fileSize?: number, studentComment?: string, studentId?: string }`
    * **Qué hace:** Sube la entrega de la tarea escolar. Si es un apoderado con múltiples hijos matriculados, envía explícitamente el `studentId` del hijo seleccionado en `useParentStore` para prevenir la asignación errónea entre hermanos. Si es un alumno (`role: 'STUDENT'`), envía su propio `studentId`. Detecta entregas tardías (`isLate: true`).
    * **Invalidación:** Invalida `['student-tasks']`, `['course-contents']` y `['homework-submissions', courseContentId]`.
  * **`useGetHomeworkSubmissions(courseContentId: string)`:**
    * **Query:** `GET /course-contents/:id/submissions`
    * **QueryKey:** `['homework-submissions', courseContentId]`
    * **Qué hace:** Retorna la nómina del aula con el estado de entrega y calificación para el profesor, o la entrega personal para el estudiante/padre.
  * **`useGradeHomeworkSubmission()`:**
    * **Mutation:** `PATCH /course-contents/submissions/:submissionId/grade`
    * **Payload:** `{ submissionId: string, courseContentId: string, numericScore?: number, literalScore?: string, teacherFeedback?: string }`
    * **Qué hace:** Guarda la nota (numérica o cualitativa CNEB) y el feedback del docente, emitiendo una notificación in-app de aviso al alumno.
    * **Invalidación:** Invalida `['homework-submissions', courseContentId]` y `['course-contents']`.
* **Supervisión Pedagógica:**
  * **`useSupervisionStats(bimester?)`:** `GET /course-contents/supervision/stats`.
  * **`useTeacherCompliance(bimester?)`:** `GET /course-contents/supervision/teacher-compliance`.
  * **`useSupervisedFeed(filters)`:** `GET /course-contents/supervision/feed`.

---

## 13. Hooks de Calificaciones, Rúbricas & Libretas

### `src/features/grades/api/useGrades.ts`

* **`useGradeMatrix(courseAssignmentId, periodNumber)`:**
  * **Query:** `GET /grades/matrix?courseAssignmentId=...&periodNumber=...`
  * **Qué hace:** Carga la grilla completa tipo Cubicol/Excel del aula para el bimestre, heredando competencias del Área Madre si el curso es un sub-curso, e inyectando `incidentsSummary` por cada estudiante.
* **`useSaveGradeMatrix()`:**
  * **Mutation:** `POST /grades/matrix/batch`
  * **Qué hace:** Guarda atómicamente todas las notas ingresadas por el profesor en la grilla (puntaje numérico, calificación cualitativa directa `'AD'|'A'|'B'|'C'|'EXO'|'-'`, o exoneración de área).
  * **Invalidación:** Invalida matriz, conclusiones descriptivas y libretas de notas.
* **`useSyncHomeworkToMatrix()`:**
  * **Mutation:** `POST /grades/matrix/sync-homework`
  * **Payload:** `{ courseAssignmentId: string, periodNumber: number, criterionId?: string, targetCriterionId?: string, competenceId?: string, targetCompetenceId?: string, homeworkId?: string }`
  * **Qué hace:** Sincroniza y vuelca masivamente las calificaciones de tareas calificadas del LMS hacia la columna del criterio evaluativo y competencias correspondientes en la matriz de notas.
  * **Invalidación:** Invalida `['grade-matrix', courseAssignmentId, periodNumber]`.
* **`useEvaluationCriteria(level?)` / `useCreateCriterion` / `useUpdateCriterion` / `useDeleteCriterion`:** Gestión de rúbricas y criterios institucionales (PC, COND, EB, RC).
* **`useCompetenceConclusions(courseAssignmentId, periodNumber)` / `useSaveCompetenceConclusions()`:** Lectura y guardado de Conclusiones Descriptivas CNEB.
* **`useReportCard(enrollmentId)`:**
  * **Query:** `GET /grades/report-card/:enrollmentId`
  * **Qué hace:** Carga la Libreta Oficial de Notas con notas en letras (`AD`, `A`, `B`, `C`), asistencias detalladas por periodo (`periodAttendanceStats`: `IJ`, `II`, `TJ`, `TI`), jerarquía de sub-cursos y conclusiones.
* **`useSiagieSummary(classroomId, periodNumber, calculationModeOrOptions?)`:**
  * **Query:** `GET /grades/siagie/summary?classroomId=...&periodNumber=...&calculationMode=...`
  * **Qué hace:** Carga el consolidado SIAGIE oficial agregando los sub-cursos hacia las competencias del Área Madre, detectando competencias huérfanas (`unmappedCompetences`) y aplicando el modo de cálculo configurado (`LAST_PERIOD` según RVM 094 o `AVERAGE`).
* **`usePeriodLockStatus(periodNumber, classroomId?)` / `useTogglePeriodLock()`:** Consulta y ejecución del cierre/bloqueo de actas bimestrales por Dirección.

---

## 14. Hooks de Asistencia Escolar & Kiosco QR

### `src/features/attendance/api/useAttendance.ts`

* **`useAttendance(filters)`:** Consulta paginada de asistencias.
* **`useAttendanceSheet(params)` / `useSaveAttendanceSheet()`:** Carga y guardado masivo de la hoja diaria de asistencia del aula (`PRESENT`, `LATE_UNJUSTIFIED`, `ABSENT_UNJUSTIFIED`, etc.).
* **`useAttendanceMatrix(params)`:** Carga la sábana mensual interactiva con los 31 días del mes.
* **`useScanAttendance()`:**
  * **Mutation:** `POST /attendance/scan` con `{ code, statusOverride }`.
  * **Qué hace:** Registra el ingreso por escáner de QR / código de barras en puerta, calculando tardanzas automáticamente según el horario configurado.
* **`useAttendanceScheduleConfigs()` / `useUpsertAttendanceScheduleConfig()`:** Horarios de entrada, tolerancia y auto-cierre.
* **`useCloseAttendance()`:** Ejecuta el auto-cierre asignando faltas a los alumnos sin marcar.
* **`useAttendanceExport(month, classroomId?)`:** Descarga datos para el Acta Mensual de Asistencia.

---

## 15. Hooks de Pagos, Finanzas & Cobranzas

### `src/features/payments/api/usePayments.ts`

* **`usePayments(filters)`:** Obligaciones de pago institucionales con filtros de estado (`PENDING`, `PARTIAL`, `PAID`, `CANCELLED`), sección y búsqueda.
* **`useParentPayments()`:** Deudas y pensiones de los hijos del apoderado (`GET /payments/obligations/my-children`).
* **`useFinancialSummary()`:** Resumen macro financiero institucional en Soles (`S/`) para el Director.
* **`useTransactions(filters)`:** Caja diaria e historial de cobros.
* **`useBulkCreateObligations()`:** Generación masiva del cronograma de pensiones para un aula o colegio completo, con soporte para becas integrales y montos personalizados.
* **`useCreateIndividualObligation()`:**
  * **Mutation:** `POST /payments/obligations`
  * **Payload:** `{ title: string, concept: string, amountDue: number, dueDate: string, enrollmentId?: string, studentId?: string, notes?: string, paidNow?: boolean, paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD', operationNumber?: string, receiptType?: string }`
  * **Qué hace:** Emite una deuda individual o registra un cobro directo en ventanilla (con `paidNow: true`). Cuando se cobra en el acto, crea la transacción con recibo correlativo y actualiza el arqueo de caja.
  * **Invalidación:** Invalida `['payments']`, `['financial-summary']`, `['payments-transactions']` y `['daily-cash-close']`.
* **`useDailyCashClose(date?: string)`:**
  * **Query:** `GET /payments/daily-cash-close?date=YYYY-MM-DD`
  * **QueryKey:** `['daily-cash-close', date]`
  * **Qué hace:** Descarga el reporte de arqueo y cuadratura de caja para la fecha seleccionada, agrupado por método de pago (`CASH`, `BANK_TRANSFER`, `CREDIT_CARD`), total en Soles y listado de comprobantes correlativos.
* **`useUpdateObligation()`:**
  * **Mutation:** `PATCH /payments/obligations/:id`
  * **Payload:** `{ obligationId: string, data: { amountDue?: number, dueDate?: string, title?: string, notes?: string, status?: string } }`
  * **Qué hace:** Permite al administrador o tesorero reajustar montos adeudados, reprogramar fechas de vencimiento o aplicar descuentos/becas individuales con notas explicativas.
  * **Invalidación:** Invalida `['payments']` y `['financial-summary']`.
* **`useRegisterTransaction()`:** Registro de cobro manual con emisión de boleta o recibo interno correlativo (`REC-000001`).
* **`useDeleteTransaction()`:** Anulación de cobro con recálculo automático de deuda.
* **`useTransactionReceipt(transactionId)`:** Datos formateados para imprimir el recibo/boleta.
* **`useSendReminder()` / `useSendBulkOverdueReminders()`:** Envío de recordatorios por correo HTML y push.

---

## 16. Hooks de Incidencias & Agenda Escolar

### `src/features/incidents/api/useIncidents.ts`

* **`useIncidents(filters?: IncidentFilters)`:**
  * **Query:** `GET /incidents?classroomId=...&studentId=...&type=...&severity=...&dateFrom=...&dateTo=...`
  * **QueryKey:** `['incidents', filters]`
  * **Qué hace:** Consulta las incidencias disciplinarias, atenciones de enfermería/tópico y citaciones escolares registradas. Para apoderados, filtra automáticamente las incidencias de sus hijos; para estudiantes, únicamente las de su matrícula personal.
* **`useCreateIncident()`:**
  * **Mutation:** `POST /incidents`
  * **Payload:** `{ enrollmentId: string, type: 'BEHAVIORAL' | 'ACADEMIC' | 'NURSING' | 'CITATION', severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', title: string, description: string, actionTaken?: string, citationDate?: string, notifyParents?: boolean }`
  * **Qué hace:** Registra el incidente o atención médica escolar y dispara notificaciones push e in-app reactivas a los apoderados legales si `notifyParents` es verdadero.
  * **Invalidación:** Invalida `['incidents']` y `['child-incidents']`.
* **`useAcknowledgeIncident()`:**
  * **Mutation:** `PATCH /incidents/:id/acknowledge`
  * **Qué hace:** Registra la confirmación y acuse de recibo formal por parte del apoderado, guardando la fecha y el usuario que validó la notificación.
  * **Invalidación:** Invalida `['incidents']` y `['child-incidents']`.

---

## 17. Hooks de Muro de Comunicados

### `src/features/announcements/api/useAnnouncements.ts`

* **`useGetAnnouncements(filters)`:** Lista comunicados vigentes filtrados por rol del usuario.
* **`useCreateAnnouncement()`:** Publica comunicado y dispara notificaciones in-app.
* **`useUpdateAnnouncement()` / `useDeleteAnnouncement()`:** Edición y soft-delete.

---

## 18. Hooks de Notificaciones In-App & Web Push

### `src/features/notifications/api/useNotifications.ts`

* **`useGetNotifications(filters)`:** Polling inteligente cada 45s de notificaciones in-app.
* **`useMarkNotificationRead(id)` / `useMarkAllNotificationsRead()`:** Marca alertas como leídas.
* **`useDeleteNotification(id)`:** Elimina alerta.
* **`useGetVapidPublicKey()`:** Obtiene la llave pública VAPID.
* **`useSavePushSubscription()`:** Registra el Service Worker del celular para notificaciones push nativas.
* **`useSendTestPushNotification()`:** Envía prueba push en tiempo real.

---

## 19. Hooks de Reportes Oficiales MINEDU

### `src/features/academic-reports/api/useAcademicReports.ts`

* **`useReportCatalogClassrooms(academicYearId?)`:** Selector transversal de aulas.
* **`useConsolidatedGradesReport(classroomId, periodNumber)`:** Reporte 0021 (Consolidado de Estudios).
* **`useDraftRegisterReport(classroomId, courseAssignmentId?)`:** Reporte 0041 (Registro Auxiliar Borrador).
* **`useMeritClassroomReport(classroomId, periodNumber)`:** Reporte 0048 (Orden de Mérito y Tercio Superior de Aula).
* **`useMeritGradeReport(educationLevel, grade, periodNumber)`:** Reporte 0049 (Orden de Mérito, Tercio y Quinto Superior por Grado).
* **`useConductCommentsReport(classroomId, periodNumber)`:** Reporte 0030 (Comentarios a la Conducta).
* **`useClassroomRosterReport(classroomId)`:** Reporte 0011 (Padrón Oficial de Alumnos por Salón).
* **`useFamiliesByStateReport(state?, academicYearId?)`:** Reporte 0001 (Familias por Estado de Convivencia).
* **`useFamiliesWithChildrenReport(classroomId?, academicYearId?)`:** Reporte 0002 (Familias e Hijos).
* **`useFamiliesRelativesReport(classroomId?, academicYearId?)`:** Reporte 0003 (Directorio de Familias y Parientes).
* **`useStudentBirthdaysReport(month?, classroomId?, educationLevel?)`:** Reporte 0019 (Cumpleaños del Mes).

---

## 20. Hooks de Catálogo & Matrículas

### `src/features/catalog/api/useCatalog.ts`
* **`useCatalogGrades(level?)`:** Grados estándar oficiales MINEDU.
* **`useCatalogCourses(level?)`:** Cursos estándar del Currículo Nacional.

### `src/features/enrollments/api/useEnrollments.ts`
* **`useEnrollments()`:** Lista de matrículas.
* **`useCreateEnrollment()`:** Matrícula individual.

---

## 21. Componentes UI, Modales & Vistas

### 21.1 Módulo Estudiantes & Malla Curricular
* **`CurricularAreasPage.tsx`:** Administración de Áreas Oficiales CNEB y Sub-cursos/Ramas Internas. Permite seleccionar si se crea un Área Madre Oficial o un Sub-curso asignado a un Área Madre con selección granular de competencias evaluadas (`evaluatedCompetenceIds`). Presenta tarjetas agrupadas con insignias visuales para sub-cursos y botón directo de "+ Sub-curso".
* **`StudentFichaModal.tsx`:** Formulario unificado de matrícula por pasos (Datos del alumno, año/aula, apoderado nuevo/existente) con validación estricta de DNI y Ubigeos.
* **`NominaSiagieModal.tsx`:** Visor de la nómina con exportación en 1 clic a Excel formateado con bordes y cabeceras institucionales.
* **`StudentQrCardModal.tsx` / `SectionQrCardsModal.tsx`:** Genera tarjetas tipo fotocheck escolar con código QR vectorial de alta resolución y datos del alumno listas para imprimir o plastificar.
* **`StudentCertificateModal.tsx`:** Modal de generación e impresión en formato A4 de Constancias Oficiales de Matrícula y No Adeudo, con verificación institucional, estado de cuenta y botón directo `window.print()`.

### 21.2 Módulo Calificaciones
* **`ExcelGradesGrid.tsx` / `GradesMatrixGrid.tsx`:**
  * **Grilla Interactiva:** Hoja de cálculo con navegación completa por teclado (flechas de dirección, Enter, Tab), validación estricta de notas y cálculo de promedio ponderado por criterio en tiempo real.
  * **Pegado Masivo desde Excel (`handlePaste`):** Soporta Ctrl+V para pegar bloques multilínea y multicolumna copiados directamente desde Microsoft Excel o Google Sheets.
  * **Importar Tareas Calificadas del LMS:** Modal y botón en barra de herramientas conectado a `useSyncHomeworkToMatrix` para volcar las notas de tareas virtuales directamente a un criterio evaluativo sin digitación manual.
  * **Insignias de Incidencias (`incidentsSummary`):** Muestra badges contextuales junto a cada alumno con el conteo de incidencias conductuales y atenciones médicas/tópico registradas en el periodo.
  * **Barra Flotante y Alerta Anti-Cortes (`hasUnsavedServerChanges`):** Barra adhesiva inferior que alerta cuando hay cambios pendientes de sincronizar con el servidor, respaldada por `window.beforeunload` para impedir cierres accidentales de pestaña.
  * **Autoguardado Local Anti-Cortes:**
    1. Genera la clave determinística `draftKey = \`saaschool_grades_draft_${courseAssignmentId}_${periodNumber}\``.
    2. En cada pulsación/edición de celda, sincroniza el estado en `localStorage.setItem(draftKey, JSON.stringify(localGrades))`.
    3. Al montar o recibir datos del backend, detecta borradores locales previos, los combina en el estado y despliega un banner de aviso: *"Se recuperaron notas no guardadas de tu última sesión"* con un botón de acción *"Descartar borrador local"*.
    4. Al completarse con éxito `saveBatchGrades.mutateAsync()`, elimina automáticamente la clave de `localStorage.removeItem(draftKey)`.
  * **Selector de Modo de Calificación:** Toggle en la barra superior que conmuta entre modo *"Vigesimal (0-20)"* y modo *"Literal (AD, A, B, C)"*, inicializado automáticamente en Literal para Inicial y Primaria, y en Vigesimal para Secundaria.
  * **Soporte Normativo de Exoneraciones (EXO) y Guion (-):** Admite tipear `"EXO"` o `"-"` en cualquier celda o marcar la fila del estudiante, pintándola con el badge semántico `"EXONERADO"` y excluyéndola del divisor en los promedios ponderados del salón.
* **`SiagieConsolidatedModal.tsx`:** Consolidado oficial MINEDU/SIAGIE de 2 capas:
  * Agrupa automáticamente los sub-cursos de colegios pre-universitarios hacia las competencias de su Área Madre oficial.
  * Selector del modo de cálculo anual: **RVM 094 (Último Periodo)** vs **Promedio Anual Ponderado**.
  * Alerta preventiva de **Competencias Oficiales Huérfanas (`unmappedCompetences`)** si alguna competencia CNEB no tiene un curso asignado en la sección.
  * Botones de 1-clic en cabeceras de columna **"Copiar Columna para SIAGIE"** (`handleCopyColumnValues`) para pegar directamente en las plantillas Excel del portal oficial MINEDU.
* **`ReportCardModal.tsx` y `ParentGradesView.tsx`:** Boleta de información oficial con conversión literal (`AD`, `A`, `B`, `C`), conclusiones descriptivas y firmas de Dirección y Tutor.
  * Toggle visual en cabecera: **"Oficial MINEDU"** (agrupa y consolida sub-cursos en sus Áreas Madre) vs **"Con Sub-cursos"** (desglosa las asignaturas internas).
  * Tabla oficial de asistencia desglosada por periodo para SIAGIE: Inasistencias Justificadas (`IJ`), Inasistencias Injustificadas (`II`), Tardanzas Justificadas (`TJ`) y Tardanzas Injustificadas (`TI`).
  * Si el backend responde `402 Payment Required` (bloqueo por morosidad activado institucionalmente), reemplaza la vista académica por una pantalla informativa con ícono de candado, explicando el motivo financiero e invitando al apoderado a regularizar en Tesorería.
* **`GradesFilterBar.tsx` / `AcademicReportsFilterBar.tsx`:** Filtros dinámicos que detectan si el año lectivo es Bimestral (1..4) o Trimestral (1..3) gracias al hook `useActiveAcademicYear`.
* **`PredefinedCommentsModal.tsx`:** Banco de frases pedagógicas predefinidas CNEB para inserción rápida en conclusiones.

### 21.3 Módulo Asistencia
* **`AttendanceSheetView.tsx`:** Pase de lista táctil con botones rápidos de estado (`Presente`, `Tarde`, `Falta`), botón de marcado masivo `"Todos Presentes"` y acceso rápido en cada fila para **"Registrar Incidencia / Tópico"** redirigiendo a la agenda con el alumno preseleccionado.
* **`CameraQrScanner.tsx` / `QrScannerModal.tsx`:** Escáner en vivo con la cámara del dispositivo (`html5-qrcode`) o soporte de pistola láser USB para portería.

### 21.4 Módulo Finanzas
* **`PaymentsPage.tsx`:** Centro financiero institucional con métricas de cobranza, botón de cobro preventivo por WhatsApp Web (genera enlace directo `https://wa.me/...` con mensaje formal preformateado en 1 clic) y accesos directos a Arqueo de Caja y Nueva Deuda.
* **`RegisterTransactionModal.tsx`:** Ventana de cobro en caja con selección de medio de pago y generación automática de recibo correlativo interno (`REC-000001`).
* **`ReceiptModal.tsx`:** Recibo imprimible con datos institucionales, RUC y detalle del cobro.
* **`CreateIndividualObligationModal.tsx`:** Modal para registrar y cobrar en caja conceptos extraordinarios (certificados, duplicados, matrículas, uniformes, talleres u otros). Incorpora el interruptor "Cobrar en caja de inmediato", permitiendo registrar el pago en efectivo/transferencia/tarjeta, generar el recibo correlativo y reflejarlo de inmediato en el Arqueo de Caja.
* **`DailyCashCloseModal.tsx`:** Modal de Arqueo y Cuadratura de Caja diaria con filtro por fecha, métricas de recaudación por método de pago (`CASH`, `BANK_TRANSFER`, `CREDIT_CARD`), total en Soles y tabla detallada de auditoría para el cajero.
* **`EditObligationModal.tsx`:** Modal de edición de cuota y aplicación de becas/descuentos con atajos rápidos (-50% Media Beca, -25% Hermanos, -10% Pronto Pago, Beca 100%) conectado a `PATCH /payments/obligations/:id`.

### 21.5 Módulo Aula Virtual LMS
* **`HomeworkSubmissionsModal.tsx`:** Modal de supervisión y calificación de entregas para docentes, con enlace directo al archivo subido a Google Drive, visualización de estado a tiempo o fuera de fecha, inputs para calificación vigesimal/literal y feedback en 1 clic.
* **`SubmitHomeworkModal.tsx`:** Modal interactivo para que el estudiante o apoderado adjunte su tarea escolar (subida a Google Drive de hasta 30 MB), asegurando el envío del `studentId` específico cuando existen varios hermanos.

### 21.6 Módulo Incidencias & Agenda Escolar
* **`IncidentsPage.tsx`:** Vista principal de bitácora institucional con filtros de salón, estudiante, tipo (`Conductual`, `Académico`, `Tópico de Enfermería`, `Citación`) y nivel de severidad (`Baja`, `Media`, `Alta`, `Crítica`).
* **`CreateIncidentModal.tsx`:** Formulario modal para que docentes y directores registren incidencias, atenciones médicas o citaciones a padres, con opción de despacho inmediato de notificaciones push/in-app.
* **`ChildIncidentsCard.tsx`:** Tarjeta integrada en el portal de padres y alumnos que lista las incidencias del estudiante seleccionado, destacando atenciones de enfermería y citaciones, e incorporando botón de **Acuse de Recibo** en 1 clic.

### 21.7 Configuración Institucional
* **`SchoolSettingsModal.tsx`:** Modal de configuración del colegio accesible por Dirección, con switch para activar/desactivar la política de **Bloqueo de Libretas por Morosidad** (`blockGradesOnOverdue`), logo y niveles educativos.

---

## 22. Utilidades de Exportación & Helpers

### `src/features/students/utils/exportNominaExcel.ts`
* **Qué hace:** Construye un libro de cálculo profesional con `ExcelJS`, aplicando estilos oficiales MINEDU: celdas combinadas, logo del colegio, encabezados coloreados, bordes finos, anchos de columna automáticos y fórmulas para calcular la edad al 31 de marzo.

### `src/features/academic-reports/utils/reportExcelExport.ts`
* **Qué hace:** Motor genérico de exportación que toma los datos de cualquiera de los 10 reportes académicos oficiales y genera archivos `.xlsx` estilizados con metadatos del colegio y fecha de descarga.

### `src/lib/utils.ts`
* **`cn(...inputs)`:** Utilidad estándar `clsx` + `tailwind-merge` para combinar clases de Tailwind condicionalmente sin conflictos de especificidad.

### `src/lib/dateUtils.ts`
* **Qué hace:** Formateo localizado de fechas en español (`es-PE`) y cálculos de diferencias temporales para vencimientos y asistencias.

