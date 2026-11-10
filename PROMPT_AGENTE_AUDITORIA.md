# PROMPT PARA EL AGENTE — Implementación de la auditoría de SaaSchool

> Copia todo desde la línea `=== INICIO DEL PROMPT ===` hasta `=== FIN DEL PROMPT ===` y pégalo al agente.
> La sección final **"Pasos manuales (NO para el agente)"** es para ti, Xavier: son acciones en paneles web (GitHub, Google Cloud, Render, Cloudflare, Brevo) que un agente de código no puede ni debe hacer.

=== INICIO DEL PROMPT ===

Eres un agente de implementación que trabaja en el monorepo `SaaSchool` (carpetas `back/` y `front/`). Tu tarea es aplicar **exactamente** los cambios descritos abajo. No rediseñes, no agregues funcionalidades que no estén aquí, no cambies nombres que no se indiquen y no "mejores" nada por tu cuenta. Cuando un bloque diga "reemplaza el archivo por", escribe el contenido literal. Cuando diga "modifica", cambia solo lo indicado y conserva el resto del archivo.

## Reglas de trabajo (obligatorias)

1. **Rama:** antes de tocar nada ejecuta `git checkout -b auditoria/fase-0-1` desde `main`.
2. **Orden:** ejecuta los bloques en el orden numerado. No empieces un bloque sin haber terminado y verificado el anterior.
3. **Verificación al final de cada bloque:**
   - `cd back && npx tsc --noEmit` debe terminar sin errores.
   - `cd front && npx tsc --noEmit` debe terminar sin errores (solo en bloques que tocan `front/`).
   - Si un comando falla, corrige el error **dentro del alcance del bloque** y vuelve a verificar.
4. **Commit por bloque:** `git add -A && git commit -m "fix(auditoria): bloque N - <título del bloque>"`. **No hagas `git push`.**
5. **Operaciones destructivas:** nunca ejecutes `prisma migrate reset`, `DROP`, `git push --force` ni borres datos sin hacer antes la pregunta literal que indica el bloque y recibir "sí" del usuario.
6. **Textos de interfaz:** todos en español de Perú, tal como aparecen aquí.
7. **Si algo de este documento no coincide con el código** (un archivo no existe, una función tiene otro nombre), busca el equivalente más directo en el mismo módulo, aplica el cambio ahí y anótalo en `CAMBIOS_REALIZADOS.md` (Bloque 18). No te detengas a preguntar por diferencias menores de nombres.
8. Gestor de paquetes: **pnpm** en ambos proyectos.

---

## BLOQUE 0 — Preparación

1. `git checkout -b auditoria/fase-0-1`
2. Borra los lockfiles de npm (el proyecto usa pnpm): `git rm back/package-lock.json front/package-lock.json`
3. Ejecuta `cd back && pnpm install` y `cd front && pnpm install`.
4. Ejecuta las verificaciones del punto 3 de las reglas para confirmar el estado inicial (ambos compilan hoy).
5. Commit: `fix(auditoria): bloque 0 - preparacion`.

---

## BLOQUE 1 — Secretos e higiene del repositorio

### 1.1 Crea `.gitignore` en la raíz del repo con este contenido exacto
```gitignore
# Archivos comprimidos (pueden contener .env y credenciales)
*.rar
*.zip
*.7z

# Variables de entorno
**/.env
**/.env.local
**/.env.*.local

# Archivos subidos y almacenamiento local de desarrollo
back/uploads/
back/storage-local/

# Credenciales
**/google-credentials*.json
**/credentials*.json
**/*.pem

# Respaldos
back/backups/
*.dump
```

### 1.2 Modifica `back/.gitignore`
- **Elimina** la línea `prisma/migrations/`.
- **Agrega** al final:
```gitignore
uploads/
storage-local/
temp-*.txt
```

### 1.3 Saca del índice los archivos que no deben estar versionados
```bash
git rm -r --cached back/uploads
git rm --cached back/temp-test-service-account.txt
rm -f back/temp-test-service-account.txt
```
(No borres la carpeta `back/uploads` del disco; solo sácala del índice).

### 1.4 Reemplaza `back/src/config/env.ts` por:
```ts
import 'dotenv/config';
import { z } from 'zod';

// Validar que todas las variables de entorno requeridas estén presentes.
// IMPORTANTE: no se permiten valores por defecto para secretos.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  FILES_SIGNING_SECRET: z.string().min(32, 'FILES_SIGNING_SECRET debe tener al menos 32 caracteres'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // URLs públicas
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),

  // Correo (Nodemailer). SMTP_USER/SMTP_PASS tienen prioridad; USER_EMAIL/PASS_EMAIL se mantienen por compatibilidad.
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  USER_EMAIL: z.string().email().optional(),
  PASS_EMAIL: z.string().optional(),

  // Web Push (obligatorias, sin valores por defecto)
  VAPID_PUBLIC_KEY: z.string().min(20),
  VAPID_PRIVATE_KEY: z.string().min(20),
  VAPID_SUBJECT: z.string().startsWith('mailto:'),

  // Google Drive (OAuth2 de la cuenta propietaria)
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),

  // Monitoreo (opcional)
  SENTRY_DSN: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Variables de entorno inválidas:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
```

### 1.5 Reemplaza `back/.env.example` por:
```dotenv
# ============================================================================
# BASE DE DATOS
# ============================================================================
DATABASE_URL="postgresql://usuario:password@host:5432/saaschool?sslmode=require"

# ============================================================================
# SEGURIDAD (genera cada secreto con:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
# ============================================================================
JWT_SECRET="CAMBIAR_minimo_32_caracteres_aleatorios"
JWT_EXPIRES_IN="12h"
FILES_SIGNING_SECRET="CAMBIAR_minimo_32_caracteres_aleatorios"
BCRYPT_ROUNDS=12

# ============================================================================
# SERVIDOR
# ============================================================================
PORT=3000
NODE_ENV=development
CORS_ORIGINS="http://localhost:5173"
PUBLIC_API_URL="http://localhost:3000"

# ============================================================================
# GOOGLE DRIVE (OAuth2)
# ============================================================================
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REFRESH_TOKEN=""
GOOGLE_DRIVE_FOLDER_ID=""

# ============================================================================
# CORREO (Nodemailer SMTP)
# Gmail: SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true
# Brevo: SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=587 SMTP_SECURE=false
# ============================================================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=""
SMTP_PASS=""
MAIL_FROM="SaaSchool <notificaciones@tudominio.pe>"

# ============================================================================
# WEB PUSH (genera con: npx web-push generate-vapid-keys)
# ============================================================================
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:soporte@tudominio.pe"

# ============================================================================
# MONITOREO (opcional)
# ============================================================================
SENTRY_DSN=""
```

### 1.6 Actualiza el `back/.env` local (NO se commitea)
- Si `JWT_SECRET` no existe o tiene menos de 32 caracteres, reemplázalo por la salida de `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- Agrega `FILES_SIGNING_SECRET=` con otro valor generado con el mismo comando.
- Ejecuta `npx web-push generate-vapid-keys` y escribe los valores en `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT="mailto:soporte@saaschool.pe"`.
- Agrega `CORS_ORIGINS="http://localhost:5173"` y `PUBLIC_API_URL="http://localhost:3000"`.
- **No** imprimas en tu respuesta ningún valor de este archivo.

### 1.7 `render.yaml`
Se reescribe completo en el Bloque 17. En este bloque, solo **elimina** las tres entradas `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` que tienen `value:` y reemplázalas por:
```yaml
      - key: VAPID_PUBLIC_KEY
        sync: false
      - key: VAPID_PRIVATE_KEY
        sync: false
      - key: VAPID_SUBJECT
        sync: false
```

Verifica (`back` tsc) y haz commit.

---

## BLOQUE 2 — Esquema Prisma, migraciones y build

### 2.1 Modificaciones en `back/prisma/schema.prisma`

**a) Modelo `School`:**
- Reemplaza la línea `blockGradesOnOverdue Boolean @default(false) // ...` por:
  ```prisma
  blockCertificatesOnOverdue Boolean @default(false) @map("blockGradesOnOverdue") // Retención SOLO de constancias/certificados por deuda vencida (Ley 27665)
  brandColor                 String? // Color primario de marca del colegio en HEX (#RRGGBB)
  ```
- Agrega estas relaciones al bloque de relaciones de `School`:
  ```prisma
  storedFiles         StoredFile[]
  auditLogs           AuditLog[]
  legalAcceptances    LegalAcceptance[]
  holidays            SchoolHoliday[]
  ```

**b) Modelo `User`:** agrega después de `isActive`:
```prisma
  mustChangePassword  Boolean   @default(false)
  passwordChangedAt   DateTime?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
```
y agrega `@@unique([schoolId, documentId])` junto al `@@index([schoolId, role])` existente.

**c) Modelo `Student`:** agrega después de `mustChangePassword`:
```prisma
  passwordChangedAt   DateTime?
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
```

**d) Modelo `AcademicYear`:** agrega después de `annualCalculationMode`:
```prisma
  promotionRulesConfig  Json?        // Overrides de reglas de situación final por nivel (ver promotion-rules.ts)
```

**e) Modelo `PaymentObligation`:** cambia `amountDue Float` por `amountDue Decimal @db.Decimal(10, 2)`.

**f) Modelo `PaymentTransaction`:**
- Cambia `amountPaid Float` por `amountPaid Decimal @db.Decimal(10, 2)`.
- Cambia `receiptType String? // BOLETA, FACTURA` por `receiptType String? @default("RECIBO_INTERNO") // Solo RECIBO_INTERNO hasta integrar facturación electrónica`.

**g) Modelo `GradingScale`:** agrega `@@unique([schoolId, level, letterGrade])`.

**h) Modelo `StudentIncident`:** agrega después de `acknowledgedByUserId`:
```prisma
  isViolenceCase       Boolean    @default(false) // Caso de violencia escolar (Ley 29719): debe reportarse en SíseVe
  siseveCode           String?    // Código de caso asignado por el portal SíseVe
  siseveReportedAt     DateTime?
```

**i) Modelo `AttendanceScheduleConfig`:** agrega después de `autoCloseEnabled`:
```prisma
  lastAutoClosedOn  DateTime?               @db.Date
```

**j) Agrega al final del archivo estos modelos y enums nuevos:**
```prisma
// ============================================================================
// 14. ARCHIVOS PRIVADOS
// ============================================================================
enum FileStorage {
  GOOGLE_DRIVE
  LOCAL
}

model StoredFile {
  id           String      @id @default(uuid())
  schoolId     String
  uploadedById String      // userId o studentId
  uploaderRole String
  purpose      String      // COURSE_MATERIAL | HOMEWORK_SUBMISSION | OTHER
  storage      FileStorage
  driveFileId  String?     @unique
  localPath    String?
  fileName     String
  mimeType     String
  size         Int
  createdAt    DateTime    @default(now())
  deletedAt    DateTime?

  school       School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, uploadedById, createdAt])
}

// ============================================================================
// 15. BITÁCORA DE AUDITORÍA
// ============================================================================
model AuditLog {
  id         String   @id @default(uuid())
  schoolId   String
  actorId    String
  actorRole  String
  actorEmail String?
  action     String
  entity     String
  entityId   String?
  before     Json?
  after      Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  school     School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, createdAt])
  @@index([schoolId, entity, entityId])
}

// ============================================================================
// 16. CONSENTIMIENTOS LEGALES (Ley 29733)
// ============================================================================
model LegalAcceptance {
  id           String   @id @default(uuid())
  schoolId     String
  userId       String?
  studentId    String?
  documentType String   // PRIVACY_POLICY | TERMS | MINOR_DATA_CONSENT
  version      String
  acceptedAt   DateTime @default(now())
  ip           String?
  userAgent    String?

  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, userId])
  @@index([schoolId, studentId])
}

// ============================================================================
// 17. FERIADOS / DÍAS NO LECTIVOS
// ============================================================================
model SchoolHoliday {
  id        String   @id @default(uuid())
  schoolId  String
  date      DateTime @db.Date
  name      String
  createdAt DateTime @default(now())

  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([schoolId, date])
}
```

### 2.2 Comprobar duplicados antes de migrar
Ejecuta contra la base local (con `npx prisma db execute --stdin` o `psql`):
```sql
SELECT "schoolId", "documentId", COUNT(*) FROM "User" WHERE "documentId" IS NOT NULL GROUP BY 1,2 HAVING COUNT(*) > 1;
SELECT "schoolId", "level", "letterGrade", COUNT(*) FROM "GradingScale" GROUP BY 1,2,3 HAVING COUNT(*) > 1;
```
Si alguna consulta devuelve filas, **detente** y muéstralas al usuario: no las borres tú.

### 2.3 Generar la migración
1. `cd back && npx prisma migrate status`
2. Si el estado indica que la base no está sincronizada con las migraciones (*drift*, típico porque antes se usaba `db push`), pregunta literalmente al usuario: **"La base de datos LOCAL tiene drift. ¿Contiene solo datos de prueba que puedo borrar con `prisma migrate reset`? (sí/no)"**.
   - Si responde **sí**: `npx prisma migrate reset --force --skip-seed`.
   - Si responde **no**: detente y reporta.
3. `npx prisma migrate dev --name auditoria_seguridad_cumplimiento --create-only`
4. Abre el `migration.sql` recién creado y agrega **al final**:
   ```sql
   -- Normalizar tipo de recibo: solo recibos internos hasta integrar facturación electrónica
   UPDATE "PaymentTransaction" SET "receiptType" = 'RECIBO_INTERNO' WHERE "receiptType" IS DISTINCT FROM 'RECIBO_INTERNO';
   ```
5. `npx prisma migrate dev` (aplica la migración) y luego `pnpm run seed`. Si el seed falla por los cambios de tipos (`Decimal`), corrige `prisma/seed.ts` solo en lo necesario.

### 2.4 Scripts de `back/package.json`
Modifica:
- `"build": "prisma generate && tsc"` (se mantiene).
- `"render-build": "prisma generate && prisma migrate deploy && tsc"`.
- Agrega `"test": "vitest run"`.
- Agrega `"flag:dni-passwords": "ts-node --transpile-only scripts/flag-dni-passwords.ts"`.
- Agrega `"drive:migrate-private": "ts-node --transpile-only scripts/migrate-drive-files-to-private.ts"`.
- Cambia `"engines": { "node": ">=18.0.0" }` por `"engines": { "node": "22.x" }`.
- Instala vitest: `pnpm add -D vitest`.

### 2.5 `back/tsconfig.json`
Cambia `"exclude"` por:
```json
"exclude": ["node_modules", "dist", "prisma", "src/**/*.test.ts", "src/**/__tests__/**"]
```

### 2.6 Reemplaza `back/src/config/prisma.ts` por:
```ts
import { Prisma, PrismaClient } from '@prisma/client';
import { env } from './env';

// Serializar los montos Decimal como number en las respuestas JSON (S/ con 2 decimales).
// Así el frontend sigue recibiendo números y no strings.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function toJSON(
  this: Prisma.Decimal,
): number {
  return this.toNumber();
};

// Limitar las conexiones del pool: Render Postgres Basic tiene pocas conexiones disponibles.
const buildDatabaseUrl = (): string => {
  const url = new URL(env.DATABASE_URL);
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', env.NODE_ENV === 'production' ? '5' : '10');
  }
  return url.toString();
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 2.7 Corregir los errores de tipos por `Decimal`
Ejecuta `npx tsc --noEmit` en `back`. Por cada error causado por `amountDue` o `amountPaid` (ahora `Prisma.Decimal`):
- Donde se **lee** el valor para operar (sumas, comparaciones, `toFixed`), envuélvelo en `Number(...)`.
- Donde se acumulan sumas de dinero, redondea el resultado con `Math.round(total * 100) / 100`.
- Donde se **escribe** (create/update), puedes seguir pasando `number`: Prisma lo acepta.

No cambies ninguna otra lógica. Verifica y haz commit.

---

## BLOQUE 3 — Autenticación y sesiones

### 3.1 Elimina el registro público
- `back/src/modules/auth/auth.routes.ts`: borra el bloque completo de `authRouter.post('/register', ...)` con su comentario.
- `auth.controller.ts`: borra el método `register` y quita `registerSchema` del import.
- `auth.service.ts`: se reemplaza completo en 3.5 (ya no tendrá `register`).
- `auth.schema.ts`: borra `registerSchema` y `RegisterDto`.
- `auth.repository.ts`: borra `createUser` y el import de `RegisterDto`.
- En `front/src`, busca `auth/register`. Si aparece, elimina esa llamada y la UI que la usa.

### 3.2 Crea `back/src/utils/password.util.ts`
```ts
import { randomInt } from 'crypto';

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para facilitar el dictado y la impresión.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Genera una contraseña temporal aleatoria criptográficamente segura. */
export const generateTemporaryPassword = (length = 10): string => {
  let password = '';
  while (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    password = Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  }
  return password;
};

