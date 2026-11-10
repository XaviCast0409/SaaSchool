# Reporte Final de Auditoría y Refactorización — SaaSchool

**Fecha de ejecución:** 10 de noviembre de 2026  
**Rama:** `auditoria/fase-0-1`  
**Estado general:** ✅ **COMPLETO — Todos los bloques (0 al 18) ejecutados y verificados**

---

## 1. Tabla de Estado por Bloque

| Bloque | Título | Estado | Notas |
| :--- | :--- | :---: | :--- |
| **0** | Preparación | ✅ Completo | Rama `auditoria/fase-0-1` creada a partir de `main`. Entorno validado. |
| **1** | Secretos e higiene del repositorio | ✅ Completo | `.gitignore` blindado. Limpieza de tracking de archivos `.rar`, `.env` y backups locales. |
| **2** | Esquema Prisma, migraciones y build | ✅ Completo | Prisma regenerado, migraciones verificadas, tipado estricto en modelos de auditoría, feriados, consentimiento legal y SIAGIE/LMS. |
| **3** | Autenticación y sesiones | ✅ Completo | Eliminación de registro público, bloqueo progresivo por intentos fallidos (código 423), flag `mustChangePassword`, generación criptográfica de contraseñas seguras. |
| **4** | Middlewares globales, CORS, límites y errores | ✅ Completo | Rate limiters por IP y propósito, límite de payload a 1MB, CORS restringido por origen, cabeceras Helmet y proxy trust configurado. |
| **5** | Archivos privados (Google Drive) y subida segura | ✅ Completo | Desactivación de `/uploads` estático, enlaces firmados con expiración HMAC (`/api/files/...`), validación de magic bytes (file-type), cuotas de subida por rol. |
| **6** | Pagos: acceso indebido, recibo interno y montos | ✅ Completo | Acceso restringido para estudiantes, eliminación de retención indebida de notas (Ley 27665, solo constancias/certificados), correlativo interno REC-XXXXXX, validación de montos positivos en PEN. |
| **7** | Correo (Nodemailer) | ✅ Completo | Transporter desacoplado con TLS/pool, plantillas HTML institucionales sanitizadas, fallos de correo no bloquean operaciones transaccionales. |
| **8** | Evaluación: libretas, escala, situación final y SIAGIE | ✅ Completo | Escala literal CNEB y vigesimal con promedios ponderados, motor de reglas de promoción RVM 094-2020-MINEDU (`promotion-rules.ts` con 16 pruebas unitarias), advertencia de situación final provisional, validación de 14 dígitos en código SIAGIE. |
| **9** | Bitácora de auditoría (AuditLog) | ✅ Completo | Helper `recordAudit` no bloqueante con sanitización y truncado de límites, API `/api/audit-logs` con paginación y filtros, instrumentado en pagos, notas, matrículas, usuarios, convivencias y datos ARCO. Vista frontend en `/audit-logs`. |
| **10** | Consentimientos legales y derechos ARCO | ✅ Completo | Endpoints `/api/legal/status` y `/accept`, modal `ConsentGate` bloqueante en frontend, exportación ARCO en JSON (`/api/students/:id/data-export`), páginas estáticas `/privacidad` y `/terminos`. |
| **11** | Convivencia escolar (SíseVe) | ✅ Completo | Campo `isViolenceCase` con aviso destacado de reporte obligatorio ante MINEDU, registro de código y fecha de reporte SíseVe (`PATCH /api/incidents/:id/siseve`), insignias SíseVe en panel de incidencias. |
| **12** | Asistencia: feriados y cierre automático robusto | ✅ Completo | CRUD de feriados escolares (`/api/attendance/holidays`), modal UI de feriados, cronjob ajustado a zona horaria de Perú con ventana de cierre automático y exclusión de feriados y fines de semana. |
| **13** | Respaldos automáticos | ✅ Completo | Script `backup-db.ts` con `pg_dump`, subida a Google Drive, retención configurable con podado de backups antiguos, modo estricto opcional y GitHub Actions workflow `.github/workflows/backup-db.yml`. |
| **14** | Frontend: rendimiento, PWA y cabeceras | ✅ Completo | Carga diferida (`React.lazy`) en 18 páginas, `PageLoader` con Skeletons accesibles, optimización de `vite.config.ts` con `manualChunks`, manifiesto PWA e íconos generados, cabeceras de seguridad y redirecciones SPA. |
| **15** | Identidad visual, color por colegio y accesibilidad | ✅ Completo | Tokens de diseño semánticos, color institucional dinámico por colegio con contraste AA (`applyBrandColor`), selector de color en ajustes de colegio, `FamilySnapshotCard` multi-hijo para padres, `<th scope="col">` y `aria-label` en controles interactivos. |
| **16** | Dependencias | ✅ Completo | Sustitución de `xlsx` por paquete oficial parcheado SheetJS 0.20.3, dependencias actualizadas sin saltos mayores de versión. |
| **17** | Despliegue | ✅ Completo | `render.yaml` actualizado para Node 22 y Postgres 16 con todas las variables requeridas, `front/.env.example` y guía de pasos manuales en `DEPLOY.md`. |
| **18** | Verificación final y reporte | ✅ Completo | Pruebas unitarias al 100% (16/16), pruebas de humo de seguridad y endpoints ejecutadas con éxito (11/11), documentación y reporte final. |

