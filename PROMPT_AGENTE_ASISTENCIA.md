# PROMPT PARA EL AGENTE — Mejora integral del sistema de asistencia de SaaSchool

> Copia todo desde `=== INICIO DEL PROMPT ===` hasta `=== FIN DEL PROMPT ===` y pégalo al agente.
> Este prompt parte de la rama `auditoria/fase-0-1` (ya auditada y corregida). Al final hay una sección **"Para Xavier"** con lo que debes revisar tú.

=== INICIO DEL PROMPT ===

Eres un agente de implementación que trabaja en el monorepo `SaaSchool` (`back/`: Express + Prisma + PostgreSQL; `front/`: React + Vite + Tailwind + TanStack Query). Tu tarea es implementar **exactamente** la mejora del sistema de asistencia descrita abajo, en 3 fases y 14 bloques. No rediseñes, no agregues funciones que no estén aquí y no cambies nombres no indicados. Si un bloque dice "reemplaza", escribe el contenido literal. Si dice "modifica", cambia solo lo indicado.

## Reglas de trabajo (obligatorias)

1. **Rama:** `git checkout auditoria/fase-0-1 && git checkout -b asistencia/mejoras`. Si hay cambios sin commit en `CAMBIOS_REALIZADOS.md`, `DEPLOY.md` o `front/src/lib/brandColor.ts` (solo saltos de línea), haz primero `git stash` y al terminar `git stash pop`.
2. **Orden:** ejecuta los bloques en orden. No empieces uno sin terminar y verificar el anterior.
3. **Verificación al final de cada bloque:**
   - `cd back && npx tsc --noEmit` sin errores.
   - `cd front && npx tsc --noEmit` sin errores (en bloques que tocan `front/`).
   - `cd back && pnpm test` debe pasar (desde el Bloque 2).
4. **Commit por bloque:** `git add -A && git commit -m "feat(asistencia): bloque N - <título>"`. **No hagas `git push`.**
5. **Destructivo:** nunca ejecutes `prisma migrate reset`, `DROP`, borrados masivos ni `push --force` sin preguntar literalmente al usuario y recibir "sí".
6. **Textos de interfaz** en español de Perú, tal como aparecen aquí.
7. **Si algo no coincide con el código** (un nombre o una ruta distinta), aplica el cambio en el equivalente más directo del mismo módulo y anótalo en `CAMBIOS_ASISTENCIA.md` (Bloque 13). No te detengas a preguntar por diferencias menores.
8. Gestor de paquetes: **pnpm**. Zona horaria del negocio: **America/Lima**. Todas las fechas de asistencia se guardan como `@db.Date` a medianoche UTC (`new Date('YYYY-MM-DDT00:00:00.000Z')`), igual que hoy.
9. Para crear notificaciones usa siempre `notificationService.createNotification(schoolId, { userId, title, message, type: 'ATTENDANCE', link })`, importando `notificationService` desde `back/src/modules/notifications/notification.routes.ts` (ya está exportado ahí). **No uses `createBulkNotifications`**: envía el mismo mensaje push a todos y aquí cada mensaje es personalizado.
10. Para registrar acciones en la bitácora usa `recordAudit(request, {...})` de `back/src/utils/audit.util.ts` (ya existe).

---

# FASE 1 — Corregir y avisar

## BLOQUE 0 — Preparación
1. Crea la rama según la regla 1.
2. `cd back && pnpm install` y `cd front && pnpm install`.
3. `cd front && pnpm add idb-keyval` (se usa en el Bloque 7).
4. Verifica que ambos proyectos compilen y que `pnpm test` pase en `back`.
5. Commit: `feat(asistencia): bloque 0 - preparacion`.

---

## BLOQUE 1 — Esquema de base de datos (todos los cambios en una migración)

### 1.1 Modifica `back/prisma/schema.prisma`

**a) Modelo `School`.** Agrega después de `brandColor`:
```prisma
  notifyAbsencesToFamilies   Boolean   @default(true) // Avisar a las familias cuando el alumno no registra ingreso
  absenceAlertConsecutive    Int       @default(3)    // Faltas injustificadas seguidas para alerta temprana
  absenceAlertMonthlyPercent Int       @default(10)   // % de faltas injustificadas en los últimos 30 días
  lateAlertMonthlyCount      Int       @default(5)    // Tardanzas injustificadas en los últimos 30 días
  lastRiskEvaluationOn       DateTime? @db.Date
```
Y en las relaciones de `School`:
```prisma
  attendanceJustifications AttendanceJustification[]
  attendanceAlerts         AttendanceAlert[]
  authorizedPickups        AuthorizedPickup[]
  courseAttendanceSessions CourseAttendanceSession[]
```

**b) Modelo `Student`.** Agrega la relación `authorizedPickups AuthorizedPickup[]`.

**c) Modelo `Enrollment`.** Agrega las relaciones:
```prisma
  attendanceJustifications AttendanceJustification[]
  attendanceAlerts         AttendanceAlert[]
  courseAttendanceRecords  CourseAttendanceRecord[]
```

**d) Modelo `CourseAssignment`.** Agrega la relación `courseAttendanceSessions CourseAttendanceSession[]`.

**e) Modelo `Attendance`.** Agrega después de `notes`:
```prisma
  checkOutTime       DateTime?
  checkOutById       String?
  pickupPersonId     String?   // AuthorizedPickup.id o User.id del apoderado que recogió
  pickedUpByName     String?
  pickedUpByDocument String?
  earlyLeaveReason   String?
```

**f) Agrega al final del archivo:**
```prisma
// ============================================================================
// 18. JUSTIFICACIONES DE ASISTENCIA
// ============================================================================
enum JustificationStatus {
  PENDING
  APPROVED
  REJECTED
}

enum JustificationReason {
  MEDICAL
  FAMILY
  BEREAVEMENT
  TRANSPORT
  OTHER
}

model AttendanceJustification {
  id              String              @id @default(uuid())
  schoolId        String
  enrollmentId    String
  dateFrom        DateTime            @db.Date
  dateTo          DateTime            @db.Date
  reason          JustificationReason
  description     String              @db.Text
  fileUrl         String?
  fileName        String?
  status          JustificationStatus @default(PENDING)
  requestedById   String
  requestedByRole String
  reviewedById    String?
  reviewedAt      DateTime?
  reviewNote      String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  school          School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  enrollment      Enrollment          @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  @@index([schoolId, status, createdAt])
  @@index([enrollmentId, dateFrom])
}

// ============================================================================
// 19. ALERTA TEMPRANA DE AUSENTISMO
// ============================================================================
enum AttendanceAlertReason {
  CONSECUTIVE_ABSENCES
  MONTHLY_ABSENCE_RATE
  REPEATED_LATENESS
}

model AttendanceAlert {
  id           String                @id @default(uuid())
  schoolId     String
  enrollmentId String
  reason       AttendanceAlertReason
  metricValue  Float
  threshold    Float
  triggeredOn  DateTime              @db.Date
  status       String                @default("OPEN") // OPEN | ATTENDED
  attendedById String?
  attendedAt   DateTime?
  attendedNote String?
  incidentId   String?
  createdAt    DateTime              @default(now())

  school       School                @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  enrollment   Enrollment            @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  @@unique([enrollmentId, reason, triggeredOn])
  @@index([schoolId, status])
}

// ============================================================================
// 20. PERSONAS AUTORIZADAS A RECOGER
// ============================================================================
model AuthorizedPickup {
  id           String       @id @default(uuid())
  schoolId     String
  studentId    String
  fullName     String
  documentType DocumentType @default(DNI)
  documentId   String
  relationship String       // Ej: Tía, Abuelo, Movilidad escolar
  cellphone    String?
  photoFileUrl String?      // /api/files/<id>
  isActive     Boolean      @default(true)
  createdById  String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  student      Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([schoolId, studentId])
}

// ============================================================================
// 21. ASISTENCIA POR CURSO (registro interno del docente)
// ============================================================================
model CourseAttendanceSession {
  id                 String                   @id @default(uuid())
  schoolId           String
  courseAssignmentId String
  date               DateTime                 @db.Date
  periodLabel        String                   @default("1") // Hora pedagógica: "1".."8"
  takenById          String
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  school             School                   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  courseAssignment   CourseAssignment         @relation(fields: [courseAssignmentId], references: [id], onDelete: Cascade)
  records            CourseAttendanceRecord[]

  @@unique([courseAssignmentId, date, periodLabel])
  @@index([schoolId, date])
}

model CourseAttendanceRecord {
  id           String                  @id @default(uuid())
  sessionId    String
  enrollmentId String
  status       AttendanceStatus
  note         String?

  session      CourseAttendanceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  enrollment   Enrollment              @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  @@unique([sessionId, enrollmentId])
}
```

### 1.2 Migración
1. `cd back && npx prisma migrate dev --name asistencia_mejoras`
2. Si Prisma reporta *drift* o pide reset, **detente** y pregunta: "La base LOCAL tiene drift. ¿Puedo resetearla (solo datos de prueba)? (sí/no)". Solo con "sí": `npx prisma migrate reset --force` y después vuelve a ejecutar el paso 1.
3. `pnpm run seed` debe terminar sin errores.

Verifica y haz commit.

---

## BLOQUE 2 — Reglas puras y pruebas

