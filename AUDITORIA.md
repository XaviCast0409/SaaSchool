# Auditoría técnica, legal y de despliegue — SaaSchool

**Fecha:** 9 de noviembre de 2026  
**Alcance:** `back/` (Express + Prisma + PostgreSQL), `front/` (React + Vite + Tailwind), `render.yaml`, historial de git, dependencias, almacenamiento (Google Drive), correo (Nodemailer) y cumplimiento normativo peruano (MINEDU/SIAGIE, datos personales, consumidor, SUNAT).  
**Método:** lectura de código, `tsc --noEmit` (back y front: **compilan sin errores**), `vite build`, `pnpm audit --prod` y revisión de la configuración de despliegue.

> Aviso: esta auditoría identifica riesgos legales, pero no reemplaza a un abogado. Antes de firmar con el primer colegio, valida con un especialista los puntos de la sección 5 (datos personales, Ley 27665 y evaluación).

---

## 0. Veredicto ejecutivo

La base es buena: la arquitectura es modular (controller/service/repository), los datos se validan con Zod, se usa Helmet, cada consulta filtra por `schoolId` (aislamiento entre colegios), hay control por roles en todas las rutas, bcrypt con 12 rondas, TypeScript en modo estricto sin errores, manejo correcto de la zona horaria de Lima y apagado ordenado del servidor. **Es un MVP funcional y bien encaminado.**

**Pero no está listo para salir a producción.** Hay **5 bloqueantes críticos** (sección 1) que exponen datos de menores o permiten tomar control de un colegio. Ninguno es costoso de arreglar: todos se resuelven en código y configuración, sin pagar más infraestructura.

| Área | Estado |
|---|---|
| Seguridad | 🔴 Crítico (5 bloqueantes) |
| Cumplimiento de datos personales (Ley 29733) | 🔴 No cumple todavía |
| Normativa MINEDU / SIAGIE | 🟡 Parcial (las reglas de promoción deben validarse) |
| Despliegue y costos | 🟡 Viable; puedes ahorrar US$ 20 al mes |
| Rendimiento del frontend | 🟠 El bundle pesa 3,3 MB (895 KB gzip) en un solo archivo |
| Diseño / UX | 🟡 Limpio, pero es el tema por defecto de shadcn (no es novedoso) |
| Calidad / pruebas | 🟠 0 tests automatizados |

---

## 1. Bloqueantes críticos (resolver ANTES del primer colegio)

### C1. El repositorio es PÚBLICO y contiene secretos
`https://github.com/XaviCast0409/SaaSchool` responde sin autenticación, así que cualquiera puede verlo.
- La **clave privada VAPID** (la que firma las notificaciones push) está en texto plano en `render.yaml`, en `back/.env.example` y como valor por defecto en `back/src/config/env.ts:15-16`. Con ella, cualquiera puede enviar notificaciones push falsas a tus usuarios suscritos.
- Tu **correo personal** está como valor por defecto en `env.ts:17`.
- `back/uploads/materials/*` (8 archivos de prueba) está versionado.
- `back/temp-test-service-account.txt` se subió en el commit `b0cb2d4`.

**Acción:**
1. Pon el repositorio en **privado** hoy mismo.
2. Genera claves VAPID nuevas (`npx web-push generate-vapid-keys`), guárdalas solo en Render y borra los valores por defecto de `env.ts`, `render.yaml` y `.env.example`. Haz que `VAPID_*` sean obligatorias.
3. Agrega `uploads/` y `*.rar` al `.gitignore`. Los `back.rar` y `front.rar` que no están en git **probablemente contienen `.env` y `google-credentials.json`**: no los subas ni los compartas.
4. Revisa los secretos de Google (client secret y refresh token). No aparecen en git, pero si alguna vez los compartiste, rótalos.

### C2. `/api/auth/register` es público y permite crear un DIRECTOR
`back/src/modules/auth/auth.routes.ts:32` no exige autenticación, y `auth.schema.ts:24` acepta `role: 'SCHOOL_ADMIN'`. Cualquier persona que conozca el `schoolId` de un colegio (un UUID que viaja en el JWT y en las respuestas) puede crearse una cuenta de director y ver o modificar notas, pagos y datos de los menores.