/** Regla de contraseña: mínimo 8 caracteres, al menos una letra y un número. */
export const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir letras y números.';
```

### 3.3 Reemplaza `back/src/modules/auth/auth.schema.ts` por:
```ts
import { z } from 'zod';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password.util';

export const loginSchema = z.object({
  email: z.string().trim().min(3, 'Ingresa tu correo, DNI o código de estudiante').max(120),
  password: z.string().min(1, 'Contraseña requerida').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida').max(200).optional(),
  newPassword: z.string().max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
```

### 3.4 Reemplaza `back/src/modules/auth/auth.repository.ts` por:
```ts
import { prisma } from '../../config/prisma';
import type { User, Student } from '@prisma/client';

export class AuthRepository {
  /** Devuelve hasta 2 usuarios que coincidan (para detectar ambigüedad entre colegios). */
  async findUsersByIdentifier(identifier: string): Promise<User[]> {
    const clean = identifier.trim();
    return prisma.user.findMany({
      where: {
        OR: [{ email: { equals: clean, mode: 'insensitive' } }, { documentId: clean }],
      },
      take: 2,
    });
  }

  /** Devuelve hasta 2 estudiantes que coincidan por DNI o código SIAGIE. */
  async findStudentsByIdentifier(identifier: string): Promise<Student[]> {
    const clean = identifier.trim();
    return prisma.student.findMany({
      where: { OR: [{ documentId: clean }, { studentCode: clean }] },
      take: 2,
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findStudentById(studentId: string): Promise<Student | null> {
    return prisma.student.findUnique({ where: { id: studentId } });
  }

  async updateUserPassword(userId: string, passwordHash: string, mustChangePassword: boolean): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async updateStudentPassword(studentId: string, passwordHash: string, mustChangePassword: boolean): Promise<Student> {
    return prisma.student.update({
      where: { id: studentId },
      data: {
        passwordHash,
        mustChangePassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async registerFailedUserLogin(userId: string, maxAttempts: number, lockMinutes: number): Promise<void> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (updated.failedLoginAttempts >= maxAttempts) {
      await prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
      });
    }
  }

  async registerFailedStudentLogin(studentId: string, maxAttempts: number, lockMinutes: number): Promise<void> {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (updated.failedLoginAttempts >= maxAttempts) {
      await prisma.student.update({
        where: { id: studentId },
        data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
      });
    }
  }

  async resetUserLoginCounters(userId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  async resetStudentLoginCounters(studentId: string): Promise<void> {
    await prisma.student.update({ where: { id: studentId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }
}
```

### 3.5 Crea `back/src/core/security/principal-status.ts`
```ts
import { prisma } from '../../config/prisma';
import { AppError } from '../errors/app-error';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

const CACHE_TTL_MS = 30_000;

interface PrincipalStatus {
  isActive: boolean;
  passwordChangedAtSec: number | null;
  expiresAt: number;
}

const cache = new Map<string, PrincipalStatus>();

export const principalCacheKey = (kind: 'user' | 'student', id: string): string =>
  kind === 'user' ? `u:${id}` : `s:${id}`;

/** Invalida el estado cacheado (llamar tras desactivar, cambiar rol o cambiar contraseña). */
export const invalidatePrincipalCache = (kind: 'user' | 'student', id: string): void => {
  cache.delete(principalCacheKey(kind, id));
};

const loadStatus = async (principal: AuthenticatedUser): Promise<PrincipalStatus> => {
  if (principal.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { id: principal.studentId ?? principal.userId },
      select: { id: true, passwordChangedAt: true },
    });
    return {
      isActive: Boolean(student),
      passwordChangedAtSec: student?.passwordChangedAt ? Math.floor(student.passwordChangedAt.getTime() / 1000) : null,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { isActive: true, passwordChangedAt: true },
  });
  return {
    isActive: Boolean(user?.isActive),
    passwordChangedAtSec: user?.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : null,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
};

/** Lanza 401 si la cuenta fue desactivada o si el token es anterior al último cambio de contraseña. */
export const assertPrincipalIsActive = async (principal: AuthenticatedUser & { iat?: number }): Promise<void> => {
  const key =
    principal.role === 'STUDENT'
      ? principalCacheKey('student', principal.studentId ?? principal.userId)
      : principalCacheKey('user', principal.userId);

  let status = cache.get(key);
  if (!status || status.expiresAt < Date.now()) {
    status = await loadStatus(principal);
    cache.set(key, status);
  }

  if (!status.isActive) {
    throw new AppError('Tu cuenta está desactivada o ya no existe. Contacta al administrador.', 401);
  }

  if (principal.iat && status.passwordChangedAtSec && principal.iat < status.passwordChangedAtSec) {
    throw new AppError('Tu sesión expiró porque la contraseña fue cambiada. Inicia sesión nuevamente.', 401);
  }
};
```

### 3.6 Reemplaza `back/src/core/middlewares/auth.middleware.ts` por:
```ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt.util';
import { AppError } from '../errors/app-error';
import { assertPrincipalIsActive } from '../security/principal-status';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

/**
 * Middleware de autenticación: verifica el JWT, que la cuenta siga activa
 * y que el token sea posterior al último cambio de contraseña.
 */
export const authMiddleware = async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new AppError('Token de acceso requerido', 401);
  }

  const token = authorizationHeader.slice(7).trim();
  if (!token) {
    throw new AppError('Token de acceso inválido', 401);
  }

  const decoded = verifyToken(token) as AuthenticatedUser & { iat?: number };
  await assertPrincipalIsActive(decoded);

  request.user = {
    userId: decoded.userId,
    studentId: decoded.studentId,
    schoolId: decoded.schoolId,
    role: decoded.role,
    email: decoded.email,
  };

  next();
};

/** Autorización por rol. */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      throw new AppError('No autenticado', 401);
    }
    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError('No tienes permisos para realizar esta acción.', 403);
    }
    next();
  };
};
```

### 3.7 Reemplaza `back/src/modules/auth/auth.service.ts` por:
```ts
import bcrypt from 'bcryptjs';
import { AppError } from '../../core/errors/app-error';
import { hashPassword, comparePassword } from '../../utils/hash.util';
import { signToken } from '../../utils/jwt.util';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import type { AuthRepository } from './auth.repository';
import type { LoginDto, ChangePasswordDto } from './auth.schema';
import type { User, Student } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/interfaces/global.interfaces';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe (evita enumeración).
const DUMMY_HASH = bcrypt.hashSync('saaschool-dummy-password', 12);

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string | null;
    role: string;
    firstName: string;
    lastNamePaternal: string;
    schoolId: string;
    documentId?: string | null;
    mustChangePassword?: boolean;
    studentId?: string;
  };
}

const assertNotLocked = (lockedUntil: Date | null): void => {
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(
      `Cuenta bloqueada temporalmente por intentos fallidos. Intenta nuevamente en ${minutes} minuto(s).`,
      423,
    );
  }
};

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const identifier = loginDto.email.trim();

    const users = await this.authRepository.findUsersByIdentifier(identifier);
    if (users.length > 1) {
      throw new AppError('Este documento está asociado a más de una cuenta. Ingresa con tu correo electrónico.', 409);
    }
    if (users[0]) {
      return this.loginUser(users[0], loginDto.password);
    }

    const students = await this.authRepository.findStudentsByIdentifier(identifier);
    if (students.length > 1) {
      throw new AppError(
        'Este documento está registrado en más de un colegio. Ingresa con tu código de estudiante SIAGIE (14 dígitos).',
        409,
      );
    }
    if (!students[0]) {
      await comparePassword(loginDto.password, DUMMY_HASH);
      throw new AppError('Credenciales inválidas', 401);
    }
    return this.loginStudent(students[0], loginDto.password);
  }

  private async loginUser(user: User, password: string): Promise<AuthResponse> {
    if (!user.isActive) {
      throw new AppError('Tu cuenta está desactivada. Contacta al administrador.', 403);
    }
    assertNotLocked(user.lockedUntil);

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.registerFailedUserLogin(user.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      throw new AppError('Credenciales inválidas', 401);
    }
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.authRepository.resetUserLoginCounters(user.id);
    }

    const token = signToken({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastNamePaternal: user.lastNamePaternal,
        schoolId: user.schoolId,
        documentId: user.documentId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  private async loginStudent(student: Student, password: string): Promise<AuthResponse> {
    if (!student.passwordHash) {
      throw new AppError(
        'Tu cuenta de estudiante aún no tiene contraseña. Solicita tus credenciales de acceso en Secretaría.',
        403,
      );
    }
    assertNotLocked(student.lockedUntil);

    const isPasswordValid = await comparePassword(password, student.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.registerFailedStudentLogin(student.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      throw new AppError('Credenciales inválidas', 401);
    }
    if (student.failedLoginAttempts > 0 || student.lockedUntil) {
      await this.authRepository.resetStudentLoginCounters(student.id);
    }

    const login = student.studentCode || student.documentId;
    const token = signToken({
      userId: student.id,
      studentId: student.id,
      schoolId: student.schoolId,
      role: 'STUDENT',
      email: login,
    });

    return {
      token,
      user: {
        id: student.id,
        studentId: student.id,
        email: login,
        role: 'STUDENT',
        firstName: student.firstNames,
        lastNamePaternal: student.lastNamePaternal,
        schoolId: student.schoolId,
        documentId: student.documentId,
        mustChangePassword: student.mustChangePassword,
      },
    };
  }

  /** Cambia la contraseña y devuelve un token nuevo (el anterior queda invalidado). */
  async changePassword(
    principal: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<{ message: string; token: string }> {
    if (principal.role === 'STUDENT') {
      const studentId = principal.studentId ?? principal.userId;
      const student = await this.authRepository.findStudentById(studentId);
      if (!student) throw new AppError('Estudiante no encontrado', 404);

      if (!student.mustChangePassword) {
        if (!dto.currentPassword) throw new AppError('Ingresa tu contraseña actual.', 400);
        const ok = student.passwordHash ? await comparePassword(dto.currentPassword, student.passwordHash) : false;
        if (!ok) throw new AppError('La contraseña actual ingresada es incorrecta', 400);
      }
      if (student.documentId && dto.newPassword.trim() === student.documentId.trim()) {
        throw new AppError('La nueva contraseña no puede ser igual a tu número de documento.', 400);
      }

      const hash = await hashPassword(dto.newPassword);
      await this.authRepository.updateStudentPassword(student.id, hash, false);
      invalidatePrincipalCache('student', student.id);

      const token = signToken({
        userId: student.id,
        studentId: student.id,
        schoolId: student.schoolId,
        role: 'STUDENT',
        email: student.studentCode || student.documentId,
      });
      return { message: 'Contraseña actualizada exitosamente', token };
    }

    const user = await this.authRepository.findUserById(principal.userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (!user.mustChangePassword) {
      if (!dto.currentPassword) throw new AppError('Ingresa tu contraseña actual.', 400);
      const ok = await comparePassword(dto.currentPassword, user.passwordHash);
      if (!ok) throw new AppError('La contraseña actual ingresada es incorrecta', 400);
    }
    if (user.documentId && dto.newPassword.trim() === user.documentId.trim()) {
      throw new AppError('La nueva contraseña no puede ser igual a tu número de DNI.', 400);
    }

    const hash = await hashPassword(dto.newPassword);
    await this.authRepository.updateUserPassword(user.id, hash, false);
    invalidatePrincipalCache('user', user.id);

    const token = signToken({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email });
    return { message: 'Contraseña actualizada exitosamente', token };
  }
}
```

### 3.8 Modifica `auth.controller.ts`, método `changePassword`:
```ts
  changePassword = async (request: Request, response: Response): Promise<void> => {
    const dto = changePasswordSchema.parse(request.body);
    const result = await this.authService.changePassword(request.user!, dto);
    response.status(200).json({ status: 'success', data: result });
  };
```

### 3.9 `back/src/utils/jwt.util.ts`
Sin cambios de código. El valor por defecto de expiración ahora es `12h` (viene de `env.ts`).

### 3.10 Contraseñas temporales en vez de DNI
Usa `generateTemporaryPassword()` de `utils/password.util.ts` en todos estos puntos:

**a) `back/src/modules/users/user.service.ts` → `resetPassword`:**
- Si no llega `newPassword`, usa `generateTemporaryPassword()` (nunca el DNI).
- Guarda con `mustChangePassword: true`, `passwordChangedAt: new Date()`, `failedLoginAttempts: 0` y `lockedUntil: null`. Ajusta `userRepository.updatePassword` para aceptar y escribir estos campos.
- Llama a `invalidatePrincipalCache('user', userId)`.
- Devuelve `{ message: 'Contraseña restablecida. Entrega la contraseña temporal al usuario.', temporaryPassword }`. Si el admin envió `newPassword`, `temporaryPassword` es ese mismo valor.

**b) `back/src/modules/students/student.service.ts` → `resetPassword`:** igual que (a), pero sobre `student` (`invalidatePrincipalCache('student', studentId)`). Ajusta `studentRepository.updatePassword` para escribir `mustChangePassword: true`, `passwordChangedAt`, `failedLoginAttempts: 0` y `lockedUntil: null`.

**c) `student.service.ts` → registro de ficha de matrícula (línea ~108; el método que usa `studentController.registerFicha`):**
- Reemplaza la contraseña inicial del apoderado (`parentDni || 'Familia...'`) por `const guardianTemporaryPassword = generateTemporaryPassword();`.
- Genera también `const studentTemporaryPassword = generateTemporaryPassword();`, hashéala y pásala a `studentRepository.registerFichaMatricula` como nuevo parámetro `studentPasswordHash`. Dentro del repositorio, en el `create` del estudiante, escribe `passwordHash: studentPasswordHash` y `mustChangePassword: true`. En el `create` del nuevo apoderado, escribe `mustChangePassword: true`.
- Devuelve el resultado de `getStudentById(...)` extendido así:
  ```ts
  return {
    ...student,
    temporaryCredentials: {
      student: { login: student.studentCode || student.documentId, password: studentTemporaryPassword },
      guardian: dto.guardian.newGuardian
        ? { login: dto.guardian.newGuardian.email || dto.guardian.newGuardian.documentId, password: guardianTemporaryPassword }
        : null,
    },
  };
  ```
  Ajusta el tipo de retorno si TypeScript lo exige.

**d) `back/src/modules/users/user.service.ts` / `user.repository.ts` → creación de usuarios:**
- En `user.schema.ts`, el campo `password` de creación pasa a `z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE).optional()`.
- El hash se calcula en el **servicio**, no en el repositorio: el repositorio recibe `passwordHash` y `mustChangePassword`.
- Servicio: `const temporaryPassword = dto.password ? null : generateTemporaryPassword();`, hashea `dto.password ?? temporaryPassword` y crea con `mustChangePassword: true`.
- Devuelve `{ ...user, temporaryPassword }`.

**e) `back/src/modules/users/user.service.ts` → `deactivate`, `reactivate` y `update` (si cambia `role` o `isActive`):** después de guardar, llama a `invalidatePrincipalCache('user', userId)`.

**f) `back/src/modules/schools/school.repository.ts` → `resetAdminPassword`:**
- `passwordToSet` = `newPassword` si cumple `PASSWORD_POLICY_REGEX`; si no, `generateTemporaryPassword(12)`.
- Hashea con `hashPassword` (de `utils/hash.util`), no con `bcrypt.hash(..., 10)`.
- Escribe `mustChangePassword: true`, `passwordChangedAt: new Date()`, `failedLoginAttempts: 0` y `lockedUntil: null`.
- Llama a `invalidatePrincipalCache('user', adminUser.id)`.

**g) `school.service.ts` / `school.repository.ts` → creación de colegio:** si se crea el usuario administrador con contraseña generada o fija, usa `generateTemporaryPassword(12)`, `mustChangePassword: true`, y devuelve la contraseña en la respuesta igual que hoy.

### 3.11 Credenciales masivas por aula (para el inicio de clases)
**a) Ruta** en `student.routes.ts`, **antes** de `studentRouter.get('/:id', ...)`:
```ts
studentRouter.post(
  '/credentials/bulk',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  studentController.generateBulkCredentials,
);
```

**b) Schema** en `student.schema.ts`:
```ts
export const bulkCredentialsSchema = z.object({
  classroomId: z.string().uuid(),
  target: z.enum(['STUDENTS', 'GUARDIANS']),
  onlyPending: z.boolean().default(true),
});
export type BulkCredentialsDto = z.infer<typeof bulkCredentialsSchema>;
```

**c) Controller** `generateBulkCredentials`: parsea con `bulkCredentialsSchema`, llama a `studentService.generateBulkCredentials(schoolId, dto)` y responde `{ status: 'success', data }`.

**d) Servicio** `generateBulkCredentials(schoolId, dto)`:
1. Busca las matrículas `isActive: true` del aula (`prisma.enrollment.findMany({ where: { schoolId, classroomId: dto.classroomId, isActive: true, academicYear: { isActive: true } }, include: { student: { include: { familyRelations: { include: { user: true } } } } } })`).
2. **STUDENTS:** por cada alumno, si `onlyPending` es verdadero y el alumno ya tiene `passwordHash` y `mustChangePassword === false`, sáltalo. Si no, genera una contraseña temporal, hashéala, actualiza (`mustChangePassword: true`, `passwordChangedAt: now`, contadores en 0) e invalida su caché.
3. **GUARDIANS:** por cada apoderado legal (`isLegalGuardian === true`, sin repetir `user.id`), con la misma lógica de `onlyPending` sobre `mustChangePassword`, actualiza el `user`.
4. Procesa en serie (no en paralelo) para no saturar el CPU.
5. Devuelve `Array<{ id: string; fullName: string; login: string; temporaryPassword: string }>` ordenado por apellido. Para alumnos, `login = studentCode || documentId`; para apoderados, `login = email || documentId`.

### 3.12 Script `back/scripts/flag-dni-passwords.ts`
Marca para cambio obligatorio a todos los que hoy tienen su DNI como contraseña:
```ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  let flaggedUsers = 0;
  let flaggedStudents = 0;

  const users = await prisma.user.findMany({
    where: { documentId: { not: null }, mustChangePassword: false },
    select: { id: true, documentId: true, passwordHash: true },
  });
  for (const user of users) {
    if (user.documentId && (await bcrypt.compare(user.documentId.trim(), user.passwordHash))) {
      await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
      flaggedUsers++;
    }
  }

  const students = await prisma.student.findMany({
    where: { passwordHash: { not: null }, mustChangePassword: false },
    select: { id: true, documentId: true, passwordHash: true },
  });
  for (const student of students) {
    if (student.passwordHash && (await bcrypt.compare(student.documentId.trim(), student.passwordHash))) {
      await prisma.student.update({ where: { id: student.id }, data: { mustChangePassword: true } });
      flaggedStudents++;
    }
  }

  console.log(`✅ Usuarios marcados: ${flaggedUsers} | Estudiantes marcados: ${flaggedStudents}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
```
Ejecútalo una vez en local: `pnpm run flag:dni-passwords`.

### 3.13 Frontend de autenticación
**a) `front/src/features/auth/api/useChangePassword.ts`:**
- Tipa la respuesta como `{ message: string; token: string }`.
- En `onSuccess`: lee el estado con `const { user, setAuth } = useAuthStore.getState();` y, si hay `user`, llama a `setAuth(data.token, { ...user, mustChangePassword: false })`. Muestra el `toast.success` como hoy. Elimina el uso de `updateUser` en este hook.

**b) `front/src/features/auth/components/ChangePasswordModal.tsx`:** cambia la validación del campo nueva contraseña a mínimo 8 caracteres con letras y números, mensaje: `La contraseña debe tener al menos 8 caracteres e incluir letras y números.`

**c) Textos:** en `LoginPage.tsx` y `ChangePasswordModal.tsx`, reemplaza todo texto que diga que la contraseña inicial es el DNI por: `Usa la contraseña temporal que te entregó tu colegio.` El placeholder del campo usuario debe decir: `Correo, DNI o código de estudiante`.

**d) Crea `front/src/components/ui/TemporaryCredentialsDialog.tsx`** usando `@radix-ui/react-dialog` con el mismo estilo visual de `ConfirmDialog.tsx`.
- Props:
  ```ts
  interface TemporaryCredential { name: string; login: string; password: string }
  interface Props { open: boolean; onClose: () => void; title: string; credentials: TemporaryCredential[] }
  ```
