# Reporte de Cambios — Sistema de Asistencia Escolar y Salida

**Rama:** `asistencia/mejoras`  
**Fecha:** 10 de noviembre de 2026  
**Entorno de pruebas:** Node 24 / PostgreSQL / Vite 5 / Vitest 5  

---

## 1. Resumen Ejecutivo

Se implementó con éxito la modernización integral del módulo de asistencia escolar para SaaSchool (B2B SaaS Multi-Tenant escolar para Perú). El sistema cubre el flujo completo de vida escolar:
- Cierre configurable de asistencia por nivel educativo (`INITIAL`, `PRIMARY`, `SECONDARY`).
- Detección automática de feriados escolares y exclusión de fines de semana en días lectivos.
- Notificaciones multicanal a familias por inasistencia no registrada con enlaces profundos para justificación directa.
- Módulo de justificaciones en línea con flujo para padres y panel de revisión con auditoría para secretaría/dirección.
- Escáner QR tolerante a fallos y con capacidad offline (almacenamiento en IndexedDB y sincronización en lote al recuperar conexión).
- Motor de alertas tempranas de ausentismo con periodicidad configurable por colegio (faltas consecutivas, porcentaje mensual y tardanzas reiteradas).
- Registro de salida escolar y gestión de personas autorizadas a recoger estudiantes con validación según nivel educativo.
- Asistencia por curso (hora pedagógica) como registro interno del docente con resumen mensual e integración referencial con el parte diario.
- Configuración institucional de umbrales y avisos en los ajustes del colegio.

---

## 2. Estado Consolidado por Bloque

| Bloque | Nombre | Estado | Notas |
|---|---|:---:|---|
| **Bloque 0** | Preparación y rama de trabajo | ✅ | Verificada rama base limpia y creada `asistencia/mejoras`. |
| **Bloque 1** | Esquema de base de datos | ✅ | Migración Prisma aplicada: `AttendanceJustification`, `AttendanceAlert`, `AuthorizedPickup`, `CourseAttendanceSession`, `CourseAttendanceRecord`, `AttendanceScheduleConfig`, y campos en `School` y `Attendance`. |
| **Bloque 2** | Reglas puras y pruebas unitarias | ✅ | Suite Vitest con 12 pruebas unitarias puras (`daysBetween`, `expandSchoolDays`, `formatAttendanceStatusPeru`, `buildCheckoutMessage`, `evaluateAttendanceRisk`). |
| **Bloque 3** | Cierre por nivel y correcciones del escáner | ✅ | Horarios por nivel (`INITIAL`, `PRIMARY`, `SECONDARY`), cron de auto-cierre, bypass de feriados y corrección de llegada tardía tras cierre (`AUTO_CLOSE` a `LATE_UNJUSTIFIED`). |
| **Bloque 4** | Aviso de inasistencia a las familias | ✅ | Notificaciones automáticas a apoderados tras el cierre si el colegio tiene activo `notifyAbsencesToFamilies`, con deep link `justify=`. |
| **Bloque 5** | Justificaciones en línea (Backend) | ✅ | Endpoints `GET`, `POST /justifications`, `PATCH /justifications/:id/review` con reglas de rango (máx. 15 días, hasta 30 días atrás), control de roles y bitácora de auditoría. |
| **Bloque 6** | Justificaciones en línea (Frontend) | ✅ | Vista de apoderados con botón "Justificar", modal con carga de comprobantes, y vista de secretaría `/attendance-justifications` con tabs, filtros y aprobación/rechazo. |
| **Bloque 7** | Escáner sin internet (Offline) | ✅ | Cola en IndexedDB (`idb-keyval`), descarga de padrón en memoria, endpoints `/scan/batch` y `/scan-roster`, ampliación de rate limit a 3000 req/15min y UI offline con badges. |
| **Bloque 8** | Alerta temprana de ausentismo | ✅ | Evaluación diaria sin duplicidad (`evaluateRiskForSchoolOncePerDay`), 3 reglas de riesgo (consecutivas, porcentaje 30 días, tardanzas), endpoints y página `/attendance-alerts` con citación a familia. |
| **Bloque 9** | Registro de salida y personas autorizadas | ✅ | Módulo `pickups`, endpoints `/checkout/preview` y `/checkout`, regla estricta (solo Secundaria sale por su cuenta), modal de entrega con fotos, sección en ficha del alumno y vista de padres. |
| **Bloque 10** | Asistencia por curso (docente) | ✅ | Módulo `course-attendance` (`/session`, `/summary`), vista `/course-attendance` con selector por hora, control segmentado P/T/F, advertencia legal SIAGIE y resumen mensual. |
| **Bloque 11** | Configuración del colegio | ✅ | Campos en `school.schema.ts`, tipos en front y sección "Asistencia" en `SchoolSettingsModal.tsx` con toggle y umbrales numéricos. |
| **Bloque 12** | Pruebas de integración manuales | ✅ | Servidor levantado en puerto 3999; las 11 pruebas de integración superadas al 100% y limpieza completa de la base de datos. |
| **Bloque 13** | Verificación final y reporte | ✅ | Backend compila (`tsc --noEmit`), 28 tests pasan (100%), frontend compila y construye (`vite build`) con chunk de entrada de 55.51 kB gzip (límite 300 kB). |