**Acción:** elimina la ruta, o protégela con `authMiddleware + authorizeRoles('SUPER_ADMIN')`. La creación de usuarios ya existe en `POST /api/users`, que sí está protegida.

### C3. Los documentos de alumnos quedan públicos en internet
- `google-drive.service.ts:150-160` pone **cada archivo** subido con permiso `anyone / reader`, es decir, público para cualquiera que tenga el enlace. Esto incluye **tareas entregadas por menores**. Los enlaces se pueden reenviar, indexar o filtrar.
- `app.ts:44` sirve `/uploads` como estático **sin autenticación**.

**Acción:** quita el permiso público. Sirve los archivos a través del backend con un endpoint `GET /api/files/:id` que verifique el JWT y la pertenencia al colegio, y que haga *stream* desde Drive (`files.get({ alt: 'media' })`). Elimina el `express.static('/uploads')`.

### C4. El build de producción usa `prisma db push` y las migraciones no están en git
- `package.json` → `render-build: prisma generate && prisma db push && tsc`. `db push` no es seguro en producción: ante cambios destructivos falla o, con `--accept-data-loss`, **borra columnas con datos**.
- `back/.gitignore` ignora `prisma/migrations/`, así que Render nunca recibe tu historial de migraciones.

**Acción:** saca `prisma/migrations/` del `.gitignore`, versiona las 4 migraciones existentes y cambia el build a `prisma generate && prisma migrate deploy && tsc`.

### C5. No hay respaldos automáticos
`scripts/backup-db.ts` es manual y solo funciona en Windows (busca `pg_dump.exe`). Si se corrompe la base de datos, se pierden notas oficiales y pagos.

**Acción:** revisa qué respaldos o recuperación a un punto en el tiempo incluye tu plan de Postgres en Render. Además, programa un **Cron Job semanal** que haga `pg_dump` y suba el archivo a tu Drive (ya tienes el código; solo falta adaptarlo a Linux). Prueba al menos una restauración antes de salir a producción.

---

## 2. Seguridad — hallazgos altos y medios