- Contenido: aviso en ámbar `Estas contraseñas solo se muestran una vez. Entrégalas de forma personal; el sistema pedirá cambiarlas en el primer ingreso.`
- Tabla con columnas **Nombre | Usuario | Contraseña temporal | (botón "Copiar")**. La contraseña va en `font-mono`.
- Botones: **"Imprimir"** (`window.print()`; añade una clase `print-area` al contenedor y en `index.css` una regla `@media print` que oculte todo excepto `.print-area`) y **"Cerrar"**.

**e) Úsalo en:**
- `useStudents.ts` (reset de alumno) y `useUsers.ts` (reset de usuario): el `mutationFn` devuelve `data.data`. En el componente que llama la mutación, al tener éxito abre el diálogo con `[{ name: <nombre completo>, login: <usuario>, password: data.temporaryPassword }]`.
- `EnrollStudentModal.tsx`: tras matricular, si la respuesta trae `temporaryCredentials`, abre el diálogo con la fila del alumno y, si existe, la del apoderado.
- El modal de creación de usuario en `features/users/components`: si la respuesta trae `temporaryPassword`, abre el diálogo.
- `StudentsPage.tsx`: agrega un botón **"Credenciales de acceso"** (ícono `KeyRound` de lucide), visible solo para `SCHOOL_ADMIN`, `ADMINISTRATIVE` y `SUPER_ADMIN`. Abre un modal nuevo `features/students/components/BulkCredentialsModal.tsx` con:
  - un select de aula (reutiliza el hook de aulas que ya usa `StudentsPage` o `EnrollStudentModal`);
  - un radio **"Estudiantes" / "Apoderados"**;
  - un checkbox **"Solo cuentas pendientes"** (marcado por defecto);
  - el botón **"Generar"**, que llama a `POST /students/credentials/bulk` y muestra el resultado en `TemporaryCredentialsDialog`.

Verifica back y front, y haz commit.

---

## BLOQUE 4 — Middlewares globales, CORS, límites y errores

### 4.1 Reemplaza `back/src/core/middlewares/rate-limiter.middleware.ts` por:
```ts
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ipKey = (request: Request): string => `ip:${ipKeyGenerator(request.ip ?? '')}`;

/** Login: 10 intentos por IP + identificador cada 15 min (no bloquea a todo un colegio que comparte IP). */
export const loginRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (request) =>
    `${ipKey(request)}:${String((request.body as { email?: string } | undefined)?.email ?? '').trim().toLowerCase()}`,
  message: { status: 'fail', message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.' },
});

/** Tope global de autenticación por IP (protege contra ataques distribuidos por identificador). */
export const authIpRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { status: 'fail', message: 'Demasiadas solicitudes de autenticación desde esta red. Intenta más tarde.' },
});

/** API autenticada: 600 peticiones por usuario cada 15 min. */
export const apiRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (request) => {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const decoded = jwt.decode(header.slice(7)) as { userId?: string } | null;
      if (decoded?.userId) return `u:${decoded.userId}`;
    }
    return ipKey(request);
  },
  message: { status: 'fail', message: 'Límite de peticiones alcanzado. Intenta nuevamente en unos minutos.' },
});

/** Tope por IP contra inundación (una red escolar completa puede compartir IP). */
export const ipFloodRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { status: 'fail', message: 'Demasiadas solicitudes desde esta red. Intenta más tarde.' },
});

/** Descarga de archivos firmados (sin token Bearer). */
export const fileContentRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { status: 'fail', message: 'Demasiadas descargas desde esta red. Intenta más tarde.' },
});
```

### 4.2 `back/src/modules/auth/auth.routes.ts`
La ruta de login queda así:
```ts
authRouter.post('/login', loginRateLimiter, authController.login);
```
(importa `loginRateLimiter` desde `../../core/middlewares/rate-limiter.middleware`).

### 4.3 Reemplaza `back/src/app.ts` por:
(Los routers `fileRouter`, `auditLogRouter` y `legalRouter` se crean en los bloques 5, 9 y 10. Si en este punto aún no existen, deja sus imports y `app.use` comentados con `// TODO bloque N` y descoméntalos al crear cada router).
```ts
import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { env } from './config/env';
import { AppError } from './core/errors/app-error';
import { globalErrorHandler } from './core/middlewares/error-handler.middleware';
import {
  authIpRateLimiter,
  apiRateLimiter,
  ipFloodRateLimiter,
  fileContentRateLimiter,
} from './core/middlewares/rate-limiter.middleware';

import { authRouter } from './modules/auth/auth.routes';
import { schoolRouter } from './modules/schools/school.routes';
import { userRouter } from './modules/users/user.routes';
import { studentRouter } from './modules/students/student.routes';
import { academicYearRouter } from './modules/academic-years/academic-year.routes';
import { classroomRouter } from './modules/classrooms/classroom.routes';
import { enrollmentRouter } from './modules/enrollments/enrollment.routes';
import { paymentRouter } from './modules/payments/payment.routes';
import { curricularAreaRouter } from './modules/curricular-areas/curricular-area.routes';
import { gradeRouter } from './modules/grades/grade.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { familyRelationshipRouter } from './modules/family-relationships/family-relationship.routes';
import { announcementRouter } from './modules/announcements/announcement.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { courseAssignmentRouter } from './modules/course-assignments/course-assignment.routes';
import { courseContentRouter } from './modules/course-contents/course-content.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { uploadRouter } from './modules/uploads/upload.routes';
import { academicReportRouter } from './modules/academic-reports/academic-report.routes';
import { incidentRouter } from './modules/incidents/incident.routes';
import { fileRouter } from './modules/files/file.routes';
import { auditLogRouter } from './modules/audit-logs/audit-log.routes';
import { legalRouter } from './modules/legal/legal.routes';

const app = express();

// Render (y cualquier PaaS) entrega las peticiones a través de un proxy: confiar en el primer salto
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ============================================================================
// SEGURIDAD
// ============================================================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError('Origen no permitido', 403));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id'],
    maxAge: 86400,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(ipFloodRateLimiter);

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SaaSchool API' });
});

// ============================================================================
// RUTAS
// ============================================================================
const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authIpRateLimiter, authRouter);

// Archivos: la descarga firmada no lleva token, por eso tiene su propio limitador
app.use(`${API_PREFIX}/files`, fileContentRateLimiter, fileRouter);

app.use(API_PREFIX, apiRateLimiter);

app.use(`${API_PREFIX}/schools`, schoolRouter);
app.use(`${API_PREFIX}/users`, userRouter);
app.use(`${API_PREFIX}/students`, studentRouter);
app.use(`${API_PREFIX}/academic-years`, academicYearRouter);
app.use(`${API_PREFIX}/classrooms`, classroomRouter);
app.use(`${API_PREFIX}/enrollments`, enrollmentRouter);
app.use(`${API_PREFIX}/payments`, paymentRouter);
app.use(`${API_PREFIX}/curricular-areas`, curricularAreaRouter);
app.use(`${API_PREFIX}/grades`, gradeRouter);
app.use(`${API_PREFIX}/attendance`, attendanceRouter);
app.use(`${API_PREFIX}/family-relationships`, familyRelationshipRouter);
app.use(`${API_PREFIX}/announcements`, announcementRouter);
app.use(`${API_PREFIX}/catalog`, catalogRouter);
app.use(`${API_PREFIX}/course-assignments`, courseAssignmentRouter);
app.use(`${API_PREFIX}/notifications`, notificationRouter);
app.use(`${API_PREFIX}/uploads`, uploadRouter);
app.use(`${API_PREFIX}/course-contents`, courseContentRouter);
app.use(`${API_PREFIX}/academic-reports`, academicReportRouter);
app.use(`${API_PREFIX}/incidents`, incidentRouter);
app.use(`${API_PREFIX}/audit-logs`, auditLogRouter);
app.use(`${API_PREFIX}/legal`, legalRouter);

app.use((_req, res) => {
  res.status(404).json({ status: 'fail', message: 'Ruta no encontrada' });
});

app.use(globalErrorHandler);

export { app };
```
Nota: se eliminó `app.use('/uploads', express.static(...))`. Ya no se sirven archivos públicos.

### 4.4 `back/src/core/middlewares/error-handler.middleware.ts`
- En la respuesta del caso `P2002`, **elimina** la línea `errors: prismaError.meta,`.
- En el bloque "Error no controlado", antes de `console.error`, agrega:
  ```ts
  if (env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
  ```
  e importa `import * as Sentry from '@sentry/node';`.

### 4.5 Sentry (opcional por variable de entorno)
1. `cd back && pnpm add @sentry/node`
2. Crea `back/src/instrument.ts`:
   ```ts
   import 'dotenv/config';
   import * as Sentry from '@sentry/node';

   if (process.env.SENTRY_DSN) {
     Sentry.init({
       dsn: process.env.SENTRY_DSN,
       environment: process.env.NODE_ENV,
       tracesSampleRate: 0,
       sendDefaultPii: false,
     });
   }
   ```
3. En `back/src/server.ts`, la **primera línea** del archivo debe ser `import './instrument';` (antes de `import 'dotenv/config';`).

Verifica y haz commit.

---

## BLOQUE 5 — Archivos privados (Google Drive) y subida segura

### 5.1 `back/src/modules/uploads/google-drive.service.ts`
Modifica la clase así:
1. **Elimina** el método `uploadFile` completo (el que asignaba el permiso `anyone/reader`).
2. Agrega la propiedad `private folderCache = new Map<string, string>();`.
3. Agrega estos métodos públicos y privados:
```ts
  private async ensureFolder(parentId: string, name: string): Promise<string> {
    const cacheKey = `${parentId}/${name}`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) return cached;
    if (!this.driveClient) throw new AppError('Google Drive no está configurado.', 503);

    const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const existing = await this.driveClient.files.list({
      q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    let folderId = existing.data.files?.[0]?.id ?? null;
    if (!folderId) {
      const created = await this.driveClient.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
        fields: 'id',
        supportsAllDrives: true,
      });
      folderId = created.data.id ?? null;
    }
    if (!folderId) throw new AppError('No se pudo crear la carpeta en Google Drive.', 500);
    this.folderCache.set(cacheKey, folderId);
    return folderId;
  }

  /** Sube un archivo PRIVADO (sin permisos públicos) dentro de /<raíz>/<segmentos...>. Devuelve el fileId de Drive. */
  public async uploadPrivateFile(input: {
    tempPath: string;
    fileName: string;
    mimeType: string;
    folderPath: string[];
  }): Promise<string> {
    const rootId = await this.getFolderId();
    if (!this.driveClient || !rootId) throw new AppError('Google Drive no está configurado.', 503);

    let parentId = rootId;
    for (const segment of input.folderPath) {
      parentId = await this.ensureFolder(parentId, segment);
    }

    const response = await this.driveClient.files.create({
      requestBody: { name: input.fileName, parents: [parentId] },
      media: { mimeType: input.mimeType, body: fs.createReadStream(input.tempPath) },
      fields: 'id',
      supportsAllDrives: true,
    });
    if (!response.data.id) throw new AppError('Error al subir el archivo a Google Drive.', 502);
    return response.data.id;
  }

  public async getFileStream(fileId: string): Promise<NodeJS.ReadableStream> {
    if (!this.driveClient) throw new AppError('Google Drive no está configurado.', 503);
    const response = await this.driveClient.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );
    return response.data as unknown as NodeJS.ReadableStream;
  }

  /** Envía el archivo a la papelera de Drive (recuperable durante 30 días). */
  public async trashFile(fileId: string): Promise<void> {
    if (!this.driveClient) return;
    await this.driveClient.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true });
  }

  public async getFileMetadata(fileId: string): Promise<{ name: string; mimeType: string; size: number; ownedByMe: boolean } | null> {
    if (!this.driveClient) return null;
    try {
      const response = await this.driveClient.files.get({
        fileId,
        fields: 'name, mimeType, size, ownedByMe',
        supportsAllDrives: true,
      });
      return {
        name: response.data.name ?? 'archivo',
        mimeType: response.data.mimeType ?? 'application/octet-stream',
        size: Number(response.data.size ?? 0),
        ownedByMe: Boolean(response.data.ownedByMe),
      };
    } catch {
      return null;
    }
  }

  /** Elimina cualquier permiso público ("anyone") del archivo. */
  public async revokePublicAccess(fileId: string): Promise<number> {
    if (!this.driveClient) return 0;
    const permissions = await this.driveClient.permissions.list({
      fileId,
      fields: 'permissions(id,type)',
      supportsAllDrives: true,
    });
    let revoked = 0;
    for (const permission of permissions.data.permissions ?? []) {
      if (permission.type === 'anyone' && permission.id) {
        await this.driveClient.permissions.delete({ fileId, permissionId: permission.id, supportsAllDrives: true });
        revoked++;
      }
    }
    return revoked;
  }
```
4. Quita el import de `path` si deja de usarse. Elimina `UploadResult` si deja de usarse.

