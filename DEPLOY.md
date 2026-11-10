# Guía de Despliegue y Pasos Manuales

## Pasos manuales (NO para el agente) — los haces tú, Xavier

Hazlos en este orden. Los marcados con 🔴 van **antes** de conectar el primer colegio.

1. 🔴 **Repositorio privado:** GitHub → `SaaSchool` → Settings → General → Danger Zone → *Change repository visibility* → **Private**. Hazlo hoy, aunque no hayas corrido aún al agente.
2. 🔴 **Archivos `.rar`:** `back/back.rar` y `front/front.rar` probablemente contienen tu `.env` y tus credenciales de Google. Muévelos fuera de la carpeta del proyecto, a un lugar seguro, o bórralos.
3. 🔴 **Google OAuth en producción:**
   1. Google Cloud Console → *APIs & Services* → *OAuth consent screen* → **Publish app** (estado "In production").
   2. Genera un **refresh token nuevo**: los emitidos en modo "Testing" vencen a los 7 días. Usa https://developers.google.com/oauthplayground → ⚙️ → *Use your own OAuth credentials* (tu Client ID y Secret) → scope `https://www.googleapis.com/auth/drive` → *Authorize* → *Exchange authorization code for tokens* → copia el `refresh_token`.
   3. Guárdalo en `back/.env` (local), en Render (`GOOGLE_REFRESH_TOKEN`) y en los secretos de GitHub (paso 8).
4. 🔴 **Render (backend + base de datos):**
   1. Render → *New* → **Blueprint** → elige el repositorio (Render pedirá permiso para leerlo aunque sea privado) → se crean `saaschool-backend` (Starter, US$ 7) y `saaschool-db` (Basic-256mb, US$ 6).
   2. Completa las variables marcadas `sync: false`:
      - `CORS_ORIGINS=https://app.tudominio.pe`
      - `PUBLIC_API_URL=https://api.tudominio.pe`
      - las de Google, SMTP y VAPID (claves **nuevas**: `npx web-push generate-vapid-keys`).
   3. **Si ya tenías una base de datos en Render creada con `db push`** (con datos), antes del primer deploy ejecuta desde tu PC, con la *External Database URL*:
      ```bash
      cd back
      set DATABASE_URL=<External Database URL>
      npx prisma migrate resolve --applied 20260731000324_init
      npx prisma migrate resolve --applied 20260806235824_add_announcements_and_logourl
      npx prisma migrate resolve --applied 20261009030055_saaschool
      npx prisma migrate resolve --applied 20261108020000_phase1_siagie_and_lms_adjustments
      npx prisma migrate deploy
      ```
      (Si la base es nueva y está vacía, no hagas nada: el build aplica las migraciones solo).
   4. Render → `saaschool-backend` → *Settings* → *Custom Domains* → `api.tudominio.pe` (agrega el CNAME que indique Render en tu DNS).
5. 🔴 **Frontend en Cloudflare Pages (gratis, en lugar de Vercel Pro):**
   1. Cloudflare → *Workers & Pages* → *Create* → *Pages* → conecta GitHub → `SaaSchool`.
   2. Configuración:
      - Root directory: `front`
      - Build command: `pnpm install && pnpm build`
      - Output: `dist`
      - Variables: `VITE_API_URL=https://api.tudominio.pe/api`, `NODE_VERSION=22`
   3. *Custom domains* → `app.tudominio.pe`.
   4. Lo ideal es gestionar el DNS del dominio en Cloudflare (gratis).
6. **Correo con tu dominio (Brevo, gratis 300 correos al día):**
   1. Crea la cuenta → *Senders, Domains* → agrega `tudominio.pe` → crea en tu DNS los registros SPF/DKIM que indique.
   2. *SMTP & API* → genera una SMTP key.
   3. En Render configura:
      - `SMTP_HOST=smtp-relay.brevo.com`
      - `SMTP_PORT=587`
      - `SMTP_SECURE=false`
      - `SMTP_USER=<login SMTP de Brevo>`
      - `SMTP_PASS=<SMTP key>`
      - `MAIL_FROM=SaaSchool <notificaciones@tudominio.pe>`
   4. Mientras no tengas dominio, puedes seguir con Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, tu correo y la contraseña de aplicación.
7. 🔴 **Scripts únicos en producción** (desde tu PC, con `DATABASE_URL` = External URL y las variables de Google):
   ```bash
   cd back
   pnpm run flag:dni-passwords
   pnpm run drive:migrate-private -- --dry-run
   pnpm run drive:migrate-private
   ```
   Corre el segundo comando primero: es una simulación. Revisa los números y recién entonces ejecuta el tercero.
8. 🔴 **Respaldos:**
   1. GitHub → repo → Settings → *Secrets and variables* → *Actions* → crea `DATABASE_URL_EXTERNAL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` y `GOOGLE_DRIVE_FOLDER_ID`.
   2. Pestaña *Actions* → "Respaldo semanal de base de datos" → *Run workflow*. Verifica que el archivo aparezca en Drive, en la carpeta `Backups_SaaSchool`.
   3. **Prueba una restauración** en tu PostgreSQL local:
      ```bash
      pg_restore --clean --no-owner -d postgresql://localhost/saaschool_restore archivo.dump
      ```
9. **Monitoreo:**
   - UptimeRobot (gratis) → monitor HTTP a `https://api.tudominio.pe/health` cada 5 minutos, con alerta a tu correo.
   - Opcional: crea proyectos en Sentry y pon `SENTRY_DSN` (Render) y `VITE_SENTRY_DSN` (Cloudflare).
10. 🔴 **Legal:**
    - Completa los `[COMPLETAR: ...]` de `PrivacyPolicyPage.tsx` y `TermsPage.tsx` con un abogado.
    - Firma con el colegio un **contrato de servicio y de encargo de tratamiento de datos personales**.
    - El colegio debe inscribir su banco de datos (alumnos y familias) ante la ANPD, declarando la transferencia internacional (Render y Google, EE. UU.).
11. 🔴 **Validación académica:** reúnete con el director del colegio piloto y revisen juntos las reglas por defecto de `promotion-rules.ts` frente al texto vigente de la RVM 094-2020-MINEDU y sus modificatorias. Si deben cambiar, se ajustan por año académico en `AcademicYear.promotionRulesConfig` (por ejemplo `{"SECONDARY":{"areaFailedWhen":"MORE_THAN_HALF_C"}}`). Pídele también las **plantillas Excel oficiales de SIAGIE** y compara columna por columna con lo que exporta el sistema.
12. **Revisión del trabajo del agente:** lee `CAMBIOS_REALIZADOS.md`, prueba la rama `auditoria/fase-0-1` en local y, si todo está bien, haz merge a `main` y push.