### 2.1 Crea `back/src/modules/attendance/attendance.rules.ts`
```ts
import type { AttendanceStatus, EducationLevel } from '@prisma/client';

export type ScheduleScope = 'GENERAL' | 'INITIAL' | 'PRIMARY' | 'SECONDARY';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Día de la semana (0 = domingo) según la hora de Lima, independiente de la zona del servidor. */
export function limaWeekday(date: Date = new Date()): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', weekday: 'short' }).format(date);
  return WEEKDAYS.indexOf(short);
}

/**
 * Niveles educativos que cierra un horario.
 * - Un horario de nivel (INITIAL/PRIMARY/SECONDARY) cierra solo ese nivel (si el colegio lo ofrece).
 * - El horario GENERAL cierra los niveles ofrecidos que NO tienen horario propio.
 */
export function levelsForScope(
  scope: ScheduleScope,
  offeredLevels: EducationLevel[],
  configuredScopes: ScheduleScope[],
): EducationLevel[] {
  if (scope !== 'GENERAL') {
    return offeredLevels.includes(scope as EducationLevel) ? [scope as EducationLevel] : [];
  }
  return offeredLevels.filter((level) => !configuredScopes.includes(level as ScheduleScope));
}

/** Lista de días lectivos (lunes a viernes, sin feriados) entre dos fechas YYYY-MM-DD, ambas inclusive. */
export function expandSchoolDays(fromStr: string, toStr: string, holidayStrs: Set<string>): string[] {
  const result: string[] = [];
  const cursor = new Date(`${fromStr}T00:00:00.000Z`);
  const end = new Date(`${toStr}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidayStrs.has(iso)) result.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

/** Diferencia en días entre dos fechas YYYY-MM-DD (to - from). */
export function daysBetween(fromStr: string, toStr: string): number {
  return Math.round(
    (new Date(`${toStr}T00:00:00.000Z`).getTime() - new Date(`${fromStr}T00:00:00.000Z`).getTime()) / 86_400_000,
  );
}

export interface RiskThresholds {
  consecutive: number;
  monthlyPercent: number;
  lateCount: number;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export type RiskReason = 'CONSECUTIVE_ABSENCES' | 'MONTHLY_ABSENCE_RATE' | 'REPEATED_LATENESS';

export interface RiskSignal {
  reason: RiskReason;
  metricValue: number;
  threshold: number;
}

/**
 * Señales de riesgo a partir de los registros de los últimos 30 días.
 * Solo cuentan faltas y tardanzas INJUSTIFICADAS (las justificadas no generan alerta).
 */
export function computeRiskSignals(records: DailyRecord[], t: RiskThresholds, minDaysForRate = 5): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  let consecutive = 0;
  for (const record of sorted) {
    if (record.status === 'ABSENT_UNJUSTIFIED') consecutive++;
    else break;
  }
  if (consecutive >= t.consecutive) {
    signals.push({ reason: 'CONSECUTIVE_ABSENCES', metricValue: consecutive, threshold: t.consecutive });
  }

  if (records.length >= minDaysForRate) {
    const absences = records.filter((r) => r.status === 'ABSENT_UNJUSTIFIED').length;
    const rate = Math.round((absences * 1000) / records.length) / 10;
    if (rate >= t.monthlyPercent) {
      signals.push({ reason: 'MONTHLY_ABSENCE_RATE', metricValue: rate, threshold: t.monthlyPercent });
    }
  }

  const lates = records.filter((r) => r.status === 'LATE_UNJUSTIFIED').length;
  if (lates >= t.lateCount) {
    signals.push({ reason: 'REPEATED_LATENESS', metricValue: lates, threshold: t.lateCount });
  }

  return signals;
}

export const RISK_REASON_LABELS: Record<RiskReason, string> = {
  CONSECUTIVE_ABSENCES: 'Faltas injustificadas consecutivas',
  MONTHLY_ABSENCE_RATE: '% de faltas injustificadas (últimos 30 días)',
  REPEATED_LATENESS: 'Tardanzas injustificadas repetidas (últimos 30 días)',
};
```

### 2.2 Crea `back/src/modules/attendance/__tests__/attendance.rules.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { levelsForScope, expandSchoolDays, computeRiskSignals, daysBetween, limaWeekday } from '../attendance.rules';

describe('levelsForScope', () => {
  const offered = ['INITIAL', 'PRIMARY', 'SECONDARY'] as const;
  it('horario de nivel cierra solo su nivel', () => {
    expect(levelsForScope('SECONDARY', [...offered], ['GENERAL', 'SECONDARY'])).toEqual(['SECONDARY']);
  });
  it('GENERAL cierra los niveles sin horario propio', () => {
    expect(levelsForScope('GENERAL', [...offered], ['GENERAL', 'INITIAL'])).toEqual(['PRIMARY', 'SECONDARY']);
  });
  it('nivel no ofrecido no cierra nada', () => {
    expect(levelsForScope('INITIAL', ['PRIMARY'], ['INITIAL'])).toEqual([]);
  });
});

describe('expandSchoolDays', () => {
  it('omite fines de semana y feriados', () => {
    // 2026-11-06 (vie) a 2026-11-10 (mar); 2026-11-09 feriado de prueba
    expect(expandSchoolDays('2026-11-06', '2026-11-10', new Set(['2026-11-09']))).toEqual(['2026-11-06', '2026-11-10']);
  });
  it('rango de un día', () => {
    expect(expandSchoolDays('2026-11-10', '2026-11-10', new Set())).toEqual(['2026-11-10']);
  });
  it('daysBetween', () => expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14));
});

describe('computeRiskSignals', () => {
  const t = { consecutive: 3, monthlyPercent: 10, lateCount: 5 };
  const days = (statuses: string[]) =>
    statuses.map((status, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, status: status as never }));

  it('3 faltas injustificadas seguidas al final generan alerta', () => {
    const r = computeRiskSignals(days(['PRESENT', 'PRESENT', 'ABSENT_UNJUSTIFIED', 'ABSENT_UNJUSTIFIED', 'ABSENT_UNJUSTIFIED']), t);
    expect(r.find((s) => s.reason === 'CONSECUTIVE_ABSENCES')?.metricValue).toBe(3);
  });
  it('faltas justificadas no generan alerta', () => {
    const r = computeRiskSignals(days(['PRESENT', 'ABSENT_JUSTIFIED', 'ABSENT_JUSTIFIED', 'ABSENT_JUSTIFIED', 'ABSENT_JUSTIFIED']), t);
    expect(r).toEqual([]);
  });
  it('porcentaje mensual', () => {
    const statuses = Array.from({ length: 20 }, (_, i) => (i < 2 ? 'ABSENT_UNJUSTIFIED' : 'PRESENT'));
    const r = computeRiskSignals(days(statuses), t);
    expect(r.find((s) => s.reason === 'MONTHLY_ABSENCE_RATE')?.metricValue).toBe(10);
  });
  it('no evalúa porcentaje con menos de 5 días', () => {
    const r = computeRiskSignals(days(['ABSENT_UNJUSTIFIED', 'PRESENT']), t);
    expect(r.some((s) => s.reason === 'MONTHLY_ABSENCE_RATE')).toBe(false);
  });
  it('tardanzas repetidas', () => {
    const r = computeRiskSignals(days(Array(5).fill('LATE_UNJUSTIFIED')), t);
    expect(r.some((s) => s.reason === 'REPEATED_LATENESS')).toBe(true);
  });
});

describe('limaWeekday', () => {
  it('usa la hora de Lima (domingo 01:00 UTC = sábado en Lima)', () => {
    expect(limaWeekday(new Date('2026-11-08T01:00:00.000Z'))).toBe(6);
  });
});
```
Ejecuta `cd back && pnpm test`: todo debe pasar. Commit.

---

## BLOQUE 3 — Cierre de asistencia por nivel y correcciones del escáner

### 3.1 Reemplaza `closeAttendance` en `back/src/modules/attendance/attendance.repository.ts` por:
```ts
  /**
   * Cierre de asistencia: asigna falta injustificada a los alumnos sin marcación.
   * Solo considera matrículas activas del AÑO ACADÉMICO ACTIVO y, si se indica, de ciertos niveles o un aula.
   * Devuelve los IDs de las asistencias creadas para notificar a las familias.
   */
  async closeAttendance(params: {
    schoolId: string;
    classroomId?: string;
    educationLevels?: EducationLevel[];
    dateStr: string;
  }): Promise<{ closedCount: number; totalUnrecorded: number; createdAttendanceIds: string[] }> {
    const dateObj = parseSchoolDate(params.dateStr);

    const enrollmentScope = {
      schoolId: params.schoolId,
      isActive: true,
      academicYear: { isActive: true },
      ...(params.classroomId ? { classroomId: params.classroomId } : {}),
      ...(params.educationLevels ? { classroom: { educationLevel: { in: params.educationLevels } } } : {}),
    };

    const activeEnrollments = await prisma.enrollment.findMany({ where: enrollmentScope, select: { id: true } });
    if (activeEnrollments.length === 0) {
      return { closedCount: 0, totalUnrecorded: 0, createdAttendanceIds: [] };
    }

    const enrollmentIds = activeEnrollments.map((e) => e.id);
    const existing = await prisma.attendance.findMany({
      where: { schoolId: params.schoolId, date: dateObj, enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true },
    });
    const recordedSet = new Set(existing.map((a) => a.enrollmentId));
    const unrecorded = enrollmentIds.filter((id) => !recordedSet.has(id));

    if (unrecorded.length === 0) {
      return { closedCount: 0, totalUnrecorded: 0, createdAttendanceIds: [] };
    }

    await prisma.attendance.createMany({
      data: unrecorded.map((enrollmentId) => ({
        schoolId: params.schoolId,
        enrollmentId,
        date: dateObj,
        status: 'ABSENT_UNJUSTIFIED' as AttendanceStatus,
        origin: 'AUTO_CLOSE' as AttendanceOrigin,
        notes: 'Inasistencia registrada por cierre de horario',
      })),
      skipDuplicates: true,
    });

    const created = await prisma.attendance.findMany({
      where: {
        schoolId: params.schoolId,
        date: dateObj,
        enrollmentId: { in: unrecorded },
        origin: 'AUTO_CLOSE',
        status: 'ABSENT_UNJUSTIFIED',
      },
      select: { id: true },
    });

    return {
      closedCount: created.length,
      totalUnrecorded: unrecorded.length,
      createdAttendanceIds: created.map((a) => a.id),
    };
  }
