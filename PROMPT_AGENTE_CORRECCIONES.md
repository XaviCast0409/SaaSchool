# Prompt para el agente: corrección de todos los hallazgos de la evaluación de salida al mercado

Eres un agente de programación trabajando en el monorepo `SaaSchool` (KIPUX): `back/` (Express + Prisma + Zod, TypeScript) y `front/` (React + Vite + React Query, TypeScript). Debes corregir **TODOS** los puntos de esta lista, **uno por uno, sin saltarte ninguno**, incluidos los menores. No cambies comportamiento que no se pide. Todos los textos visibles para el usuario van **en español**.

## Reglas de trabajo (obligatorias)

1. Antes de editar cada punto, **lee el archivo indicado** y busca con grep el texto citado. Si la ruta o la línea no coincide exactamente, localízalo por el texto entre comillas.
2. Haz el cambio mínimo y correcto. No reescribas módulos enteros.
3. Cada corrección de backend que cambie una regla debe llevar **un test en Vitest** junto a los existentes (`back/src/**/__tests__/`), salvo que se indique otra cosa.
4. Al terminar todos los puntos ejecuta, y deja todo en verde:
   - `pnpm --dir back run test`
   - `cd back && npx tsc --noEmit`
   - `cd front && npx tsc --noEmit`
5. No toques `.env`, migraciones ya aplicadas ni datos de producción. Si un punto necesita una migración nueva de Prisma, créala con `prisma migrate dev --name <nombre>`.
6. Al final, entrega una lista con cada punto (C1…, A1…, M1…, B1…, P1…) marcado como hecho, con el archivo que cambiaste. Si alguno no se pudo, explica por qué.

---

## CRÍTICOS (seguridad; se corrigen primero)

### C1. Nadie del colegio puede tocar una cuenta SUPER_ADMIN

Hoy una secretaria restableció la clave del SUPER_ADMIN y entró como él.

- En `back/src/modules/users/user.service.ts`, en `resetPassword`, `updateUser` (o como se llame la edición), `deactivateUser` y `reactivateUser`: si el usuario destino tiene `role === 'SUPER_ADMIN'` y quien ejecuta **no** es SUPER_ADMIN, lanza `new AppError('Usuario no encontrado', 404)`. Para eso, pasa el rol de quien ejecuta desde el controlador (`request.user!.role`).
- En `back/src/modules/users/user.repository.ts`, el listado (`findAll` o equivalente usado por `GET /users`) y `findById`/`getById` deben **excluir** `role: 'SUPER_ADMIN'` cuando quien consulta no es SUPER_ADMIN.
- La misma exclusión aplica a los filtros de «Persona» de la bitácora (`back/src/modules/audit-logs`) para usuarios que no son SUPER_ADMIN: no mostrar al SUPER_ADMIN como persona del colegio.
- Test: una secretaria (ADMINISTRATIVE) y un director (SCHOOL_ADMIN) reciben 404 al restablecer, editar o desactivar a un SUPER_ADMIN.

### C2. Jerarquía de roles en la gestión de usuarios

Hoy una secretaria se subió a sí misma el rol a SCHOOL_ADMIN, ascendió a un docente y restableció la clave de la directora.

- En `back/src/modules/users/user.service.ts` crea una regla `canManage(actorRole, targetRole)`:
  - **SUPER_ADMIN** gestiona a todos.
  - **SCHOOL_ADMIN** gestiona SCHOOL_ADMIN, ADMINISTRATIVE, TEACHER y PARENT, nunca SUPER_ADMIN.
  - **ADMINISTRATIVE** gestiona solo TEACHER y PARENT (no SCHOOL_ADMIN, no ADMINISTRATIVE, no SUPER_ADMIN).
- Aplícala en: restablecer clave (`POST /users/:id/reset-password`), editar (`PATCH /users/:id`), crear (`POST /users`, según el rol que se crea), desactivar y reactivar.
- **Cambio de rol:** solo SCHOOL_ADMIN o SUPER_ADMIN pueden enviar el campo `role` en `PATCH /users/:id`. Si lo envía ADMINISTRATIVE, responde 403 «No tienes permiso para cambiar roles.». Nadie puede cambiarse **su propio** rol (403 «No puedes cambiar tu propio rol.»).
- `updateUserSchema` (`back/src/modules/users/user.schema.ts`) nunca debe aceptar `SUPER_ADMIN` como rol. Verifícalo.
- Al crear o editar, ADMINISTRATIVE no puede asignar los roles SCHOOL_ADMIN ni ADMINISTRATIVE.
- Front: en `front/src/features/users/` (formularios de usuario y botones de restablecer clave), oculta las acciones que el rol actual no puede ejecutar según la misma regla.
- Tests: casos permitidos y denegados de `canManage`, autopromoción y ascenso de un docente por una secretaria.

