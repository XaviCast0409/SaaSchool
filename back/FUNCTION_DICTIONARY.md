# SaaSchool Backend — Diccionario de Funciones y Referencia Técnica 100% Exhaustiva

Este documento contiene la especificación quirúrgica y detallada de **cada función, método de controlador, método de servicio, método de repositorio y utilidad** existente en el backend de **SaaSchool**.

---

## Índice General de Módulos

1. [Infraestructura & Utilidades Core](#1-infraestructura--utilidades-core)
2. [Módulo Auth](#2-módulo-auth)
3. [Módulo Schools](#3-módulo-schools)
4. [Módulo Users](#4-módulo-users)
5. [Módulo Students](#5-módulo-students)
6. [Módulo Family Relationships](#6-módulo-family-relationships)
7. [Módulo Academic Years](#7-módulo-academic-years)
8. [Módulo Classrooms](#8-módulo-classrooms)
9. [Módulo Course Assignments](#9-módulo-course-assignments)
10. [Módulo Course Contents LMS](#10-módulo-course-contents-lms)
11. [Módulo Curricular Areas & Competencias CNEB](#11-módulo-curricular-areas--competencias-cneb)
12. [Módulo Enrollments](#12-módulo-enrollments)
13. [Módulo Grades & Rúbricas](#13-módulo-grades--rúbricas)
14. [Módulo Siagie Consolidator](#14-módulo-siagie-consolidator)
15. [Módulo Attendance & Kiosco QR](#15-módulo-attendance--kiosco-qr)
16. [Módulo Payments & Finanzas](#16-módulo-payments--finanzas)
17. [Módulo Announcements](#17-módulo-announcements)
18. [Módulo Notifications & Web Push](#18-módulo-notifications--web-push)
19. [Módulo Academic Reports](#19-módulo-academic-reports)
20. [Módulo Uploads & Google Drive](#20-módulo-uploads--google-drive)
21. [Módulo Catalog](#21-módulo-catalog)
22. [Módulo Incidents & Agenda Escolar](#22-módulo-incidents--agenda-escolar)
23. [Scripts y Crons del Sistema](#23-scripts-y-crons-del-sistema)

---

## 1. Infraestructura & Utilidades Core

### 1.5 `src/utils/period-dates.util.ts` (v1.2.0)

#### `getPeriodDateRange(academicYear: AcademicYearWithPeriods, periodNumber: number): { startDate: Date; endDate: Date }`
* **Qué hace:** Calcula el rango de fechas exacto (inicio y fin) para un periodo bimestral o trimestral. Si el año lectivo tiene configurado `periodsConfig` (array de `{ periodNumber, startDate, endDate }`), utiliza las fechas fijadas por Dirección. De lo contrario, particiona matemáticamente el intervalo entre `startDate` y `endDate` del año escolar.
* **Qué necesita:** Objeto `academicYear` y el `periodNumber` (1..4).
* **Retorna:** `{ startDate: Date, endDate: Date }`.
* **Para qué sirve:** Base para el cálculo de estadísticas de asistencia por periodo (`IJ`, `II`, `TJ`, `TI`) y filtrado de incidencias por periodo en la matriz de notas.

---

#### `hashPassword(plainPassword: string): Promise<string>`
* **Qué hace:** Genera un hash criptográfico unidireccional de una contraseña plana usando la librería `bcryptjs`.
* **Qué necesita:**
  * `plainPassword`: String con la contraseña en texto claro (mínimo 1 carácter).
  * Variable de entorno `env.BCRYPT_ROUNDS` (por defecto `12`).
* **Retorna:** `Promise<string>` con el hash resultante (ej: `$2a$12$...`).
* **Para que funcione bien:** Debe invocarse antes de persistir cualquier contraseña en las tablas `User` o al restablecer credenciales.

#### `comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean>`
* **Qué hace:** Compara en tiempo constante la contraseña provista contra el hash guardado para mitigar ataques de temporización (*timing attacks*).
* **Qué necesita:**
  * `plainPassword`: Contraseña ingresada por el usuario en el formulario.
  * `hashedPassword`: Hash previamente generado y almacenado en `User.passwordHash`.
* **Retorna:** `Promise<boolean>` (`true` si coinciden, `false` en caso contrario).
* **Para que funcione bien:** El hash no debe ser nulo o estar corrupto.

---

### 1.2 `src/utils/jwt.util.ts`

#### `signToken(payload: AuthenticatedUser): string`
* **Qué hace:** Crea y firma digitalmente un JSON Web Token (JWT) con algoritmo HMAC-SHA256.
* **Qué necesita:**
  * `payload`: Objeto `{ userId: string, schoolId: string, role: string, email: string }`.
  * `env.JWT_SECRET`: Clave simétrica de al menos 16 caracteres.
  * `env.JWT_EXPIRES_IN`: String de vigencia (por defecto `'7d'`).
* **Retorna:** `string` (JWT codificado en base64url).
* **Para que funcione bien:** La clave secreta debe ser idéntica entre arranques del servidor para que las sesiones no se invaliden espontáneamente.

#### `verifyToken(token: string): AuthenticatedUser`
* **Qué hace:** Decodifica y verifica la firma criptográfica y fecha de vencimiento del token.
* **Qué necesita:** Cadena JWT sin el prefijo `Bearer `.
* **Retorna:** `AuthenticatedUser` con los datos de sesión.
* **Errores:**
  * `AppError('El token ha expirado. Por favor inicia sesión nuevamente.', 401)` si `TokenExpiredError`.
  * `AppError('Token inválido o malformado.', 401)` si la firma no coincide o el token fue alterado.

---

### 1.3 `src/utils/timezone.util.ts`

#### `getSchoolNow(timeZone = 'America/Lima'): SchoolNowResult`
* **Qué hace:** Obtiene la fecha y hora oficial escolar de Perú sin importar si el servidor se ejecuta en UTC (Render, Railway, AWS).
* **Qué necesita:** Parámetro opcional `timeZone` (por defecto `'America/Lima'`).
* **Retorna:** Objeto `SchoolNowResult`:
  * `dateStr`: Fecha en formato ISO `'YYYY-MM-DD'` (ej: `'2026-11-07'`).
  * `dateObj`: Objeto `Date` fijado a las `00:00:00.000Z` (ideal para columnas Prisma `@db.Date`).
  * `hour`: Número entero (0..23) en hora local peruana.
  * `minute`: Número entero (0..59) en hora local peruana.
  * `fullDate`: Instante actual completo.
* **Para que funcione bien:** La versión de Node.js debe soportar la API estándar `Intl.DateTimeFormat`.

#### `parseSchoolDate(dateStr: string): Date`
* **Qué hace:** Parsea una cadena `'YYYY-MM-DD'` a objeto Date fijado a las 00:00:00 UTC para consistencia en bases de datos PostgreSQL.
* **Qué necesita:** Cadena de fecha en formato año-mes-día.
* **Retorna:** Objeto `Date`.

---

### 1.4 `src/utils/notification.util.ts`

#### `getMailTransporter(): Transporter | null`
* **Qué hace:** Inicializa y mantiene como singleton la conexión SMTP con el servicio de Gmail utilizando `nodemailer`.
* **Qué necesita:** `env.USER_EMAIL` y `env.PASS_EMAIL` (App Password de 16 caracteres de Google).
* **Retorna:** Instancia de `Transporter` o `null` si faltan variables.

#### `sendEmail(options: EmailOptions): Promise<boolean>`
* **Qué hace:** Envía un correo electrónico con soporte HTML y texto plano. Si no hay credenciales SMTP, registra la simulación en consola sin tumbar el flujo.
* **Qué necesita:** Objeto `{ to: string, subject: string, text: string, html?: string }`.
* **Retorna:** `true` si se envió exitosamente o `false` en caso de error o ausencia de SMTP.

#### `sendReminderNotification(params: ReminderNotificationParams): Promise<ReminderNotificationResult[]>`
* **Qué hace:** Construye un mensaje formal de cobranza con plantilla HTML responsiva (logo institucional, monto formateado en Soles `S/`, concepto y fecha de vencimiento) y lo envía al apoderado.
* **Qué necesita:** `recipientEmail`, `recipientName`, `studentName`, `obligationTitle`, `amountDue`, `dueDate`.
* **Retorna:** Array con el estado de entrega y timestamp.

---

### 1.5 `src/utils/web-push.util.ts`

#### `sendWebPushNotification(subscription: PushSubscriptionKeys, payload: PushNotificationPayload): Promise<{ success: boolean; shouldRemove: boolean }>`
* **Qué hace:** Transmite una notificación push cifrada directamente a los servidores de notificaciones (Google FCM, Apple Push Notification Service, Mozilla).
* **Qué necesita:**
  * `subscription`: `{ endpoint: string, p256dh: string, auth: string }`.
  * `payload`: `{ title: string, message: string, type?: string, link?: string }`.
  * Claves VAPID configuradas en `env.VAPID_PUBLIC_KEY` y `env.VAPID_PRIVATE_KEY`.
* **Retorna:**
  * `{ success: true, shouldRemove: false }` si se entregó.
  * `{ success: false, shouldRemove: true }` si el código HTTP es `404` o `410` (indica que el usuario desinstaló la PWA o revocó los permisos en el celular, requiriendo eliminar la suscripción de la BD).

---

## 2. Módulo Auth

### Controlador: `AuthController` (`src/modules/auth/auth.controller.ts`)

#### `login = async (req: Request, res: Response): Promise<void>`
* **Endpoint:** `POST /api/auth/login`
* **Permisos:** Público (Protegido por `authRateLimiter`).
* **Qué hace:** Valida `loginSchema` en `req.body`, delega a `AuthService.login` y retorna código `200 OK`.
* **Códigos HTTP:** `200 OK`, `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`.

#### `changePassword = async (req: Request, res: Response): Promise<void>`
* **Endpoint:** `POST /api/auth/change-password`
* **Permisos:** Privado (`authMiddleware`).
* **Qué hace:** Extrae `req.user.userId`, valida `changePasswordSchema` y ejecuta `AuthService.changePassword`.
* **Códigos HTTP:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.

#### `register = async (req: Request, res: Response): Promise<void>`
* **Endpoint:** `POST /api/auth/register`
* **Permisos:** Público o Administrador.
* **Qué hace:** Valida `registerSchema` y crea un usuario nuevo mediante `AuthService.register`. Retorna código `201 Created`.

---

### Servicio: `AuthService` (`src/modules/auth/auth.service.ts`)

#### `login(loginDto: LoginDto): Promise<AuthResponse>`
* **Qué hace:**
  1. Busca al usuario regular en `authRepository.findUserByIdentifier(loginDto.email)`.
  2. **Login Dual de Estudiantes:** Si no existe en `User`, busca automáticamente en la tabla `Student` mediante `authRepository.findStudentByIdentifier(loginDto.email)` (por `documentId` o `studentCode`).
  3. **Auto-inicialización para Alumnos:** Si es estudiante y `student.passwordHash === null`, compara la contraseña ingresada con `student.documentId`. Si coincide, hashea la clave y persiste `passwordHash`.
  4. Si existe `passwordHash`, compara con `comparePassword`. Si falla, arroja `AppError('Credenciales inválidas', 401)`.
  5. **Detección de primer inicio para apoderados o alumnos:** Si `mustChangePassword` está activo o la contraseña es el documento de identidad, fuerza la bandera en la respuesta.
  6. Emite el token JWT con `signToken` conteniendo `userId`, `schoolId`, `role` (`STUDENT` para alumnos), `email` y `studentId`.
* **Retorna:** `{ token, user: { id, email, role, firstName, lastNamePaternal, schoolId, documentId, studentId, mustChangePassword } }`.

#### `changePassword(userId: string, changePasswordDto: ChangePasswordDto, role?: string): Promise<{ message: string }>`
* **Qué hace:**
  1. Si `role === 'STUDENT'`, recupera el estudiante mediante `authRepository.findStudentById(userId)`. Si es usuario regular, usa `authRepository.findUserById(userId)`.
  2. Si el DTO incluye `currentPassword`, valida con `comparePassword`. Si no coincide, arroja `AppError('La contraseña actual ingresada es incorrecta', 400)`.
  3. **Seguridad contra contraseñas triviales:** Comprueba que `newPassword.trim() !== account.documentId.trim()`. Si coinciden, arroja `AppError('La nueva contraseña no puede ser idéntica a tu número de documento por motivos de seguridad.', 400)`.
  4. Genera el nuevo hash con `hashPassword` y actualiza mediante `authRepository.updateStudentPassword` (si es estudiante, desactivando `mustChangePassword: false`) o `authRepository.updatePassword`.
* **Retorna:** `{ message: 'Contraseña actualizada exitosamente' }`.

#### `register(registerDto: RegisterDto): Promise<AuthResponse>`
* **Qué hace:** Valida que el email no esté registrado previamente en `authRepository.findUserByEmail`. Hashea la clave y persiste el usuario. Genera el token JWT y lo retorna.

---

### Repositorio: `AuthRepository` (`src/modules/auth/auth.repository.ts`)

* **`findUserByEmail(email: string): Promise<User | null>`**: `prisma.user.findUnique({ where: { email } })`.
* **`findUserByIdentifier(identifier: string): Promise<User | null>`**: Busca en `User` con `OR`: correo electrónico insensitivo a mayúsculas o match exacto en `documentId`.
* **`findUserById(id: string): Promise<User | null>`**: `prisma.user.findUnique({ where: { id } })`.
* **`findStudentByIdentifier(identifier: string): Promise<Student | null>`**: Busca en `Student` por coincidencia exacta en `documentId` o `studentCode`.
* **`findStudentById(id: string): Promise<Student | null>`**: `prisma.student.findUnique({ where: { id } })`.
* **`updateStudentPassword(studentId: string, passwordHash: string): Promise<Student>`**: Actualiza `passwordHash` y setea `mustChangePassword: false` en `prisma.student`.
* **`updatePassword(userId: string, passwordHash: string): Promise<User>`**: `prisma.user.update({ where: { id: userId }, data: { passwordHash } })`.
* **`createUser(data: RegisterDto & { passwordHash: string }): Promise<User>`**: Crea el registro en la base de datos vinculándolo a su `schoolId`.

---

## 3. Módulo Schools

### Controlador: `SchoolController` (`src/modules/schools/school.controller.ts`)

* **`getAll(req, res)`**: Invoca `SchoolService.getAllSchools()`. Retorna `200 OK` con todos los colegios.
* **`getById(req, res)`**: Extrae `req.params.id`. Retorna `200 OK` o `404 Not Found`.
* **`create(req, res)`**: Valida `createSchoolSchema` y ejecuta `SchoolService.createSchool`. Retorna `201 Created`.
* **`update(req, res)`**: Valida `updateSchoolSchema` y ejecuta `SchoolService.updateSchool`. Retorna `200 OK`.
* **`deactivate(req, res)`**: Soft-delete institucional con `SchoolService.deactivateSchool`. Retorna `200 OK`.
* **`reactivate(req, res)`**: Reactivación institucional con `SchoolService.reactivateSchool`. Retorna `200 OK`.
* **`resetAdminPassword(req, res)`**: Valida `req.body.newPassword` (min 6) y ejecuta `SchoolService.resetAdminPassword`. Retorna `200 OK`.

---

### Servicio: `SchoolService` (`src/modules/schools/school.service.ts`)

#### `getAllSchools(): Promise<School[]>`
* **Qué hace:** Retorna la lista de todas las instituciones escolares ordenadas por fecha de creación descendente.

#### `getSchoolById(schoolId: string): Promise<School>`
* **Qué hace:** Busca el colegio por ID. Si no existe, arroja `AppError('Colegio con id ... no encontrado', 404)`.

#### `createSchool(createSchoolDto: CreateSchoolDto): Promise<School>`
* **Qué hace:**
  1. Si se proveen credenciales de administrador (`adminEmail` y `adminPassword`), hashea la clave con `hashPassword`.
  2. Ejecuta `schoolRepository.create` en una transacción atómica creando la institución y su administrador principal.

#### `updateSchool(schoolId: string, updateSchoolDto: UpdateSchoolDto): Promise<School>`
* **Qué hace:** Verifica que el colegio exista y actualiza campos institucionales (RUC, modularCode, teléfono, niveles `offeredLevels`, logoUrl, plan, etc.).

#### `deactivateSchool(schoolId: string): Promise<School>`
* **Qué hace:** Desactiva el colegio (`isActive: false`). Esto bloquea inmediatamente el acceso a todos los usuarios de esa institución vía `tenantMiddleware`.

#### `reactivateSchool(schoolId: string): Promise<School>`
* **Qué hace:** Vuelve a activar el colegio (`isActive: true`).

#### `resetAdminPassword(schoolId: string, newPassword: string): Promise<{ adminEmail: string }>`
* **Qué hace:**
  1. Busca en `prisma.user` al primer usuario con `schoolId`, `role: 'SCHOOL_ADMIN'` y `isActive: true`.
  2. Si no existe, arroja `AppError('No se encontró un administrador escolar activo para este colegio', 404)`.
  3. Hashea la nueva clave y actualiza el usuario en la BD.
* **Retorna:** `{ adminEmail }`.

---

### Repositorio: `SchoolRepository` (`src/modules/schools/school.repository.ts`)

* **`findAll(): Promise<School[]>`**: `prisma.school.findMany({ orderBy: { createdAt: 'desc' } })`.
* **`findById(id: string): Promise<School | null>`**: `prisma.school.findUnique({ where: { id } })`.
* **`create(data: CreateSchoolDto): Promise<School>`**: Ejecuta `prisma.$transaction`. Crea `School` y, si se incluyeron datos del admin, crea `User` con `role: 'SCHOOL_ADMIN'`.
* **`update(id: string, data: UpdateSchoolDto): Promise<School>`**: Actualiza atributos con `prisma.school.update`.
* **`softDelete(id: string): Promise<School>`**: `prisma.school.update({ where: { id }, data: { isActive: false } })`.
* **`reactivate(id: string): Promise<School>`**: `prisma.school.update({ where: { id }, data: { isActive: true } })`.

---

## 4. Módulo Users

### Controlador: `UserController` (`src/modules/users/user.controller.ts`)

* **`getAll(req, res)`**: Valida `userFilterSchema` en `req.query`. Invoca `UserService.getAllUsers(req.user.schoolId, filters)`. Retorna `200 OK` con datos paginados.
* **`getById(req, res)`**: Retorna `200 OK` con el usuario (sin hash) o `404`.
* **`create(req, res)`**: Valida `createUserSchema` y ejecuta `UserService.createUser`. Retorna `201 Created`.
* **`update(req, res)`**: Valida `updateUserSchema` y ejecuta `UserService.updateUser`. Retorna `200 OK`.
* **`deactivate(req, res)`**: Ejecuta soft delete (`isActive: false`). Retorna `200 OK`.
* **`reactivate(req, res)`**: Ejecuta reactivación (`isActive: true`). Retorna `200 OK`.

---

### Servicio: `UserService` (`src/modules/users/user.service.ts`)

#### `getAllUsers(schoolId: string, filters: UserFilterDto): Promise<PaginatedResult<Omit<User, 'passwordHash'>>>`
* **Qué hace:** Filtra usuarios por colegio (`schoolId`), término de búsqueda (nombre, apellidos, correo, documento), rol específico o filtro de docentes/personal (`staffOnly = true`). Retorna lista paginada excluyendo el hash.

#### `getUserById(userId: string, schoolId: string): Promise<Omit<User, 'passwordHash'>>`
* **Qué hace:** Busca usuario garantizando que pertenezca al colegio autenticado. Arroja `404` si no existe.

#### `createUser(schoolId: string, createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>>`
* **Qué hace:**
  1. Si `createUserDto.email` está definido, comprueba unicidad de correo en `userRepository.findByEmail`. Si existe, arroja `AppError('El correo ya está registrado', 409)`. Si es un apoderado sin email, el campo se admite nulo.
  2. Si tiene `documentId`, valida unicidad en el colegio con `userRepository.findByDocumentId`. Soporta tipos polimórficos (`'DNI'`, `'CE'`, `'PTP'`, `'PASSPORT'`).
  3. Hashea la clave y persiste con `userRepository.create`.

#### `updateUser(userId: string, schoolId: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>>`
* **Qué hace:** Verifica pertenencia institucional y actualiza nombres, documento, celular, nivel educativo o rol.

#### `deactivateUser(userId: string, schoolId: string): Promise<Omit<User, 'passwordHash'>>`
* **Qué hace:** Pone `isActive: false`.

#### `reactivateUser(userId: string, schoolId: string): Promise<Omit<User, 'passwordHash'>>`
* **Qué hace:** Pone `isActive: true`.

---

### Repositorio: `UserRepository` (`src/modules/users/user.repository.ts`)

* **`findAllBySchool(schoolId, filters)`**: Realiza consulta paginada con `skip`, `take`, cláusulas `OR` en búsquedas e incluye conteo total.
* **`findById(id, schoolId)`**: Busca registro por ID y colegio.
* **`findByEmail(email)`**: Busca por email global.
* **`findByDocumentId(schoolId, documentId)`**: Busca por DNI dentro del colegio.
* **`create(schoolId, data)`**: Inserta usuario en la BD.
* **`update(id, schoolId, data)`**: Actualiza usuario.
* **`softDelete(id, schoolId)`**: Cambia `isActive: false`.
* **`reactivate(id, schoolId)`**: Cambia `isActive: true`.

---

## 5. Módulo Students

### Controlador: `StudentController` (`src/modules/students/student.controller.ts`)

* **`getCatalogs(req, res)`**: Retorna catálogos oficiales SIAGIE (Ubigeos, lenguas, etc.).
* **`registerFicha(req, res)`**: Valida `registerFichaMatriculaSchema` y ejecuta la matrícula atómica en `StudentService.registerFichaMatricula`. Retorna `201 Created`.
* **`getNominaMatricula(req, res)`**: Extrae `classroomId` y genera la nómina oficial SIAGIE para Excel con `StudentService.getNominaMatricula`.
* **`getMyChildren(req, res)`**: Endpoint de apoderados (`PARENT`). Devuelve los hijos asociados al usuario autenticado.
* **`getEnrollmentCertificate(req, res)`**:
  * **Endpoint:** `GET /api/students/:id/certificates/enrollment`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`, `PARENT`, `STUDENT`.
  * **Qué hace:** Valida permisos IDOR (si es alumno o apoderado verifica relación legal) y genera la Constancia de Matrícula oficial con datos del colegio, aula, turno, año lectivo y fecha en español. Retorna `200 OK`.
* **`getNoDebtCertificate(req, res)`**:
  * **Endpoint:** `GET /api/students/:id/certificates/no-debt`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`, `PARENT`, `STUDENT`.
  * **Qué hace:** Valida permisos IDOR y comprueba que el estudiante no tenga ninguna obligación de pago pendiente o vencida en el colegio. Si presenta deudas, arroja `AppError(400)` especificando el número de obligaciones pendientes; si está al día, emite la Constancia de No Adeudo oficial. Retorna `200 OK`.
* **`getAll(req, res)`**: Listado paginado de estudiantes con filtros de salón, nivel, grado y búsqueda.
* **`getById(req, res)`**: Detalle del alumno con sus relaciones familiares y matrículas.
* **`create(req, res)`**: Creación individual de estudiante.
* **`update(req, res)`**: Actualización de datos demográficos o código SIAGIE.
* **`delete(req, res)`**: Eliminación de estudiante previa comprobación de integridad.

---

### Servicio: `StudentService` (`src/modules/students/student.service.ts`)

#### `getCatalogs()`
* **Qué hace:** Retorna constantes de `student.catalogs.ts` (Ubigeo INEI, Tipos de Discapacidad, Lenguas Maternas).

#### `registerFichaMatricula(schoolId: string, dto: RegisterFichaMatriculaDto)`
* **Qué hace (Transacción Maestra):**
  1. Verifica si el estudiante ya existe buscando por tipo y número de documento (`studentRepository.findByDocument`).
  2. Si es nuevo, evalúa la cuota de alumnos permitida por el plan del colegio (`BASIC`: 150, `PRO`: 600, `ENTERPRISE`: 999999). Si se rebasa, arroja `AppError('Has alcanzado el límite máximo de estudiantes...', 403)`.
  3. Ejecuta `studentRepository.registerFichaMatriculaTransaction` en una transacción Prisma:
     * Inserta o actualiza el registro en `Student`.
     * Valida que no exista ya una matrícula para el mismo estudiante en ese año lectivo (`studentId` + `academicYearId`).
     * Crea el registro en `Enrollment`.
     * Si `guardian.mode === 'NEW'`, crea el usuario apoderado con clave inicial = número de DNI y rol `PARENT`.
     * Crea o actualiza el vínculo en `FamilyRelationship` configurando flags de apoderado legal y financiero.
* **Retorna:** `{ student, enrollment, guardian }`.

#### `getNominaMatricula(schoolId: string, classroomId: string)`
* **Qué hace:**
  1. Consulta los datos de la institución escolar (nombre, código modular, código de local, DRE/UGEL).
  2. Consulta el aula (nivel, grado, sección, turno).
  3. Recupera todas las matrículas activas del aula con sus estudiantes ordenados alfabéticamente por apellido paterno, apellido materno y nombres.
  4. Calcula la edad exacta de cada alumno cumplida al 31 de marzo del año escolar (norma técnica MINEDU).
  5. Extrae al apoderado legal con su parentesco y teléfono.
* **Retorna:** Estructura completa formateada para renderizado visual o descarga a Excel de la Nómina Oficial de Matrícula.

#### `getMyChildren(schoolId: string, parentUserId: string)`
* **Qué hace:** Busca en `FamilyRelationship` todos los estudiantes vinculados al apoderado en el colegio, incluyendo el aula y grado actual, así como las pensiones pendientes de pago.

#### `getEnrollmentCertificate(schoolId: string, studentId: string, userContext?: UserContext)`
* **Qué hace:**
  1. Valida permisos de acceso (IDOR): si el usuario es `STUDENT`, valida que coincida con su identidad; si es `PARENT`, comprueba parentesco en `familyRelations`.
  2. Obtiene la matrícula activa del alumno (`isActive: true`, `academicYear: { isActive: true }`, `enrollmentState: 'REGISTERED'`).
  3. Formula el correlativo `CE-[studentCode]-[year]` y formatea la fecha en redacción natural en español.
* **Retorna:** Objeto estructurado para constancia oficial con membrete y pie de firmas.

#### `getNoDebtCertificate(schoolId: string, studentId: string, userContext?: UserContext)`
* **Qué hace:**
  1. Ejecuta control de permisos IDOR idéntico a la constancia de matrícula.
  2. Valida la existencia de matrícula activa.
  3. Cuenta las obligaciones del estudiante con estado `PENDING` o `PARTIAL` mediante `studentRepository.countStudentPendingObligations`.
  4. Si `count > 0`, rechaza la solicitud con `AppError(..., 400)`. Si no registra deuda, genera el código `CNA-[studentCode]-[year]`.
* **Retorna:** Objeto estructurado de constancia de no adeudo con estado `CLEARED`.

---

### Repositorio: `StudentRepository` (`src/modules/students/student.repository.ts`)

* **`findAllBySchool(schoolId, filters)`**: Búsqueda paginada con joins a `Classroom` y `Enrollment`.
* **`countBySchool(schoolId)`**: Conteo de estudiantes activos para verificación de cuotas.
* **`findByDocument(schoolId, documentType, documentId)`**: Búsqueda por documento único.
* **`findByStudentCode(schoolId, studentCode)`**: Búsqueda por código modular SIAGIE (14 dígitos).
* **`findStudentForCertificate(studentId, schoolId)`**: Consulta el alumno con su colegio, vínculos familiares y matrícula activa en el año lectivo vigente.
* **`countStudentPendingObligations(studentId, schoolId)`**: Cuenta las obligaciones pendientes o parciales del estudiante a nivel de colegio.
* **`registerFichaMatriculaTransaction(...)`**: Implementación de la transacción ACID con `prisma.$transaction`.

---

## 6. Módulo Family Relationships

### Controlador y Servicio (`family-relationship.*.ts`)

* **`getAllBySchool(schoolId)`**: Devuelve todos los vínculos familiares registrados en la institución.
* **`getByStudent(studentId, schoolId)`**: Devuelve la lista de apoderados y familiares de un alumno.
* **`getByParent(userId, schoolId)`**: Devuelve todos los alumnos a cargo de un apoderado.
* **`create(dto)`**: Crea el vínculo familiar en la tabla `FamilyRelationship`.
* **`update(id, schoolId, dto)`**: Modifica tipo de relación (`MOTHER`, `FATHER`, `TUTOR_LEGAL`, etc.) o flags de apoderado legal/financiero.
* **`delete(id, schoolId)`**: Elimina el vínculo de parentesco.

---

## 7. Módulo Academic Years

### Controlador y Servicio (`academic-year.*.ts`)

* **`getAllAcademicYears(schoolId)`**: Retorna todos los años lectivos del colegio ordenados por año descendente.
* **`getAcademicYearById(academicYearId, schoolId)`**: Detalle del año escolar o `404`.
* **`createAcademicYear(schoolId, dto)`**: Crea un año escolar (`year`, `startDate`, `endDate`, `name`, `periodType`: `'BIMESTER'` | `'TRIMESTER'`, `isActive`). Valida que el año numérico no exista previamente en el colegio (`409 Conflict`). Permite operar con régimen bimestral (4 periodos) o trimestral (3 periodos).
* **`updateAcademicYear(academicYearId, schoolId, dto)`**: Actualiza fechas de vigencia o estado. Valida colisiones de año con otros registros.
* **`deleteAcademicYear(academicYearId, schoolId)`**:
  * **Regla de Protección de Datos:** Cuenta las matrículas asociadas mediante `countEnrollments(academicYearId)`. Si cuenta con al menos 1 matrícula, rechaza la operación arrojando `AppError('No se puede eliminar el Año Lectivo porque cuenta con X estudiantes matriculados.', 400)`.

---

## 8. Módulo Classrooms

### Controlador y Servicio (`classroom.*.ts`)

* **`getAllClassrooms(schoolId)`**: Retorna aulas del colegio incluyendo datos del docente tutor asignado (`User`).
* **`getClassroomById(classroomId, schoolId)`**: Detalle del aula con su tutor o `404`.
* **`createClassroom(schoolId, dto)`**: Crea un aula (`educationLevel`, `grade`, `section`, `shift`, `capacity`, `tutorTeacherId`).
  * **Validación de Tutor:** Si se pasa `tutorTeacherId`, verifica que el usuario exista en el colegio, esté activo y posea rol `TEACHER`.
* **`updateClassroom(classroomId, schoolId, dto)`**: Actualiza capacidad, turno o reasigna el docente tutor.
* **`deleteClassroom(classroomId, schoolId)`**: Elimina el aula previa comprobación de integridad referencial.

---

## 9. Módulo Course Assignments

### Controlador y Servicio (`course-assignment.*.ts`)

* **`getMyAssignments(teacherId, schoolId)`**: Retorna las materias y aulas asignadas al docente autenticado.
* **`getAllBySchool(schoolId)`**: Listado de todas las asignaciones del colegio (para Dirección).
* **`create(schoolId, dto)`**: Asigna un profesor a un curso de un aula (`classroomId`, `areaId`, `teacherId`). Aplica restricción de clave única `[classroomId, areaId]` garantizando un único docente titular por materia.
* **`bulkAssignUnidocente(schoolId, dto)`**: Asigna en bloque todas las áreas curriculares de un aula a un mismo maestro (modelo de aula unidocente en Inicial y Primaria).
* **`syncTeacherAssignments(schoolId, dto)`**: Sincroniza la carga completa de un docente tipo checklist interactivo: crea las nuevas asignaciones y elimina las desmarcadas de forma segura.
* **`delete(assignmentId, schoolId)`**: Elimina una asignación docente.

---

## 10. Módulo Course Contents LMS

### Controlador: `CourseContentController` (`src/modules/course-contents/course-content.controller.ts`)

* **`getByAssignment(req, res)`**: Extrae `courseAssignmentId` y `bimester` opcional de `req.query`. Invoca `service.getByAssignment`. Retorna `200 OK`.
* **`getById(req, res)`**: Extrae `id` de `req.params`. Invoca `service.getById`. Retorna `200 OK` o `404`.
* **`create(req, res)`**: Valida `createCourseContentSchema` en `req.body`. Invoca `service.create(schoolId, req.user, dto)`. Retorna `201 Created`.
* **`delete(req, res)`**: Extrae `id` de `req.params`. Invoca `service.delete(schoolId, req.user, id)`. Retorna `200 OK`.
* **`getComments(req, res)`**: Extrae `id` de `req.params`. Invoca `service.getComments(schoolId, id)`. Retorna `200 OK`.
* **`addComment(req, res)`**: Extrae `id` de `req.params`, valida `createCourseCommentSchema`. Invoca `service.addComment(schoolId, req.user.userId, id, content)`. Retorna `201 Created`.
* **`getStudentCourses(req, res)`**: Extrae `studentId` de `req.params`. Invoca `service.getStudentCourses(schoolId, studentId)`. Retorna `200 OK`.
* **`getStudentTasks(req, res)`**: Extrae `studentId` de `req.params`. Invoca `service.getStudentTasks(schoolId, studentId)`. Retorna `200 OK`.
* **`submitHomework(req, res)`**:
  * **Endpoint:** `POST /api/course-contents/:id/submissions`
  * **Permisos:** `STUDENT`, `PARENT`, `SUPER_ADMIN`, `SCHOOL_ADMIN`.
  * **Qué hace:** Valida `submitHomeworkSchema` (`fileUrl`, `fileName`, `fileSize`, `studentComment`). Invoca `service.submitHomework(schoolId, req.user, courseContentId, body)`. Retorna `201 Created`.
* **`getSubmissions(req, res)`**:
  * **Endpoint:** `GET /api/course-contents/:id/submissions`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`, `TEACHER`, `STUDENT`, `PARENT`.
  * **Qué hace:** Invoca `service.getSubmissions(schoolId, req.user, courseContentId)`. Retorna `200 OK` con la lista de entregas.
* **`gradeSubmission(req, res)`**:
  * **Endpoint:** `PATCH /api/course-contents/submissions/:submissionId/grade`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`.
  * **Qué hace:** Valida `gradeSubmissionSchema` (`numericScore`, `literalScore`, `teacherFeedback`). Invoca `service.gradeSubmission(schoolId, req.user, submissionId, body)`. Retorna `200 OK`.
* **`getSupervisionStats(req, res)`**: `GET /api/course-contents/supervision/stats`. Retorna `200 OK` con métricas directivas.
* **`getTeacherCompliance(req, res)`**: `GET /api/course-contents/supervision/teacher-compliance`. Retorna `200 OK`.
* **`getSupervisedFeed(req, res)`**: `GET /api/course-contents/supervision/feed`. Retorna `200 OK` con feed paginado.

---

### Servicio: `CourseContentService` (`src/modules/course-contents/course-content.service.ts`)

* **`getByAssignment(schoolId: string, courseAssignmentId: string, bimester?: number)`**: Devuelve los contenidos del aula virtual (material de clase, tareas, foros) filtrados opcionalmente por bimestre (1..4).
* **`getById(schoolId: string, id: string)`**: Detalle de una publicación con sus adjuntos.
* **`create(schoolId: string, user: AuthenticatedUser, dto: CreateCourseContentDto)`**:
  * Publica material, tarea o foro interactivo.
  * Valida que el usuario sea el docente titular del curso o un directivo (`SUPER_ADMIN`, `SCHOOL_ADMIN`).
* **`delete(schoolId: string, user: AuthenticatedUser, id: string)`**: Elimina una publicación. Solo puede hacerlo el docente autor o un directivo.
* **`getComments(schoolId: string, courseContentId: string)`**: Retorna comentarios de un foro de debate con datos del autor.
* **`addComment(schoolId: string, userId: string, courseContentId: string, content: string)`**: Agrega una respuesta al foro. Valida que `contentType === 'FORUM'`.
* **`getStudentCourses(schoolId: string, studentId: string)`**: Devuelve las asignaturas que cursa el alumno para el portal de padres/alumnos.
* **`getStudentTasks(schoolId: string, studentId: string)`**: Devuelve tareas pendientes con fecha límite de entrega y foros abiertos.
* **`submitHomework(schoolId: string, user: AuthenticatedUser, courseContentId: string, data: SubmitHomeworkDto)`**:
  * Valida que la publicación exista y sea estrictamente de tipo `contentType === 'HOMEWORK'`.
  * Resuelve el `enrollmentId` correspondiente: si es estudiante usa su matrícula activa; si es apoderado, valida su tutela en `FamilyRelationship`.
  * Evalúa `courseContent.dueDate`: si la fecha actual es posterior al vencimiento, marca automáticamente `isLate: true`.
  * Registra o actualiza la entrega en `HomeworkSubmission` mediante `courseContentRepository.createSubmission`.
  * Retorna la entrega registrada.
* **`getSubmissions(schoolId: string, user: AuthenticatedUser, courseContentId: string)`**:
  * Si el solicitante es Docente o Directivo: invoca `findEnrolledStudentsWithSubmissions(classroomId, courseContentId)` y retorna la totalidad de alumnos con su estado de entrega (`CALIFICADA`, `ENTREGADA`, `PENDIENTE`).
  * Si el solicitante es Estudiante o Apoderado: recupera las matrículas del alumno y retorna únicamente su entrega individual con `findSubmissions(courseContentId, enrollmentIds)`.
* **`gradeSubmission(schoolId: string, user: AuthenticatedUser, submissionId: string, data: GradeSubmissionDto)`**:
  * Valida que la entrega exista y pertenezca al colegio.
  * Valida que el docente sea el titular del curso o directivo institucional.
  * Persiste `numericScore`, `literalScore`, `teacherFeedback` y `gradedAt: new Date()` en `courseContentRepository.gradeSubmission`.
  * Dispara automáticamente una notificación In-App al apoderado/alumno informando la publicación de la calificación.
* **Supervisión Directiva:**
  * **`getSupervisionStats(schoolId: string, bimester?: number)`**: Métricas agregadas de publicaciones por tipo.
  * **`getTeacherCompliance(schoolId: string, bimester?: number)`**: Ratio de cumplimiento de publicaciones por docente.
  * **`getSupervisedFeed(schoolId: string, filters: SupervisionFeedFilters)`**: Feed unificado con filtros por nivel, grado, profesor y tipo.

---

### Repositorio: `CourseContentRepository` (`src/modules/course-contents/course-content.repository.ts`)

* **`createSubmission(schoolId: string, data: { courseContentId: string; enrollmentId: string; fileUrl: string; fileName: string; fileSize?: number; studentComment?: string; isLate: boolean })`**:
  * Ejecuta upsert atómico en la tabla `HomeworkSubmission` sobre la restricción `@@unique([courseContentId, enrollmentId])`.
* **`findSubmissionById(submissionId: string)`**:
  * Retorna la entrega con su relación a `CourseContent` y `Enrollment` (incluyendo datos del `Student`).
* **`findSubmissions(courseContentId: string, enrollmentIds?: string[])`**:
  * Consulta entregas filtradas por publicación y matrículas específicas.
* **`findEnrolledStudentsWithSubmissions(classroomId: string, courseContentId: string)`**:
  * Consulta todos los estudiantes matriculados en el aula e incluye su entrega correspondiente a esa tarea (`submissions: { where: { courseContentId } }`).
* **`gradeSubmission(submissionId: string, data: { numericScore?: number; literalScore?: string; teacherFeedback?: string; gradedAt: Date })`**:
  * Actualiza la calificación y feedback docente en `prisma.homeworkSubmission.update`.

---

## 11. Módulo Curricular Areas & Competencias CNEB (Jerarquía y Malla Oficial)

### Controlador y Servicio (`curricular-area.*.ts`)

* **`getAllAreas(schoolId)`**: Devuelve todas las áreas curriculares con su auto-relación jerárquica (`parentArea`, `subAreas`) y sus competencias activas.
* **`createArea(schoolId, dto)`**: Registra un Área Madre oficial (`parentAreaId: null`) o un Sub-curso (`parentAreaId !== null`) con sus competencias evaluadas específicas (`evaluatedCompetenceIds`).
* **`seedMineduCurriculum(schoolId)`**: Carga automática de toda la malla oficial del CNEB diferenciada por nivel:
  * **Inicial:** Personal Social (3 comp), Psicomotriz (1 comp), Comunicación (4 comp), Matemática (2 comp: Cantidad y Forma), CyT (1 comp), Transversales (2 comp).
  * **Primaria:** Personal Social (5 comp), Ed. Física (3 comp), Arte y Cultura (2 comp), Comunicación (3 comp), Inglés (3 comp), Matemática (4 comp), CyT (3 comp), Ed. Religiosa (2 comp), Transversales (2 comp).
  * **Secundaria:** DPCC (2 comp), CC.SS (3 comp), EPT (1 comp), Ed. Física (3 comp), Arte y Cultura (2 comp), Comunicación (3 comp), Inglés (3 comp), Matemática (4 comp), CyT (3 comp), Ed. Religiosa (2 comp), Transversales (2 comp).
* **`loadDefaultCompetencesForArea(schoolId, areaId)`**: Identifica el código MINEDU del área e inyecta las competencias oficiales predeterminadas sin duplicar.
* **`createCompetence(schoolId, dto)`**: Crea una nueva competencia evaluativa dentro de un área con código oficial determinístico (`officialCompetenceCode`: `'C1'`, `'C2'`, etc.).
* **`updateCompetence(schoolId, competenceId, dto)`**: Modifica nombre, descripción o código oficial de la competencia.
* **`toggleCompetence(schoolId, competenceId)`**: Activa o desactiva una competencia evaluativa.
* **`deleteArea(areaId, schoolId)`**: Bloquea el borrado si el área tiene cursos asignados o notas guardadas.

---

## 12. Módulo Enrollments

### Controlador: `EnrollmentController` (`src/modules/enrollments/enrollment.controller.ts`)

* **`getAll(req, res)`**: Lista las matrículas del colegio (`schoolId`) filtrando por aula o año lectivo. Retorna `200 OK`.
* **`getById(req, res)`**: Retorna `200 OK` con la matrícula y sus relaciones o `404 Not Found`.
* **`create(req, res)`**: Valida `createEnrollmentSchema` en `req.body`. Invoca `service.createEnrollment`. Retorna `201 Created`.
* **`update(req, res)`**: Extrae `id`, valida `updateEnrollmentSchema` y ejecuta `service.updateEnrollment`. Retorna `200 OK`.

---

### Servicio: `EnrollmentService` (`src/modules/enrollments/enrollment.service.ts`)

* **`getAllEnrollments(schoolId: string, filters: EnrollmentFilters)`**: Lista de matrículas con estudiante, aula y año lectivo.
* **`getEnrollmentById(enrollmentId: string, schoolId: string)`**: Detalle de matrícula o `404`.
* **`createEnrollment(schoolId: string, dto: CreateEnrollmentDto)`**:
  * Registra una matrícula con condición (`INGRESANTE`, `CONTINUO`, `TRASLADO`, `REENTRANTE`), repitencia, montos preferenciales de pensión (`customPensionAmount`), motivo de beca (`discountReason`) y situación final SIAGIE (`finalSituation`).
* **`updateEnrollment(enrollmentId: string, schoolId: string, dto: UpdateEnrollmentDto)`**:
  * Actualiza aula, estado (`REGISTERED`, `TRANSFERRED`, `WITHDRAWN`), beca y situación académica final.
  * **Conexión 3 — Migración Automática de Notas entre Secciones (v1.2.0):** Si `dto.classroomId` cambia, busca las asignaciones del aula anterior y las asignaciones del aula nueva que coincidan en `areaId`, y migra dentro de la misma transacción de Prisma todas las notas (`DetailedGrade`) y conclusiones descriptivas (`CompetenceConclusion`) del estudiante.
  * **Baja Automática de Pensiones Futuras:** Si `dto.status === 'WITHDRAWN'` o `'TRANSFERRED'`, ejecuta en la misma transacción la cancelación (`status = 'CANCELLED'`) de todas las obligaciones de pago (`PaymentObligation`) pendientes de esa matrícula con fecha de vencimiento posterior a la fecha actual (`dueDate > new Date()`).

---

### Repositorio: `EnrollmentRepository` (`src/modules/enrollments/enrollment.repository.ts`)

* **`findAll(schoolId, filters)`**: Consulta con `include` a `student`, `classroom` y `academicYear`.
* **`findById(id, schoolId)`**: Búsqueda por ID institucional.
* **`create(schoolId, data)`**: Inserta la matrícula en Prisma.
* **`update(id, schoolId, data)`**: Actualiza la matrícula.
* **`cancelPendingFutureObligations(enrollmentId: string, now: Date)`**:
  * Ejecuta `prisma.paymentObligation.updateMany({ where: { enrollmentId, status: 'PENDING', dueDate: { gt: now } }, data: { status: 'CANCELLED' } })`.

---

## 13. Módulo Grades & Rúbricas

### Controlador y Servicio (`grade.*.ts`)

* **`getCriteria(schoolId, level?)`**: Consulta los criterios de evaluación institucionales (Prácticas, Exámenes, Cuadernos, etc.) con sus ponderaciones.
* **`createCriterion(schoolId, dto)`** / **`updateCriterion`** / **`deleteCriterion`**: CRUD de criterios evaluativos.
* **`getMatrixData(schoolId, courseAssignmentId, periodNumber)`**:
  * Devuelve la grilla completa tipo Cubicol/Excel del aula para el bimestre especificado.
  * **Herencia de Sub-cursos:** Si el curso es un sub-curso (`parentAreaId !== null`), carga las competencias activas de su Área Madre filtrando por `evaluatedCompetenceIds`.
  * **Conexión 4 — Inyección de Incidencias:** Cada alumno incluye `incidentsSummary` (`total`, `topics`, `convivencia`, `acoso`) computado dentro del rango de fechas del periodo evaluado.
* **`saveBatchGrades(schoolId, courseAssignmentId, periodNumber, grades)`**:
  * **Verificación de Bloqueo:** Comprueba si el periodo está cerrado en `GradingPeriodLock`. Si está bloqueado, arroja `AppError(403)`.
  * **Guardado Atómico:** Realiza upserts de calificaciones detalladas (`DetailedGrade`) admitiendo escala literal (`'AD'`, `'A'`, `'B'`, `'C'`, `'EXO'`, `'-'`). Tanto `'EXO'` como `'-'` se excluyen del denominador al promediar.
* **`syncHomeworkToMatrix(schoolId, courseAssignmentId, periodNumber)` (Conexión 1 — LMS -> Matriz):**
  * Sincroniza y promedia automáticamente las calificaciones de las entregas de tareas del módulo LMS Tareas hacia el criterio `'TAREAS'` de la matriz de notas.
* **`getConclusions(schoolId, courseAssignmentId, periodNumber)`** y **`saveBatchConclusions`**: Gestión de conclusiones descriptivas por competencia según la RVM N° 094-2020-MINEDU.
* **`getReportCard(schoolId, enrollmentId, userContext?)`**:
  * Libreta oficial de notas del estudiante. Consolida todas las asignaturas por periodos dinámicos, promedios ponderados, traducción a letras (`AD`, `A`, `B`, `C`), conclusiones descriptivas.
  * **Conexión 2 — Asistencia Oficial SIAGIE (`IJ`, `II`, `TJ`, `TI`):** Desglosa por cada periodo escolar los contadores exactos de asistencia oficial calculados mediante `getPeriodDateRange`.
  * **Control de Acceso IDOR:** Valida que un alumno (`STUDENT`) o apoderado (`PARENT`) solo acceda a su propia libreta.
  * **Bloqueo por Morosidad:** Si `school.blockGradesOnOverdue === true`, deniega la consulta a padres o alumnos con código `402 Payment Required` si registran pensiones vencidas.
* **`getPeriodLockStatus(schoolId, periodNumber, classroomId?)`** y **`togglePeriodLock`**: Bloqueo o desbloqueo formal de actas por Dirección con auditoría de fecha y usuario.

---

## 14. Módulo Siagie Consolidator

### Servicio: `SiagieConsolidatorService` (`src/modules/grades/siagie-consolidator.service.ts`)

#### `scoreToLetter(score: number | null): 'AD' | 'A' | 'B' | 'C' | null`
* **Qué hace:** Convierte una nota vigesimal en la escala cualitativa oficial del CNEB:
  * $17.5 \le \text{nota} \le 20.0 \implies \mathbf{AD}$
  * $13.5 \le \text{nota} < 17.5 \implies \mathbf{A}$
  * $10.5 \le \text{nota} < 13.5 \implies \mathbf{B}$
  * $0.0 \le \text{nota} < 10.5 \implies \mathbf{C}$

#### `sanitizeSiagieConclusion(text: string): string`
* **Qué hace:** Sanea y normaliza textos de conclusiones descriptivas (máximo 300 caracteres, elimina retornos de carro `\r`, saltos de línea `\n`, tabulaciones `\t` y comillas dobles `"`) para asegurar compatibilidad 100% con las plantillas oficiales de importación de SIAGIE Excel.

#### `consolidateClassroom(...)`: Consolidación Oficial SIAGIE v1.2.0
* **Qué hace:**
  1. Consolida todos los sub-cursos internos de los estudiantes bajo sus Áreas Madre Oficiales correspondientes.
  2. Detecta competencias oficiales huérfanas (`unmappedCompetences`) alertando a Dirección si alguna competencia CNEB no está siendo evaluada en el salón.
  3. Soporta modos de cálculo anual (`annualCalculationMode`): `'LAST_PERIOD'` (nivel de logro conclusivo del último periodo según RVM N° 094-2020) vs `'AVERAGE'` (promedio ponderado anual).
  4. Aplica la regla oficial de desaprobación: un área se considera reprobada si más del 50% de sus competencias evaluadas tienen calificación literal `'C'`.
  5. Computa la situación final del estudiante (`PROMOTED`, `RECOVERY`, `RETAINED`, `TRANSFERRED`, `WITHDRAWN`), aplicando promoción automática obligatoria por ley para Educación Inicial y 1er Grado de Primaria.

---

## 15. Módulo Attendance & Kiosco QR

### Controlador y Servicio (`attendance.*.ts`)

* **`getSheet(schoolId, userContext, classroomId, dateStr)`**:
  * Carga la hoja diaria de asistencia de un aula para una fecha dada.
  * Si el usuario es `TEACHER`, valida que sea el tutor asignado del aula.
* **`saveSheet(schoolId, userContext, dto)`**:
  * Guarda o actualiza masivamente el estado de asistencia de los estudiantes del aula (`PRESENT`, `LATE_JUSTIFIED`, `LATE_UNJUSTIFIED`, `ABSENT_JUSTIFIED`, `ABSENT_UNJUSTIFIED`).
* **`getMatrix(schoolId, userContext, classroomId, year, month)`**:
  * Devuelve la sábana mensual interactiva con los días 1 al 31 del mes, totalizando puntualidades, tardanzas y faltas justificadas/injustificadas.
* **`scanAttendance(schoolId, userContext, dto)` (Kiosco en Puerta con Despacho Asíncrono):**
  1. Busca la matrícula del alumno mediante DNI, código SIAGIE o ID.
  2. Obtiene la configuración de horarios de asistencia (`AttendanceScheduleConfig`) aplicable al nivel educativo del alumno.
  3. Obtiene la hora peruana con `getSchoolNow()`.
  4. Compara contra `entryTime` y `lateToleranceTime`. Clasifica automáticamente como `PRESENT` o `LATE_UNJUSTIFIED` (o respeta `statusOverride` si fue forzado por el operador de puerta).
  5. Guarda en base de datos (`origin = 'QR_SCAN'`).
  6. **Despacho Web Push Fire-and-Forget:** Dispara la notificación al celular del apoderado en segundo plano de forma no bloqueante (`void this.sendScanPushNotification(...)`).
  7. **Respuesta Inmediata:** Retorna al escáner en $< \text{50ms}$, garantizando cero colas en portería.
* **`getScheduleConfigs(schoolId)`** y **`upsertScheduleConfig(schoolId, dto)`**: Configura horarios de entrada, tolerancia y auto-cierre por nivel educativo.
* **`closeAttendance(schoolId, dto)`**: Asigna falta injustificada con `origin = 'AUTO_CLOSE'` a todos los estudiantes del aula o colegio que no registraron ingreso en la fecha.

---

## 16. Módulo Payments & Finanzas

### Controlador: `PaymentController` (`src/modules/payments/payment.controller.ts`)

* **`getSummary(req, res)`**: Invoca `service.getFinancialSummary(schoolId)`. Retorna `200 OK` con métricas financieras.
* **`getDailyCashClose(req, res)`**:
  * **Endpoint:** `GET /api/payments/daily-cash-close?date=YYYY-MM-DD`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`.
  * **Qué hace:** Extrae la fecha (o usa la fecha de hoy según `getSchoolNow()`). Invoca `service.getDailyCashClose(schoolId, date)`. Retorna `200 OK` con total recaudado, desglose por método (`CASH`, `BANK_TRANSFER`, `CREDIT_CARD`), conteo de transacciones y detalle de cobros.
* **`createObligation(req, res)`**:
  * **Endpoint:** `POST /api/payments/obligations`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`.
  * **Qué hace:** Valida `createObligationSchema` admitiendo `enrollmentId` o `studentId`, concepto estándar (`PENSION`, `MATRICULA`, `LIBROS_MATERIALES`, `UNIFORME`, `CARNET_AGENDA`, `EXCURSION_EVENTO`, `OTROS`), monto, vencimiento, notas y parámetros opcionales de cobro inmediato en ventanilla (`paidNow: boolean`, `paymentMethod`, `operationNumber`, `receiptType`, `receiptNumber`). Si `paidNow: true`, crea la obligación en estado `PAID` y registra la transacción atómicamente con recibo correlativo `REC-XXXXXX`. Invoca `service.createObligation`. Retorna `201 Created`.
* **`bulkCreate(req, res)`**: Valida `bulkCreateObligationSchema`. Invoca `service.bulkCreateObligations(schoolId, body)`. Retorna `201 Created`.
* **`updateObligation(req, res)`**:
  * **Endpoint:** `PATCH /api/payments/obligations/:id`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`.
  * **Qué hace:** Extrae `id = req.params.id`, valida `updateObligationSchema` (`amountDue`, `dueDate`, `title`, `notes`, `status`). Invoca `service.updateObligation(schoolId, id, body)`. Retorna `200 OK`.
* **`registerTransaction(req, res)`**: Valida `createPaymentTransactionSchema`. Invoca `service.registerTransaction(schoolId, body)`. Retorna `201 Created`.
* **`deleteTransaction(req, res)`**: Extrae `id = req.params.id`. Invoca `service.deleteTransaction(id, schoolId)`. Retorna `200 OK`.
* **`getReceipt(req, res)`**: Extrae `id = req.params.id`. Invoca `service.getTransactionReceipt(id, schoolId)`. Retorna `200 OK`.
* **`sendReminder(req, res)`**: Extrae `id = req.params.id`. Invoca `service.sendObligationReminder(schoolId, id)`. Retorna `200 OK`.
* **`sendBulkOverdueReminders(req, res)`**:
  * **Endpoint:** `POST /api/payments/obligations/remind-overdue`
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`.
  * **Qué hace:** Invoca `service.sendBulkOverdueReminders(schoolId)`. Retorna `202 Accepted` con `{ message: 'Envío de recordatorios iniciado en segundo plano', totalQueued }`.

---

### Servicio: `PaymentService` (`src/modules/payments/payment.service.ts`)

* **`getFinancialSummary(schoolId: string)`**:
  * Totaliza recaudaciones, saldos vencidos morosos y ratio de morosidad institucional en Soles (`S/`).
* **`getDailyCashClose(schoolId: string, dateStr?: string)`**:
  * Consulta el total recaudado del día objetivo (`targetDate = dateStr || getSchoolNow().dateStr`), discriminando por métodos (`CASH`, `BANK_TRANSFER`, `CREDIT_CARD`), conteo de operaciones y lista de transacciones con datos del estudiante y aula.
* **`createObligation(schoolId: string, dto: CreateObligationDto)`**:
  * Emite una obligación o cuota individual para un estudiante.
  * Si solo se proporciona `studentId`, busca la matrícula activa del estudiante en el año escolar vigente para resolver `enrollmentId`.
  * **Cobro Inmediato en Ventanilla:** Si `dto.paidNow === true` o se especifica `dto.paymentMethod`, crea la obligación en estado `PAID` y registra atómicamente la transacción (`PaymentTransaction`) en caja generando el recibo correlativo `REC-XXXXXX`. Esto asegura que los cobros de trámites (certificados, agendas, uniformes, otros) queden registrados al instante en el Arqueo de Caja Diario.
  * Previene duplicación de mes exclusivamente para el concepto `PENSION`, permitiendo la emisión recurrente de otros conceptos administrativos.
* **`bulkCreateObligations(schoolId: string, dto: BulkCreateObligationDto)`**:
  * Genera el cronograma de pagos para todas las matrículas activas del aula o colegio.
  * **Lógica de Becas y Descuentos:**
    1. Si `dto.concept === 'PENSION'`, consulta `Enrollment.customPensionAmount`.
    2. Si el estudiante cuenta con `customPensionAmount !== null`, sobreescribe el monto general con su cuota pactada.
    3. Si el monto es `0` (Beca Integral), omite la generación de la deuda para ese estudiante.
    4. Comprueba si el alumno ya tiene emitida una obligación con el mismo título en ese año escolar para evitar duplicaciones.
* **`updateObligation(schoolId: string, obligationId: string, data: UpdateObligationDto)`**:
  * Valida que la obligación exista y pertenezca al colegio.
  * Actualiza `amountDue`, `dueDate`, `title`, `notes` o `status` en `paymentRepository.updateObligation`.
* **`registerTransaction(schoolId: string, dto: CreatePaymentTransactionDto)`**:
  * Valida que la obligación no esté `PAID` ni `CANCELLED`.
  * **Recibo Interno Autonumerado:** Si `dto.receiptNumber` no se especifica o está vacío, genera automáticamente la serie correlativa `REC-` concatenando 6 dígitos (`REC-000001`, `REC-000002`...) contando las transacciones del colegio.
  * Suma pagos previos más el pago actual para actualizar la obligación a `PAID` o `PARTIAL`.
  * Registra la transacción con método de pago manual (`CASH`, `BANK_TRANSFER`, `CREDIT_CARD`), boleta/factura y notas.
* **`deleteTransaction(transactionId: string, schoolId: string)`**:
  * Anula un pago erróneo. Recalcula el saldo restante con los pagos sobrevivientes y actualiza la obligación a `PARTIAL` o `PENDING`.
* **`getTransactionReceipt(transactionId: string, schoolId: string)`**:
  * Genera la información estructurada lista para imprimir la boleta con membrete institucional.
* **`sendObligationReminder(schoolId: string, obligationId: string)`**:
  * Envía correo HTML y notificación Web Push al apoderado financiero.
* **`sendBulkOverdueReminders(schoolId: string)`**:
  * Busca obligaciones vencidas (`status: PENDING`, `dueDate < today`).
  * Despacha los envíos en segundo plano de manera no bloqueante.
  * Itera secuencialmente con un retraso obligatorio de 2000 ms entre cada correo (`await new Promise(r => setTimeout(r, 2000))`) para respetar los límites de conexiones concurrentes de Gmail SMTP y evitar el bloqueo de la cuenta institucional.

---

### Repositorio: `PaymentRepository` (`src/modules/payments/payment.repository.ts`)

* **`findAllObligations(schoolId, filters)`**: Búsqueda paginada de obligaciones.
* **`findObligationById(id, schoolId)`**: Detalle de obligación con matrículas y pagos.
* **`findObligationByIdSimple(id, schoolId)`**: Consulta rápida de obligación por ID.
* **`createObligation(schoolId, data)`**: Inserta una obligación individual.
* **`bulkCreateObligations(obligations)`**: Inserción masiva de obligaciones.
* **`updateObligation(schoolId: string, obligationId: string, data: Partial<PaymentObligation>)`**:
  * Actualiza campos de la obligación garantizando pertenencia al colegio.
* **`createTransaction(schoolId, data)`**: Registra el pago en la base de datos.
* **`deleteTransaction(id, schoolId)`**: Elimina una transacción.
* **`findOverdueObligations(schoolId, today)`**: Recupera deudas morosas para recordatorios.

---

## 17. Módulo Announcements

### Controlador y Servicio (`announcement.*.ts`)

* **`getAnnouncements(schoolId, userRole, filters)`**: Lista comunicados vigentes filtrando según los roles permitidos en `targetRoles` y aula opcional.
* **`getAnnouncementById(announcementId, schoolId)`**: Detalle del comunicado o `404`.
* **`createAnnouncement(schoolId, authorId, dto)`**:
  * Inserta el comunicado en la base de datos (`title`, `content`, `priority`, `targetRoles`, `expiresAt`).
  * **Side Effect Reactivo:** Busca en batch a todos los usuarios del colegio que pertenezcan a los roles destinatarios y genera notificaciones in-app en la tabla `Notification` en una sola operación `createMany`.
* **`updateAnnouncement(announcementId, schoolId, dto)`**: Modifica el comunicado o su estado de activación.
* **`deleteAnnouncement(announcementId, schoolId)`**: Ejecuta soft delete (`isActive: false`).

---

## 18. Módulo Notifications & Web Push

### Controlador y Servicio (`notification.*.ts`)

* **`getVapidPublicKey()`**: Retorna la clave pública VAPID institucional para la suscripción de Service Workers en navegadores y teléfonos móviles.
* **`savePushSubscription(schoolId, target, dto)`**:
  * Guarda o actualiza el endpoint y claves `p256dh`/`auth` del dispositivo del usuario o estudiante en la tabla `PushSubscription`.
  * **Soporte Polimórfico de Destinatarios:** Admite `NotificationTarget` discriminando limpiamente entre `User` (`userId`) y `Student` (`studentId`), resolviendo de raíz el error fatal `P2003` de clave foránea cuando el rol es `STUDENT`.
* **`getMyNotifications(schoolId, target, filters)`**: Consulta paginada de notificaciones in-app del usuario o estudiante (`isRead`, `type`, `createdAt`). Admite el nuevo tipo de notificación `INCIDENT`.
* **`markAsRead(schoolId, target, notificationId)`**: Marca una notificación como leída verificando pertenencia al destinatario.
* **`markAllAsRead(schoolId, target)`**: Marca todas las notificaciones pendientes del destinatario como leídas.
* **`deleteNotification(schoolId, target, notificationId)`**: Elimina una notificación.
* **`sendTestPushNotification(schoolId, target)`**: Envía una notificación Web Push de prueba al celular del usuario o estudiante para verificar la conectividad VAPID.
* **`createNotification(schoolId, dto)`**: Crea una notificación in-app (asociada a `userId` o `studentId`) y dispara en segundo plano el Web Push a los dispositivos suscritos, limpiando automáticamente tokens caducados.

---

## 19. Módulo Academic Reports

### Controlador y Servicio (`academic-report.*.ts`)

* **`getAvailableClassrooms(schoolId, academicYearId?)`**: Catálogo transversal de aulas para los selectores de los reportes.
* **`getConsolidatedGrades(schoolId, classroomId, periodNumber)` (Reporte 0021):** Matriz oficial de calificaciones por aula y bimestre, calculando promedios ponderados por criterio, notas de conducta y tardanzas/inasistencias acumuladas.
* **`getMeritClassroom(schoolId, classroomId, periodNumber)` (Reporte 0048):** Orden de mérito del salón con resolución estadística de empates y cálculo de alumnos pertenecientes al **Tercio Superior**.
* **`getMeritGrade(schoolId, educationLevel, grade, periodNumber, academicYearId?)` (Reporte 0049):** Orden de mérito consolidado de todo el grado (ej: 1ro de Secundaria secciones A, B y C unificadas) con cálculo de **Tercio Superior** y **Quinto Superior**.
* **`getDraftRegister(schoolId, classroomId, courseAssignmentId?)` (Reporte 0041):** Registro Auxiliar borrador en blanco para control físico docente.
* **`getConductComments(schoolId, classroomId, periodNumber)` (Reporte 0030):** Listado de apreciaciones conductuales emitidas por los docentes.
* **`getClassroomRoster(schoolId, classroomId)` (Reporte 0011):** Padrón de estudiantes matriculados en la sección con datos demográficos.
* **`getFamiliesByState(schoolId, state?, academicYearId?)` (Reporte 0001):** Clasificación de familias según convivencia de los padres.
* **`getFamiliesWithChildren(schoolId, classroomId?, academicYearId?)` (Reporte 0002):** Listado institucional de familias y sus hijos matriculados.
* **`getFamiliesRelatives(schoolId, classroomId?, academicYearId?)` (Reporte 0003):** Directorio telefónico y residencial de apoderados y parientes.
* **`getStudentBirthdays(schoolId, month?, classroomId?, educationLevel?, academicYearId?)` (Reporte 0019):** Calendario de cumpleaños de alumnos por mes para celebraciones institucionales.

---

## 20. Módulo Uploads & Google Drive

### Archivos: `upload.routes.ts` y `google-drive.service.ts`

* **`POST /api/uploads/material` y `POST /api/uploads/materials`**:
  * Utiliza almacenamiento temporal en disco `multer.diskStorage({ destination: os.tmpdir() })` con límite de **30 MB** y lista blanca de extensiones (`.pdf`, `.pptx`, `.docx`, `.xlsx`, imágenes, `.zip`, `.txt`), protegiendo a Node.js de caídas por saturación de RAM (`OOM`).
  * **Estrategia Híbrida Optimizada con Streams y Anti-Bloqueo:**
    1. Si `googleDriveService.isConfigured()` es verdadero, sube el archivo a Google Drive leyendo en streaming con `fs.createReadStream(filePath)`. Envuelto en un bloque `try / finally` que borra el archivo temporal del disco local (`fs.promises.unlink`) apenas termina la transferencia.
    2. Genera y retorna tanto la URL de visualización embebida (`viewUrl`: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`) como el enlace de descarga directa, asignando el visor como URL principal para PDFs y documentos para eludir bloqueos por tráfico simultáneo.
    3. Si Google Drive no estuviese disponible, mantiene el archivo en el disco local (`uploads/materials/`) y genera la URL estática de Express `/uploads/materials/<filename>`.
* **Métodos de `GoogleDriveService`:**
  * **`initialize()`**: Carga credenciales OAuth2 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`) o Service Account JSON.
  * **`isConfigured()`**: Retorna si el cliente de Google Drive está listo para operar.
  * **`uploadFile(filePath: string, originalName: string, mimeType: string): Promise<UploadResult>`**: Transmite el archivo a Google Drive leyendo mediante `fs.createReadStream(filePath)` en streaming y retorna `{ fileId, downloadUrl, viewUrl }`. Aplica permisos públicos de lectura (`anyone / reader`) y construye el enlace de previsualización `viewUrl` anti-bloqueo.
  * **`getFolderId()`**: Obtiene o autodescubre la carpeta compartida `SaaSchool` en Google Drive.

---

## 21. Módulo Catalog

### Archivos: `catalog.routes.ts`, `catalog.controller.ts`, `catalog.data.ts`

* **`GET /api/catalog/grades`**: Retorna los grados oficiales organizados por nivel (`INITIAL`, `PRIMARY`, `SECONDARY`).
* **`GET /api/catalog/courses`**: Retorna las materias oficiales del Currículo Nacional MINEDU.
* **Características:** Rutas públicas sin autenticación para inicializar selectores del frontend de forma estandarizada.

---

## 22. Módulo Incidents & Agenda Escolar

### Archivos: `incident.routes.ts`, `incident.controller.ts`, `incident.service.ts`, `incident.repository.ts`, `incident.schema.ts`

* **`POST /api/incidents`**:
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`, `TEACHER`.
  * **Qué hace:** Valida `createIncidentSchema` (`studentId` o `enrollmentId`, `type`, `severity`, `title`, `description`, `actionTaken`, `citationDate`).
  * **Despacho Multicanal Inmediato:** Crea el registro en `StudentIncident` y notifica atómicamente a todos los apoderados legales vinculados al estudiante mediante notificación in-app (tipo `INCIDENT`) y Web Push al navegador/celular (`sendWebPushNotification`). Emite también notificación in-app para la cuenta del estudiante.
  * **Retorna:** `201 Created` con el objeto de la incidencia.
* **`GET /api/incidents`**:
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`, `TEACHER`, `PARENT`, `STUDENT`.
  * **Filtros:** `type`, `severity`, `enrollmentId`, `studentId`, `classroomId`, `startDate`, `endDate`, paginación (`page`, `limit`).
  * **Aislamiento por Rol (IDOR):** Si el usuario es `PARENT`, restringe la consulta estrictamente a los incidentes de sus propios hijos; si es `STUDENT`, filtra exclusivamente sus propios registros.
  * **Retorna:** `200 OK` con `{ data: StudentIncident[], meta }`.
* **`GET /api/incidents/:id`**:
  * **Permisos:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ADMINISTRATIVE`, `TEACHER`, `PARENT`, `STUDENT`.
  * **Qué hace:** Consulta el detalle de la incidencia con comprobación IDOR. Retorna `200 OK`.
* **`PATCH /api/incidents/:id/acknowledge`**:
  * **Permisos:** `PARENT`.
  * **Qué hace:** Acuse de recibo formal. Valida que el usuario sea el apoderado legal del estudiante y registra `acknowledgedAt = now()` y `acknowledgedByUserId = req.user.userId`.
  * **Retorna:** `200 OK` con la incidencia actualizada.

---

## 23. Scripts y Crons del Sistema

### 22.1 Tarea Programada de Auto-Cierre de Asistencia (`src/modules/attendance/attendance.cron.ts`)

* **`initAttendanceAutoCloseCron(attendanceRepository: AttendanceRepository): () => void`**
  * **Qué hace:** Crea un temporizador nativo `setInterval` que corre cada 60 segundos.
  * **Lógica:**
    1. Evalúa si el día actual es de Lunes a Viernes bajo hora peruana (`getSchoolNow()`). Si es Sábado o Domingo, se salta.
    2. Busca configuraciones de asistencia en `AttendanceScheduleConfig` que tengan `autoCloseEnabled: true` y cuya hora `autoCloseTime` (ej. `'08:30'`) sea exactamente el minuto actual.
    3. Ejecuta `attendanceRepository.closeAttendance` asignando falta injustificada automática a los estudiantes sin marcar.
  * **Retorna:** Función de cierre para detener el intervalo limpiamente en caso de señal `SIGTERM` o `SIGINT`.

### 22.2 Backup Automatizado de Base de Datos (`scripts/backup-db.ts`)

* **Comando:** `npm run db:backup`
* **Qué hace:**
  1. Detecta automáticamente la ruta del ejecutable `pg_dump` en Windows o en Linux.
  2. Extrae un respaldo completo de la base de datos PostgreSQL con compresión binaria.
  3. Se conecta a Google Drive mediante credenciales OAuth2.
  4. Crea o reutiliza la carpeta `Backups_SaaSchool` y sube el archivo generado.