```
Importa `EducationLevel` desde `@prisma/client` si no está importado.

### 3.2 `attendance.schema.ts`
En `closeClassroomAttendanceSchema` agrega:
```ts
  educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']).optional(),
```

### 3.3 `attendance.service.ts` → `closeAttendance`
- Después de calcular `dateStr`, rechaza los feriados:
  ```ts
  const holiday = await prisma.schoolHoliday.findUnique({
    where: { schoolId_date: { schoolId, date: parseSchoolDate(dateStr) } },
  });
  if (holiday) throw new AppError(`La fecha ${dateStr} está registrada como feriado (${holiday.name}). No se puede cerrar la asistencia.`, 400);
  ```
- Pasa al repositorio `educationLevels: dto.educationLevel ? [dto.educationLevel] : undefined`.
- Después del cierre, si `result.createdAttendanceIds.length > 0`, llama `void this.notifyAbsences(schoolId, result.createdAttendanceIds).catch((e) => console.error('[AbsenceNotify]', e));` (el método se crea en el Bloque 4; por ahora déjalo como un método privado vacío `private async notifyAbsences(_schoolId: string, _ids: string[]): Promise<void> {}`).
- La respuesta HTTP sigue siendo `{ closedCount, totalUnrecorded, message }`, como hoy. **No** incluyas `createdAttendanceIds` en la respuesta: solo se usa internamente para notificar.
- Agrega un método público para el cron:
  ```ts
  /** Cierre automático de un horario: solo los niveles que gobierna ese horario. */
  async closeAttendanceForScope(schoolId: string, scope: ScheduleScope, dateStr: string): Promise<number> {
    const [school, configs] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { offeredLevels: true } }),
      prisma.attendanceScheduleConfig.findMany({ where: { schoolId }, select: { scope: true } }),
    ]);
    const levels = levelsForScope(scope, school?.offeredLevels ?? [], configs.map((c) => c.scope as ScheduleScope));
    if (levels.length === 0) return 0;

    const result = await this.attendanceRepository.closeAttendance({ schoolId, educationLevels: levels, dateStr });
    if (result.createdAttendanceIds.length > 0) {
      void this.notifyAbsences(schoolId, result.createdAttendanceIds).catch((e) => console.error('[AbsenceNotify]', e));
    }
    return result.closedCount;
  }
  ```
  Importa `levelsForScope` y `ScheduleScope` desde `./attendance.rules`, y `parseSchoolDate` desde `../../utils/timezone.util`.
- En el controlador del cierre manual, después del éxito, agrega `recordAudit(request, { action: 'ATTENDANCE_CLOSED_MANUALLY', entity: 'Attendance', entityId: null, after: { ...request.body, closedCount: result.closedCount } })`.

### 3.4 Reemplaza `back/src/modules/attendance/attendance.cron.ts` por:
```ts
import { prisma } from '../../config/prisma';
import { getSchoolNow } from '../../utils/timezone.util';
import { limaWeekday, type ScheduleScope } from './attendance.rules';
import type { AttendanceService } from './attendance.service';

/**
 * Cierre automático de asistencia, cada 60 s, de lunes a viernes (hora de Lima).
 * Cada horario cierra SOLO los niveles que gobierna (ver levelsForScope).
 * Al terminar el cierre de un colegio, evalúa la alerta temprana de ausentismo una vez al día.
 */