### C3. Script del superadmin

- En `back/src/scratch/create-superadmin.ts`, la cuenta SUPER_ADMIN no debe asociarse a un colegio cliente real.
- Opción preferida: crear (con upsert) un colegio interno «KIPUX Plataforma» con `isActive: false` y RUC `00000000000`, oculto del panel de colegios, y asociarle el SUPER_ADMIN.
- Excluye ese colegio interno de `getAllSchools`, del MRR y de los totales del panel SuperAdmin (`back/src/modules/schools/school.repository.ts`, `school.service.ts`).
- Si esto es complejo, como mínimo garantiza que C1 deja al SUPER_ADMIN fuera de todo listado y acción del colegio que lo contiene.
- Ajusta igual el seed (`back/prisma/seed.ts`) y documenta en `DEPLOY.md` cómo crear el superadmin en producción.

### C4. Fuga de asistencia a padres de otros alumnos

Hoy un padre, con un ID ajeno, ve la asistencia, las horas de entrada y salida, y el nombre y el DNI de quien recogió a un niño que no es su hijo.

- En `back/src/modules/attendance/attendance.routes.ts` / `attendance.controller.ts` / `attendance.service.ts`, en `GET /attendance/enrollment/:enrollmentId` y `GET /attendance/student/:enrollmentId/summary`:
  - Si el rol es **PARENT**, verifica que exista `familyRelationship` entre `request.user.userId` y el alumno de esa matrícula. Si no existe, 403 «No tienes permisos sobre este estudiante.».
  - Si el rol es **STUDENT**, solo su propia matrícula.
  - Si el rol es **TEACHER**, solo matrículas de aulas donde sea tutor o tenga cursos asignados en ese año.
- Revisa con grep **todos** los endpoints que reciben `enrollmentId` o `studentId` en params o query, en todos los módulos (attendance, incidents, grades, academic, course-contents, family, pickups, meetings). Aplica la misma verificación de vínculo para PARENT, STUDENT y TEACHER. Usa como referencia el patrón que ya existe en justificaciones («No tienes permisos sobre este estudiante.») y en libretas.
- Tests: un padre recibe 403 con la matrícula de un niño ajeno y 200 con la de su hijo.

### C5. Minimización de datos para docentes (Ley 29733)

Hoy un docente ve el DNI, el celular y el correo de todos los padres, y a todos los alumnos del colegio.

- `GET /users` (`back/src/modules/users/user.routes.ts:23`):
  - Para TEACHER, devolver solo personal (SCHOOL_ADMIN, ADMINISTRATIVE, TEACHER) con los campos `id, firstName, lastNamePaternal, lastNameMaternal, role, avatarUrl, email`.
  - Para los apoderados, solo los de alumnos de sus aulas, sin `documentId`.
  - Revisa qué pantallas del front usan este listado siendo docente y que sigan funcionando.
- En todas las respuestas de `/users`, para cualquier rol, **nunca** devolver `passwordHash`, `failedLoginAttempts`, `lockedUntil`, `passwordChangedAt` ni `mustChangePassword` (salvo el propio usuario). Usa un `select` explícito.
- `GET /students` para TEACHER: solo alumnos matriculados en aulas donde es tutor o tiene cursos en el año seleccionado.
- Tests de ambos filtros.

---

## ALTOS

### A1. Comunicados de docentes limitados a sus aulas