### 5.2 Crea `back/src/modules/uploads/file-signature.util.ts`
```ts
import fs from 'fs';
import { AppError } from '../../core/errors/app-error';

const isJpeg = (b: Buffer): boolean => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isZip = (b: Buffer): boolean =>
  b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isOle = (b: Buffer): boolean => b.subarray(0, 8).equals(OLE_SIGNATURE);

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  '.pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
  '.png': (b) => b.subarray(0, 8).equals(PNG_SIGNATURE),
  '.jpg': isJpeg,
  '.jpeg': isJpeg,
  '.webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  '.docx': isZip,
  '.xlsx': isZip,
  '.pptx': isZip,
  '.zip': isZip,
  '.doc': isOle,
  '.xls': isOle,
  '.ppt': isOle,
  '.txt': (b) => !b.includes(0),
};

/** Verifica que el contenido real del archivo corresponda a su extensión (firma o "magic bytes"). */
export async function assertFileSignature(filePath: string, extension: string): Promise<void> {
  const check = SIGNATURES[extension];
  if (!check) {
    throw new AppError('Formato de archivo no permitido.', 415);
  }
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(4100);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (!check(buffer.subarray(0, bytesRead))) {
      throw new AppError('El contenido del archivo no coincide con su extensión.', 415);
    }
  } finally {
    await handle.close();
  }
}
```

### 5.3 Crea `back/src/modules/files/file-storage.service.ts`
```ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { StoredFile } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { googleDriveService } from '../uploads/google-drive.service';

const LOCAL_DIR = path.join(process.cwd(), 'storage-local');

export type FilePurpose = 'COURSE_MATERIAL' | 'HOMEWORK_SUBMISSION' | 'OTHER';

const sanitizeFileName = (name: string): string =>
  path.basename(name).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_').slice(0, 150) || 'archivo';

export const extractStoredFileId = (url?: string | null): string | null => {
  const match = url?.match(/^\/api\/files\/([0-9a-f-]{36})$/i);
  return match ? match[1] : null;
};

export class FileStorageService {
  async assertDailyQuota(schoolId: string, uploadedById: string, maxPerDay: number): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.storedFile.count({ where: { schoolId, uploadedById, createdAt: { gte: since } } });
    if (count >= maxPerDay) {
      throw new AppError(`Alcanzaste el límite de ${maxPerDay} archivos por día. Intenta mañana.`, 429);
    }
  }

  async store(input: {
    schoolId: string;
    uploadedById: string;
    uploaderRole: string;
    purpose: FilePurpose;
    tempPath: string;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<StoredFile> {
    const fileName = sanitizeFileName(input.originalName);
    const base = {
      schoolId: input.schoolId,
      uploadedById: input.uploadedById,
      uploaderRole: input.uploaderRole,
      purpose: input.purpose,
      fileName,
      mimeType: input.mimeType || 'application/octet-stream',
      size: input.size,
    };

    if (googleDriveService.isConfigured()) {
      const driveFileId = await googleDriveService.uploadPrivateFile({
        tempPath: input.tempPath,
        fileName,
        mimeType: base.mimeType,
        folderPath: [input.schoolId, String(new Date().getFullYear()), input.purpose],
      });
      return prisma.storedFile.create({ data: { ...base, storage: 'GOOGLE_DRIVE', driveFileId } });
    }

    if (env.NODE_ENV === 'production') {
      throw new AppError('El almacenamiento de archivos no está disponible. Intenta nuevamente en unos minutos.', 503);
    }

    await fs.promises.mkdir(LOCAL_DIR, { recursive: true });
    const localName = `${crypto.randomUUID()}${path.extname(fileName).toLowerCase()}`;
    await fs.promises.copyFile(input.tempPath, path.join(LOCAL_DIR, localName));
    return prisma.storedFile.create({ data: { ...base, storage: 'LOCAL', localPath: localName } });
  }

  async getForSchool(id: string, schoolId: string): Promise<StoredFile> {
    const file = await prisma.storedFile.findFirst({ where: { id, schoolId, deletedAt: null } });
    if (!file) throw new AppError('Archivo no encontrado.', 404);
    return file;
  }

  async getById(id: string): Promise<StoredFile> {
    const file = await prisma.storedFile.findFirst({ where: { id, deletedAt: null } });
    if (!file) throw new AppError('Archivo no encontrado.', 404);
    return file;
  }

  async openStream(file: StoredFile): Promise<NodeJS.ReadableStream> {
    if (file.storage === 'GOOGLE_DRIVE' && file.driveFileId) {
      return googleDriveService.getFileStream(file.driveFileId);
    }
    if (file.storage === 'LOCAL' && file.localPath) {
      return fs.createReadStream(path.join(LOCAL_DIR, path.basename(file.localPath)));
    }
    throw new AppError('Archivo no disponible.', 404);
  }

  /** Marca el archivo como eliminado y lo envía a la papelera de Drive. No lanza errores. */
  async softDeleteByUrl(url?: string | null): Promise<void> {
    const id = extractStoredFileId(url);
    if (!id) return;
    try {
      const file = await prisma.storedFile.update({ where: { id }, data: { deletedAt: new Date() } });
      if (file.storage === 'GOOGLE_DRIVE' && file.driveFileId) {
        await googleDriveService.trashFile(file.driveFileId);
      } else if (file.storage === 'LOCAL' && file.localPath) {
        await fs.promises.unlink(path.join(LOCAL_DIR, path.basename(file.localPath))).catch(() => undefined);
      }
    } catch (error) {
      console.error('[Files] No se pudo eliminar el archivo', id, error);
    }
  }
}

export const fileStorageService = new FileStorageService();
```

### 5.4 Reemplaza `back/src/modules/uploads/upload.routes.ts` por:
```ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { AppError } from '../../core/errors/app-error';
import { assertFileSignature } from './file-signature.util';
import { fileStorageService, type FilePurpose } from '../files/file-storage.service';

export const uploadRouter = Router();

const STAFF_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'];
const FAMILY_ROLES = ['PARENT', 'STUDENT'];
const MAX_STAFF_BYTES = 30 * 1024 * 1024;
const MAX_FAMILY_BYTES = 15 * 1024 * 1024;
const DAILY_QUOTA_STAFF = 100;
const DAILY_QUOTA_FAMILY = 20;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp', '.zip', '.txt',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_STAFF_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new AppError(`Tipo de archivo no permitido (${ext}). Formatos válidos: PDF, Word, Excel, PowerPoint, imágenes, ZIP o TXT.`, 400));
    }
  },
});

uploadRouter.use(authMiddleware, tenantMiddleware);

uploadRouter.post(
  ['/material', '/materials'],
  authorizeRoles(...STAFF_ROLES, ...FAMILY_ROLES),
  upload.single('file'),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError('No se ha subido ningún archivo.', 400);

    const user = req.user!;
    const isFamily = FAMILY_ROLES.includes(user.role);

    try {
      if (isFamily && file.size > MAX_FAMILY_BYTES) {
        throw new AppError('El archivo supera el máximo de 15 MB permitido para entregas.', 413);
      }
      await assertFileSignature(file.path, path.extname(file.originalname).toLowerCase());

      const uploadedById = user.studentId ?? user.userId;
      await fileStorageService.assertDailyQuota(user.schoolId, uploadedById, isFamily ? DAILY_QUOTA_FAMILY : DAILY_QUOTA_STAFF);

      const requestedPurpose = (req.body as { purpose?: string }).purpose;
      const purpose: FilePurpose = isFamily
        ? 'HOMEWORK_SUBMISSION'
        : requestedPurpose === 'HOMEWORK_SUBMISSION'
          ? 'HOMEWORK_SUBMISSION'
          : 'COURSE_MATERIAL';

      const stored = await fileStorageService.store({
        schoolId: user.schoolId,
        uploadedById,
        uploaderRole: user.role,
        purpose,
        tempPath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });

      const url = `/api/files/${stored.id}`;
      res.status(201).json({
        status: 'success',
        data: {
          fileId: stored.id,
          url,
          viewUrl: url,
          downloadUrl: url,
          fileName: stored.fileName,
          fileType: stored.mimeType,
          fileSize: stored.size,
          storage: stored.storage,
        },
      });
    } finally {
      await fs.promises.unlink(file.path).catch(() => undefined);
    }
  },
);
```

### 5.5 Crea `back/src/modules/files/file.routes.ts`
```ts
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { fileStorageService } from './file-storage.service';

export const fileRouter = Router();

const SIGNED_URL_TTL_SECONDS = 600;
const INLINE_MIME = /^(application\/pdf|image\/(png|jpeg|webp))$/;

const sign = (id: string, exp: number): string =>
  crypto.createHmac('sha256', env.FILES_SIGNING_SECRET).update(`${id}.${exp}`).digest('base64url');

/**
 * GET /api/files/:id/link — (autenticado) genera una URL firmada válida por 10 minutos.
 */
fileRouter.get('/:id/link', authMiddleware, tenantMiddleware, async (req: Request, res: Response) => {
  const file = await fileStorageService.getForSchool(String(req.params.id), req.user!.schoolId);
  const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  const url = `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/files/${file.id}/content?exp=${exp}&sig=${sign(file.id, exp)}`;
  res.status(200).json({
    status: 'success',
    data: {
      url,
      downloadUrl: `${url}&download=1`,
      expiresAt: new Date(exp * 1000).toISOString(),
      fileName: file.fileName,
      mimeType: file.mimeType,
    },
  });
});

/**
 * GET /api/files/:id/content?exp=&sig=[&download=1] — entrega el archivo si la firma es válida.
 */
fileRouter.get('/:id/content', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const exp = Number(req.query.exp);
  const sig = String(req.query.sig ?? '');

  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
    throw new AppError('El enlace del archivo expiró. Vuelve a abrirlo desde la plataforma.', 410);
  }
  const provided = Buffer.from(sig);
  const expected = Buffer.from(sign(id, exp));
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new AppError('Enlace de archivo inválido.', 403);
  }

  const file = await fileStorageService.getById(id);
  const inline = INLINE_MIME.test(file.mimeType) && req.query.download !== '1';
  const frameAncestors = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean).join(' ');

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${frameAncestors}`);

  const stream = await fileStorageService.openStream(file);
  stream.on('error', (error) => {
    console.error('[Files] Error al transmitir archivo', id, error);
    if (!res.headersSent) {
      res.status(502).end();
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
});
```

### 5.6 Eliminar archivos al borrar contenidos o reemplazar entregas
- `course-content.service.ts` → `delete`: antes de `this.repository.delete(...)`, obtén las URLs a borrar:
  ```ts
  const submissions = await prisma.homeworkSubmission.findMany({ where: { courseContentId: id }, select: { fileUrl: true } });
  const urlsToDelete = [content.fileUrl, ...submissions.map((s) => s.fileUrl)];
  ```
  Después del delete: `await Promise.all(urlsToDelete.map((u) => fileStorageService.softDeleteByUrl(u)));` (importa `prisma` y `fileStorageService`).
- En el método del servicio que crea o actualiza una entrega de tarea (el que llama al repositorio en la línea ~644/655 de `course-content.repository.ts` con `upsert`/`update`): antes de guardar, lee la entrega existente (`courseContentId` + `enrollmentId`). Si existe y su `fileUrl` es distinto del nuevo, después de guardar llama a `fileStorageService.softDeleteByUrl(anterior.fileUrl)`.

### 5.7 `course-content.schema.ts`
En `submitHomeworkSchema`, reemplaza `fileUrl: z.string().url('fileUrl debe ser una URL válida'),` por:
```ts
  fileUrl: z
    .string()
    .trim()
    .refine((value) => value.startsWith('/api/files/') || /^https:\/\//.test(value), 'fileUrl inválido'),
```

### 5.8 Script `back/scripts/migrate-drive-files-to-private.ts`
Convierte los archivos de Drive que hoy son públicos en archivos privados registrados:
```ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { googleDriveService } from '../src/modules/uploads/google-drive.service';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const extractDriveId = (url: string): string | null =>
  url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ?? null;

async function migrateOne(params: {
  url: string;
  schoolId: string;
  uploadedById: string;
  uploaderRole: string;
  purpose: string;
  fallbackName: string | null;
  update: (newUrl: string) => Promise<unknown>;
}): Promise<'migrated' | 'skipped'> {
  const driveId = extractDriveId(params.url);
  if (!driveId) return 'skipped';
  const meta = await googleDriveService.getFileMetadata(driveId);
  if (!meta || !meta.ownedByMe) return 'skipped'; // enlace externo pegado por un docente: se deja igual
  if (DRY_RUN) return 'migrated';

  await googleDriveService.revokePublicAccess(driveId);
  const stored = await prisma.storedFile.upsert({
    where: { driveFileId: driveId },
    update: {},
    create: {
      schoolId: params.schoolId,
      uploadedById: params.uploadedById,
      uploaderRole: params.uploaderRole,
      purpose: params.purpose,
      storage: 'GOOGLE_DRIVE',
      driveFileId: driveId,
      fileName: params.fallbackName || meta.name,
      mimeType: meta.mimeType,
      size: meta.size,
    },
  });
  await params.update(`/api/files/${stored.id}`);
  return 'migrated';
}

async function main(): Promise<void> {
  if (!googleDriveService.isConfigured()) throw new Error('Google Drive no está configurado.');
  let migrated = 0;
  let skipped = 0;

  const contents = await prisma.courseContent.findMany({
    where: { fileUrl: { contains: 'drive.google.com' } },
    select: { id: true, schoolId: true, teacherId: true, fileUrl: true, fileName: true },
  });
  for (const c of contents) {
    const r = await migrateOne({
      url: c.fileUrl!, schoolId: c.schoolId, uploadedById: c.teacherId, uploaderRole: 'TEACHER',
      purpose: 'COURSE_MATERIAL', fallbackName: c.fileName,
      update: (newUrl) => prisma.courseContent.update({ where: { id: c.id }, data: { fileUrl: newUrl } }),
    });
    r === 'migrated' ? migrated++ : skipped++;
  }

  const submissions = await prisma.homeworkSubmission.findMany({
    where: { fileUrl: { contains: 'drive.google.com' } },
    select: { id: true, schoolId: true, fileUrl: true, fileName: true, enrollment: { select: { studentId: true } } },
  });
  for (const s of submissions) {
    const r = await migrateOne({
      url: s.fileUrl, schoolId: s.schoolId, uploadedById: s.enrollment.studentId, uploaderRole: 'STUDENT',
      purpose: 'HOMEWORK_SUBMISSION', fallbackName: s.fileName,
      update: (newUrl) => prisma.homeworkSubmission.update({ where: { id: s.id }, data: { fileUrl: newUrl } }),
    });
    r === 'migrated' ? migrated++ : skipped++;
  }

  console.log(`${DRY_RUN ? '[SIMULACIÓN] ' : ''}Migrados: ${migrated} | Omitidos: ${skipped}`);
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => void prisma.$disconnect());
```
**No lo ejecutes contra producción.** Ejecútalo solo en local con `pnpm run drive:migrate-private -- --dry-run`.

### 5.8-bis Usar el servicio nuevo en `check-drive.ts`
En `back/scripts/check-drive.ts`, si se usa `googleDriveService.uploadFile`, reemplázalo por `uploadPrivateFile` con `folderPath: ['diagnostico']`.

### 5.9 Frontend: archivos con URL firmada
**a) Agrega al final de `front/src/features/course-contents/utils/fileUrls.ts`:**
```ts
import { api } from '@/lib/axios';
import { toast } from 'sonner';

export const getInternalFileId = (url?: string | null): string | null =>
  url?.match(/^\/api\/files\/([0-9a-f-]{36})$/i)?.[1] ?? null;

export const isInternalFileUrl = (url?: string | null): boolean => Boolean(getInternalFileId(url));

/** Devuelve una URL utilizable: firmada (archivos internos) o la transformada actual (enlaces externos). */
export async function resolveFileUrl(url: string, options: { download?: boolean } = {}): Promise<string> {
  const id = getInternalFileId(url);
  if (!id) {
    return options.download ? getDirectDownloadUrl(url) : getPreviewUrl(url) || url;
  }
  const response = await api.get<{ status: string; data: { url: string; downloadUrl: string } }>(`/files/${id}/link`);
  return options.download ? response.data.data.downloadUrl : response.data.data.url;
}

/** Abre un archivo en una pestaña nueva (la abre antes del await para evitar el bloqueo de ventanas emergentes). */
export async function openFile(url: string, options: { download?: boolean } = {}): Promise<void> {
  const newWindow = window.open('', '_blank');
  try {
    const resolved = await resolveFileUrl(url, options);
    if (newWindow) {
      newWindow.opener = null;
      newWindow.location.href = resolved;
    } else {
      window.location.href = resolved;
    }
  } catch {
    newWindow?.close();
    toast.error('No se pudo abrir el archivo. Intenta nuevamente.');
  }
}
```
Mueve esos dos `import` a la parte superior del archivo.

**b) Crea `front/src/features/course-contents/api/useResolvedFileUrl.ts`:**
```ts
import { useQuery } from '@tanstack/react-query';
import { resolveFileUrl } from '../utils/fileUrls';

export const useResolvedFileUrl = (url?: string | null) =>
  useQuery({
    queryKey: ['file-link', url],
    queryFn: () => resolveFileUrl(url as string),
    enabled: Boolean(url),
    staleTime: 8 * 60 * 1000,
    gcTime: 9 * 60 * 1000,
  });
```

**c) Reemplaza los enlaces directos** en estos archivos. Cada `<a href={getDirectDownloadUrl(X)} ...>...</a>` se convierte en `<button type="button" onClick={() => void openFile(X, { download: true })} ...>...</button>`, conservando `className` e hijos (quita `target`, `rel` y `download`). Aplica en:
- `CourseContentCard.tsx` (línea ~291; deja de calcular `downloadUrl` en la línea ~66);
- `HomeworkSubmissionsModal.tsx` (línea ~264);
- `StudentPendingTasksCard.tsx` (línea ~132);
- `SubmitHomeworkModal.tsx` (donde use `getDirectDownloadUrl`).

**d) `DocumentPreviewModal.tsx`:**
1. Mueve los hooks antes del `if (!isOpen || !fileUrl) return null;` y agrega:
   ```ts
   const internal = isInternalFileUrl(fileUrl);
   const { data: signedPreviewUrl, isLoading: isResolving } = useResolvedFileUrl(isOpen && internal ? fileUrl : null);
   ```
2. Después del early return: `const previewUrl = internal ? signedPreviewUrl ?? '' : getPreviewUrl(fileUrl);`
3. Para archivos internos cuyo `fileName` no termine en `.pdf`, `.png`, `.jpg`, `.jpeg` o `.webp`, no renderices `iframe`/`img`. Muestra en su lugar: `La vista previa no está disponible para este tipo de archivo. Descárgalo para abrirlo.` con un botón **"Descargar"** que llame a `openFile(fileUrl, { download: true })`.
4. Mientras `isResolving` sea verdadero, muestra el `Skeleton` de `components/ui/skeleton.tsx` en el área de vista previa.
5. Los botones **"Descargar"** y **"Abrir en pestaña nueva"** usan `openFile(fileUrl, { download: true })` y `openFile(fileUrl)` respectivamente.

**e) `useCourseContents.ts`:** agrega a `UploadFileResponse` el campo `fileId: string`. No cambies nada más: `PublishContentModal` ya usa `uploaded.url`, que ahora es `/api/files/<id>`.

Verifica back y front, y haz commit.

---

## BLOQUE 6 — Pagos: acceso indebido, recibo interno y montos

### 6.1 Verificar que el padre sea apoderado (IDOR)
**a) `payment.repository.ts` → `TRANSACTION_INCLUDE`:** dentro de `student: { select: { ... } }` agrega `familyRelations: { select: { userId: true } },`.

**b) `payment.controller.ts`:** `getObligationById` y `getTransactionReceipt` deben pasar el contexto al servicio:
```ts
const userContext = { userId: request.user!.userId, role: request.user!.role };
const obligation = await this.paymentService.getObligationById(id, schoolId, userContext);
```
(igual para `getTransactionReceipt`).

**c) `payment.service.ts`:** agrega el parámetro opcional `userContext?: { userId: string; role: string }` a ambos métodos. Después de encontrar el registro:
```ts
if (userContext?.role === 'PARENT') {
  const relations = (obligation as unknown as {
    enrollment: { student: { familyRelations: Array<{ userId?: string; user?: { id: string } }> } };
  }).enrollment.student.familyRelations;
  const isGuardian = relations.some((r) => (r.userId ?? r.user?.id) === userContext.userId);
  if (!isGuardian) throw new AppError('No tienes permisos para ver este registro.', 403);
}
```
En `getTransactionReceipt` la ruta es `transaction.obligation.enrollment.student.familyRelations`.

### 6.2 Solo recibos internos
- `payment.schema.ts`: reemplaza ambas definiciones de `receiptType` (líneas ~27 y ~65) por `receiptType: z.literal('RECIBO_INTERNO').optional(),`.
- `payment.repository.ts` (línea ~283) y `payment.service.ts` (línea ~137): `receiptType: 'RECIBO_INTERNO',` (constante, sin leer del DTO).
- `payment.service.ts` → `getTransactionReceipt`: agrega al objeto devuelto
  `legalNotice: 'Documento interno de control de pagos. No es un comprobante de pago electrónico válido ante SUNAT.'`.
- `front/src/features/payments/components/ReceiptModal.tsx`:
  - reemplaza cualquier texto visible "Boleta" o "BOLETA" por "Recibo interno de pago";
  - al pie del recibo (dentro del área imprimible) agrega:
    ```tsx
    <p className="mt-4 text-center text-[10px] leading-snug text-muted-foreground">
      Documento interno de control de pagos. No es un comprobante de pago electrónico válido ante SUNAT.
    </p>
    ```
- En `RegisterTransactionModal.tsx` y `CreateIndividualObligationModal.tsx`, si existe un selector de tipo de comprobante con BOLETA/FACTURA, elimínalo y envía siempre `receiptType: 'RECIBO_INTERNO'` (o no lo envíes).

Verifica back y front, y haz commit.

---

## BLOQUE 7 — Correo (Nodemailer)

### 7.1 `back/src/utils/notification.util.ts`
**a) Reemplaza `getMailTransporter` por:**
```ts
export const getMailTransporter = (): Transporter | null => {
  if (transporterInstance) return transporterInstance;

  const smtpUser = env.SMTP_USER || env.USER_EMAIL;
  const smtpPass = env.SMTP_PASS || env.PASS_EMAIL;
  if (!smtpUser || !smtpPass) {
    console.warn('[EMAIL WARNING] Credenciales SMTP no configuradas (SMTP_USER/SMTP_PASS).');
    return null;
  }

  transporterInstance = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: smtpUser, pass: smtpPass },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
  });

  return transporterInstance;
};
```

**b) En `sendEmail`**, el remitente pasa a ser `from: env.MAIL_FROM || \`"SaaSchool - Notificaciones" <${env.SMTP_USER || env.USER_EMAIL}>\``.