export function initAttendanceAutoCloseCron(attendanceService: AttendanceService): () => void {
  let isExecuting = false;

  const intervalId = setInterval(async () => {
    if (isExecuting) return;
    isExecuting = true;
    try {
      const weekday = limaWeekday();
      if (weekday === 0 || weekday === 6) return;

      const schoolNow = getSchoolNow();
      const currentTimeStr = `${String(schoolNow.hour).padStart(2, '0')}:${String(schoolNow.minute).padStart(2, '0')}`;
      const todayDate = schoolNow.dateObj;

      const candidateConfigs = await prisma.attendanceScheduleConfig.findMany({
        where: {
          autoCloseEnabled: true,
          OR: [{ lastAutoClosedOn: null }, { lastAutoClosedOn: { lt: todayDate } }],
        },
        select: { id: true, schoolId: true, scope: true, autoCloseTime: true },
      });

      const dueConfigs = candidateConfigs.filter(
        (config) => currentTimeStr >= config.autoCloseTime && currentTimeStr < '18:00',
      );
      if (dueConfigs.length === 0) return;

      const holidays = await prisma.schoolHoliday.findMany({
        where: { date: todayDate, schoolId: { in: dueConfigs.map((c) => c.schoolId) } },
        select: { schoolId: true },
      });
      const holidaySchoolIds = new Set(holidays.map((h) => h.schoolId));

      const processedSchools = new Set<string>();

      for (const config of dueConfigs) {
        try {
          if (!holidaySchoolIds.has(config.schoolId)) {
            const closed = await attendanceService.closeAttendanceForScope(
              config.schoolId,
              config.scope as ScheduleScope,
              schoolNow.dateStr,
            );
            if (closed > 0) {
              console.log(`[Cron Auto-Cierre] Colegio ${config.schoolId} (${config.scope}): ${closed} faltas asignadas a las ${currentTimeStr}.`);
            }
            processedSchools.add(config.schoolId);
          }
          await prisma.attendanceScheduleConfig.update({
            where: { id: config.id },
            data: { lastAutoClosedOn: todayDate },
          });
        } catch (error) {
          console.error(`[Cron Auto-Cierre] Error en colegio ${config.schoolId} (${config.scope}):`, error);
        }
      }

      for (const schoolId of processedSchools) {
        await attendanceService
          .evaluateRiskForSchoolOncePerDay(schoolId, schoolNow.dateStr)
          .catch((error) => console.error(`[Cron Riesgo] Error en colegio ${schoolId}:`, error));
      }
    } catch (error) {
      console.error('[Cron Auto-Cierre] Error general:', error);
    } finally {
      isExecuting = false;
    }
  }, 60 * 1000);

  return () => clearInterval(intervalId);
}
```
- En `AttendanceService`, crea por ahora el método vacío `async evaluateRiskForSchoolOncePerDay(_schoolId: string, _dateStr: string): Promise<void> {}` (se implementa en el Bloque 8).
- En `back/src/server.ts`, el cron ahora recibe el **servicio**: reemplaza las líneas `const attendanceRepo = new AttendanceRepository();` y `const stopAttendanceCron = initAttendanceAutoCloseCron(attendanceRepo);` por
  ```ts
  const attendanceService = new AttendanceService(new AttendanceRepository());
  const stopAttendanceCron = initAttendanceAutoCloseCron(attendanceService);
  ```
  e importa `AttendanceService` desde `./modules/attendance/attendance.service`.

### 3.5 Llegada después del cierre (corrige la falta automática)
En `attendance.service.ts` → `scanAttendance`, reemplaza la condición `if (existing) {` por:
```ts
    const isAutoCloseAbsence = existing?.origin === 'AUTO_CLOSE' && existing.status === 'ABSENT_UNJUSTIFIED';
    if (existing && !isAutoCloseAbsence) {
```
y, cuando `isAutoCloseAbsence` sea verdadero, agrega al final de `noteText`: ` (Corrige la falta asignada por el cierre automático)`. El `upsert` existente (`recordScanAttendance`) sobrescribe el registro.

### 3.6 Enlace de la notificación de ingreso
En `sendScanPushNotification`, cambia `link: '/parent/attendance'` por `link: '/attendance'` (la ruta `/parent/attendance` no existe).

### 3.7 Límite de peticiones del escáner (evita bloquear la puerta en hora punta)
- En `back/src/core/middlewares/rate-limiter.middleware.ts`:
  - en `apiRateLimiter`, agrega la opción `skip: (request) => request.path.startsWith('/attendance/scan'),`;
  - agrega al final:
    ```ts
    /** Escáner de asistencia: un portero puede registrar cientos de ingresos en minutos. */
    export const scanRateLimiter = rateLimit({
      windowMs: FIFTEEN_MINUTES,
      limit: 3000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      keyGenerator: (request) => {
        const header = request.headers.authorization;
        if (header?.startsWith('Bearer ')) {
          const decoded = jwt.decode(header.slice(7)) as { userId?: string } | null;
          if (decoded?.userId) return `scan:${decoded.userId}`;
        }
        return `scan:${ipKey(request)}`;
      },
      message: { status: 'fail', message: 'Demasiados escaneos en poco tiempo. Espera unos segundos.' },
    });
    ```
- En `attendance.routes.ts`, agrega `scanRateLimiter` como primer middleware de la ruta `POST /scan` (y de las rutas `/scan/batch` y `/scan-roster` que se crean en el Bloque 7).

Verifica (incluye `pnpm test`) y haz commit.

---

## BLOQUE 4 — Aviso de inasistencia a las familias

### 4.1 Implementa `notifyAbsences` en `attendance.service.ts`
```ts
  /** Notifica a los apoderados de cada alumno con falta automática (push + campana). */
  private async notifyAbsences(schoolId: string, attendanceIds: string[]): Promise<void> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { notifyAbsencesToFamilies: true },
    });
    if (!school?.notifyAbsencesToFamilies) return;

    const attendances = await prisma.attendance.findMany({
      where: { id: { in: attendanceIds }, schoolId },
      select: {
        date: true,
        enrollmentId: true,
        enrollment: {
          select: {
            student: {
              select: {
                firstNames: true,
                lastNamePaternal: true,
                familyRelations: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    for (const attendance of attendances) {
      const student = attendance.enrollment.student;
      const dateStr = attendance.date.toISOString().slice(0, 10);
      const [y, m, d] = dateStr.split('-');
      const userIds = Array.from(new Set(student.familyRelations.map((r) => r.userId)));
      for (const userId of userIds) {
        await notificationService
          .createNotification(schoolId, {
            userId,
            title: 'Inasistencia registrada',
            message: `${student.firstNames} ${student.lastNamePaternal} no registró su ingreso hoy (${d}/${m}/${y}). Si es un error o tiene justificación, toca aquí para enviarla.`,
            type: 'ATTENDANCE',
            link: `/attendance?justify=${attendance.enrollmentId}&date=${dateStr}`,
          })
          .catch((error) => console.error('[AbsenceNotify] Error al notificar', userId, error));
      }
    }
  }
```
Importa `notificationService` desde `../notifications/notification.routes`.

### 4.2 Sin correo
No envíes correo por inasistencias (protege el límite diario del proveedor SMTP). Solo notificación en la app y push.

Verifica y haz commit.

---

## BLOQUE 5 — Justificaciones en línea (backend)

### 5.1 Esquemas en `attendance.schema.ts`
```ts
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');

export const createJustificationSchema = z
  .object({
    enrollmentId: z.string().uuid(),
    dateFrom: isoDate,
    dateTo: isoDate,
    reason: z.enum(['MEDICAL', 'FAMILY', 'BEREAVEMENT', 'TRANSPORT', 'OTHER']),
    description: z.string().trim().min(5, 'Describe brevemente el motivo').max(1000),
    fileUrl: z
      .string()
      .trim()
      .refine((v) => v.startsWith('/api/files/'), 'Adjunto inválido')
      .optional()
      .nullable(),
    fileName: z.string().trim().max(150).optional().nullable(),
  })
  .refine((v) => v.dateFrom <= v.dateTo, { message: 'La fecha inicial no puede ser posterior a la final', path: ['dateTo'] });

export const reviewJustificationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().trim().max(500).optional().nullable(),
});

export const justificationFilterSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  enrollmentId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateJustificationDto = z.infer<typeof createJustificationSchema>;
export type ReviewJustificationDto = z.infer<typeof reviewJustificationSchema>;
export type JustificationFilterDto = z.infer<typeof justificationFilterSchema>;
```

### 5.2 Crea `back/src/modules/attendance/attendance-justification.service.ts`
```ts
import type { AttendanceStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import { notificationService } from '../notifications/notification.routes';
import { daysBetween, expandSchoolDays } from './attendance.rules';
import type { CreateJustificationDto, ReviewJustificationDto, JustificationFilterDto } from './attendance.schema';

interface Principal {
  userId: string;
  studentId?: string;
  role: string;
  schoolId: string;
}

const STAFF = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'];
const MAX_RANGE_DAYS = 15;
const MAX_PAST_DAYS = 30;
const REASON_LABELS: Record<string, string> = {
  MEDICAL: 'Salud / cita médica',
  FAMILY: 'Motivo familiar',
  BEREAVEMENT: 'Duelo',
  TRANSPORT: 'Problema de transporte',
  OTHER: 'Otro motivo',
};

export class AttendanceJustificationService {
  private async getEnrollmentForPrincipal(enrollmentId: string, principal: Principal) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId: principal.schoolId },
      select: {
        id: true,
        classroom: { select: { tutorTeacherId: true } },
        student: {
          select: { id: true, firstNames: true, lastNamePaternal: true, familyRelations: { select: { userId: true } } },
        },
      },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada.', 404);

    if (principal.role === 'PARENT') {
      const isGuardian = enrollment.student.familyRelations.some((r) => r.userId === principal.userId);
      if (!isGuardian) throw new AppError('No tienes permisos sobre este estudiante.', 403);
    } else if (principal.role === 'TEACHER') {
      if (enrollment.classroom.tutorTeacherId !== principal.userId) {
        throw new AppError('Solo el tutor del aula puede gestionar estas justificaciones.', 403);
      }
    } else if (!STAFF.includes(principal.role)) {
      throw new AppError('No tienes permisos para esta acción.', 403);
    }
    return enrollment;
  }

  /** Aplica la justificación a los días lectivos del rango. */
  private async applyToAttendance(schoolId: string, enrollmentId: string, dateFrom: string, dateTo: string, justificationId: string) {
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        schoolId,
        date: { gte: new Date(`${dateFrom}T00:00:00.000Z`), lte: new Date(`${dateTo}T00:00:00.000Z`) },
      },
      select: { date: true },
    });
    const days = expandSchoolDays(dateFrom, dateTo, new Set(holidays.map((h) => h.date.toISOString().slice(0, 10))));
    const note = `Justificada (solicitud ${justificationId.slice(0, 8)})`;

    for (const day of days) {
      const date = new Date(`${day}T00:00:00.000Z`);
      const existing = await prisma.attendance.findUnique({
        where: { enrollmentId_date: { enrollmentId, date } },
        select: { id: true, status: true },
      });
      if (!existing) {
        await prisma.attendance.create({
          data: { schoolId, enrollmentId, date, status: 'ABSENT_JUSTIFIED', origin: 'MANUAL', notes: note },
        });
        continue;
      }
      const nextStatus: AttendanceStatus | null =
        existing.status === 'ABSENT_UNJUSTIFIED'
          ? 'ABSENT_JUSTIFIED'
          : existing.status === 'LATE_UNJUSTIFIED'
            ? 'LATE_JUSTIFIED'
            : null;
      if (nextStatus) {
        await prisma.attendance.update({ where: { id: existing.id }, data: { status: nextStatus, notes: note } });
      }
    }
  }

  async create(principal: Principal, dto: CreateJustificationDto) {
    const enrollment = await this.getEnrollmentForPrincipal(dto.enrollmentId, principal);
    const today = getSchoolNow().dateStr;

    if (daysBetween(dto.dateFrom, dto.dateTo) + 1 > MAX_RANGE_DAYS) {
      throw new AppError(`El rango máximo por solicitud es de ${MAX_RANGE_DAYS} días.`, 400);
    }
    if (daysBetween(dto.dateFrom, today) > MAX_PAST_DAYS) {
      throw new AppError(`Solo se pueden justificar inasistencias de los últimos ${MAX_PAST_DAYS} días.`, 400);
    }

    const isStaff = STAFF.includes(principal.role) || principal.role === 'TEACHER';
    const justification = await prisma.attendanceJustification.create({
      data: {
        schoolId: principal.schoolId,
        enrollmentId: dto.enrollmentId,
        dateFrom: new Date(`${dto.dateFrom}T00:00:00.000Z`),
        dateTo: new Date(`${dto.dateTo}T00:00:00.000Z`),
        reason: dto.reason,
        description: dto.description,
        fileUrl: dto.fileUrl ?? null,
        fileName: dto.fileName ?? null,
        requestedById: principal.userId,
        requestedByRole: principal.role,
        // Registrada por personal del colegio: queda aprobada directamente
        status: isStaff ? 'APPROVED' : 'PENDING',
        reviewedById: isStaff ? principal.userId : null,
        reviewedAt: isStaff ? new Date() : null,
      },
    });

    if (isStaff) {
      await this.applyToAttendance(principal.schoolId, dto.enrollmentId, dto.dateFrom, dto.dateTo, justification.id);
    } else {
      const studentName = `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal}`;
      const tutorId = enrollment.classroom.tutorTeacherId;
      const reviewers = await prisma.user.findMany({
        where: { schoolId: principal.schoolId, isActive: true, role: { in: ['SCHOOL_ADMIN', 'ADMINISTRATIVE'] } },
        select: { id: true },
      });
      const targets = Array.from(new Set([...(tutorId ? [tutorId] : []), ...reviewers.map((r) => r.id)]));
      for (const userId of targets) {
        await notificationService
          .createNotification(principal.schoolId, {
            userId,
            title: 'Nueva justificación de asistencia',
            message: `Se recibió una justificación para ${studentName} (${REASON_LABELS[dto.reason]}).`,
            type: 'ATTENDANCE',
            link: '/attendance-justifications',
          })
          .catch((error) => console.error('[Justification notify]', error));
      }
    }
    return justification;
  }

  async list(principal: Principal, filters: JustificationFilterDto) {
    const where: Record<string, unknown> = {
      schoolId: principal.schoolId,
      ...(filters.status && { status: filters.status }),
      ...(filters.enrollmentId && { enrollmentId: filters.enrollmentId }),
    };
    if (principal.role === 'PARENT') {
      where.enrollment = { student: { familyRelations: { some: { userId: principal.userId } } } };
    } else if (principal.role === 'TEACHER') {
      where.enrollment = { classroom: { tutorTeacherId: principal.userId } };
    } else if (!STAFF.includes(principal.role)) {
      throw new AppError('No tienes permisos para esta acción.', 403);
    }

    const [data, total] = await Promise.all([
      prisma.attendanceJustification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          enrollment: {
            select: {
              id: true,
              classroom: { select: { grade: true, section: true, educationLevel: true } },
              student: { select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true } },
            },
          },
        },
      }),
      prisma.attendanceJustification.count({ where }),
    ]);
    return { data, meta: { total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) } };
  }

  async review(principal: Principal, id: string, dto: ReviewJustificationDto) {
    const justification = await prisma.attendanceJustification.findFirst({ where: { id, schoolId: principal.schoolId } });
    if (!justification) throw new AppError('Justificación no encontrada.', 404);
    if (justification.status !== 'PENDING') throw new AppError('Esta justificación ya fue revisada.', 409);

    const enrollment = await this.getEnrollmentForPrincipal(justification.enrollmentId, principal);
    if (principal.role === 'PARENT') throw new AppError('No tienes permisos para revisar justificaciones.', 403);

    const updated = await prisma.attendanceJustification.update({
      where: { id },
      data: { status: dto.decision, reviewedById: principal.userId, reviewedAt: new Date(), reviewNote: dto.reviewNote ?? null },
    });

    const from = justification.dateFrom.toISOString().slice(0, 10);
    const to = justification.dateTo.toISOString().slice(0, 10);
    if (dto.decision === 'APPROVED') {
      await this.applyToAttendance(principal.schoolId, justification.enrollmentId, from, to, id);
    }

    const studentName = `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal}`;
    await notificationService
      .createNotification(principal.schoolId, {
        userId: justification.requestedById,
        title: dto.decision === 'APPROVED' ? 'Justificación aprobada' : 'Justificación rechazada',
        message:
          dto.decision === 'APPROVED'
            ? `La justificación de ${studentName} fue aprobada.`
            : `La justificación de ${studentName} fue rechazada.${dto.reviewNote ? ` Motivo: ${dto.reviewNote}` : ''}`,
        type: 'ATTENDANCE',
        link: '/attendance',
      })
      .catch((error) => console.error('[Justification review notify]', error));

    return updated;
  }
}