- En `back/src/modules/announcements` (servicio de creación y edición): si el autor es TEACHER, `classroomId` es **obligatorio** y debe ser un aula donde es tutor o tiene cursos en el año activo. Sin aula o con un aula ajena: 403 «Solo puedes publicar comunicados para tus aulas.».
- El docente no puede incluir los roles `ADMINISTRATIVE`, `SCHOOL_ADMIN` ni `SUPER_ADMIN` en `targetRoles`.
- Front (`front/src/features/announcements/`): para docentes, el selector de aula es obligatorio y solo muestra sus aulas.
- Revisa además por qué `targetRoles` no acepta `STUDENT`, aunque la pantalla de comunicados está habilitada para alumnos. Si los alumnos deben poder recibir comunicados, añade `STUDENT` al enum permitido. Si no, quita la opción del front. Elige añadir `STUDENT` si el modelo `Role` de Prisma lo permite.
- Tests.

### A2. Asistencia solo en días lectivos dentro del año escolar

Hoy se guardó la asistencia de un domingo fuera del año 2027, y un escaneo QR de domingo registró una tardanza.

- Crea en `back/src/modules/attendance/attendance.rules.ts` la función `isSchoolDay(dateStr, year: { startDate, endDate }, holidays: Set<string>)`. Devuelve `false` si es sábado o domingo, si es feriado del colegio o si está fuera de `startDate..endDate` del año académico de la matrícula.
- Aplícala en:
  - `PUT /attendance/sheet`, `POST /attendance`, `POST /attendance/bulk`, `POST /attendance/scan`, `POST /attendance/scan/batch` y `POST /attendance/close`.
  - Error 400 con mensajes claros: «No se registra asistencia en fin de semana.», «La fecha {fecha} es feriado ({nombre}).», «La fecha está fuera del año escolar {año} ({inicio} – {fin}).».
- En el escaneo QR (`POST /attendance/scan`), en un día no lectivo responde 400 con ese mensaje y no crees ningún registro.
- Front (`front/src/features/attendance/`): si la fecha elegida no es lectiva, muestra un aviso y desactiva «Guardar Asistencia».
- Tests de `isSchoolDay` y de cada endpoint principal.

### A3. Cierre automático que respete el año escolar

- En `back/src/modules/attendance/attendance.repository.ts`, `closeAttendance` (la consulta `enrollmentScope`, línea ~1108): agrega la condición de que la fecha esté entre `academicYear.startDate` y `academicYear.endDate`. Ejemplo: `academicYear: { isActive: true, startDate: { lte: dateObj }, endDate: { gte: dateObj } }`.
- Así ni `attendance.cron.ts` ni el cierre manual crean faltas fuera del año escolar.
- Test con una fecha anterior al inicio del año: debe crear 0 faltas.

### A4. Vencimiento de la cuota de matrícula

Hoy la cuota de matrícula vence el mismo día en que se genera (15/11/2026, antes del año 2027), y los alumnos aparecen en mora de inmediato.

- En `back/src/modules/payments/fee-schedule.service.ts` (busca donde se crea la obligación con `concept: 'MATRICULA'`), el `dueDate` de la matrícula debe ser:
  - **el día anterior al `startDate` del año académico** si la matrícula se genera antes del inicio del año;
  - si se genera con el año ya iniciado, **la fecha de generación + 7 días**.
- No la marques como vencida mientras no pase su `dueDate`.
- Revisa que los recordatorios de morosidad (`/payments/obligations/remind-overdue` y las automatizaciones) usen `dueDate < hoy` y no cuenten cuotas futuras.
- Test.

### A5. Constancia de No Adeudo

- En `back/src/modules/students/student.repository.ts:184` (`countStudentPendingObligations`), cuenta solo cuotas **vencidas**: agrega `dueDate: { lt: <hoy en Lima> }` (usa `getSchoolNow()` / `parseSchoolDate` de `back/src/utils/timezone.util.ts`).
- Cambia el texto del error en `student.service.ts` (~línea 414) a «…presenta {n} cuota(s) vencida(s) sin pagar.».
- Test.

### A6. Colegio suspendido

Hoy un colegio suspendido deja iniciar sesión y luego expulsa con «El colegio o la sesión ya no existe…».

- En `back/src/modules/auth/auth.service.ts` (`login`): si el colegio del usuario o del alumno tiene `isActive: false` y el usuario no es SUPER_ADMIN, lanza `AppError('El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.', 403)` **antes** de emitir el token.
- En el middleware de autenticación o de tenant (`back/src/core/middlewares/`, busca «El colegio o la sesión ya no existe»): distingue los dos casos. Colegio inactivo: 403 con el mismo mensaje de suspensión. Colegio o usuario inexistente: el 401 actual.
- Front (`front/src/lib/axios.ts`): ante ese 403 de suspensión, cierra la sesión y muestra el mensaje en la pantalla de ingreso (no un error genérico).
- La página pública de ingreso (`/api/public/login-pages/:slug`) de un colegio suspendido debe responder con un mensaje claro de suspensión en vez de 404. El front `SchoolLoginPage` debe mostrarlo.
- Tests.