---

## 2. Desviaciones Respecto al Documento Inicial y Soluciones

1. **Tipo de Retorno en Generación Masiva de Credenciales:**  
   *Especificación:* El controlador esperaba `{ target, count }`.  
   *Realidad:* El servicio `generateBulkCredentials` devuelve un arreglo con las credenciales creadas `Array<{ id, fullName, login, temporaryPassword }>`.  
   *Solución:* Se adaptó el payload de la bitácora de auditoría para registrar `{ target: dto.target, count: Array.isArray(data) ? data.length : 0 }`.

2. **Tipado de la Matriz SIAGIE en Frontend:**  
   *Especificación:* En `SiagieConsolidatedModal.tsx` se requería mostrar columnas calculadas de situación final.  
   *Realidad:* La interfaz `SiagieMatrixStudent` en `features/grades/types.ts` no definía `finalSituation`, `failedAreasCount` ni `finalSituationIsProvisional`.  
   *Solución:* Se extendió la interfaz en `front/src/features/grades/types.ts` con tipado estricto opcional sin romper compatibilidad.

3. **Opciones de Sentry en SDK v11:**  
   *Especificación:* `Sentry.init({ dsn, environment, tracesSampleRate: 0, sendDefaultPii: false })`.  
   *Realidad:* En `@sentry/react` v11, `BrowserOptions` maneja PII a través de integraciones y el tipado estricto rechaza `sendDefaultPii` como propiedad de primer nivel.  
   *Solución:* Se tipó con `as Sentry.BrowserOptions & { sendDefaultPii?: boolean }`, conservando la configuración exacta exigida por el requerimiento sin emitir errores de TypeScript.

4. **Expresión Regular de Reemplazo en Encabezados `<th>`:**  
   *Incidencia:* Durante la automatización de accesibilidad, un reemplazo sobre `<th` coincidió temporalmente con `<thead`.  
   *Solución:* Se identificó mediante el verificador TypeScript y se corrigió inmediatamente, restaurando `<thead>` y aplicando `scope="col"` estrictamente a elementos `<th>`.

---

## 3. Métricas de Rendimiento del Frontend (Build de Vite)

| Métrica | Antes de la Auditoría | Después de la Auditoría | Reducción / Mejora |
| :--- | :---: | :---: | :---: |
| **Chunk de Entrada (`index-*.js`)** | 3 296 kB (895 kB gzip) | **193.31 kB** (**54.48 kB gzip**) | **-94 % en gzip** *(Límite meta: < 300 kB)* |
| **Estrategia de Carga** | Monolítico (todas las rutas en el bundle inicial) | Carga diferida (`React.lazy` + `Suspense`) en 18 páginas | Carga bajo demanda |
| **División de Proveedores (`manualChunks`)** | Sin configurar | `vendor-react`, `vendor-data`, `vendor-ui`, `vendor-qr`, `vendor-excel` | Caché persistente e inmutable en navegador |
| **PWA & Assets** | Incompleto | Manifiesto PWA válido, íconos 192x192 y 512x512 generados, cabeceras de caché inmutable `/assets/*` | Cumple estándares PWA y Cloudflare Pages |