---

## 3. Resultados Detallados de las Pruebas de Integración (Bloque 12)

Ejecutadas con `scripts/run-bloque12-tests.ts` contra la base de datos PostgreSQL local:

| N.° | Prueba | Estado | Duración | Detalle |
|:---:|---|:---:|:---:|---|
| **1** | Cierre por nivel | ✅ PASS | 44 ms | Se crearon 28 faltas automáticas exclusivamente en aulas de `SECONDARY` sin afectar `INITIAL` ni `PRIMARY`. |
| **2** | Feriado en cierre | ✅ PASS | 8 ms | `POST /attendance/close` con fecha feriada retornó HTTP 400 informando que la fecha está registrada como feriado escolar. |
| **3** | Llegada tardía tras el cierre | ✅ PASS | 20 ms | El escaneo de un alumno con falta previa `AUTO_CLOSE` retornó `alreadyRegistered: false` y actualizó el estado a `LATE_UNJUSTIFIED`. |
| **4** | Aviso de inasistencia a familias | ✅ PASS | 2 ms | Se generó notificación al apoderado con título "Inasistencia registrada" y link con parámetros `justify={enrollmentId}&date={fecha}`. |
| **5** | Flujo completo de justificación | ✅ PASS | 32 ms | Padre ajeno: HTTP 403; Padre legítimo: HTTP 201 (`PENDING`); Secretaría aprueba: HTTP 200 y asistencia actualizada a `ABSENT_JUSTIFIED`; Intento de re-aprobación: HTTP 409. |
| **6** | Validación de rango de fechas | ✅ PASS | 20 ms | Solicitud de 20 días calendario (> 15 días) y solicitud con fecha de 40 días atrás (> 30 días) rechazadas con HTTP 400. |
| **7** | Escaneo offline por lotes (`/scan/batch`) | ✅ PASS | 19 ms | Lote procesado: código válido `ok: true`, código inexistente `ok: false` (HTTP 404), escaneo con fecha futura `ok: false` (HTTP 422). |
| **8** | Límite de tasa del escáner (700 peticiones) | ✅ PASS | 1,262 ms | 700 llamadas continuas a `/attendance/scan` con el mismo usuario sin recibir ningún código HTTP 429 (límite configurado en 3,000/15min). |
| **9** | Alerta temprana de ausentismo | ✅ PASS | 92 ms | Tras 3 faltas injustificadas: `POST /attendance/alerts/evaluate` creó la alerta; una segunda llamada el mismo día no duplicó (`created: 0`); `PATCH /alerts/:id/attend` retornó HTTP 200. |
| **10** | Registro de salida y personas autorizadas | ✅ PASS | 35 ms | Alumno de Primaria intentando salir por su cuenta (`SELF`): HTTP 422; Con persona autorizada registrada: HTTP 200 y notificación enviada al padre; Segunda salida: HTTP 409. |
| **11** | Asistencia por curso y permisos de docente | ✅ PASS | 24 ms | Docente asignado al curso guardó sesión (HTTP 200); Otro docente intentando guardar en curso ajeno fue rechazado con HTTP 403. |