export const attendanceJustificationService = new AttendanceJustificationService();
```

### 5.3 Rutas y controlador
En `attendance.routes.ts`, agrega **antes** de cualquier ruta con parámetro `/:id`:
```ts
attendanceRouter.get(
  '/justifications',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  attendanceController.listJustifications,
);
attendanceRouter.post(
  '/justifications',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  attendanceController.createJustification,
);
attendanceRouter.patch(
  '/justifications/:justificationId/review',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  attendanceController.reviewJustification,
);
```
En `attendance.controller.ts`, agrega los tres métodos. Cada uno parsea con su schema, llama a `attendanceJustificationService` con `request.user!` y responde `{ status: 'success', data }` (en `list`, responde `{ status: 'success', data: result.data, meta: result.meta }`). Registra en la bitácora:
- `createJustification` → `ATTENDANCE_JUSTIFICATION_CREATED` (entity `AttendanceJustification`);
- `reviewJustification` → `ATTENDANCE_JUSTIFICATION_APPROVED` o `ATTENDANCE_JUSTIFICATION_REJECTED`.

Verifica y haz commit.

---

## BLOQUE 6 — Justificaciones en línea (frontend)

### 6.1 Hooks en `front/src/features/attendance/api/useJustifications.ts`
- `useJustifications(filters: { status?: string; enrollmentId?: string; page?: number })` → `GET /attendance/justifications` (queryKey `['attendance-justifications', filters]`).
- `useCreateJustification()` → `POST /attendance/justifications`; al tener éxito invalida `['attendance-justifications']`, `['attendance']` y `['student-attendance']`, y muestra `toast.success('Justificación enviada. El colegio la revisará pronto.')`. Si la respuesta trae `status === 'APPROVED'`, el mensaje es `'Justificación registrada y aplicada.'`.
- `useReviewJustification()` → `PATCH /attendance/justifications/:id/review`; invalida las mismas claves.

Agrega a `front/src/features/attendance/types.ts` los tipos `JustificationReason`, `JustificationStatus` y `AttendanceJustification` (con los campos del modelo y `enrollment.student` / `enrollment.classroom`).

### 6.2 Crea `front/src/features/attendance/components/JustifyAbsenceModal.tsx`
Props: `{ open: boolean; onClose: () => void; enrollmentId: string; studentName: string; defaultDate?: string }`.
Formulario con `react-hook-form` + `zod`:
- **"Desde"** y **"Hasta"** (`input type="date"`, por defecto `defaultDate` o hoy, con `getPeruToday()` de `lib/dateUtils`);
- **"Motivo"**: select con *Salud / cita médica*, *Motivo familiar*, *Duelo*, *Problema de transporte*, *Otro motivo*;
- **"Descripción"** (textarea, 5 a 1000 caracteres);
- **"Adjuntar sustento (opcional)"**: acepta PDF, JPG y PNG; sube con `useUploadMaterial` de `features/course-contents/api/useCourseContents.ts` y guarda `url` y `fileName`. Muestra `Formatos: PDF, JPG o PNG. Máximo 15 MB.`;
- el botón **"Enviar justificación"**, que llama a `useCreateJustification`.

### 6.3 Vista de padres: `front/src/features/parent/components/ParentAttendanceView.tsx`
1. Lee `?justify=<enrollmentId>&date=YYYY-MM-DD` con `useSearchParams`. Si existe, abre `JustifyAbsenceModal` con ese alumno y esa fecha, y limpia los parámetros al cerrar.
2. En cada registro con estado `ABSENT_UNJUSTIFIED` o `LATE_UNJUSTIFIED` de los últimos 30 días, muestra el botón **"Justificar"** que abre el modal con esa fecha.
3. Agrega una sección **"Mis justificaciones"** con `useJustifications({ enrollmentId })`: fecha(s), motivo y badge de estado (*Pendiente* en ámbar, *Aprobada* en verde con `bg-success/15 text-success`, *Rechazada* en rojo con la nota de revisión).
4. Agrega el botón **"Justificar una inasistencia"** arriba de la vista (permite pre-justificar días futuros cercanos, como una cita médica).

### 6.4 Bandeja del personal: `front/src/features/attendance/pages/AttendanceJustificationsPage.tsx`
- Título `Justificaciones de asistencia`; subtítulo `Revisa y aprueba las justificaciones enviadas por las familias.`
- Pestañas **Pendientes | Aprobadas | Rechazadas**.
- Tabla: **Estudiante**, **Aula** (`3° "A" - Primaria`), **Fechas** (`10/11/2026` o `10/11 – 12/11/2026`), **Motivo**, **Descripción** (truncada con tooltip), **Sustento** (botón *Ver* con `openFile(fileUrl)` de `features/course-contents/utils/fileUrls`), **Enviado** y **Acciones**.
- En Pendientes: **"Aprobar"** (verde) y **"Rechazar"** (abre un diálogo con una nota opcional).
- Paginación con `components/ui/Pagination.tsx`.
- **Ruta:** `/attendance-justifications` (lazy), con `RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']}`.
- **Menú lateral** (`DashboardLayout.tsx`): en la misma sección del ítem de asistencia, agrega **"Justificaciones"** con el ícono `FileCheck2` y los mismos roles, `minPlan: 'BASIC'`.

Verifica back y front, y haz commit.

---

# FASE 2 — Robustez y prevención

## BLOQUE 7 — Escáner que funciona sin internet

### 7.1 Utilidad de hora escolar para un instante dado
En `back/src/utils/timezone.util.ts`, agrega `export function getSchoolTimeParts(instant: Date, timeZone = 'America/Lima'): SchoolNowResult` con la misma lógica que `getSchoolNow`, pero usando `instant` en lugar de `new Date()`. Luego reescribe `getSchoolNow` como `return getSchoolTimeParts(new Date(), timeZone);`.

### 7.2 Hora real del escaneo (`scannedAt`)
- En `scanAttendanceSchema` agrega: `scannedAt: z.string().datetime({ offset: true }).optional(),`.
- En `attendance.service.ts` → `scanAttendance`, reemplaza:
  ```ts
  const schoolNow = getSchoolNow();
  ```
  por:
  ```ts
  let instant = new Date();
  if (dto.scannedAt) {
    const scanned = new Date(dto.scannedAt);
    const diffMs = Date.now() - scanned.getTime();
    if (diffMs < -2 * 60_000) throw new AppError('La hora del escaneo está en el futuro. Revisa la hora del dispositivo.', 422);
    if (diffMs > 12 * 60 * 60_000) throw new AppError('El escaneo tiene más de 12 horas y no puede registrarse automáticamente.', 422);
    instant = scanned;
  }
  const schoolNow = getSchoolTimeParts(instant);
  ```
  (las variables `todayDate`, `now`, `hour` y `minute` siguen saliendo de `schoolNow`). Agrega a `noteText` el sufijo ` [sincronizado sin conexión]` cuando venga `scannedAt`.

### 7.3 Endpoint por lotes
Ruta: `attendanceRouter.post('/scan/batch', scanRateLimiter, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'), attendanceController.scanBatch);`

Schema:
```ts
export const scanBatchSchema = z.object({
  items: z
    .array(
      z.object({
        clientId: z.string().min(1).max(64),
        code: z.string().min(1).max(64),
        scannedAt: z.string().datetime({ offset: true }),
        toleranceTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      }),
    )
    .min(1)
    .max(200),
});
```
El controlador `scanBatch` procesa los ítems **en serie**:
```ts
const results = [];
for (const item of dto.items) {
  try {
    const r = await this.attendanceService.scanAttendance(schoolId, { code: item.code, scannedAt: item.scannedAt, toleranceTime: item.toleranceTime }, userContext);
    results.push({ clientId: item.clientId, ok: true, alreadyRegistered: r.alreadyRegistered, status: r.status, studentName: r.student.fullName });
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    results.push({ clientId: item.clientId, ok: false, httpStatus: appError?.statusCode ?? 500, error: appError?.message ?? 'Error interno' });
  }
}
response.status(200).json({ status: 'success', data: { results } });
```
(usa el mismo `userContext` que arma el controlador de `/scan`).

### 7.4 Padrón para mostrar nombres sin conexión
Ruta: `attendanceRouter.get('/scan-roster', scanRateLimiter, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ADMINISTRATIVE'), attendanceController.getScanRoster);`

Devuelve las matrículas activas del año activo (para `TEACHER`, solo sus aulas de tutoría) como:
```ts
Array<{ studentCode: string | null; documentId: string; fullName: string; classroom: string }>
```
donde `classroom` = `3° "A" - PRIMARY`. Solo esos 4 campos (minimización de datos).