**c) Agrega, debajo de los imports:**
```ts
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
```
**d) En `sendReminderNotification`**, al inicio, crea
```ts
const safe = {
  recipientName: escapeHtml(params.recipientName),
  studentName: escapeHtml(params.studentName),
  obligationTitle: escapeHtml(params.obligationTitle),
};
```
y dentro de `emailHtml` usa `safe.recipientName`, `safe.studentName` y `safe.obligationTitle` en lugar de `params.*`. El texto plano (`emailBody`) sigue usando `params.*`. Aplica el mismo patrón a cualquier otra plantilla HTML de este archivo que interpole datos de usuario.

### 7.2 Envío masivo en serie
En `payment.service.ts`, en el método que envía recordatorios masivos (`sendBulkReminders` o el que itera obligaciones y llama a `sendReminderNotification`/`sendEmail`):
- Reemplaza `Promise.all`/`map` por un bucle `for...of` secuencial.
- Entre envíos espera 400 ms: `await new Promise((resolve) => setTimeout(resolve, 400));`.
- Pon un tope de 300 envíos por ejecución; los restantes cuentan como `skipped`.
- Devuelve `{ sent, failed, skipped }` además de lo que ya devuelva hoy.

Verifica y haz commit.

---

## BLOQUE 8 — Evaluación: libretas, escala, situación final y SIAGIE

### 8.1 Quitar el bloqueo de libretas por deuda (Ley 27665)
**a) `grade.service.ts`:** elimina el bloque completo `// Bloqueo de libreta por morosidad ...` (el `if (rawData.student.school.blockGradesOnOverdue && ...) { ... }`, líneas ~173-187). Si `countOverdueObligations` queda sin uso, elimínalo del repositorio.

**b) `school.schema.ts`:** renombra `blockGradesOnOverdue` a `blockCertificatesOnOverdue`. Busca en `back/src` cualquier otra referencia a `blockGradesOnOverdue` y renómbrala.

**c) `student.service.ts` → `getEnrollmentCertificate`:** después de las verificaciones de acceso existentes, agrega:
```ts
if (userContext?.role === 'PARENT' || userContext?.role === 'STUDENT') {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { blockCertificatesOnOverdue: true } });
  if (school?.blockCertificatesOnOverdue) {
    const overdue = await prisma.paymentObligation.count({
      where: {
        schoolId,
        enrollment: { studentId },
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: new Date() },
      },
    });
    if (overdue > 0) {
      throw new AppError(
        'La constancia oficial no puede emitirse mientras existan pensiones vencidas. Las notas, la libreta y la asistencia siguen disponibles. Acércate a Administración.',
        402,
      );
    }
  }
}
```
(Usa los nombres reales de variables del método: el id del alumno y el contexto de usuario ya existen ahí).

**d) Frontend:**
- `features/schools/types.ts`: renombra `blockGradesOnOverdue` a `blockCertificatesOnOverdue` en ambas interfaces.
- `SchoolSettingsModal.tsx`: renombra el campo del formulario y cambia los textos:
  - Título: `Retener constancias oficiales por deuda vencida`
  - Descripción: `Conforme a la Ley 27665, solo se pueden retener constancias y certificados de periodos no pagados. Las notas, la libreta y la asistencia SIEMPRE permanecen visibles para las familias.`
- Busca `402` en `front/src/features/grades` (por ejemplo, en `ReportCardModal.tsx`) y elimina la rama de interfaz que mostraba la libreta bloqueada por deuda.

### 8.2 Escala de conversión configurable (GradingScale)
**a) En `back/src/modules/grades/siagie-consolidator.service.ts`**, reemplaza `scoreToLetter` por:
```ts
export interface LetterScaleThresholds {
  AD: number;
  A: number;
  B: number;
}

export const DEFAULT_LETTER_THRESHOLDS: LetterScaleThresholds = { AD: 17.5, A: 13.5, B: 10.5 };

/** Convierte un puntaje numérico (0-20) a la escala literal CNEB según los umbrales del colegio. */
export function scoreToLetter(
  score: number | null,
  thresholds: LetterScaleThresholds = DEFAULT_LETTER_THRESHOLDS,
): 'AD' | 'A' | 'B' | 'C' | null {
  if (score === null || Number.isNaN(score)) return null;
  if (score >= thresholds.AD) return 'AD';
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  return 'C';
}

export function thresholdsFromGradingScale(
  rows: Array<{ letterGrade: string; minNumeric: number }>,
): LetterScaleThresholds {
  const find = (letter: string, fallback: number) => rows.find((r) => r.letterGrade === letter)?.minNumeric ?? fallback;
  return {
    AD: find('AD', DEFAULT_LETTER_THRESHOLDS.AD),
    A: find('A', DEFAULT_LETTER_THRESHOLDS.A),
    B: find('B', DEFAULT_LETTER_THRESHOLDS.B),
  };
}
```

**b) En `grade.repository.ts`**, agrega:
```ts
private letterThresholdCache = new Map<string, { value: LetterScaleThresholds; expiresAt: number }>();

async getLetterThresholds(schoolId: string, level: EducationLevel): Promise<LetterScaleThresholds> {
  const key = `${schoolId}:${level}`;
  const cached = this.letterThresholdCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const rows = await prisma.gradingScale.findMany({ where: { schoolId, level }, select: { letterGrade: true, minNumeric: true } });
  const value = thresholdsFromGradingScale(rows);
  this.letterThresholdCache.set(key, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
  return value;
}

clearLetterThresholds(schoolId: string): void {
  for (const key of this.letterThresholdCache.keys()) {
    if (key.startsWith(`${schoolId}:`)) this.letterThresholdCache.delete(key);
  }
}

async upsertGradingScale(schoolId: string, level: EducationLevel, t: LetterScaleThresholds): Promise<void> {
  const rows = [
    { letterGrade: 'AD', minNumeric: t.AD, maxNumeric: 20 },
    { letterGrade: 'A', minNumeric: t.A, maxNumeric: t.AD - 0.01 },
    { letterGrade: 'B', minNumeric: t.B, maxNumeric: t.A - 0.01 },
    { letterGrade: 'C', minNumeric: 0, maxNumeric: t.B - 0.01 },
  ];
  await prisma.$transaction(
    rows.map((r) =>
      prisma.gradingScale.upsert({
        where: { schoolId_level_letterGrade: { schoolId, level, letterGrade: r.letterGrade } },
        update: { minNumeric: r.minNumeric, maxNumeric: r.maxNumeric },
        create: { schoolId, level, ...r },
      }),
    ),
  );
  this.clearLetterThresholds(schoolId);
}
```

**c) Busca todas las llamadas a `scoreToLetter(`** en `back/src`. En cada una donde estén disponibles `schoolId` y el nivel educativo (`educationLevel` del aula), obtén `const thresholds = await gradeRepository.getLetterThresholds(schoolId, level)` **una sola vez** antes del bucle y pásalo como segundo argumento. Si la función del consolidador es síncrona, agrégale un parámetro opcional `thresholds?: LetterScaleThresholds` y pásaselo desde quien la llama.

**d) Endpoints** en `grade.routes.ts` (después de `gradeRouter.use(...)`):
```ts
gradeRouter.get('/grading-scale', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), gradeController.getGradingScale);
gradeRouter.put('/grading-scale', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), gradeController.updateGradingScale);
```
- Schema en `grade.schema.ts`:
  ```ts
  export const gradingScaleSchema = z
    .object({
      level: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']),
      AD: z.number().min(0).max(20),
      A: z.number().min(0).max(20),
      B: z.number().min(0).max(20),
    })
    .refine((v) => v.B > 0 && v.B < v.A && v.A < v.AD, { message: 'Los umbrales deben cumplir 0 < B < A < AD ≤ 20' });
  export const gradingScaleQuerySchema = z.object({ level: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']) });
  ```
- Controller: `getGradingScale` responde `{ status: 'success', data: await repo.getLetterThresholds(schoolId, level) }` (pásalo por el servicio si el módulo lo exige). `updateGradingScale` llama a `upsertGradingScale` y responde con los umbrales guardados.

**e) Frontend** (`features/grades/pages/EvaluationCriteriaPage.tsx`): agrega al final una tarjeta **"Escala de conversión numérica → literal"**, visible solo para `SCHOOL_ADMIN`/`SUPER_ADMIN`:
- un select de nivel (Primaria/Secundaria);
- tres inputs numéricos con paso 0.5: **"AD desde"**, **"A desde"**, **"B desde"**, con el texto auxiliar `C: por debajo de B`;
- el botón **"Guardar escala"**.
Crea los hooks `useGradingScale(level)` y `useUpdateGradingScale()` en `features/grades/api/` con el mismo patrón que los demás hooks del módulo.