| # | Severidad | Hallazgo | Ubicación | Acción |
|---|---|---|---|---|
| H1 | Alta | **Falta `trust proxy`.** En Render, todas las peticiones llegan desde el proxy, así que el *rate limiter* ve una sola IP para todos. Con 300 peticiones cada 15 min, **un solo colegio se bloquearía a sí mismo** en minutos. | `app.ts` | `app.set('trust proxy', 1)`. Para la API autenticada, limita por `userId` en lugar de por IP (un colegio entero sale por una sola IP de su WiFi). |
| H2 | Alta | CORS abierto: `cors()` acepta cualquier origen. | `app.ts:41` | `cors({ origin: ['https://tudominio.pe', 'https://app.tudominio.pe'] })` |
| H3 | Alta | La contraseña inicial de alumnos y padres es su **DNI**, y el usuario también es el DNI. El DNI es un dato fácil de conseguir. El límite de login es 100 intentos (el comentario dice 10), no hay bloqueo de cuenta y el mínimo de contraseña es 6 caracteres. | `auth.service.ts:42-48, 96-101`, `rate-limiter.middleware.ts:9` | Genera una contraseña temporal aleatoria (o un código de activación entregado por el colegio), baja el límite a 10 intentos, bloquea la cuenta tras 5 fallos y exige 8 caracteres como mínimo. |
| H4 | Alta | El JWT dura **7 días**, se guarda en `localStorage` y no se puede revocar. Un usuario **desactivado sigue entrando** hasta que su token vence, porque `authMiddleware` no revisa `isActive`. | `jwt.util.ts`, `auth.middleware.ts` | Token de 8–12 h y verificación de `isActive` (puedes cachearla 60 s). A futuro: refresh token en cookie `httpOnly`. |
| H5 | Alta | `change-password` permite cambiar la clave **sin la contraseña actual** (`currentPassword` es opcional). Con un token robado se secuestra la cuenta. | `auth.schema.ts:9` | Exigir la contraseña actual, salvo cuando `mustChangePassword` sea verdadero. |
| H6 | Alta | El login de alumnos busca por DNI **en todos los colegios** (`findFirst`). Si dos colegios tienen al mismo alumno (por traslado), entra al registro equivocado. `User.documentId` tampoco es único. | `auth.repository.ts:17,41` | Login por código SIAGIE o correo, o pedir el código del colegio. Agregar `@@unique([schoolId, documentId])` en `User`. |
| H7 | Alta | **Subida de archivos:** cualquier rol (incluidos alumnos) puede subir 30 MB sin límite de cantidad; solo se valida la extensión (no el contenido real); y si Drive falla, el archivo se guarda en el disco de Render, que **se borra en cada deploy**. | `upload.routes.ts` | Restringir por rol, poner una cuota por usuario y día, validar el tipo real con *magic bytes* y **quitar el respaldo local** (mejor devolver un error que perder el archivo). |
| H8 | Alta | **Montos de dinero en `Float`** (`amountDue`, `amountPaid`). Produce errores de redondeo (0.1 + 0.2 ≠ 0.3) y es incompatible con la facturación electrónica futura. | `schema.prisma:356,374` | Migrar a `Decimal @db.Decimal(10,2)` (ya lo usas en `customPensionAmount`). |
| H9 | Alta | **Dependencias vulnerables:** front 25 (15 altas: `xlsx`, `axios`, `react-router`, `follow-redirects`); back 8 (3 altas: `multer`, `body-parser`, `zod`). `xlsx@0.18.5` **no tiene parche en npm**. | `package.json` | `pnpm update` y eliminar `xlsx` (ya tienes `exceljs`, que hace lo mismo). |
| H10 | Media | **Acceso indebido dentro del colegio (IDOR):** un padre puede ver cualquier obligación o recibo de su colegio si conoce el id, porque no se verifica que sea de su hijo. | `payment.controller.ts:34,102` | Si `role === 'PARENT'`, validar el vínculo en `FamilyRelationship`. |
| M1 | Media | Inyección de HTML en los correos: nombres y conceptos se insertan sin escapar. | `notification.util.ts` | Escapar `& < > " '`. |
| M2 | Media | **No hay bitácora de auditoría** (quién cambió qué nota y cuándo). Para actas oficiales y reclamos de padres es indispensable. | — | Tabla `AuditLog(userId, action, entity, entityId, before, after, ip, at)` en notas, pagos y matrículas. |
| M3 | Media | El manejador de errores devuelve `prismaError.meta` al cliente (nombres internos de columnas). | `error-handler.middleware.ts:76` | No enviar `meta`. |
| M4 | Media | 85 `findMany` y solo 17 con `take:`. Para un colegio no es grave, pero listados como asistencia o notificaciones crecerán sin límite. | módulos | Paginar los listados. |
| M5 | Baja | El cron de auto-cierre compara el minuto exacto: si el servidor se reinicia en ese minuto, ese día no se ejecuta. Tampoco considera feriados. | `attendance.cron.ts` | Usar `>= hora` y la bandera "ya cerrado hoy"; agregar una tabla de feriados. |
| M6 | Baja | La ruta `DELETE` de transacciones queda abierta y el modelo `GradingScale` existe, pero no se usa (las escalas están fijas en el código). | `siagie-consolidator.service.ts:268` | Usar `GradingScale` por colegio. |

---

## 3. Almacenamiento (Google Drive 5 TB) y correo (Nodemailer)

### Google Drive — **verificado: sí guarda en tu Drive personal**
`google-drive.service.ts` usa OAuth2 con `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN` (tu cuenta de 5 TB) y sube por *stream* a la carpeta `GOOGLE_DRIVE_FOLDER_ID` (o autodescubre "SaaSchool"). Con 5 TB tienes espacio de sobra para varios colegios. **No necesitas cambiarlo ahora**, pero hay que corregir lo siguiente:

1. **Riesgo operativo n.º 1:** si tu app OAuth de Google Cloud está en estado **"Testing"**, el *refresh token* **vence a los 7 días** y todas las subidas empezarán a fallar en silencio (y caerán al disco efímero, ver H7). En Google Cloud Console → *OAuth consent screen* → **Publish app** ("In production"). Como solo la usas tú, no necesitas verificación.
2. Permiso público en cada archivo (C3).
3. Cuando se borra un contenido o una tarea, el archivo **sigue en Drive** (no hay `files.delete`). Esto deja archivos huérfanos y datos de menores retenidos sin motivo.
4. Organiza por carpeta `/<colegio>/<año>/<curso>` para poder borrar o exportar por colegio cuando uno se dé de baja (derecho de cancelación).
5. Ten en cuenta que usas una cuenta personal para un negocio. Funciona, pero si Google suspende esa cuenta pierdes todo. Mantén el respaldo de la base de datos **fuera** de esa misma cuenta, o al menos en otra carpeta con acceso separado.

### Nodemailer — **verificado: funciona con Gmail (`service: 'gmail'`, contraseña de aplicación)**
1. **Render bloquea SMTP en el plan gratuito** (puertos 25, 465 y 587 desde septiembre de 2025). Tu `render.yaml` dice `plan: free`: **cámbialo a `plan: starter`** o los correos no saldrán. Con el plan de US$ 7, los puertos 465 y 587 funcionan.
2. Un Gmail personal tiene un límite de ~500 destinatarios al día. Si envías recordatorios de pago masivos a un colegio de 400 familias, te quedas sin cuota y Google puede bloquear la cuenta por spam.
3. **Recomendación sin costo, manteniendo Nodemailer:** cuando compres el dominio, usa el SMTP gratuito de **Brevo** (300 correos al día) o **Resend** (3 000 al mes), con remitente `notificaciones@tudominio.pe` y SPF/DKIM configurados. Solo cambias el `createTransport` (host/puerto/usuario) y la entregabilidad mejora mucho.
4. Envía los correos masivos en cola o en lotes con pausa, no en un `Promise.all`.

---

## 4. Frontend: rendimiento, UX y diseño

| Hallazgo | Detalle | Acción |
|---|---|---|
| **Bundle de 3,3 MB (895 KB gzip) en un solo archivo** | Todas las páginas se importan de forma estática en `router/index.tsx`, incluidas 2 librerías de Excel. Un padre con datos móviles descarga los módulos de director, SIAGIE y reportes solo para ver la libreta de su hijo. | `React.lazy()` por ruta; `import('exceljs')` dinámico solo al exportar; eliminar `xlsx`. Objetivo: < 250 KB gzip en la carga inicial. |
| Favicon roto | `index.html` apunta a `/vite.svg`, que no existe (el archivo es `favicon.svg`). Título genérico. | Corregir; agregar `<meta name="description">`, Open Graph y `theme-color`. |
| Falta un PWA real | Hay `sw.js` para push, pero no hay `manifest.webmanifest`. En iPhone, el push web **solo funciona si la app está instalada** en la pantalla de inicio. | Agregar el manifest con íconos de 192 y 512 px. Es clave para que los padres usen la app. |
| Accesibilidad | Solo hay 13 atributos `aria-*`/`alt` en ~47 000 líneas. | Etiquetas en formularios, foco visible, contraste AA y navegación por teclado en las tablas de notas y asistencia. |
| Archivos gigantes | `reportExcelExport.ts` (1 922 líneas), `GradesMatrixGrid.tsx` (1 326), `SiagieConsolidatedModal.tsx` (1 247)… | Dividirlos en partes más pequeñas; la mantenibilidad sufre. |
| Sesión | Token en `localStorage` (vulnerable si algún día hay XSS). | Ver H4. |
| **Diseño** | Usa la paleta por defecto de shadcn/ui (azul `221 83% 53%`, grises slate). Es correcto y limpio, pero **idéntico a miles de SaaS**: no es "novedoso". | Define una identidad propia: color de marca, tipografía con carácter (p. ej. *Plus Jakarta Sans* o *Outfit*), ilustraciones o íconos educativos, una vista de padre tipo "app móvil" (tarjetas por hijo, semáforo de asistencia y deuda, línea de tiempo) y personalización por colegio (logo y color primario desde `School.logoUrl`). Ahí está tu diferenciación de venta. |
| Pruebas | 0 tests en back y front. | Como mínimo, tests de `siagie-consolidator` (reglas de promoción y conversión) y de auth y permisos. Son las partes donde un error genera un reclamo o un problema legal. |