### 7.5 Frontend: cola sin conexión
**a) Crea `front/src/features/attendance/offline/scanQueue.ts`:**
```ts
import { createStore, get, set, del, values } from 'idb-keyval';

const queueStore = createStore('saaschool-offline', 'attendance-scans');
const rosterStore = createStore('saaschool-offline-roster', 'attendance-roster');

export interface QueuedScan {
  id: string;
  schoolId: string;
  code: string;
  scannedAt: string;
  toleranceTime?: string;
  attempts: number;
  rejected?: boolean;
  lastError?: string;
}

export interface RosterEntry {
  studentCode: string | null;
  documentId: string;
  fullName: string;
  classroom: string;
}

export async function enqueueScan(input: Omit<QueuedScan, 'id' | 'attempts'>): Promise<QueuedScan> {
  const item: QueuedScan = { ...input, id: crypto.randomUUID(), attempts: 0 };
  await set(item.id, item, queueStore);
  return item;
}

export async function listQueuedScans(schoolId: string): Promise<QueuedScan[]> {
  const all = await values<QueuedScan>(queueStore);
  return all.filter((s) => s.schoolId === schoolId).sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}

export async function updateQueuedScan(item: QueuedScan): Promise<void> {
  await set(item.id, item, queueStore);
}

export async function removeQueuedScan(id: string): Promise<void> {
  await del(id, queueStore);
}

export async function saveRoster(schoolId: string, roster: RosterEntry[]): Promise<void> {
  await set(schoolId, { savedAt: new Date().toISOString(), roster }, rosterStore);
}

export async function findInRoster(schoolId: string, code: string): Promise<RosterEntry | null> {
  const cached = await get<{ savedAt: string; roster: RosterEntry[] }>(schoolId, rosterStore);
  const clean = code.trim();
  return cached?.roster.find((r) => r.studentCode === clean || r.documentId === clean) ?? null;
}

export async function clearRoster(): Promise<void> {
  const { clear } = await import('idb-keyval');
  await clear(rosterStore);
}
```

**b) Crea `front/src/features/attendance/offline/useOfflineScanQueue.ts`**, un hook que:
- recibe `schoolId`;
- expone `{ pending: QueuedScan[]; rejected: QueuedScan[]; isSyncing: boolean; syncNow: () => Promise<void>; refresh: () => Promise<void> }`;
- `syncNow`: toma hasta 200 escaneos no rechazados, llama a `POST /attendance/scan/batch` con `{ items: [{ clientId: id, code, scannedAt, toleranceTime }] }`, y luego:
  - `ok: true` → `removeQueuedScan`;
  - `ok: false` con `httpStatus` 4xx → marca `rejected: true` y `lastError`;
  - `ok: false` con 5xx o error de red → incrementa `attempts` y lo deja pendiente.

  Después invalida `['attendance']`, `['attendance-sheet']` y `['attendance-summary']`;
- sincroniza automáticamente al montar, en el evento `window 'online'` y cada 30 segundos mientras haya pendientes y `navigator.onLine`;
- incluye `discardRejected(id)` para quitar un rechazado de la lista.

**c) Modifica `QrScannerModal.tsx`:**
1. Obtén `schoolId` del usuario (`useAuthStore`; si existe `impersonatedSchool`, usa su `id`).
2. Al abrir el modal, si `navigator.onLine`, descarga `GET /attendance/scan-roster` y guárdalo con `saveRoster`.
3. En `handleProcessScan`, captura el instante **antes** de enviar: `const scannedAt = new Date().toISOString();`. Envía `{ code, toleranceTime, scannedAt }`.
4. En `onError`: si `!err.response` (error de red) o `!navigator.onLine`:
   - `await enqueueScan({ schoolId, code: trimmed, scannedAt, toleranceTime })`;
   - busca el nombre con `findInRoster`;
   - muestra el resultado *"Guardado sin conexión"*: `{nombre o código} · {HH:MM}` con fondo ámbar, y suena `playBeep('warning')`;
   - agrégalo a `recentScans` con una marca `offline: true`;
   - no muestres el mensaje de error.

   Los demás errores (404, 403, etc.) se muestran como hoy.
5. Usa `useOfflineScanQueue(schoolId)` y muestra en el encabezado del modal:
   - si hay pendientes: un badge ámbar `{n} por sincronizar` y el botón **"Sincronizar ahora"** (deshabilitado sin conexión o mientras sincroniza);
   - sin conexión: un badge rojo `Sin conexión — los ingresos se guardan en este dispositivo`;
   - si hay rechazados: un bloque rojo **"Escaneos no registrados"** con código, hora, motivo (`lastError`) y el botón *Descartar*.
6. Al cerrar el modal con pendientes, muestra `ConfirmDialog`: `Hay {n} ingresos sin sincronizar. Se enviarán automáticamente cuando vuelva la conexión mientras la app esté abierta. ¿Cerrar de todos modos?`

**d) `front/src/store/useAuthStore.ts` → `logout`:** agrega `void import('@/features/attendance/offline/scanQueue').then((m) => m.clearRoster());`. **No borres la cola de escaneos al cerrar sesión**: se sincroniza en el próximo ingreso del mismo colegio.

**e) Texto de ayuda** en el modal, bajo el lector: `Si se cae el internet, sigue escaneando: los ingresos se guardan con su hora real y se envían solos al volver la conexión. Abre el lector con internet al inicio del día.`

Verifica back y front, y haz commit.

---

## BLOQUE 8 — Alerta temprana de ausentismo

### 8.1 Evaluación diaria en `attendance.service.ts`
Reemplaza el método vacío `evaluateRiskForSchoolOncePerDay` por:
```ts
  /** Evalúa señales de riesgo una vez al día por colegio y avisa al tutor por cada alerta nueva. */
  async evaluateRiskForSchoolOncePerDay(schoolId: string, dateStr: string): Promise<void> {
    const today = parseSchoolDate(dateStr);
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { lastRiskEvaluationOn: true, absenceAlertConsecutive: true, absenceAlertMonthlyPercent: true, lateAlertMonthlyCount: true },
    });
    if (!school) return;
    if (school.lastRiskEvaluationOn && school.lastRiskEvaluationOn.getTime() >= today.getTime()) return;

    await prisma.school.update({ where: { id: schoolId }, data: { lastRiskEvaluationOn: today } });
    await this.evaluateRiskForSchool(schoolId, dateStr, {
      consecutive: school.absenceAlertConsecutive,
      monthlyPercent: school.absenceAlertMonthlyPercent,
      lateCount: school.lateAlertMonthlyCount,
    });
  }

  async evaluateRiskForSchool(schoolId: string, dateStr: string, thresholds: RiskThresholds): Promise<number> {
    const today = parseSchoolDate(dateStr);
    const since = new Date(today.getTime() - 29 * 86_400_000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000);

    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, isActive: true, academicYear: { isActive: true } },
      select: {
        id: true,
        classroom: { select: { tutorTeacherId: true, grade: true, section: true } },
        student: { select: { firstNames: true, lastNamePaternal: true } },
        attendances: { where: { date: { gte: since, lte: today } }, select: { date: true, status: true } },
      },
    });

    let created = 0;
    for (const enrollment of enrollments) {
      const signals = computeRiskSignals(
        enrollment.attendances.map((a) => ({ date: a.date.toISOString().slice(0, 10), status: a.status })),
        thresholds,
      );
      for (const signal of signals) {
        const recentOpen = await prisma.attendanceAlert.findFirst({
          where: { enrollmentId: enrollment.id, reason: signal.reason, status: 'OPEN', triggeredOn: { gte: sevenDaysAgo } },
          select: { id: true },
        });
        if (recentOpen) continue;

        await prisma.attendanceAlert.upsert({
          where: { enrollmentId_reason_triggeredOn: { enrollmentId: enrollment.id, reason: signal.reason, triggeredOn: today } },
          update: {},
          create: {
            schoolId,
            enrollmentId: enrollment.id,
            reason: signal.reason,
            metricValue: signal.metricValue,
            threshold: signal.threshold,
            triggeredOn: today,
          },
        });
        created++;

        const tutorId = enrollment.classroom.tutorTeacherId;
        if (tutorId) {
          await notificationService
            .createNotification(schoolId, {
              userId: tutorId,
              title: 'Alerta de asistencia',
              message: `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal} (${enrollment.classroom.grade}° "${enrollment.classroom.section}"): ${RISK_REASON_LABELS[signal.reason]} — ${signal.metricValue}.`,
              type: 'ATTENDANCE',
              link: '/attendance-alerts',
            })
            .catch((error) => console.error('[Risk notify]', error));
        }
      }
    }
    return created;
  }
```
Importa `computeRiskSignals`, `RISK_REASON_LABELS` y `RiskThresholds` desde `./attendance.rules`.