### 8.3 Reglas de situación final configurables
**a) Crea `back/src/modules/grades/promotion-rules.ts`:**
```ts
/**
 * Reglas de situación final (promoción / recuperación / permanencia).
 *
 * IMPORTANTE: los valores por defecto deben ser validados por la Dirección del colegio contra el texto
 * vigente de la RVM N.° 094-2020-MINEDU y sus modificatorias. Cada colegio puede ajustarlos por año
 * académico en AcademicYear.promotionRulesConfig. La situación calculada es SIEMPRE una sugerencia
 * que la Dirección debe confirmar antes del acta oficial.
 */

export type Letter = 'AD' | 'A' | 'B' | 'C';
export type FinalSituation = 'PROMOTED' | 'RECOVERY' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN';

export interface PromotionRuleConfig {
  /** Cuándo se considera desaprobada un área según la proporción de competencias en "C". */
  areaFailedWhen: 'HALF_OR_MORE_C' | 'MORE_THAN_HALF_C';
  /** Desde cuántas áreas desaprobadas corresponde permanencia. */
  retainedMinFailedAreas: number;
  /** Desde cuántas áreas desaprobadas corresponde recuperación (y menos que retainedMinFailedAreas). */
  recoveryMinFailedAreas: number;
  /** Códigos de área que no cuentan para la situación final (por ejemplo, competencias transversales). */
  excludedAreaCodes: string[];
}

export type PromotionRuleOverrides = Partial<Record<'PRIMARY' | 'SECONDARY', Partial<PromotionRuleConfig>>>;

export const DEFAULT_PROMOTION_RULES: Record<'PRIMARY' | 'SECONDARY', PromotionRuleConfig> = {
  PRIMARY: { areaFailedWhen: 'HALF_OR_MORE_C', retainedMinFailedAreas: 4, recoveryMinFailedAreas: 1, excludedAreaCodes: ['TRANS'] },
  SECONDARY: { areaFailedWhen: 'HALF_OR_MORE_C', retainedMinFailedAreas: 4, recoveryMinFailedAreas: 1, excludedAreaCodes: ['TRANS'] },
};

export interface AreaLetters {
  areaCode: string;
  letters: Letter[];
}

export interface FinalSituationInput {
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | string;
  grade: number;
  enrollmentState: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN' | string;
  areas: AreaLetters[];
}

export interface FinalSituationResult {
  situation: FinalSituation;
  failedAreasCount: number;
  failedAreaCodes: string[];
  isProvisional: true;
}

export function isAreaFailed(letters: Letter[], mode: PromotionRuleConfig['areaFailedWhen']): boolean {
  if (letters.length === 0) return false;
  const cCount = letters.filter((l) => l === 'C').length;
  return mode === 'HALF_OR_MORE_C' ? cCount * 2 >= letters.length : cCount * 2 > letters.length;
}

export function resolveRules(level: 'PRIMARY' | 'SECONDARY', overrides?: PromotionRuleOverrides | null): PromotionRuleConfig {
  return { ...DEFAULT_PROMOTION_RULES[level], ...(overrides?.[level] ?? {}) };
}

export function evaluateFinalSituation(
  input: FinalSituationInput,
  overrides?: PromotionRuleOverrides | null,
): FinalSituationResult {
  const base = { failedAreasCount: 0, failedAreaCodes: [] as string[], isProvisional: true as const };

  if (input.enrollmentState === 'WITHDRAWN') return { ...base, situation: 'WITHDRAWN' };
  if (input.enrollmentState === 'TRANSFERRED') return { ...base, situation: 'TRANSFERRED' };

  const level = String(input.educationLevel).toUpperCase();
  if (level === 'INITIAL' || (level === 'PRIMARY' && input.grade === 1)) {
    return { ...base, situation: 'PROMOTED' };
  }

  const rules = resolveRules(level === 'SECONDARY' ? 'SECONDARY' : 'PRIMARY', overrides);
  const excluded = rules.excludedAreaCodes.map((c) => c.toUpperCase());

  const failedAreaCodes = input.areas
    .filter((area) => !excluded.some((code) => area.areaCode.toUpperCase().includes(code)))
    .filter((area) => isAreaFailed(area.letters, rules.areaFailedWhen))
    .map((area) => area.areaCode);

  const failedAreasCount = failedAreaCodes.length;
  let situation: FinalSituation = 'PROMOTED';
  if (failedAreasCount >= rules.retainedMinFailedAreas) situation = 'RETAINED';
  else if (failedAreasCount >= rules.recoveryMinFailedAreas) situation = 'RECOVERY';

  return { situation, failedAreasCount, failedAreaCodes, isProvisional: true };
}
```

**b) En `siagie-consolidator.service.ts`**, reemplaza todo el bloque desde el comentario `// 4. Regla Oficial de Situación Final SIAGIE` hasta el cierre del `else` que asigna `finalSituation` (líneas ~715-757) por:
```ts
      // 4. Situación final SUGERIDA (requiere confirmación de Dirección)
      const areasForRules = Object.entries(consolidatedGrades).map(([areaCode, areaGrade]) => ({
        areaCode,
        letters: Object.values(areaGrade.competences)
          .map((c) => c.letter)
          .filter((l): l is 'AD' | 'A' | 'B' | 'C' => l === 'AD' || l === 'A' || l === 'B' || l === 'C'),
      }));
      const evaluation = evaluateFinalSituation(
        {
          educationLevel: String(classroomInfo?.educationLevel ?? ''),
          grade: Number(classroomInfo?.grade ?? 0),
          enrollmentState: st.enrollmentState,
          areas: areasForRules,
        },
        promotionRules,
      );
      const finalSituation = evaluation.situation;
```
y en el objeto `return { ...st, orderIndex, finalSituation, consolidatedGrades }` agrega `failedAreasCount: evaluation.failedAreasCount, finalSituationIsProvisional: true,`. Agrega un parámetro opcional `promotionRules?: PromotionRuleOverrides | null` a la función exportada que contiene este bloque y actualiza el tipo del alumno consolidado (interfaz cercana a la línea ~510) con `failedAreasCount?: number; finalSituationIsProvisional?: boolean;`. Importa `evaluateFinalSituation` y `PromotionRuleOverrides` desde `./promotion-rules`.

**c) En `grade.repository.ts`** (alrededor de la línea ~991, donde ya se consulta `academicYear`), pasa `academicYear?.promotionRulesConfig as PromotionRuleOverrides | null` hasta la llamada al consolidador.

**d) Frontend:**
- `SiagieConsolidatedModal.tsx`: el encabezado de la columna de situación final pasa a `Situación final (sugerida)`. Agrega sobre la tabla un aviso en ámbar: `La situación final es una sugerencia calculada con las reglas configuradas del colegio. La Dirección debe validarla antes de registrar el acta oficial en SIAGIE.`
- `ReportCardModal.tsx`: si muestra la situación final, agrega ` (sugerida)` a la etiqueta.

### 8.4 Tests (vitest)
Crea `back/src/modules/grades/__tests__/promotion-rules.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { evaluateFinalSituation, isAreaFailed } from '../promotion-rules';
import { scoreToLetter, thresholdsFromGradingScale } from '../siagie-consolidator.service';

const area = (areaCode: string, letters: Array<'AD' | 'A' | 'B' | 'C'>) => ({ areaCode, letters });

describe('isAreaFailed', () => {
  it('HALF_OR_MORE_C: 1 de 2 en C desaprueba', () => expect(isAreaFailed(['C', 'A'], 'HALF_OR_MORE_C')).toBe(true));
  it('HALF_OR_MORE_C: 1 de 3 en C aprueba', () => expect(isAreaFailed(['C', 'A', 'B'], 'HALF_OR_MORE_C')).toBe(false));
  it('MORE_THAN_HALF_C: 1 de 2 en C aprueba', () => expect(isAreaFailed(['C', 'A'], 'MORE_THAN_HALF_C')).toBe(false));
  it('sin competencias no desaprueba', () => expect(isAreaFailed([], 'HALF_OR_MORE_C')).toBe(false));
});

describe('evaluateFinalSituation', () => {
  const base = { enrollmentState: 'REGISTERED', grade: 3 };

  it('Inicial siempre promueve', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'INITIAL', areas: [area('MAT', ['C', 'C'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('1.° de primaria promueve automáticamente', () => {
    const r = evaluateFinalSituation({ ...base, grade: 1, educationLevel: 'PRIMARY', areas: [area('MAT', ['C', 'C'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('una sola C aislada NO manda a recuperación', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas: [area('MAT', ['C', 'A', 'A'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('1 área desaprobada → recuperación', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas: [area('MAT', ['C', 'A'])] });
    expect(r.situation).toBe('RECOVERY');
    expect(r.failedAreasCount).toBe(1);
  });
  it('3 áreas desaprobadas → recuperación', () => {
    const areas = ['MAT', 'COM', 'CYT'].map((c) => area(c, ['C', 'C']));
    expect(evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas }).situation).toBe('RECOVERY');
  });
  it('4 áreas desaprobadas → permanencia', () => {
    const areas = ['MAT', 'COM', 'CYT', 'CCSS'].map((c) => area(c, ['C', 'C']));
    expect(evaluateFinalSituation({ ...base, educationLevel: 'PRIMARY', areas }).situation).toBe('RETAINED');
  });
  it('competencias transversales no cuentan', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas: [area('TRANS', ['C', 'C'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('retirado y trasladado', () => {
    expect(evaluateFinalSituation({ ...base, enrollmentState: 'WITHDRAWN', educationLevel: 'PRIMARY', areas: [] }).situation).toBe('WITHDRAWN');
    expect(evaluateFinalSituation({ ...base, enrollmentState: 'TRANSFERRED', educationLevel: 'PRIMARY', areas: [] }).situation).toBe('TRANSFERRED');
  });
  it('overrides por colegio', () => {
    const r = evaluateFinalSituation(
      { ...base, educationLevel: 'SECONDARY', areas: [area('MAT', ['C', 'A'])] },
      { SECONDARY: { areaFailedWhen: 'MORE_THAN_HALF_C' } },
    );
    expect(r.situation).toBe('PROMOTED');
  });
  it('siempre es provisional', () => {
    expect(evaluateFinalSituation({ ...base, educationLevel: 'PRIMARY', areas: [] }).isProvisional).toBe(true);
  });
});

describe('scoreToLetter', () => {
  it('umbrales por defecto', () => {
    expect(scoreToLetter(18)).toBe('AD');
    expect(scoreToLetter(14)).toBe('A');
    expect(scoreToLetter(11)).toBe('B');
    expect(scoreToLetter(10)).toBe('C');
    expect(scoreToLetter(null)).toBeNull();
  });
  it('umbrales personalizados', () => {
    const t = thresholdsFromGradingScale([{ letterGrade: 'AD', minNumeric: 18 }, { letterGrade: 'A', minNumeric: 14 }, { letterGrade: 'B', minNumeric: 11 }]);
    expect(scoreToLetter(17.5, t)).toBe('A');
    expect(scoreToLetter(10.9, t)).toBe('C');
  });
});
```
Ejecuta `cd back && pnpm test`. Todos los tests deben pasar. Si `siagie-consolidator.service.ts` importa Prisma al cargarse y eso rompe el test, mueve `scoreToLetter`, `thresholdsFromGradingScale`, `DEFAULT_LETTER_THRESHOLDS` y `LetterScaleThresholds` a un archivo nuevo `back/src/modules/grades/letter-scale.ts`, reexpórtalos desde el consolidador e importa el test desde `../letter-scale`.

### 8.5 Código de estudiante SIAGIE de 14 dígitos
En `student.schema.ts`, en las dos definiciones de `studentCode` (líneas ~60-66 y ~110), cambia el regex a `/^\d{14}$/` con el mensaje `El código de estudiante SIAGIE debe tener exactamente 14 dígitos`. Conserva `.optional().nullable().or(z.literal(''))`. En el frontend (`EnrollStudentModal.tsx`, `EditStudentModal.tsx`), si hay una validación del código SIAGIE, aplica el mismo regex y mensaje.

Verifica back y front, ejecuta `pnpm test` y haz commit.

---

## BLOQUE 9 — Bitácora de auditoría

### 9.1 Crea `back/src/utils/audit.util.ts`
```ts
import type { Request } from 'express';
import { prisma } from '../config/prisma';

const SENSITIVE_KEYS = new Set(['passwordHash', 'password', 'newPassword', 'currentPassword', 'temporaryPassword', 'token']);

const sanitize = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  const json = JSON.stringify(value, (key, v) => (SENSITIVE_KEYS.has(key) ? undefined : v));
  if (!json) return undefined;
  // Limitar tamaño para no inflar la base de datos
  return json.length > 20_000 ? { truncated: true, preview: json.slice(0, 20_000) } : JSON.parse(json);
};

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Registra una acción en la bitácora sin bloquear la respuesta. Nunca lanza errores. */
export function recordAudit(request: Request, entry: AuditEntry): void {
  const user = request.user;
  if (!user?.schoolId) return;

  const before = sanitize(entry.before);
  const after = sanitize(entry.after);

  void prisma.auditLog
    .create({
      data: {
        schoolId: user.schoolId,
        actorId: user.studentId ?? user.userId,
        actorRole: user.role,
        actorEmail: user.email ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        ...(before !== undefined && { before: before as object }),
        ...(after !== undefined && { after: after as object }),
        ip: request.ip ?? null,
        userAgent: request.get('user-agent')?.slice(0, 300) ?? null,
      },
    })
    .catch((error) => console.error('[Audit] No se pudo registrar la acción', entry.action, error));
}
```

### 9.2 Llamadas a `recordAudit`
Agrega `recordAudit(request, {...})` **después** de que cada operación termine con éxito, en estos controladores:

| Controlador.método | action | entity | entityId | after |
|---|---|---|---|---|
| `paymentController.registerTransaction` | `PAYMENT_TRANSACTION_CREATED` | `PaymentTransaction` | id creado | resultado |
| `paymentController.deleteTransaction` | `PAYMENT_TRANSACTION_DELETED` | `PaymentTransaction` | `req.params.id` | resultado |
| `paymentController.createObligation` | `PAYMENT_OBLIGATION_CREATED` | `PaymentObligation` | id creado | resultado |
| `paymentController.bulkCreateObligations` | `PAYMENT_OBLIGATIONS_BULK_CREATED` | `PaymentObligation` | `null` | `request.body` |
| `paymentController.updateObligation` | `PAYMENT_OBLIGATION_UPDATED` | `PaymentObligation` | `req.params.id` | resultado |
| `paymentController.cancelObligation` | `PAYMENT_OBLIGATION_CANCELLED` | `PaymentObligation` | `req.params.id` | resultado |
| `gradeController.togglePeriodLock` | `GRADING_PERIOD_LOCK_TOGGLED` | `GradingPeriodLock` | `null` | `request.body` |
| Todo handler de `gradeController` conectado a una ruta **POST/PUT/DELETE** de `grade.routes.ts` (salvo `togglePeriodLock` y las de `grading-scale`) | `GRADES_` + nombre del método en MAYÚSCULAS_CON_GUIONES (ej. `saveDetailedGrades` → `GRADES_SAVE_DETAILED_GRADES`) | `Grades` | `request.body.courseAssignmentId ?? request.params.id ?? null` | `request.body` |
| `gradeController.updateGradingScale` | `GRADING_SCALE_UPDATED` | `GradingScale` | `null` | `request.body` |
| `enrollmentController.create` | `ENROLLMENT_CREATED` | `Enrollment` | id creado | resultado |
| `enrollmentController.update` | `ENROLLMENT_UPDATED` | `Enrollment` | `req.params.id` | resultado |
| `studentController.create` | `STUDENT_CREATED` | `Student` | id creado | resultado (sin `temporaryCredentials`) |
| `studentController.registerFicha` | `STUDENT_ENROLLED_FICHA` | `Student` | id del alumno creado | resultado (sin `temporaryCredentials`) |
| `studentController.update` | `STUDENT_UPDATED` | `Student` | `req.params.id` | resultado |
| `studentController.delete` | `STUDENT_DELETED` | `Student` | `req.params.id` | `null` |
| `studentController.resetPassword` | `STUDENT_PASSWORD_RESET` | `Student` | `req.params.id` | `null` |
| `studentController.generateBulkCredentials` | `CREDENTIALS_BULK_GENERATED` | `Classroom` | `body.classroomId` | `{ target, count }` |
| `userController.create` | `USER_CREATED` | `User` | id creado | resultado |
| `userController.update` | `USER_UPDATED` | `User` | `req.params.id` | resultado |
| `userController.deactivate` | `USER_DEACTIVATED` | `User` | `req.params.id` | `null` |
| `userController.resetPassword` | `USER_PASSWORD_RESET` | `User` | `req.params.id` | `null` |
| `schoolController.update` | `SCHOOL_UPDATED` | `School` | `req.params.id` | resultado |
| `incidentController` (crear) | `INCIDENT_CREATED` | `StudentIncident` | id creado | resultado |

Si un método tiene otro nombre en el código, usa el equivalente y anótalo.

### 9.3 Módulo `back/src/modules/audit-logs/`
`audit-log.routes.ts`:
```ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

export const auditLogRouter = Router();

const querySchema = z.object({
  entity: z.string().trim().max(60).optional(),
  actorId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

auditLogRouter.use(authMiddleware, tenantMiddleware, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'));

auditLogRouter.get('/', async (req: Request, res: Response) => {
  const q = querySchema.parse(req.query);
  const where = {
    schoolId: req.user!.schoolId,
    ...(q.entity && { entity: q.entity }),
    ...(q.actorId && { actorId: q.actorId }),
    ...((q.from || q.to) && {
      createdAt: {
        ...(q.from && { gte: new Date(`${q.from}T00:00:00-05:00`) }),
        ...(q.to && { lte: new Date(`${q.to}T23:59:59-05:00`) }),
      },
    }),
  };
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.auditLog.count({ where }),
  ]);
  res.status(200).json({
    status: 'success',
    data,
    meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
  });
});
```