---

## 5. Cumplimiento normativo (Perú)

### 5.1 Protección de datos personales — Ley 29733 y su nuevo Reglamento (D.S. 016-2024-JUS, vigente desde el 30/03/2025) 🔴
Tratas datos de **menores de edad** y **datos sensibles** (discapacidad `hasDisability/disabilityType`, atenciones de tópico en incidencias, conducta). Hoy el sistema **no tiene** ningún elemento de cumplimiento.

| Obligación | Estado | Qué hacer |
|---|---|---|
| Política de privacidad y términos de uso | ❌ No existen | Publicarlos y mostrar aceptación en el primer login (guardar fecha, versión e IP). |
| Consentimiento del padre o tutor para datos del menor y datos sensibles | ❌ | Casilla de consentimiento expreso en la matrícula o el primer acceso del apoderado. Guardarlo en una tabla `Consent`. |
| **Contrato de encargo de tratamiento** colegio ↔ tú | ❌ | El colegio es el *responsable* y tú eres el *encargado*. Necesitas un contrato que lo diga (confidencialidad, medidas de seguridad, borrado al terminar). |
| Transferencia internacional (Render y Google están en EE. UU.) | ❌ | Declararla en la política y en el contrato. El colegio la informa al inscribir su banco de datos ante la ANPD. |
| Notificar incidentes de seguridad en **48 h** a la ANPD y a los afectados | ❌ | Procedimiento escrito y logs suficientes para saber qué se filtró (ver M2). |
| Oficial de datos personales | ❌ | El nuevo reglamento lo extiende al sector privado. Confirma con un abogado si aplica a ti o al colegio por el volumen de datos sensibles. |
| Derechos ARCO (acceso, rectificación, cancelación, oposición) | Parcial | Exportar los datos de un alumno o familia y borrarlos o anonimizarlos al dar de baja a un colegio. |
| Medidas de seguridad | Parcial | Las secciones 1 y 2 de este informe **son** tus medidas de seguridad. Documéntalas. |

### 5.2 Pensiones y morosidad — Ley 27665 / Código del Consumidor 🔴
`School.blockGradesOnOverdue` permite **bloquear la libreta de notas a familias morosas** (`grade.service.ts:175`). La normativa de protección a la economía familiar **prohíbe condicionar la evaluación del alumno al pago de pensiones**, e Indecopi ha sancionado a colegios por restringir el acceso a la información académica. La ley solo permite retener **certificados** de los periodos no pagados.  
**Acción:** quita la función o reemplázala por "retener solo la emisión de certificados y constancias oficiales". Muestra la deuda como aviso, nunca como bloqueo de notas. Consúltalo con un abogado: es el tipo de función que un competidor o un padre denuncia.

### 5.3 SUNAT (antes de la facturación electrónica) 🟡
- Bien: el recibo por defecto es `RECIBO_INTERNO`. Pero `receiptType` acepta cualquier texto, incluido `BOLETA` o `FACTURA` (`schema.prisma:378`). Emitir algo llamado "boleta" que no fue enviado a SUNAT es un riesgo **para el colegio**.
- **Acción:** usa un enum `RECIBO_INTERNO` y agrega al PDF la leyenda *"Documento interno de control. No es comprobante de pago"*. Recuerda al colegio que debe seguir emitiendo su boleta electrónica por su cuenta.
- Para la futura integración con un OSE/PSE: migra el dinero a `Decimal` (H8), agrega datos del adquirente (tipo y número de documento del responsable financiero; `isFinancialResponsible` ya existe), series y correlativos por tipo y estado de envío.