---

## MEDIOS

### M1. Archivos demasiado grandes y errores de subida

- En `back/src/core/middlewares/error-handler.middleware.ts`, maneja `MulterError` antes del 500 genérico:
  - `LIMIT_FILE_SIZE` → 413 «El archivo supera el tamaño máximo permitido (8 MB).». Si es posible, toma el límite real de la configuración.
  - `LIMIT_FILE_COUNT` → 400 «Demasiados archivos.».
  - `LIMIT_UNEXPECTED_FILE` → 400 «Campo de archivo no válido.».
  - Cualquier otro → 400 «No se pudo procesar el archivo.».
- Test con un archivo mayor al límite.

### M2. Apellido materno vacío mostrado como «null»

- Busca en `front/src` todas las concatenaciones de nombres con `lastNameMaternal` (y `studentLastNameMaternal`). Hoy se ven «Huamán null, Ana Lucía» en Pagos y «Huamán , Ana Lucía» en Caja.
- Crea en `front/src/lib/utils.ts` un helper `fullName({ lastNamePaternal, lastNameMaternal, firstNames|firstName }, formato)` que omita las partes vacías o nulas y no deje espacios ni comas sobrantes. Úsalo en **todos** esos lugares.
- Haz lo mismo en el backend donde se arman nombres para respuestas, recibos, PDF, Excel o notificaciones: busca `lastNameMaternal}` en `back/src`.

### M3. Libro de Reclamaciones (D.S. 011-2011-PCM)

- En `front/src/features/secretariat/pages/PublicComplaintsBookPage.tsx`, muestra en la cabecera la **razón social / nombre del colegio, el RUC (`documentId`) y la dirección** (`address`).
- Si `GET /api/public/schools/:schoolId` (`back/src/modules/secretariat/secretariat.public.routes.ts`, `loadSchool`) no devuelve `documentId` y `address`, añádelos al `select`.
- Tras registrar la hoja, muestra en pantalla el código de la hoja (`code`) y la fecha límite de respuesta (`dueDate`), con la opción de imprimirla.

### M4. Vista en celular

- **Pagos del padre** (`front/src/features/payments/pages/PaymentsPage.tsx`, vista PARENT): en pantallas < 768 px, reemplaza la tabla por tarjetas (alumno, concepto, monto, vencimiento, estado y botón «Reportar pago» / «Boleta» visibles sin desplazamiento lateral). Ordena primero lo **vencido**, luego lo pendiente por fecha de vencimiento ascendente, y al final lo pagado (o en una sección plegada «Pagados»).
- **Pase de lista del docente** (`front/src/features/attendance/`, hoja de pase de lista): en < 768 px, muestra cada alumno como tarjeta con su nombre y los botones de estado (Presente, Falta, Tardanza y sus variantes justificadas) visibles debajo del nombre, sin desplazamiento horizontal.

### M5. Portal del padre: datos contradictorios

- En el panel del padre (`front/src/features/dashboard/` y `front/src/features/parent/`), el mismo hijo muestra «Asistencia 84%» en su tarjeta y «89 %» en «¿Cómo va Lucas?». Unifica la fuente o rotula cada cifra con su periodo («este mes», «en el año»).
- «Próximo vencimiento: 10-nov.» muestra una fecha pasada. Si el vencimiento ya pasó, muestra «Vencida desde {fecha}». «Próximo vencimiento» debe referirse solo a la primera cuota con `dueDate >= hoy`.

### M6. Reporte de pago sin captura

- En el modal «Reportar pago» del padre (busca «Enviar a tesorería» en `front/src/features/payments/` o `payment-reports`): marca «Captura del voucher *» como obligatoria.
- Mientras el botón esté desactivado, muestra debajo el motivo: «Adjunta la captura del voucher para enviar.».
- Valida también en el front que la fecha del pago no sea futura (el backend ya lo hace) y muestra el error.