### 9.4 Frontend de la bitácora
- `front/src/features/audit-logs/api/useAuditLogs.ts`: un hook con TanStack Query que reciba `{ entity, from, to, page }` y llame a `GET /audit-logs`.
- `front/src/features/audit-logs/pages/AuditLogsPage.tsx`: tabla con columnas **Fecha y hora** (usa `formatPeruDate` y `formatPeruTime` de `lib/dateUtils`), **Usuario** (`actorEmail` o `actorId` abreviado a 8 caracteres + `actorRole`), **Acción**, **Entidad** e **ID**. Filtros: select de entidad (Todas, PaymentTransaction, PaymentObligation, Grades, GradingPeriodLock, Enrollment, Student, User, School, StudentIncident) y dos inputs de fecha. Paginación con `components/ui/Pagination.tsx`. Título: `Bitácora de auditoría`; subtítulo: `Registro de cambios en notas, pagos, matrículas y usuarios.`
- En el router, agrega la ruta `/audit-logs` con `RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}`.
- En el menú lateral de `DashboardLayout.tsx`, agrega el ítem **"Bitácora"** con el ícono `History` de lucide, visible para esos dos roles, inmediatamente después del ítem de reportes académicos.

Verifica back y front, y haz commit.

---

## BLOQUE 10 — Consentimientos legales y derechos ARCO

### 10.1 `back/src/modules/legal/legal.constants.ts`
```ts
export const LEGAL_VERSIONS = {
  PRIVACY_POLICY: '2026-11-01',
  TERMS: '2026-11-01',
  MINOR_DATA_CONSENT: '2026-11-01',
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const REQUIRED_DOCUMENTS_BY_ROLE: Record<string, LegalDocumentType[]> = {
  SUPER_ADMIN: [],
  SCHOOL_ADMIN: ['PRIVACY_POLICY', 'TERMS'],
  ADMINISTRATIVE: ['PRIVACY_POLICY', 'TERMS'],
  TEACHER: ['PRIVACY_POLICY', 'TERMS'],
  PARENT: ['PRIVACY_POLICY', 'TERMS', 'MINOR_DATA_CONSENT'],
  STUDENT: ['TERMS'],
};
```

### 10.2 `back/src/modules/legal/legal.routes.ts`
```ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { LEGAL_VERSIONS, REQUIRED_DOCUMENTS_BY_ROLE, type LegalDocumentType } from './legal.constants';

export const legalRouter = Router();
legalRouter.use(authMiddleware, tenantMiddleware);

const principalWhere = (req: Request) =>
  req.user!.role === 'STUDENT'
    ? { studentId: req.user!.studentId ?? req.user!.userId }
    : { userId: req.user!.userId };

const getPending = async (req: Request): Promise<LegalDocumentType[]> => {
  const required = REQUIRED_DOCUMENTS_BY_ROLE[req.user!.role] ?? [];
  if (required.length === 0) return [];
  const accepted = await prisma.legalAcceptance.findMany({
    where: { schoolId: req.user!.schoolId, ...principalWhere(req), documentType: { in: required } },
    select: { documentType: true, version: true },
  });
  return required.filter(
    (doc) => !accepted.some((a) => a.documentType === doc && a.version === LEGAL_VERSIONS[doc]),
  );
};

legalRouter.get('/status', async (req: Request, res: Response) => {
  const pending = await getPending(req);
  res.status(200).json({
    status: 'success',
    data: { pending: pending.map((type) => ({ type, version: LEGAL_VERSIONS[type] })) },
  });
});

const acceptSchema = z.object({
  documents: z.array(z.enum(['PRIVACY_POLICY', 'TERMS', 'MINOR_DATA_CONSENT'])).min(1),
});

legalRouter.post('/accept', async (req: Request, res: Response) => {
  const { documents } = acceptSchema.parse(req.body);
  const pending = await getPending(req);
  const missing = pending.filter((doc) => !documents.includes(doc));
  if (missing.length > 0) {
    throw new AppError('Debes aceptar todos los documentos pendientes para continuar.', 400);
  }
  await prisma.legalAcceptance.createMany({
    data: pending.map((documentType) => ({
      schoolId: req.user!.schoolId,
      ...principalWhere(req),
      documentType,
      version: LEGAL_VERSIONS[documentType],
      ip: req.ip ?? null,
      userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
    })),
  });
  res.status(200).json({ status: 'success', data: { accepted: pending } });
});
```

### 10.3 Exportación de datos de un alumno (derecho de acceso ARCO)
Ruta en `student.routes.ts`, antes de `/:id`:
```ts
studentRouter.get('/:id/data-export', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), studentController.exportStudentData);
```
Controller `exportStudentData`:
```ts
exportStudentData = async (request: Request, response: Response): Promise<void> => {
  const schoolId = request.user!.schoolId;
  const id = String(request.params.id);
  const student = await prisma.student.findFirst({
    where: { id, schoolId },
    include: {
      familyRelations: {
        include: {
          user: {
            select: {
              id: true, email: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true,
              documentType: true, documentId: true, cellphone: true, educationLevel: true,
            },
          },
        },
      },
      enrollments: {
        include: {
          attendances: true,
          detailedGrades: true,
          competenceConclusions: true,
          obligations: { include: { transactions: true } },
          incidents: true,
          homeworkSubmissions: true,
        },
      },
    },
  });
  if (!student) throw new AppError('Estudiante no encontrado', 404);
  const { passwordHash: _omit, ...safeStudent } = student;
  recordAudit(request, { action: 'STUDENT_DATA_EXPORTED', entity: 'Student', entityId: id });
  response.setHeader('Content-Disposition', `attachment; filename="datos-alumno-${id}.json"`);
  response.status(200).json({ exportedAt: new Date().toISOString(), student: safeStudent });
};
```
En el frontend, en `StudentFichaModal.tsx`, agrega un botón **"Exportar datos (ARCO)"**, visible solo para `SCHOOL_ADMIN`/`SUPER_ADMIN`. Llama al endpoint con `responseType: 'blob'` y descarga el archivo `datos-alumno-<id>.json`.

### 10.4 Frontend de consentimiento
**a) `front/src/features/legal/api/useLegal.ts`:**
- `useLegalStatus()` → `GET /legal/status` (`staleTime: Infinity`).
- `useAcceptLegal()` → `POST /legal/accept`; al tener éxito, invalida `['legal-status']`.

**b) `front/src/features/legal/components/ConsentGate.tsx`:** si `pending.length > 0`, muestra un diálogo modal a pantalla completa que no se puede cerrar, con:
- el título `Antes de continuar`;
- un checkbox por documento pendiente:
  - `PRIVACY_POLICY` → `He leído y acepto la <Link to="/privacidad" target="_blank">Política de Privacidad</Link>.`
  - `TERMS` → `He leído y acepto los <Link to="/terminos" target="_blank">Términos y Condiciones de Uso</Link>.`
  - `MINOR_DATA_CONSENT` → `Como padre, madre o apoderado(a) legal, autorizo de manera previa, libre, expresa, inequívoca e informada al colegio en el que está matriculado(a) mi hijo(a) (responsable del tratamiento) y a SaaSchool (encargado del tratamiento) a tratar los datos personales de mi(s) menor(es) hijo(s), incluidos datos sensibles de salud y discapacidad, con la finalidad de gestionar su matrícula, evaluación, asistencia, comunicación con la familia y pagos, conforme a la Política de Privacidad. Entiendo que los datos se almacenan en servidores ubicados en Estados Unidos (Render Services, Inc. y Google LLC).`
- el botón **"Aceptar y continuar"**, deshabilitado hasta marcar todos los checkboxes;
- un enlace secundario **"Cerrar sesión"** que llame a `logout()`.

Móntalo en `DashboardLayout.tsx` junto a `<ChangePasswordModal />`, renderizándolo solo cuando `!user?.mustChangePassword` (primero se cambia la contraseña y luego se acepta).

**c) Páginas públicas `front/src/features/legal/pages/PrivacyPolicyPage.tsx` y `TermsPage.tsx`:** texto estático con un diseño de lectura limpio (`max-w-3xl`, `prose`-like con clases de Tailwind) y un aviso visible arriba: `Versión 2026-11-01`.

`PrivacyPolicyPage` debe tener estas secciones, con los marcadores `[COMPLETAR: ...]` tal cual:
1. **Identidad del encargado del tratamiento:** `[COMPLETAR: razón social, RUC, domicilio y correo de contacto]`. El colegio es el responsable del banco de datos de sus alumnos y familias.
2. **Datos que tratamos:** identificación (nombres, documento, fecha de nacimiento, ubigeo), contacto, datos académicos (notas, asistencia, conducta), datos económicos (pensiones y pagos), y datos sensibles (discapacidad, atenciones de tópico).
3. **Finalidades:** gestión de matrícula, evaluación y reportes oficiales al MINEDU (SIAGIE), asistencia, comunicación con las familias, cobranza de pensiones y seguridad de la plataforma.
4. **Base legal:** consentimiento del titular o de su representante legal (Ley N.° 29733 y su Reglamento, D.S. N.° 016-2024-JUS) y el cumplimiento de obligaciones educativas.
5. **Transferencia internacional:** los datos se alojan en servidores de Render Services, Inc. (EE. UU.) y Google LLC (EE. UU.), con medidas de seguridad contractuales.
6. **Conservación:** mientras dure la relación del colegio con el servicio y los plazos legales aplicables. Al finalizar, los datos se devuelven o eliminan. `[COMPLETAR: plazo]`
7. **Seguridad:** cifrado en tránsito (HTTPS), contraseñas cifradas, control de acceso por roles, bitácora de auditoría, respaldos periódicos y archivos privados con enlaces temporales.
8. **Derechos ARCO:** acceso, rectificación, cancelación y oposición, ante el colegio o en `[COMPLETAR: correo]`. Derecho a reclamar ante la Autoridad Nacional de Protección de Datos Personales.
9. **Incidentes de seguridad:** se notifican a la autoridad y a los afectados dentro de las 48 horas de conocidos.
10. **Cambios a esta política:** se informa a los usuarios y se solicita nueva aceptación.

`TermsPage` debe tener: objeto del servicio; cuentas y responsabilidad por las credenciales; uso permitido y prohibido; contenido subido por los usuarios; disponibilidad del servicio; recibos internos (`no son comprobantes de pago electrónicos`); limitación de responsabilidad; ley aplicable (Perú) y contacto `[COMPLETAR]`.

**d) Router:** agrega las rutas `/privacidad` y `/terminos` **fuera** de `PublicRoute` y `ProtectedRoute` (accesibles siempre).

**e) `LoginPage.tsx`:** al pie del formulario, agrega `Al ingresar aceptas nuestros Términos y la Política de Privacidad.` con enlaces a ambas rutas.

Verifica back y front, y haz commit.

---

## BLOQUE 11 — Convivencia escolar (SíseVe)

1. `incident.schema.ts`:
   - en `createIncidentSchema` agrega `isViolenceCase: z.boolean().default(false),`;
   - crea `export const siseveUpdateSchema = z.object({ siseveCode: z.string().trim().min(3).max(40) });`.
2. El servicio y el repositorio de creación de incidencias deben persistir `isViolenceCase`.
3. Nueva ruta en `incident.routes.ts`:
   ```ts
   incidentRouter.patch('/:id/siseve', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), incidentController.registerSiseve);
   ```
   Controller y servicio: verifica que la incidencia pertenezca al `schoolId` y sea `isViolenceCase`; guarda `siseveCode` y `siseveReportedAt: new Date()`; registra `recordAudit` con la acción `INCIDENT_SISEVE_REGISTERED`.
4. Frontend:
   - `CreateIncidentModal.tsx`: agrega el checkbox `Caso de violencia escolar (debe reportarse en el portal SíseVe del MINEDU)`. Si se marca, muestra el aviso en ámbar: `Recuerda registrar el caso en siseve.minedu.gob.pe y luego anotar aquí el código asignado.`
   - En `IncidentsPage.tsx` (la lista del personal), para incidencias con `isViolenceCase && !siseveCode`, muestra el badge rojo **"Pendiente SíseVe"** y un botón **"Registrar código SíseVe"** (solo para `SCHOOL_ADMIN`/`ADMINISTRATIVE`/`SUPER_ADMIN`) que abre un input y llama al endpoint. Con código, muestra el badge verde **"SíseVe: <código>"**.

Verifica back y front, y haz commit.

---

## BLOQUE 12 — Asistencia: feriados y cierre automático robusto

### 12.1 Endpoints de feriados en `attendance.routes.ts`
Colócalos justo después de `attendanceRouter.use(...)`, antes de cualquier ruta con `/:param`:
```ts
attendanceRouter.get('/holidays', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), attendanceController.getHolidays);
attendanceRouter.post('/holidays', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), attendanceController.createHoliday);
attendanceRouter.delete('/holidays/:holidayId', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), attendanceController.deleteHoliday);
```
- `getHolidays`: query `year` (número; por defecto, el año actual) → `prisma.schoolHoliday.findMany({ where: { schoolId, date: { gte: new Date(\`${year}-01-01T00:00:00.000Z\`), lte: new Date(\`${year}-12-31T00:00:00.000Z\`) } }, orderBy: { date: 'asc' } })`.
- `createHoliday`: body `z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string().trim().min(2).max(80) })` → `create` con `date: new Date(\`${date}T00:00:00.000Z\`)`. Si hay un duplicado (`P2002`), lo maneja el handler global.
- `deleteHoliday`: `deleteMany({ where: { id: holidayId, schoolId } })`; si `count === 0` → 404.

### 12.2 `attendance.cron.ts`
Reemplaza **solo** la selección de configuraciones (el `findMany` con `autoCloseTime: currentTimeStr`) por:
```ts
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date());
      const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

      const candidateConfigs = await prisma.attendanceScheduleConfig.findMany({
        where: {
          autoCloseEnabled: true,
          OR: [{ lastAutoClosedOn: null }, { lastAutoClosedOn: { lt: todayDate } }],
        },
        select: { id: true, schoolId: true, scope: true, autoCloseTime: true },
      });

      // Ejecutar a partir de la hora configurada (no solo en el minuto exacto) y nunca después de las 18:00
      const dueConfigs = candidateConfigs.filter(
        (config) => currentTimeStr >= config.autoCloseTime && currentTimeStr < '18:00',
      );

      const holidays = await prisma.schoolHoliday.findMany({
        where: { date: todayDate, schoolId: { in: dueConfigs.map((c) => c.schoolId) } },
        select: { schoolId: true },
      });
      const holidaySchoolIds = new Set(holidays.map((h) => h.schoolId));
      const activeConfigs = dueConfigs.filter((config) => !holidaySchoolIds.has(config.schoolId));
```
Conserva la lógica existente que procesa `activeConfigs`. Después de procesar con éxito cada `config`, agrega:
```ts
await prisma.attendanceScheduleConfig.update({ where: { id: config.id }, data: { lastAutoClosedOn: todayDate } });
```
Para las configuraciones de colegios en feriado, también marca `lastAutoClosedOn: todayDate` (para no reevaluarlas en todo el día).

### 12.3 Frontend
Crea `front/src/features/attendance/components/HolidaysModal.tsx`:
- una lista de feriados del año (fecha formateada con `formatPeruDate` + nombre + botón eliminar);
- un formulario con `input type="date"` y nombre, más el botón **"Agregar"**.
En `AttendancePage.tsx`, agrega un botón **"Feriados"** (ícono `CalendarOff`) junto a los controles de configuración de horario existentes, visible para `SCHOOL_ADMIN`/`ADMINISTRATIVE`/`SUPER_ADMIN`.

Verifica back y front, y haz commit.

---

## BLOQUE 13 — Respaldos automáticos

### 13.1 `back/scripts/backup-db.ts`
1. `uploadToGoogleDrive` debe devolver también `folderId: targetFolderId`.
2. Agrega esta función:
```ts
async function pruneOldBackups(folderId: string, retentionDays: number): Promise<number> {
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const list = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'saaschool_backup_' and createdTime < '${cutoff}' and trashed = false`,
    fields: 'files(id, name)',
  });
  let removed = 0;
  for (const file of list.data.files ?? []) {
    if (file.id) {
      await drive.files.update({ fileId: file.id, requestBody: { trashed: true } });
      removed++;
    }
  }
  return removed;
}
```
3. En `main`, después de una subida exitosa: si `process.env.BACKUP_RETENTION_DAYS` existe, llama a `pruneOldBackups(driveResult.folderId, Number(process.env.BACKUP_RETENTION_DAYS))` y registra cuántos archivos se enviaron a la papelera.
4. En el `catch (cloudError)`: si `process.env.BACKUP_STRICT === '1'`, termina con `process.exit(1)` después del aviso.

### 13.2 Crea `.github/workflows/backup-db.yml`
```yaml
name: Respaldo semanal de base de datos