### 5.4 Evaluación — CNEB / RVM N.° 094-2020-MINEDU (y sus modificatorias) 🟡
- Bien: la escala literal AD/A/B/C, la promoción automática en Inicial y 1.° de Primaria, el modo de cálculo anual `LAST_PERIOD` (último periodo), las conclusiones descriptivas por competencia, la exoneración (EXO), el cierre de actas por periodo y las competencias transversales.
- ⚠️ **La regla de situación final está simplificada** (`siagie-consolidator.service.ts:730-756`):
  - **Una sola competencia en "C" en cualquier área envía al alumno a RECUPERACIÓN** (`totalCCompetences >= 1`). Es mucho más estricto que la norma, que usa umbrales por área y por nivel. Esto generaría reclamos inmediatos de los padres.
  - Usa `cCount > totalComp / 2` ("más de la mitad"). La norma maneja condiciones de "la mitad o más" y reglas distintas para Primaria (2.°–6.°) y Secundaria, además de considerar el resultado del programa de recuperación.
  - **Acción:** implementa las reglas por nivel y grado copiándolas literalmente de la versión vigente de la norma (revisa en gob.pe si hubo modificatorias para 2026), cúbrelas con tests y que un docente o director del colegio piloto las valide con casos reales del año anterior.
- La conversión numérica → literal (17.5/13.5/10.5) está fija en el código. Úsala desde `GradingScale` por colegio, porque cada colegio decide su equivalencia interna.

### 5.5 SIAGIE 🟡
- SIAGIE **no tiene una API pública**: la integración real consiste en exportar en el **formato exacto de las plantillas** que el colegio descarga del propio SIAGIE. Debes obtener las plantillas vigentes del colegio piloto y validar columna por columna el Excel que genera `SiagieConsolidatedModal`.
- El código de estudiante SIAGIE es de 14 dígitos, pero la validación acepta de 8 a 14 (`student.schema.ts:63`). Ajústalo, permitiendo que esté vacío para alumnos que todavía no lo tienen.
- Bien: nombres y apellidos separados, tipo de documento (incluido el código temporal), ubigeo INEI de 6 dígitos, lengua materna, discapacidad, condición de matrícula (ingresante, continuo, traslado, reentrante), código modular y de local.
- Matrícula: revisa los requisitos de la norma de matrícula vigente (RM 447-2020-MINEDU y modificatorias). Por ejemplo, **no se puede condicionar la matrícula a cuotas extraordinarias**; tenlo en cuenta en el módulo de pagos.

### 5.6 Convivencia escolar 🟡
El módulo de incidencias puede servir como el **Libro de Registro de Incidencias** que exigen los lineamientos de convivencia escolar (D.S. 004-2018-MINEDU), lo que es un buen argumento de venta. Pero para casos de violencia escolar (Ley 29719 antibullying) el colegio **debe reportarlos en el portal SíseVe**. Agrega a `StudentIncident` los campos `isViolenceCase`, `siseveCode` y `siseveReportedAt`, y una alerta si un caso de violencia no tiene código SíseVe.

### 5.7 Para tu propio negocio
- Contrato de servicio con el colegio: SLA, precio, plazo, propiedad de los datos, exportación y borrado al terminar, y limitación de responsabilidad.
- Si vendes desde una web pública, evalúa el Libro de Reclamaciones virtual. También puede ser un módulo vendible para los colegios, que están obligados a tenerlo.
- Conviene estar formalizado (RUC) para emitir tus propias facturas a los colegios.

---

## 6. Despliegue y costos

### Presupuesto que planteaste
| Concepto | Costo mensual |
|---|---|
| Render Web Service **Starter** (512 MB, siempre encendido) | US$ 7,00 |
| Render Postgres **Basic-256mb** | US$ 6,00 |
| Almacenamiento de Postgres (~US$ 0,30/GB; ~5 GB) | ~US$ 1,50 |
| Vercel Pro | US$ 20,00 |
| Dominio (US$ 10–15 al año) | ~US$ 1,00 |
| Google Drive 5 TB / Gmail | ya lo pagas |
| **Total** | **~US$ 35,50 / mes** |