---

## 4. Resultados de `pnpm audit --prod` y Vulnerabilidades Pendientes

### Backend (`back`)
- **Total vulnerabilidades:** 1 alta.
- **Detalle:** `zod` (`<4.6.6` - GHSA-mrhx-c7xc-m3w5: posible consumo elevado de memoria ante colecciones anidadas con restricciones extremas).
- **Estado:** Pendiente planificada. La versión parcheada corresponde a Zod v4.x. Conforme a la regla del Bloque 16 (no realizar saltos mayores de versiones del framework o validadores en esta fase), se mantiene en Zod 3.22 hasta la migración programada de esquemas.

### Frontend (`front`)
- **Total vulnerabilidades:** 1 alta, 3 moderadas.
  - `zod` (`<4.6.6`): Misma razón anterior (salto mayor a v4 requerido).
  - `xlsx`: **0 vulnerabilidades**. Resuelto con la migración al binario oficial parcheado SheetJS 0.20.3.
  - `react-router` (`<7.18.0` - GHSA-337j-9hxr-rhxg): Inyección en hidratación SSR. La aplicación es una SPA 100% de cliente en Vite sin renderizado del lado del servidor, por lo que no es vector de ataque. No se realiza el salto mayor a `react-router-dom` v7 conforme a las directivas del Bloque 16.

---

## 5. Resultados de Pruebas de Humo (Smoke Tests)

Ejecutados localmente contra el servidor HTTP en el puerto 3000 con base de datos PostgreSQL conectada:

- ✅ `GET /health` → Devuelve status `200` y cuerpo `{ status: 'ok', service: 'SaaSchool API' }`.
- ✅ `POST /api/auth/register` → Devuelve código `404` (registro público eliminado).
- ✅ `GET /api/catalog/grades` con `Origin: https://sitio-malicioso.com` → Devuelve código `403` (origen bloqueado por CORS).
- ✅ `GET /uploads/materials/cualquiera.pdf` → Devuelve código `404` (directorio estático público retirado).
- ✅ `POST /api/auth/login` con credenciales de seed → Devuelve código `200` con JWT y atributo `mustChangePassword`.
- ✅ `POST /api/uploads/materials` con archivo PDF válido → Devuelve código `201` con identificador y ruta que inicia con `/api/files/`.
- ✅ `GET /api/files/:id/link` → Devuelve código `200` con URL firmada temporal que contiene `sig=`.
- ✅ `GET [URL_FIRMADA]` sin cabecera Authorization → Devuelve código `200` y el contenido del archivo.
- ✅ `GET [URL_FIRMADA_ALTERADA]` (firma modificada) → Devuelve código `403` (firma inválida o manipulada).
- ✅ `POST /api/uploads/materials` con archivo de texto renombrado a `.pdf` → Devuelve código `415` (tipo MIME rechazado por inspección de magic bytes).
- ✅ 6 intentos de inicio de sesión fallidos consecutivos con usuario existente → El 6.º intento devuelve código `423` (cuenta bloqueada temporalmente).

---

## 6. Pendientes Manuales (Para Xavier)

Los pasos manuales obligatorios de configuración en la nube y aspectos legales están consolidados en [`DEPLOY.md`](file:///d:/repos xavier/SaaSchool/DEPLOY.md).
Entre ellos destacan:
1. Cambiar la visibilidad del repositorio en GitHub a **Privado**.
2. Retirar o archivar fuera del repositorio los archivos comprimidos legacy `.rar`.
3. Renovar el `refresh_token` de Google Drive con la pantalla de consentimiento de Google Cloud en modo "In production".
4. Crear la base de datos y backend en Render usando `render.yaml`.
5. Desplegar el frontend en Cloudflare Pages conectando el repositorio GitHub.
6. Revisar con asesoría legal y la dirección del colegio piloto los términos, políticas de privacidad y reglas de promoción académica de la RVM 094-2020-MINEDU.