### M7. Importación Excel: cuotas

- En `front/src/features/students/components/StudentImportModal.tsx`, la casilla `generateFees` debe venir **marcada por defecto** (`useState(true)`) cuando el año tiene tarifario.
- Si se desmarca, muestra el aviso: «Los alumnos importados quedarán sin pensiones. Podrás generarlas luego con “Generar cuotas faltantes” en el Tarifario.».
- El schema del backend (`back/src/modules/student-import/student-import.schema.ts`) puede quedarse con `default(false)` por compatibilidad. No es obligatorio cambiarlo.

---

## MENORES (también obligatorios)

- **B1. Mensajes de Zod en inglés.**
  - Configura un `errorMap` global en español para Zod en el backend (por ejemplo, en `back/src/app.ts` o un archivo `back/src/core/zod-es.ts` importado al inicio), que traduzca `Required`, `Invalid enum value`, `Expected number`, etc.
  - En el error handler, para errores de Zod, el `message` principal debe ser el primer error ya traducido.
  - Revisa en particular: la anulación de un cobro sin motivo (hoy devuelve «Required»), `reason` de justificaciones (hoy «Invalid enum value…») y `targetRoles` de comunicados.
- **B2. Textos en inglés visibles.**
  - Reemplaza «PRIMARY», «SECONDARY», «INITIAL» por «Primaria», «Secundaria», «Inicial», y «MORNING», «AFTERNOON», «NIGHT» por «Mañana», «Tarde», «Noche», en todo el front.
  - Casos vistos: filtro de aulas en Alumnos y Pagos («1° "A" - PRIMARY»), selector de aula de la matrícula, cabecera del alumno («3° "A" • SECONDARY», «Turno MORNING»).
  - Crea o usa un único helper de etiquetas en `front/src/lib/` y busca con grep todos los usos.
- **B3. Doble punto.** En el mensaje de portería «El estudiante ya registró su salida a las {hora}.» (`back/src/modules/attendance/attendance.service.ts`, ~línea 1018), la hora ya termina en «a. m.». Quita el punto final cuando la hora formateada ya termine en punto.
- **B4. Tarifario con montos negativos.** En el formulario de tarifario (`front/src/features/payments/pages/FeeSchedulesPage.tsx` o su modal), un monto negativo debe dar «El monto no puede ser negativo.». El «Total anual por alumno» nunca debe mostrar valores negativos. Pon `min="0"` en los inputs.
- **B5. Planilla de notas.** En `front/src/features/academic/pages/GradebookPage.tsx`, cuando haya celdas inválidas, el pie no debe decir «Guardado». Debe decir «{n} valor(es) no válido(s) sin guardar», y al salir de la celda inválida debe aparecer un aviso. No envíes al backend las celdas inválidas.
- **B6. Parentesco por defecto.** En `front/src/features/students/components/EnrollStudentModal.tsx`, el parentesco del apoderado no debe venir preseleccionado como «Padre». Usa una opción vacía «— Selecciona —» y hazlo obligatorio.
- **B7. Libretas sin aula.** En `/academic/report-cards/print` y `/academic/tutor-report`, cuando falta el aula, muestra un selector de aula y periodo (o un enlace de vuelta a «Reportes académicos») en lugar de solo «Falta elegir el aula.».
- **B8. Accesos de prueba inexistentes.** En `front/src/features/auth/pages/LoginPage.tsx` (solo modo desarrollo), quita de `DEMO_CATEGORIES` las cuentas de «San Ignacio» (BASIC) y la del alumno Mateo, porque el seed no las crea. Alternativa: añádelas al seed `back/prisma/seed.ts`.
- **B9. Mensaje de la cuota de ingreso.** En el tarifario, si la pensión es 0 o vacía, el mensaje correcto es «Ingresa la pensión mensual.». Si es negativa, usa el mensaje de B4. Hoy ambos casos muestran el primero.

---

## PENDIENTES DE ONBOARDING (también obligatorios)

### P1. «Olvidé mi contraseña»

Hoy no existe; solo un administrador puede restablecer claves.