### 8.2 Endpoints de alertas
En `attendance.routes.ts` (antes de rutas con `/:id`):
```ts
attendanceRouter.get('/alerts', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), attendanceController.listAlerts);
attendanceRouter.post('/alerts/evaluate', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), attendanceController.evaluateAlertsNow);
attendanceRouter.patch('/alerts/:alertId/attend', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), attendanceController.attendAlert);
attendanceRouter.post('/alerts/:alertId/cite', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), attendanceController.citeFamilyFromAlert);
```
- **`listAlerts`:** query `{ status?: 'OPEN' | 'ATTENDED'; page; limit (máx 100) }`. Para `TEACHER`, filtra `enrollment.classroom.tutorTeacherId = userId`. Incluye alumno (nombres), aula y `reason`, `metricValue`, `threshold`, `triggeredOn`, `status`, `attendedNote`, `incidentId`. Orden: `triggeredOn desc`.
- **`evaluateAlertsNow`:** lee los umbrales del colegio, llama a `evaluateRiskForSchool(schoolId, getSchoolNow().dateStr, thresholds)` y responde `{ created }`.
- **`attendAlert`:** body `{ note: z.string().trim().min(3).max(500) }`. Verifica que la alerta pertenezca al colegio (y, si es `TEACHER`, que sea tutor del aula). Actualiza `status: 'ATTENDED'`, `attendedById`, `attendedAt` y `attendedNote`. Bitácora: `ATTENDANCE_ALERT_ATTENDED`.
- **`citeFamilyFromAlert`:** body `{ citationDate: z.string().datetime({ offset: true }), note: z.string().trim().max(500).optional() }`. Mismas verificaciones. Crea un `StudentIncident` con:
  ```ts
  {
    schoolId,
    enrollmentId: alert.enrollmentId,
    authorId: userId,
    type: 'CITACION_PADRES',
    severity: 'MEDIUM',
    title: 'Citación por asistencia',
    description: `${RISK_REASON_LABELS[alert.reason]}: ${alert.metricValue} (umbral ${alert.threshold}). ${note ?? ''}`.trim(),
    citationDate: new Date(citationDate),
  }
  ```
  Luego actualiza la alerta con `status: 'ATTENDED'`, `incidentId`, `attendedById`, `attendedAt` y `attendedNote: 'Familia citada'`. Notifica a cada apoderado (`familyRelations.userId`): título `Citación del colegio`, mensaje `Se le cita el {fecha y hora en Lima} para conversar sobre la asistencia de {nombre}.`, `link: '/dashboard'`. Bitácora: `ATTENDANCE_ALERT_FAMILY_CITED`.

### 8.3 Frontend: `front/src/features/attendance/pages/AttendanceAlertsPage.tsx`
- Título `Alerta temprana de asistencia`; subtítulo `Estudiantes con señales de ausentismo en los últimos 30 días. Atiéndelos a tiempo para prevenir la deserción escolar.`
- Pestañas **Abiertas | Atendidas**.
- Tarjetas (no tabla) en `grid md:grid-cols-2`, cada una con:
  - nombre y aula;
  - etiqueta del motivo (usa los textos de `RISK_REASON_LABELS`, replicados en `front/src/features/attendance/types.ts`);
  - métrica grande (`3 faltas seguidas`, `12.5 %`, `6 tardanzas`) y el umbral en gris;
  - fecha de la alerta;
  - botones **"Marcar como atendida"** (diálogo con nota obligatoria) y **"Citar a la familia"** (diálogo con `input type="datetime-local"` y nota opcional).
- En Atendidas: muestra la nota y, si tiene `incidentId`, el badge `Familia citada`.
- Para `SCHOOL_ADMIN` / `SUPER_ADMIN`, el botón **"Evaluar ahora"** arriba, que llama a `/alerts/evaluate` y muestra un toast con el número de alertas nuevas.
- **Ruta:** `/attendance-alerts` (lazy), `RoleGuard` con `['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']`.
- **Menú:** ítem **"Alertas de asistencia"** con el ícono `AlertTriangle`, mismos roles, en la sección de asistencia.
- Hooks en `front/src/features/attendance/api/useAttendanceAlerts.ts`: `useAttendanceAlerts`, `useAttendAlert`, `useCiteFamily` y `useEvaluateAlerts`.

Verifica (incluye `pnpm test`) y haz commit.

---

# FASE 3 — Valor agregado

## BLOQUE 9 — Registro de salida y personas autorizadas a recoger

### 9.1 Módulo `back/src/modules/pickups/`
`pickup.routes.ts` (montado en `app.ts` como `app.use(\`${API_PREFIX}/pickups\`, pickupRouter);` junto a las demás rutas):
```ts
pickupRouter.use(authMiddleware, tenantMiddleware);
pickupRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'), controller.list);   // ?studentId=
pickupRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), controller.create);
pickupRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), controller.update);
pickupRouter.delete('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), controller.deactivate);
```
Schema:
```ts
export const pickupSchema = z.object({
  studentId: z.string().uuid(),
  fullName: z.string().trim().min(3).max(120),
  documentType: z.enum(['DNI', 'CE', 'CARNET_EXTRANJERIA', 'PASSPORT', 'PTP', 'OTHER']).default('DNI'),
  documentId: z.string().trim().min(6).max(20),
  relationship: z.string().trim().min(2).max(40),
  cellphone: z.string().trim().regex(/^9\d{8}$/, 'Celular de 9 dígitos que empiece con 9').optional().nullable().or(z.literal('')),
  photoFileUrl: z.string().refine((v) => v.startsWith('/api/files/'), 'Foto inválida').optional().nullable(),
});
export const updatePickupSchema = pickupSchema.omit({ studentId: true }).partial();
```
Reglas:
- `list` exige `studentId`. Para `PARENT`, verifica que sea apoderado de ese alumno. Devuelve solo `isActive: true`, ordenado por `fullName`.
- `create` verifica que el alumno pertenezca al colegio y guarda `createdById`.
- `deactivate` pone `isActive: false` (no borra).
- Bitácora: `PICKUP_CREATED`, `PICKUP_UPDATED` y `PICKUP_DEACTIVATED`.
- Notifica a los apoderados al crear: título `Nueva persona autorizada`, mensaje `{fullName} ({relationship}) fue autorizado(a) para recoger a {alumno}. Si no lo reconoces, comunícate con el colegio.`

### 9.2 Salida en `attendance` (backend)
Rutas:
```ts
attendanceRouter.get('/checkout/preview', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), attendanceController.checkoutPreview); // ?code=
attendanceRouter.post('/checkout', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), attendanceController.checkout);
```
Schema:
```ts
export const checkoutSchema = z.object({
  code: z.string().min(1).max(64),
  pickupType: z.enum(['GUARDIAN', 'AUTHORIZED', 'SELF']),
  pickupPersonId: z.string().uuid().optional(),
  earlyLeaveReason: z.string().trim().max(200).optional().nullable(),
});
```
- **`checkoutPreview`:** busca la matrícula con `findActiveEnrollmentByCode` (para `TEACHER`, solo si es tutor del aula) y devuelve:
  - alumno (nombre, aula, nivel);
  - la asistencia de hoy (`status`, `checkInTime`, `checkOutTime`);
  - los apoderados (`familyRelations` con `user.id`, nombre completo, `relationshipType` y `documentId`);
  - las personas autorizadas activas (`id`, `fullName`, `relationship`, `documentType`, `documentId`, `photoFileUrl`).
- **`checkout`:**
  1. Busca la matrícula igual que en la vista previa.
  2. Exige asistencia de hoy con estado `PRESENT`, `LATE_JUSTIFIED` o `LATE_UNJUSTIFIED`. Si no: 409 `El estudiante no registra ingreso hoy.`
  3. Si ya tiene `checkOutTime`: 409 `El estudiante ya registró su salida a las HH:MM.`
  4. `pickupType = 'SELF'` solo se permite si `classroom.educationLevel === 'SECONDARY'`. Si no: 422 `En Inicial y Primaria el estudiante debe ser recogido por un apoderado o una persona autorizada.`
  5. `GUARDIAN`: `pickupPersonId` debe ser el `userId` de una `familyRelation` del alumno. `AUTHORIZED`: debe ser un `AuthorizedPickup` activo del alumno. Si no: 422 `Persona no autorizada para recoger a este estudiante.`
  6. Actualiza la asistencia con `checkOutTime: new Date()`, `checkOutById: userId`, `pickupPersonId`, `pickedUpByName`, `pickedUpByDocument` y `earlyLeaveReason`.
  7. Notifica a los apoderados: título `Salida del colegio`, mensaje `{alumno} salió a las {HH:MM}{, recogido(a) por {nombre} ({parentesco}) | por su cuenta}.`, `link: '/attendance'`.
  8. Bitácora: `ATTENDANCE_CHECKOUT`.

### 9.3 Frontend
**a) `front/src/features/attendance/components/CheckoutModal.tsx`:**
- Paso 1: código por cámara (reutiliza `CameraQrScanner` con `onScan`) o input manual. Llama a `/attendance/checkout/preview`.
- Paso 2: tarjeta del alumno (nombre, aula, hora de ingreso). Debajo, la lista seleccionable (tarjetas tipo radio) con los apoderados y las personas autorizadas. Muestra la foto si existe: resuelve la URL con `useResolvedFileUrl` y usa un avatar con iniciales si no hay foto. Para Secundaria, agrega la opción **"Sale por su cuenta"**. Incluye el campo opcional **"Motivo de salida anticipada"**.
- Botón **"Registrar salida"**. Si ya registró salida, muestra el aviso con la hora y deshabilita el botón.

**b) `AttendancePage.tsx`:** agrega el botón **"Registrar salida"** (ícono `LogOut`) junto al botón del lector QR, para los roles con permiso.

**c) `AttendanceSheetView.tsx`:** agrega la columna **"Salida"**, que muestra la hora (`formatPeruTime`) y `pickedUpByName` debajo en texto pequeño, o `—`. El tipo de fila del front debe incluir `checkOutTime` y `pickedUpByName` (y el repositorio `getClassroomAttendanceSheet` debe devolverlos).

**d) `StudentFichaModal.tsx`:** agrega la sección **"Personas autorizadas a recoger"** con la lista (avatar, nombre, parentesco, documento, celular) y, para `SCHOOL_ADMIN` / `ADMINISTRATIVE` / `SUPER_ADMIN`, los botones **"Agregar"** (formulario con los campos del schema y foto opcional subida con `useUploadMaterial`) y **"Quitar"** (con `ConfirmDialog`).

**e) Vista de padres:** en `ParentAttendanceView.tsx`, agrega una tarjeta de solo lectura **"Personas autorizadas a recoger a {nombre}"** con el texto `Para agregar o quitar personas, comunícate con Secretaría.`

Hooks en `front/src/features/attendance/api/usePickups.ts` y `useCheckout.ts`.

Verifica back y front, y haz commit.

---

## BLOQUE 10 — Asistencia por curso (registro interno del docente)