on:
  schedule:
    - cron: '0 8 * * 0' # Domingos 03:00 hora de Lima (UTC-5)
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    defaults:
      run:
        working-directory: back
    steps:
      - uses: actions/checkout@v4

      - name: Instalar cliente PostgreSQL 16
        run: sudo apt-get update && sudo apt-get install -y postgresql-client-16

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: back/pnpm-lock.yaml

      - name: Instalar dependencias
        run: pnpm install --prod=false

      - name: Ejecutar respaldo
        run: pnpm run db:backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_EXTERNAL }}
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          GOOGLE_REFRESH_TOKEN: ${{ secrets.GOOGLE_REFRESH_TOKEN }}
          GOOGLE_DRIVE_FOLDER_ID: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
          BACKUP_STRICT: '1'
          BACKUP_RETENTION_DAYS: '90'

      - name: Copia secundaria como artefacto (30 días)
        uses: actions/upload-artifact@v4
        with:
          name: backup-${{ github.run_id }}
          path: back/backups/*.dump
          retention-days: 30
```

Verifica (`back` tsc) y haz commit.

---

## BLOQUE 14 — Frontend: rendimiento, PWA y cabeceras

### 14.1 Carga diferida de rutas (`front/src/router/index.tsx`)
- Mantén con import estático solo `LoginPage`, `DashboardLayout`, `PlanGuard` y las páginas legales.
- Convierte **todas** las demás páginas a `React.lazy`. Ejemplo:
  ```ts
  const StudentsPage = lazy(() =>
    import('@/features/students/pages/StudentsPage').then((m) => ({ default: m.StudentsPage })),
  );
  ```
  Hazlo para `DashboardPage`, `StudentsPage`, `PaymentsPage`, `GradesPage`, `AttendancePage`, `DirectoryPage`, `AnnouncementsPage`, `ClassroomsPage`, `CurricularAreasPage`, `TeacherAssignmentsPage`, `AcademicYearsPage`, `EvaluationCriteriaPage`, `SuperAdminPage`, `StudentCoursesPage`, `VirtualClassroomSupervisionPage`, `AcademicReportsPage`, `IncidentsPage` y `AuditLogsPage`.
- Crea `front/src/components/ui/PageLoader.tsx`: un contenedor centrado con 3 bloques `Skeleton` (alto 32, 64 y 64; ancho completo; `space-y-4 p-6`) y `aria-busy="true"`, `aria-label="Cargando página"`.
- Envuelve `<Routes>` con `<Suspense fallback={<PageLoader />}>`.
- En `RoleGuard`, elimina la heurística que detecta alumnos por el texto `'alumno'`/`'estudiante'` en el correo; usa solo `user.role === 'STUDENT'`.

### 14.2 Reemplaza `front/vite.config.ts` por:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-data': ['@tanstack/react-query', '@tanstack/react-table', 'axios', 'zustand'],
          'vendor-ui': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select',
            '@radix-ui/react-toast', 'lucide-react', 'sonner',
          ],
          'vendor-excel': ['exceljs', 'xlsx'],
          'vendor-qr': ['html5-qrcode', 'qrcode'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
```

### 14.3 Reemplaza `front/index.html` por:
```html
<!doctype html>
<html lang="es-PE">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>SaaSchool | Gestión escolar para colegios del Perú</title>
    <meta name="description" content="Plataforma de gestión escolar: matrícula, notas CNEB/SIAGIE, asistencia con QR, pagos y comunicación con las familias." />
    <meta name="theme-color" content="#5046e5" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0e1022" media="(prefers-color-scheme: dark)" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="SaaSchool" />
    <meta property="og:title" content="SaaSchool | Gestión escolar" />
    <meta property="og:description" content="Notas, asistencia, pagos y comunicación escolar en un solo lugar." />
    <meta property="og:type" content="website" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <noscript>Activa JavaScript para usar SaaSchool.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 14.4 PWA
**a) Crea `front/public/manifest.webmanifest`:**
```json
{
  "name": "SaaSchool - Gestión escolar",
  "short_name": "SaaSchool",
  "description": "Notas, asistencia, pagos y comunicados de tu colegio.",
  "lang": "es-PE",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f7f8fc",
  "theme_color": "#5046e5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
**b) Genera los íconos** desde `front/public/favicon.svg`:
```bash
cd front
npx --yes sharp-cli -i public/favicon.svg -o public/icon-192.png resize 192 192
npx --yes sharp-cli -i public/favicon.svg -o public/icon-512.png resize 512 512
```
Si `sharp-cli` falla, anótalo en `CAMBIOS_REALIZADOS.md` como pendiente manual y continúa.

### 14.5 Cabeceras y SPA para Cloudflare Pages
**a) Crea `front/public/_redirects`:**
```
/*    /index.html   200
```
**b) Crea `front/public/_headers`:**
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache
```

### 14.6 Sentry en frontend (opcional por variable)
1. `cd front && pnpm add @sentry/react`
2. En `front/src/main.tsx`, antes de `ReactDOM.createRoot`:
   ```ts
   import * as Sentry from '@sentry/react';

   if (import.meta.env.VITE_SENTRY_DSN) {
     Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, tracesSampleRate: 0, sendDefaultPii: false });
   }
   ```
3. En `front/.env.example`, agrega `VITE_SENTRY_DSN=""`.

### 14.7 Verificación de tamaño
Ejecuta `cd front && npx vite build`. El chunk de entrada (`index-*.js`) debe pesar **menos de 300 kB gzip**. Si lo supera, revisa que ninguna página pesada siga importada de forma estática desde `router/index.tsx` o `DashboardLayout.tsx` y corrígelo. Anota los tamaños finales en `CAMBIOS_REALIZADOS.md`.

Verifica front y haz commit.

---

## BLOQUE 15 — Identidad visual, color por colegio y accesibilidad

### 15.1 Tokens de diseño
En `front/src/index.css`, reemplaza el contenido de `:root { ... }` y `.dark { ... }` dentro de `@layer base` por:
```css
  :root {
    --background: 230 33% 98%;
    --foreground: 232 47% 12%;
    --card: 0 0% 100%;
    --card-foreground: 232 47% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 232 47% 12%;
    --primary: 243 75% 59%;
    --primary-foreground: 0 0% 100%;
    --secondary: 230 30% 95%;
    --secondary-foreground: 232 47% 18%;
    --muted: 230 25% 95%;
    --muted-foreground: 230 12% 40%;
    --accent: 168 76% 92%;
    --accent-foreground: 168 80% 20%;
    --destructive: 0 74% 50%;
    --destructive-foreground: 0 0% 100%;
    --success: 152 62% 34%;
    --success-foreground: 0 0% 100%;
    --warning: 36 95% 48%;
    --warning-foreground: 30 60% 12%;
    --border: 230 22% 90%;
    --input: 230 22% 88%;
    --ring: 243 75% 59%;
    --radius: 0.875rem;
  }

  .dark {
    --background: 234 32% 8%;
    --foreground: 230 40% 96%;
    --card: 234 28% 11%;
    --card-foreground: 230 40% 96%;
    --popover: 234 28% 11%;
    --popover-foreground: 230 40% 96%;
    --primary: 243 85% 70%;
    --primary-foreground: 234 40% 10%;
    --secondary: 234 22% 17%;
    --secondary-foreground: 230 40% 96%;
    --muted: 234 20% 16%;
    --muted-foreground: 230 15% 70%;
    --accent: 168 50% 18%;
    --accent-foreground: 168 70% 82%;
    --destructive: 0 65% 50%;
    --destructive-foreground: 0 0% 100%;
    --success: 152 55% 45%;
    --success-foreground: 234 40% 8%;
    --warning: 36 90% 55%;
    --warning-foreground: 30 60% 10%;
    --border: 234 18% 20%;
    --input: 234 18% 22%;
    --ring: 243 85% 70%;
  }
```
Y dentro del mismo `@layer base`, agrega:
```css
  body {
    font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  :focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
```

### 15.2 `front/tailwind.config.js`
- Agrega `import defaultTheme from 'tailwindcss/defaultTheme';` al inicio.
- En `theme.extend` agrega:
  ```js
  fontFamily: {
    sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
  },
  ```
- En `theme.extend.colors` agrega:
  ```js
  success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
  warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
  ```

### 15.3 Color de marca por colegio
**a) Backend:** en `school.schema.ts` (update), agrega `brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (formato #RRGGBB)').nullable().optional(),`. Asegúrate de que el endpoint `GET /schools/:id` lo devuelva (si usa `select`, agrega `brandColor: true`).

**b) Crea `front/src/lib/brandColor.ts`:**
```ts
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const rgbToHsl = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s * 100, l * 100];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

/** Aplica el color del colegio como --primary garantizando contraste AA (≥ 4.5) con texto blanco. */
export function applyBrandColor(hex?: string | null): void {
  const root = document.documentElement;
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
    return;
  }
  let [h, s, l] = rgbToHsl(hexToRgb(hex));
  while (l > 10 && (1.05 / (relativeLuminance(hslToRgb(h, s, l)) + 0.05)) < 4.5) {
    l -= 2;
  }
  const value = `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
  root.style.setProperty('--primary', value);
  root.style.setProperty('--ring', value);
}
```

**c)** En `DashboardLayout.tsx`, donde ya se obtienen los datos del colegio (el logo), agrega `useEffect(() => { applyBrandColor(school?.brandColor ?? null); return () => applyBrandColor(null); }, [school?.brandColor]);`. Agrega `brandColor?: string | null` a `features/schools/types.ts`.

**d)** En `SchoolSettingsModal.tsx`, agrega el campo **"Color institucional"** con `<input type="color">`, un botón **"Restablecer"** (envía `null`) y una vista previa de un botón primario con ese color.

### 15.4 Resumen familiar (vista de padres)
Crea `front/src/features/parent/components/FamilySnapshotCard.tsx` y muéstralo al inicio del dashboard cuando `user.role === 'PARENT'`, **una tarjeta por hijo**:
- avatar con iniciales sobre `bg-primary/10 text-primary`, nombre completo y grado/sección;
- tres "píldoras" de estado:
  - **Asistencia** del mes: verde (`bg-success/15 text-success`) si es ≥ 95 %, ámbar (`bg-warning/15`) entre 85 y 94 %, rojo (`bg-destructive/15 text-destructive`) si es < 85 %;
  - **Pagos:** `Al día` en verde o `N vencidas` en rojo;
  - **Tareas pendientes:** `N pendientes`.
- Usa **solo** los hooks que ya existen en `features/parent`, `features/payments`, `features/attendance` y `features/course-contents`. Si un dato no tiene hook disponible, **omite esa píldora** (no crees endpoints nuevos).
- La tarjeta completa es un enlace al detalle del hijo que ya exista en el dashboard.
- En móvil: `grid-cols-1`; desde `md:`: `grid-cols-2`.

### 15.5 Accesibilidad
1. Todo botón que contenga solo un ícono de `lucide-react` (sin texto visible) debe tener `aria-label` con la acción en español (ej. `aria-label="Eliminar publicación"`). Busca en `front/src` los `<button` y `<Button` con `size="icon"` o cuyo único hijo sea un ícono.
2. Todo `<input>`, `<select>` y `<textarea>` debe tener un `<label htmlFor>` asociado o `aria-label`.
3. Toda `<img>` debe tener `alt` (descriptivo, o `alt=""` si es decorativa).
4. Los modales construidos con `div` fijo (no Radix) deben tener `role="dialog"`, `aria-modal="true"` y `aria-labelledby` apuntando a su título.
5. Las tablas de notas y asistencia deben usar `<th scope="col">` en los encabezados.

Verifica front, ejecuta `npx vite build` y haz commit.

---

## BLOQUE 16 — Dependencias

1. **Front:** en `front/package.json`, cambia la dependencia `xlsx` por la versión parcheada oficial de SheetJS (no publicada en npm):
   ```json
   "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
   ```
   Luego ejecuta `pnpm install`.
2. En ambos proyectos, ejecuta `pnpm update` (respeta los rangos `^` actuales; no hagas saltos de versión mayor).
3. Ejecuta `pnpm audit --prod` en ambos proyectos. Para cada vulnerabilidad **alta** restante:
   - si la versión parcheada está dentro de la misma versión mayor del paquete directo, actualízalo con `pnpm add <paquete>@<versión parcheada>`;
   - si es una dependencia transitiva (por ejemplo `qs`, `body-parser`, `follow-redirects`), agrégala a `pnpm.overrides` en el `package.json` correspondiente con la versión parcheada que indica el audit.
4. **No** subas versiones mayores de: `express` (5), `react-router-dom` (7), `zod` (4), `tailwindcss` (4), `vite` (6+), `react` (19), `@prisma/client`/`prisma` (6). Si una vulnerabilidad solo se corrige con un salto mayor, anótala en `CAMBIOS_REALIZADOS.md` como pendiente.
5. Verifica que todo siga compilando: `npx tsc --noEmit` en ambos, `npx vite build`, `pnpm test` en `back`.

Haz commit.

---

## BLOQUE 17 — Despliegue

### 17.1 Reemplaza `render.yaml` (raíz) por:
```yaml
services:
  - type: web
    name: saaschool-backend
    runtime: node
    plan: starter
    region: oregon
    rootDir: back
    buildCommand: pnpm install --prod=false && pnpm run render-build
    startCommand: pnpm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: "22"
      - key: DATABASE_URL
        fromDatabase:
          name: saaschool-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: FILES_SIGNING_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 12h
      - key: BCRYPT_ROUNDS
        value: "12"
      - key: CORS_ORIGINS
        sync: false
      - key: PUBLIC_API_URL
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_REFRESH_TOKEN
        sync: false
      - key: GOOGLE_DRIVE_FOLDER_ID
        sync: false
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        sync: false
      - key: SMTP_SECURE
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: MAIL_FROM
        sync: false
      - key: VAPID_PUBLIC_KEY
        sync: false
      - key: VAPID_PRIVATE_KEY
        sync: false
      - key: VAPID_SUBJECT
        sync: false
      - key: SENTRY_DSN
        sync: false

databases:
  - name: saaschool-db
    plan: basic-256mb
    region: oregon
    databaseName: saaschool
    user: saaschool
    postgresMajorVersion: "16"
```
**Nota:** `pnpm install --prod=false` es obligatorio. Con `NODE_ENV=production`, pnpm omite las `devDependencies` (`typescript`, `prisma`) y el build falla.

### 17.2 `front/.env.example`
Reemplázalo por:
```dotenv
# URL pública del backend en Render (con /api al final)
VITE_API_URL="https://api.tudominio.pe/api"
# Monitoreo de errores (opcional)
VITE_SENTRY_DSN=""
```

### 17.3 Documentación de despliegue
Crea `DEPLOY.md` en la raíz con, exactamente, los pasos de la sección **"Pasos manuales"** que aparecen al final de este documento (cópialos tal cual).

Haz commit.

---

## BLOQUE 18 — Verificación final y reporte

1. `cd back && npx tsc --noEmit && pnpm test`
2. `cd front && npx tsc --noEmit && npx vite build`
3. Levanta el backend (`cd back && pnpm dev`) y ejecuta estas pruebas de humo. Toma las credenciales de un `SCHOOL_ADMIN` del seed en `back/prisma/seed.ts` y **no las imprimas en el reporte**:
   ```bash
   curl -s http://localhost:3000/health
   # Debe devolver 404 (registro eliminado):
   curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{}'
   # Debe devolver 403 (origen no permitido):
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/catalog/grades -H "Origin: https://sitio-malicioso.com"
   # Debe devolver 404 (ya no se sirven estáticos):
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/uploads/materials/cualquiera.pdf
   # Login correcto → 200 con token y mustChangePassword:
   curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"<ADMIN_DEL_SEED>","password":"<PASS_DEL_SEED>"}'
   ```
   - Con el token obtenido, sube un PDF a `POST /api/uploads/materials` (multipart, campo `file`). Verifica `201` y que `url` empiece con `/api/files/`.
   - Llama a `GET /api/files/<id>/link` (debe devolver `url`), y luego a esa `url` sin token: debe devolver `200`.
   - Llama a la misma `url` cambiando un carácter de `sig`: debe devolver `403`.
   - Sube un archivo `.txt` renombrado a `.pdf`: debe devolver `415`.
   - Haz 6 logins fallidos con un usuario del seed: el 6.º debe devolver `423`.
4. Crea `CAMBIOS_REALIZADOS.md` en la raíz con:
   - una tabla **Bloque | Estado (✅ completo / ⚠️ parcial / ❌ no realizado) | Notas**;
   - la lista de desviaciones respecto a este documento (nombres distintos, archivos inexistentes) y cómo se resolvieron;
   - los tamaños del build del frontend (antes: 3 296 kB / 895 kB gzip; después: ...);
   - el resultado de `pnpm audit --prod` final de ambos proyectos y las vulnerabilidades pendientes;
   - los pendientes manuales detectados.
5. Commit final: `fix(auditoria): bloque 18 - verificacion y reporte`. **No hagas push.** Informa al usuario que la rama `auditoria/fase-0-1` está lista para revisión.

=== FIN DEL PROMPT ===

---

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