### Recomendación: ahorra US$ 20 al mes
Tu frontend es un sitio **estático** (Vite → `dist/`). No usa SSR ni funciones serverless de Vercel, así que pagar Vercel Pro no aporta nada. Vercel Hobby no permite uso comercial, pero estas alternativas **sí lo permiten y son gratuitas**:
- **Cloudflare Pages** (gratis, CDN global, uso comercial permitido, dominio propio y SSL), **o**
- **Render Static Site** (gratis, todo en un mismo panel).

**Total optimizado: ~US$ 15,50 al mes.** Pasa a Vercel Pro solo cuando necesites algo que realmente ofrezca.

### Notas de despliegue
- `render.yaml`: cambia `plan: free` → `plan: starter` (obligatorio por el SMTP y para que el servidor no se duerma), quita las claves VAPID (C1) y agrega `FRONTEND_URL` para CORS. Agrega también la base de datos al blueprint con la misma región que el backend (Oregon u Ohio; elige la misma para ambos).
- Usa `prisma migrate deploy` (C4).
- Con 256 MB, Postgres tiene **pocas conexiones**. Agrega `?connection_limit=5` a `DATABASE_URL` para Prisma.
- 512 MB de RAM en el backend alcanzan para 1–3 colegios. Las exportaciones Excel grandes se hacen en el frontend, lo cual ayuda.
- Dominio: un `.com` cuesta ~US$ 10–12 al año. Un `.pe` o `.edu.pe` transmite más confianza en Perú, pero cuesta más (consulta en punto.pe). Usa `app.tudominio` para el front y `api.tudominio` para el backend (Render permite dominio propio gratis).
- Monitoreo gratuito: **UptimeRobot** o **Better Stack** para `/health`, y **Sentry** (plan gratuito) para errores del backend y del frontend. Hoy, si algo falla en producción, no te enteras.

---

## 7. Plan de acción priorizado

### Fase 0 — Antes de entregar al primer colegio (1–2 semanas)
1. Repositorio privado y rotación de VAPID (C1).
2. Eliminar o proteger `/auth/register` (C2).
3. Archivos privados, proxy de descarga, quitar `/uploads` estático y publicar la app OAuth en "Production" (C3, sección 3).
4. `migrate deploy` y migraciones versionadas (C4).
5. Respaldo automático semanal y una prueba de restauración (C5).
6. `trust proxy`, CORS restringido, `isActive` en el middleware, JWT de 12 h, contraseña actual obligatoria y contraseñas temporales aleatorias (H1–H5).
7. Quitar el bloqueo de libretas por deuda (5.2).
8. Corregir las reglas de situación final con tests y validarlas con el colegio (5.4).
9. Política de privacidad, términos, consentimiento y contrato de encargo (5.1).
10. `render.yaml` en `starter`, front en Cloudflare Pages y monitoreo con Sentry y UptimeRobot.

### Fase 1 — Primer mes de operación
- Dinero en `Decimal` (H8), actualizar dependencias y eliminar `xlsx` (H9), IDOR de pagos (H10).
- Bitácora de auditoría (M2).
- Code splitting del frontend, manifest PWA y favicon.
- SMTP con dominio propio (Brevo/Resend) y SPF/DKIM.
- Plantillas SIAGIE validadas y campos de SíseVe.

### Fase 2 — Antes del segundo colegio y de la facturación electrónica
- Identidad visual propia y vista de padres "mobile-first".
- Tests de los módulos críticos (notas, asistencia, pagos, auth).
- Carpetas de Drive por colegio, borrado de archivos huérfanos y exportación y baja de colegio (ARCO).
- Integración con OSE/PSE para boletas electrónicas.
- Paginación, feriados en asistencia y `GradingScale` configurable.

---

## Fuentes consultadas
- Render — bloqueo de SMTP en el plan gratuito: https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
- Render — precios: https://render.com/pricing
- Nuevo Reglamento de la Ley 29733 (D.S. 016-2024-JUS): https://elperuano.pe/noticia/258993-proteccion-de-datos-personales-ejecutivo-aprueba-nuevo-reglamento-de-la-ley-n-29733 · https://cms.law/en/per/publication/nuevo-reglamento-de-proteccion-de-datos-personales