### 10.1 Módulo `back/src/modules/course-attendance/`
Montado en `app.ts` como `app.use(\`${API_PREFIX}/course-attendance\`, courseAttendanceRouter);`.
```ts
courseAttendanceRouter.use(authMiddleware, tenantMiddleware);
courseAttendanceRouter.get('/session', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), controller.getSession);   // ?courseAssignmentId&date&periodLabel
courseAttendanceRouter.put('/session', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), controller.saveSession);
courseAttendanceRouter.get('/summary', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), controller.getSummary); // ?courseAssignmentId&month=YYYY-MM
```
Schemas:
```ts
const periodLabel = z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).default('1');
export const sessionQuerySchema = z.object({ courseAssignmentId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), periodLabel });
export const saveSessionSchema = sessionQuerySchema.extend({
  records: z.array(z.object({
    enrollmentId: z.string().uuid(),
    status: z.enum(['PRESENT', 'LATE_UNJUSTIFIED', 'LATE_JUSTIFIED', 'ABSENT_UNJUSTIFIED', 'ABSENT_JUSTIFIED']),
    note: z.string().trim().max(200).optional().nullable(),
  })).min(1).max(60),
});
export const summaryQuerySchema = z.object({ courseAssignmentId: z.string().uuid(), month: z.string().regex(/^\d{4}-\d{2}$/) });
```
Reglas:
- **Acceso:** el `courseAssignment` debe pertenecer al colegio. Si el rol es `TEACHER`, `assignment.teacherId` debe ser el `userId`; si no: 403 `Solo el docente del curso puede registrar su asistencia.`
- **`getSession`:** carga las matrículas activas (año activo) del aula del curso, ordenadas por apellido. Si la sesión existe, devuelve sus registros. Si no, sugiere el estado desde la asistencia diaria de esa fecha: si es `ABSENT_*`, el mismo estado; en cualquier otro caso, `PRESENT`. Respuesta: `{ sessionExists: boolean; students: Array<{ enrollmentId, fullName, status, note, dailyStatus }> }`.
- **`saveSession`:** en una `prisma.$transaction`, haz upsert de la sesión (clave `courseAssignmentId_date_periodLabel`, `takenById: userId`) y upsert de cada registro (clave `sessionId_enrollmentId`). Valida que cada `enrollmentId` pertenezca al aula del curso. Bitácora: `COURSE_ATTENDANCE_SAVED`.
- **`getSummary`:** por alumno, conteo de presentes, tardanzas y faltas en el mes, y el número de sesiones.

### 10.2 Frontend: `front/src/features/course-attendance/pages/CourseAttendancePage.tsx`
- Aviso fijo en azul claro: `Registro interno del docente. La asistencia oficial que se reporta al SIAGIE es la del ingreso diario al colegio.`
- Filtros:
  - curso: para `TEACHER` usa `useMyCourseAssignments` de `features/course-assignments/api`; para administradores, `useCourseAssignments`. Etiqueta: `Área — 3° "A"`;
  - fecha (hoy por defecto);
  - **"Hora"** (1.ª a 8.ª).
- Lista de alumnos con un control segmentado por fila: **P** (verde), **T** (ámbar), **F** (rojo). Cada botón tiene `aria-label` (`Presente`, `Tardanza`, `Falta`) y `aria-pressed`. Si el estado diario es falta, muestra la etiqueta `Faltó al colegio`.
- Acciones: **"Todos presentes"** y **"Guardar asistencia"**. Muestra `Guardado` con la hora si la sesión ya existía.
- Pestaña **"Resumen del mes"**: tabla con Alumno | Presentes | Tardanzas | Faltas | % asistencia.
- **Ruta:** `/course-attendance` (lazy), `RoleGuard` con `['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']`.
- **Menú:** **"Asistencia por curso"** con el ícono `ClipboardCheck`, mismos roles, `minPlan: 'BASIC'`.
- Hooks en `front/src/features/course-attendance/api/useCourseAttendance.ts`.

Verifica back y front, y haz commit.

---

## BLOQUE 11 — Configuración del colegio

1. `back/src/modules/schools/school.schema.ts` (update), agrega:
   ```ts
   notifyAbsencesToFamilies: z.boolean().optional(),
   absenceAlertConsecutive: z.number().int().min(2).max(10).optional(),
   absenceAlertMonthlyPercent: z.number().int().min(5).max(50).optional(),
   lateAlertMonthlyCount: z.number().int().min(2).max(20).optional(),
   ```
   Asegúrate de que `GET /schools/:id` devuelva estos campos.
2. `front/src/features/schools/types.ts`: agrega los 4 campos.
3. `SchoolSettingsModal.tsx`: agrega la sección **"Asistencia"** con:
   - el toggle **"Avisar a las familias cuando el estudiante no registra ingreso"**;
   - **"Alerta por faltas injustificadas seguidas"** (número, 2–10);
   - **"Alerta por % de faltas injustificadas en 30 días"** (número, 5–50, sufijo `%`);
   - **"Alerta por tardanzas injustificadas en 30 días"** (número, 2–20);
   - el texto de ayuda: `Las alertas se calculan cada día lectivo después del cierre automático y se envían al tutor del aula.`

Verifica y haz commit.

---

## BLOQUE 12 — Pruebas de integración manuales

Levanta el backend (`cd back && PORT=3999 pnpm dev`) y verifica con `curl` o con un script en Node 22 (`fetch`). Usa las cuentas del seed (`back/prisma/seed.ts`) y no imprimas contraseñas en el reporte.

1. **Cierre por nivel:**
   - configura horarios `INITIAL` (`autoCloseTime` 08:30) y `SECONDARY` (`autoCloseTime` 08:00) en un colegio con ambos niveles;
   - llama a `closeAttendanceForScope(schoolId, 'SECONDARY', hoy)` desde un script con `ts-node`;
   - verifica que solo se crearon faltas en aulas de Secundaria.
2. **Feriado:** `POST /attendance/close` con una fecha registrada como feriado → **400**.
3. **Llegada tardía tras el cierre:** escanea a un alumno con falta `AUTO_CLOSE` → la respuesta tiene `alreadyRegistered: false` y estado `LATE_UNJUSTIFIED`.
4. **Aviso de inasistencia:** tras un cierre, el apoderado del alumno tiene una notificación `Inasistencia registrada` con `link` que contiene `justify=`.
5. **Justificación:**
   - el padre crea una (201, `PENDING`);
   - otro padre de otra familia no puede crearla para ese alumno (403);
   - la secretaría la aprueba (200) y la asistencia de esa fecha queda `ABSENT_JUSTIFIED`;
   - aprobarla otra vez → 409.
6. **Rango inválido:** 20 días → 400; hace 40 días → 400.
7. **Escaneo sin conexión:**
   - `POST /attendance/scan/batch` con 2 ítems (un código válido con `scannedAt` de hace 10 minutos y uno inexistente): un `ok: true` y otro `ok: false` con `httpStatus: 404`;
   - un `scannedAt` futuro (+10 min) → `ok: false` con 422.
8. **Límite del escáner:** 700 escaneos seguidos con el mismo usuario a `/attendance/scan` (puedes reutilizar un código ya registrado) no deben devolver 429.
9. **Alertas:** crea 3 faltas injustificadas seguidas para un alumno, llama a `POST /attendance/alerts/evaluate` → `created ≥ 1`. Una segunda llamada el mismo día no duplica (`created: 0`). `PATCH /alerts/:id/attend` → 200.
10. **Salida:**
    - en Primaria, `pickupType: 'SELF'` → 422;
    - con una persona autorizada válida → 200 y la notificación al apoderado;
    - una segunda salida → 409.
11. **Asistencia por curso:** el docente del curso guarda una sesión (200). Otro docente → 403.

Al terminar, **limpia los datos de prueba** que creaste (alertas, justificaciones, salidas, sesiones, faltas creadas en el cierre de prueba) para dejar la base como estaba, y detén el servidor.

---

## BLOQUE 13 — Verificación final y reporte

1. `cd back && npx tsc --noEmit && pnpm test`
2. `cd front && npx tsc --noEmit && npx vite build`. El chunk de entrada debe seguir por debajo de 300 kB gzip.
3. Crea `CAMBIOS_ASISTENCIA.md` en la raíz con:
   - una tabla **Bloque | Estado (✅ / ⚠️ / ❌) | Notas**;
   - el resultado de cada prueba del Bloque 12 (PASS o FAIL con detalle);
   - las desviaciones respecto a este documento y cómo se resolvieron;
   - los pendientes.
4. Commit final: `feat(asistencia): bloque 13 - verificacion y reporte`. No hagas push. Informa que la rama `asistencia/mejoras` está lista para revisión.

=== FIN DEL PROMPT ===

---

## Para Xavier (no para el agente)

- **Antes de correrlo:** asegúrate de estar en la rama `auditoria/fase-0-1` actualizada. El agente creará `asistencia/mejoras` encima.
- **Privacidad:** la cola sin conexión guarda en el celular del portero solo código + hora, y el padrón guarda nombre, DNI/código y aula. El padrón se borra al cerrar sesión. Usa celulares del colegio para el escáner, no personales.
- **Avisos a familias:** salen como notificación en la app y push. Para que el push llegue en iPhone, el padre debe instalar la app en su pantalla de inicio (la app instalable ya quedó lista en la auditoría).
- **Validar con el colegio piloto:**
  - los umbrales de alerta (3 faltas seguidas, 10 %, 5 tardanzas);
  - la regla de salida (en Secundaria el alumno puede salir solo; en Inicial y Primaria, nunca);
  - quién aprueba las justificaciones (tutor, secretaría o ambos).
- **Revisión:** al terminar, lee `CAMBIOS_ASISTENCIA.md` y pídeme que revise la rama como hicimos con la auditoría.