- **Backend** (`back/src/modules/auth/`):
  - `POST /api/auth/forgot-password` con `{ email }`, pasando por `authIpRateLimiter` y un límite propio de 5 por hora por IP.
  - Responde **siempre** 200 con «Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.», exista o no la cuenta.
  - Si el usuario existe y está activo, genera un token aleatorio (`crypto.randomBytes(32)`), guarda **solo su hash SHA-256** con vencimiento de 30 minutos y un solo uso. Usa un modelo Prisma nuevo `PasswordResetToken` (`id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt`) con su migración.
  - Envía el correo con el enlace `{FRONTEND_URL}/restablecer?token=...`. Usa el servicio de correo existente: busca `nodemailer` / `sendMail` en `back/src`.
- **Backend:** `POST /api/auth/reset-password` con `{ token, newPassword }`:
  - Valida con `PASSWORD_POLICY_REGEX` (`back/src/utils/password.util.ts`) y que la clave no sea igual al DNI.
  - Marca el token como usado, actualiza `passwordHash` y `passwordChangedAt`, pone `mustChangePassword=false`, reinicia `failedLoginAttempts` y `lockedUntil`, invalida la caché de sesión (`invalidatePrincipalCache`) y registra auditoría.
  - Token inválido, vencido o ya usado: 400 «El enlace no es válido o ya venció. Solicita uno nuevo.».
- **Alcance:** solo para usuarios con correo (personal y apoderados). Los alumnos y los apoderados sin correo siguen recuperando su clave con el colegio. En ese caso el mensaje de la pantalla debe decir: «Si no tienes correo registrado, pide a tu colegio que restablezca tu contraseña.».
- **Front:**
  - Enlace «¿Olvidaste tu contraseña?» en `front/src/features/auth/pages/SchoolLoginPage.tsx` y `LoginPage.tsx`.
  - Página nueva `/olvide-contrasena` (formulario de correo) y página `/restablecer` (nueva clave y confirmación), ambas públicas en `front/src/router/index.tsx`.
- **Tests:** token válido, vencido, reutilizado y correo inexistente (la respuesta debe ser igual).

### P2. Guía de primeros pasos para el director nuevo

Hoy el director de un colegio vacío ve «Todo en orden: no hay pendientes urgentes».

- Ya existe `buildOnboarding` en `back/src/modules/schools/onboarding.rules.ts`, pero solo lo ve el SuperAdmin (`SchoolDetailPage`).
- Expón para SCHOOL_ADMIN un endpoint `GET /api/schools/me/onboarding` que use la misma lógica y los mismos conteos que ya usa el detalle de colegio del SuperAdmin. Busca dónde se llama `buildOnboarding`.
- En `front/src/features/dashboard/pages/DashboardPage.tsx` (vista de dirección):
  - Mientras `percent < 100`, muestra arriba una tarjeta «Pon en marcha tu colegio» con la barra de avance, la lista de pasos (hechos y pendientes) y un botón al paso siguiente que lleve a la pantalla correspondiente:
    - perfil → «Ajustes del Colegio»
    - año → `/academic-years`
    - aulas → `/classrooms`
    - docentes → `/directory`
    - alumnos → `/students`
    - cursos → `/academic/teaching-load`
    - familias → `/students`
    - pensiones → `/payments/fee-schedules`
    - asistencia → `/attendance`
  - El paso «La dirección ingresó y cambió su clave» se marca solo.
  - Con el colegio vacío, «Para resolver hoy» no debe decir «Todo en orden». Debe decir «Completa la puesta en marcha para empezar.».

### P3. Mostrar el código de ingreso al dar de alta un colegio

- En `front/src/features/super-admin/components/CreateSchoolModal.tsx`, tras crear el colegio, no cierres el modal con solo un toast. Muestra una pantalla de éxito con:
  - el **código del colegio** (`slug`);
  - el **enlace de ingreso** `{origen}/c/{slug}`;
  - el correo del director y la clave inicial que se ingresó.
  - Botones «Copiar credenciales» (texto listo para enviar por WhatsApp o correo) y «Listo».
- Añade un campo opcional «Código de ingreso» (`slug`), que el backend ya acepta, con el texto de ayuda «Si lo dejas vacío se genera desde el nombre».
- Muestra el código y el enlace también en `front/src/features/super-admin/pages/SchoolDetailPage.tsx`, con un botón para copiar.

### P4. Mensaje correcto para un RUC repetido