**Resultado consolidado:** 11/11 pruebas superadas (100%).

---

## 4. Desviaciones Respecto al Documento Original y Soluciones Adoptadas

1. **Estado activo en el modelo `Enrollment`:**
   - *Original:* Asumía `enrollment.status === 'ACTIVE'`.
   - *Realidad del esquema:* El modelo Prisma utiliza el campo booleano `isActive: Boolean @default(true)`.
   - *Solución:* Todas las consultas a matrículas activas utilizan `where: { isActive: true, academicYear: { isActive: true } }`.

2. **Nombre del modelo de relación familiar en Prisma:**
   - *Original:* Mencionaba `prisma.familyRelation`.
   - *Realidad del esquema:* El modelo Prisma es `FamilyRelationship` (accesible en el cliente como `prisma.familyRelationship`) y la propiedad relacional en el modelo `Student` es `student.familyRelations`.
   - *Solución:* Se unificaron las consultas hacia `prisma.familyRelationship` y las inclusiones en consultas de estudiantes como `familyRelations`.

3. **Estructura del lote offline (`/scan/batch`):**
   - *Detalle:* Para garantizar idempotencia y correlación en el cliente, cada ítem del lote requiere `clientId` (identificador único generado en el cliente) además de `code` y `scannedAt`.
   - *Solución:* Se integró `clientId: z.string()` tanto en el esquema backend como en el almacén IndexedDB del cliente.

4. **Campos del modelo `AuthorizedPickup`:**
   - *Detalle:* El campo de contacto se denomina `cellphone` y el modelo exige `createdById` para trazabilidad de quién autorizó el recojo.
   - *Solución:* Se incluyó `createdById` tanto en el esquema de creación como en las mutaciones y consultas.

5. **Identificación de registros sincronizados sin conexión:**
   - *Detalle:* Al sincronizar asistencias tomadas sin internet, el sistema preserva la hora real registrada por el escáner y añade `[sincronizado sin conexión]` en las notas de asistencia para facilitar la trazabilidad administrativa sin alterar la puntualidad del alumno.

---

## 5. Verificación de Rendimiento y Empaquetado

- **Backend:**
  - TypeScript: `pnpm.cmd -C back exec tsc --noEmit` completado con 0 errores.
  - Tests unitarios: 2 archivos, 28 pruebas ejecutadas y aprobadas en 148 ms.
- **Frontend:**
  - TypeScript: `pnpm.cmd -C front exec tsc --noEmit` completado con 0 errores.
  - Build de producción: `pnpm.cmd -C front exec vite build` generado en 9.51 s.
  - **Tamaño del chunk de entrada principal (`index-*.js`):** **198.65 kB** (comprimido **55.51 kB gzip**), muy por debajo del presupuesto máximo establecido de **300 kB gzip**.

---

## 6. Recomendaciones para Pase a Producción

1. **Revisión de umbrales con el colegio piloto:**
   - Validar si los valores por defecto (3 faltas injustificadas consecutivas, 15 % mensual, 5 tardanzas en 30 días) son adecuados para el reglamento interno de la institución educativa piloto.
2. **Capacitación sobre el escáner sin conexión:**
   - El personal de portería debe descargar el padrón al inicio de la jornada mientras cuenta con red; los registros quedarán seguros en el almacenamiento local del dispositivo y se enviarán automáticamente tan pronto se recupere la conexión.
3. **Instalación PWA para familias:**
   - Para recibir notificaciones push en dispositivos iOS, los apoderados deben añadir el acceso directo a la pantalla de inicio ("Instalar aplicación").

---

*La rama `asistencia/mejoras` se encuentra completamente verificada, con el árbol de trabajo limpio y lista para revisión y merge hacia `main`.*