- Hoy un RUC repetido responde «El DNI / Número de Documento ingresado ya pertenece a otro estudiante o apoderado registrado.».
- En `back/src/core/middlewares/error-handler.middleware.ts` (bloque P2002), distingue por modelo. Si el error viene del modelo `School` (usa `meta.modelName` si está disponible) y el campo es `documentId`: «Ya existe un colegio registrado con ese RUC.».
- Mejor aún: en `back/src/modules/schools/school.service.ts` (`createSchool`), verifica antes con `findFirst({ where: { documentId } })` y lanza `AppError('Ya existe un colegio registrado con ese RUC.', 409)`.
- Valida también que el RUC sea de 11 dígitos numéricos (regex `^\d{11}$`, en front y back).
- Si el correo del director ya existe, responde 409 «Ese correo ya está registrado en la plataforma.» en lugar del genérico.

### P5. Datos completos en el alta del colegio

- En `CreateSchoolModal.tsx`, agrega estos campos, que el schema del backend (`back/src/modules/schools/school.schema.ts`) ya acepta:
  - código modular (7 dígitos, opcional);
  - dirección;
  - departamento, provincia y distrito (hoy fijos en LIMA por defecto: déjalos editables);
  - **vigencia del plan** (`planExpiresAt`, fecha);
  - **mensualidad pactada** (`monthlyFee`, opcional, con el texto «Vacío = precio de lista del plan»).
- Agrega también el DNI y el celular del director (`adminDocumentId`, `adminCellphone`). Hoy, si faltan, el backend copia el RUC como DNI del director (`school.repository.ts`, `documentId: adminDocumentId || school.documentId`).
  - Corrige ese respaldo: el DNI del director debe ser **obligatorio** (8 dígitos) o quedar `null`, **nunca** el RUC.
  - Haz lo mismo con `lastNamePaternal: adminLastNamePaternal || school.name`: el apellido paterno es obligatorio, no se rellena con el nombre del colegio.

### P6. Inicio del plan BASIC sin funciones PRO

- En `front/src/features/dashboard/pages/DashboardPage.tsx` (vista de dirección), la tarjeta «Registro de Notas» de «Módulos del Sistema», y cualquier otro acceso a funciones PRO, debe:
  - ocultarse si el plan del colegio es BASIC, **o**
  - mostrarse con la insignia «PRO» y llevar a la pantalla de mejora de plan, sin parecer una función incluida.
- Usa la misma fuente de plan que `PlanGuard` (`front/src/components/ui/PlanGuard.tsx`).
- Revisa también el menú lateral (`front/src/layouts/navigation.ts`) con el mismo criterio.

### P7. Año lectivo preseleccionado en la matrícula

- En `front/src/features/students/components/EnrollStudentModal.tsx` (paso 2, «Matrícula Escolar»), preselecciona el año activo (`isActive`). Si solo existe un año, selecciónalo siempre.
- Haz lo mismo en cualquier otro formulario con el selector «-- Selecciona el Año Lectivo --»: búscalo con grep.

---

## Verificación final (obligatoria)

1. `pnpm --dir back run test`: todos los tests pasan, incluidos los nuevos.
2. `npx tsc --noEmit` en `back/` y en `front/`: sin errores.
3. Prueba manual con `pnpm --dir back run dev` y `pnpm --dir front run dev` y las cuentas del seed (`admin.pro@innova.edu.pe` / `Admin123!`, `secretaria.pro@innova.edu.pe` / `Admin123!`, `docente.pro@innova.edu.pe` / `Teacher123!`, `padre.doshijos@innova.edu.pe` / `Parent123!`):
   - La secretaria **no** puede restablecer la clave de la directora ni la del superadmin, ni cambiar roles.
   - El docente no ve el DNI ni el celular de los padres y solo ve a los alumnos de sus aulas.
   - El padre recibe 403 con la asistencia de un niño ajeno.
   - No se puede guardar asistencia un sábado o domingo.
   - Un colegio suspendido muestra el mensaje de suspensión al ingresar.
   - El alta de un colegio muestra el código y el enlace de ingreso.
   - El director nuevo ve la guía de puesta en marcha.
   - «¿Olvidaste tu contraseña?» funciona de principio a fin. Si no hay SMTP en local, revisa en la consola del backend que el enlace se genera.
4. Entrega la lista final punto por punto (C1–C5, A1–A6, M1–M7, B1–B9, P1–P7).
