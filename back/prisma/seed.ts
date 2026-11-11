/// <reference types="node" />
/**
 * SEED DE PRUEBA — SaaSchool
 *
 * Crea UN colegio en plan PRO ("Innova Academy") y la cuenta SUPER_ADMIN, con un año 2026 en curso:
 *   - Bimestres 1, 2 y 3 CERRADOS con notas completas, conclusiones y algunos ajustes del docente.
 *   - Bimestre 4 ABIERTO con avance parcial (cursos completos, a medias y sin notas) para probar
 *     "Avance y cierre", recordatorios y el registro de notas.
 *   - Plan de estudios CNEB por grado, Matemática dividida en Secundaria, talleres propios.
 *   - Carga docente completa (un docente sin carga a propósito) y transversales a cargo del tutor.
 *   - Asistencia de todo el año, justificaciones, alertas, recojo autorizado, incidencias,
 *     pensiones con deudores, aula virtual, asistencia por curso, comunicados y notificaciones.
 *   - Año 2027 inactivo y vacío para probar "Copiar plan" y "Copiar carga docente".
 *
 * Casos especiales para probar:
 *   - Lucas Silva (3.° Primaria A): buen rendimiento; tiene una justificación APROBADA.
 *   - Bruno Castillo (3.° Primaria A): varias C, 3 faltas seguidas, alerta abierta y justificación PENDIENTE.
 *   - Gabriel Mendoza (1.° Primaria A): justificación RECHAZADA.
 *   - Tomás Vega (5.° Primaria A): SIN código SIAGIE (aparece como observación al exportar).
 *   - Mía Campos (1.° Secundaria A): EXONERADA de Educación Religiosa.
 *   - Andrés Huamán (1.° Secundaria A): tardanzas repetidas, alerta abierta.
 *   - Valeria Silva (3.° Secundaria A): puede iniciar sesión como estudiante.
 *   - Joaquín Paredes (retirado) y Renata Soto (trasladada) en 3.° Secundaria A: solo notas del bimestre 1.
 *   - Sofía Ramos (Inicial 5 años): personas autorizadas para el recojo.
 *
 * ⚠️ BORRA TODOS LOS DATOS de la base apuntada por DATABASE_URL.
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import type { AttendanceOrigin, AttendanceStatus, EducationLevel, Gender, Prisma } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { CurriculumService } from '../src/modules/academic/curriculum.service';
import { TeachingLoadService } from '../src/modules/academic/teaching-load.service';
import { computeCompetencePeriod, needsConclusion, type ResultLetter } from '../src/modules/academic/grade-engine';
import type { LetterScaleThresholds } from '../src/modules/grades/letter-scale';

// ============================================================================
// UTILIDADES (aleatorio determinista: el seed produce siempre los mismos datos)
// ============================================================================
let rngState = 20260311;
const rng = (): number => {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const hash = (plain: string) => bcrypt.hash(plain, 10);

let dniCounter = 70100000;
const nextStudentDni = () => String(dniCounter++);
let adultDniCounter = 41200000;
const nextAdultDni = () => String(adultDniCounter++);
let codeCounter = 0;
const nextStudentCode = () => String(15040000000000 + ++codeCounter * 7919); // 14 dígitos, único

/** Fecha "solo día" (columna @db.Date). */
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
/** Hora de Lima (UTC-5) para un día dado. */
const limaTime = (date: Date, h: number, min: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h + 5, min));
const ymd = (d: Date) => d.toISOString().slice(0, 10);

const FIRST_MALE = ['Matías', 'Santiago', 'Sebastián', 'Mateo', 'Leonardo', 'Nicolás', 'Thiago', 'Benjamín', 'Joaquín', 'Diego', 'Rodrigo', 'Adrián', 'Emiliano', 'Fabrizio', 'Alejandro', 'Daniel', 'Samuel', 'Piero', 'Mauricio', 'Renato', 'Valentino', 'Josué', 'Ángel', 'Franco', 'Ignacio'];
const FIRST_FEMALE = ['Luciana', 'Valentina', 'Camila', 'Isabella', 'Martina', 'Emma', 'Mariana', 'Daniela', 'Victoria', 'Nicole', 'Antonella', 'Paula', 'Andrea', 'Jimena', 'Adriana', 'Bianca', 'Lucía', 'Gabriela', 'Renata', 'Romina', 'Macarena', 'Celeste', 'Flavia', 'Abril', 'Fiorella'];
const LAST = ['Quispe', 'Flores', 'Rodríguez', 'Sánchez', 'García', 'Rojas', 'Díaz', 'Torres', 'López', 'González', 'Pérez', 'Chávez', 'Vásquez', 'Ramos', 'Huamán', 'Mendoza', 'Castro', 'Espinoza', 'Romero', 'Morales', 'Gutiérrez', 'Herrera', 'Medina', 'Alarcón', 'Navarro', 'Palacios', 'Cárdenas', 'Benavides', 'Vargas', 'Salcedo', 'Carrillo', 'Miranda', 'Villanueva', 'Córdova', 'Rivera', 'Campos', 'Aguilar', 'Peralta', 'Cornejo', 'Valdivia', 'Acosta', 'Cabrera', 'Delgado'];

// ============================================================================
// CALENDARIO 2026 (bimestres, feriados y vacaciones)
// ============================================================================
const YEAR = 2026;
const PERIODS = [
  { periodNumber: 1, name: 'I Bimestre', startDate: '2026-03-09', endDate: '2026-05-08' },
  { periodNumber: 2, name: 'II Bimestre', startDate: '2026-05-18', endDate: '2026-07-17' },
  { periodNumber: 3, name: 'III Bimestre', startDate: '2026-08-03', endDate: '2026-10-02' },
  { periodNumber: 4, name: 'IV Bimestre', startDate: '2026-10-12', endDate: '2026-12-18' },
];
const HOLIDAYS: Array<[string, string]> = [
  ['2026-04-02', 'Jueves Santo'],
  ['2026-04-03', 'Viernes Santo'],
  ['2026-05-01', 'Día del Trabajo'],
  ['2026-06-29', 'San Pedro y San Pablo'],
  ['2026-07-06', 'Día del Maestro'],
  ['2026-07-23', 'Día de la Fuerza Aérea'],
  ['2026-08-06', 'Batalla de Junín'],
  ['2026-08-31', 'Santa Rosa de Lima (traslado)'],
  ['2026-10-23', 'Aniversario del colegio'],
  ['2026-12-08', 'Inmaculada Concepción'],
  ['2026-12-09', 'Batalla de Ayacucho'],
];
const holidaySet = new Set(HOLIDAYS.map(([d]) => d));

const todayLima = (() => {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = s.split('-').map(Number);
  return day(y, m, d);
})();

/** Días lectivos (lunes a viernes, dentro de un bimestre, sin feriados) hasta AYER inclusive. */
function schoolDaysUntilYesterday(): Array<{ date: Date; period: number }> {
  const out: Array<{ date: Date; period: number }> = [];
  for (const p of PERIODS) {
    const start = new Date(`${p.startDate}T00:00:00Z`);
    const end = new Date(`${p.endDate}T00:00:00Z`);
    for (let d = new Date(start); d <= end && d < todayLima; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6 || holidaySet.has(ymd(d))) continue;
      out.push({ date: new Date(d), period: p.periodNumber });
    }
  }
  return out;
}
const isSchoolDay = (d: Date) => {
  const dow = d.getUTCDay();
  const p = PERIODS.find((x) => ymd(d) >= x.startDate && ymd(d) <= x.endDate);
  return !!p && dow !== 0 && dow !== 6 && !holidaySet.has(ymd(d));
};

// ============================================================================
// MAIN
// ============================================================================
async function main(): Promise<void> {
  console.log('\n🌱 SEED DE PRUEBA SAASCHOOL — Colegio PRO + Super Admin\n');

  // --------------------------------------------------------------------------
  // 0. Limpieza total (todas las tablas excepto el historial de migraciones)
  // --------------------------------------------------------------------------
  console.log('🧹 Limpiando la base de datos...');
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE;`);
  }

  const [passAdmin, passTeacher, passParent, passStudent] = await Promise.all([
    hash('Admin123!'), hash('Teacher123!'), hash('Parent123!'), hash('Student123!'),
  ]);

  // --------------------------------------------------------------------------
  // 1. Colegio PRO
  // --------------------------------------------------------------------------
  console.log('🏫 Colegio...');
  const school = await prisma.school.create({
    data: {
      name: 'Innova Academy',
      documentId: '20609876543',
      modularCode: '0725881',
      localCode: '345678',
      email: 'direccion@innova.edu.pe',
      phone: '01-2223344',
      address: 'Av. Javier Prado Este 4500, Santiago de Surco',
      department: 'LIMA',
      province: 'LIMA',
      district: 'SANTIAGO DE SURCO',
      plan: 'PRO',
      planExpiresAt: day(2027, 3, 31),
      offeredLevels: ['INITIAL', 'PRIMARY', 'SECONDARY'],
      brandColor: '#4F46E5',
      blockCertificatesOnOverdue: true,
      notifyAbsencesToFamilies: true,
      absenceAlertConsecutive: 3,
      absenceAlertMonthlyPercent: 10,
      lateAlertMonthlyCount: 5,
    },
  });
  const S = school.id;

  // --------------------------------------------------------------------------
  // 2. Usuarios del personal
  // --------------------------------------------------------------------------
  console.log('👤 Personal...');
  const mkUser = (data: { email: string; role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT'; firstName: string; lastNamePaternal: string; lastNameMaternal: string; passwordHash: string; cellphone?: string }) =>
    prisma.user.create({ data: { schoolId: S, documentType: 'DNI', documentId: nextAdultDni(), cellphone: data.cellphone ?? `9${between(10000000, 99999999)}`, ...data } });

  await mkUser({ email: 'superadmin@saaschool.com', role: 'SUPER_ADMIN', firstName: 'Carlos', lastNamePaternal: 'Administrador', lastNameMaternal: 'SaaS', passwordHash: passAdmin });
  const director = await mkUser({ email: 'admin.pro@innova.edu.pe', role: 'SCHOOL_ADMIN', firstName: 'Mariana', lastNamePaternal: 'Benavides', lastNameMaternal: 'Castro', passwordHash: passAdmin });
  const secretaria = await mkUser({ email: 'secretaria.pro@innova.edu.pe', role: 'ADMINISTRATIVE', firstName: 'Patricia', lastNamePaternal: 'Salazar', lastNameMaternal: 'Vega', passwordHash: passAdmin });

  const T = {
    rosa: await mkUser({ email: 'rosa.inicial@innova.edu.pe', role: 'TEACHER', firstName: 'Rosa', lastNamePaternal: 'Cárdenas', lastNameMaternal: 'Luna', passwordHash: passTeacher }),
    carmen: await mkUser({ email: 'carmen.primaria@innova.edu.pe', role: 'TEACHER', firstName: 'Carmen', lastNamePaternal: 'Huertas', lastNameMaternal: 'Paz', passwordHash: passTeacher }),
    miguel: await mkUser({ email: 'docente.pro@innova.edu.pe', role: 'TEACHER', firstName: 'Miguel', lastNamePaternal: 'Navarro', lastNameMaternal: 'Mendoza', passwordHash: passTeacher }),
    jorge: await mkUser({ email: 'jorge.primaria@innova.edu.pe', role: 'TEACHER', firstName: 'Jorge', lastNamePaternal: 'Salinas', lastNameMaternal: 'Ríos', passwordHash: passTeacher }),
    lucia: await mkUser({ email: 'lucia.docente@innova.edu.pe', role: 'TEACHER', firstName: 'Lucía', lastNamePaternal: 'Flores', lastNameMaternal: 'Reyes', passwordHash: passTeacher }),
    pedro: await mkUser({ email: 'pedro.comunicacion@innova.edu.pe', role: 'TEACHER', firstName: 'Pedro', lastNamePaternal: 'Aranda', lastNameMaternal: 'Soto', passwordHash: passTeacher }),
    andrea: await mkUser({ email: 'andrea.ingles@innova.edu.pe', role: 'TEACHER', firstName: 'Andrea', lastNamePaternal: 'Whitman', lastNameMaternal: 'Gálvez', passwordHash: passTeacher }),
    luis: await mkUser({ email: 'luis.edfisica@innova.edu.pe', role: 'TEACHER', firstName: 'Luis', lastNamePaternal: 'Paredes', lastNameMaternal: 'Quispe', passwordHash: passTeacher }),
    elena: await mkUser({ email: 'elena.religion@innova.edu.pe', role: 'TEACHER', firstName: 'Elena', lastNamePaternal: 'Montes', lastNameMaternal: 'Arce', passwordHash: passTeacher }),
    ricardo: await mkUser({ email: 'ricardo.ciencias@innova.edu.pe', role: 'TEACHER', firstName: 'Ricardo', lastNamePaternal: 'Zevallos', lastNameMaternal: 'Lima', passwordHash: passTeacher }),
    sofia: await mkUser({ email: 'sofia.sociales@innova.edu.pe', role: 'TEACHER', firstName: 'Sofía', lastNamePaternal: 'Ugarte', lastNameMaternal: 'Bravo', passwordHash: passTeacher }),
    martin: await mkUser({ email: 'martin.nuevo@innova.edu.pe', role: 'TEACHER', firstName: 'Martín', lastNamePaternal: 'Olivares', lastNameMaternal: 'Cano', passwordHash: passTeacher }), // sin carga (a propósito)
  };

  // --------------------------------------------------------------------------
  // 3. Años lectivos, escala, criterios, feriados y horarios
  // --------------------------------------------------------------------------
  console.log('📅 Año lectivo, escala y criterios...');
  const year = await prisma.academicYear.create({
    data: {
      schoolId: S, year: YEAR, name: 'Año Escolar 2026', periodType: 'BIMESTER', periodsConfig: PERIODS,
      annualCalculationMode: 'LAST_PERIOD', startDate: day(2026, 3, 9), endDate: day(2026, 12, 18), isActive: true,
    },
  });
  await prisma.academicYear.create({
    data: {
      schoolId: S, year: 2027, name: 'Año Escolar 2027', periodType: 'BIMESTER',
      periodsConfig: [
        { periodNumber: 1, name: 'I Bimestre', startDate: '2027-03-08', endDate: '2027-05-07' },
        { periodNumber: 2, name: 'II Bimestre', startDate: '2027-05-17', endDate: '2027-07-16' },
        { periodNumber: 3, name: 'III Bimestre', startDate: '2027-08-02', endDate: '2027-10-01' },
        { periodNumber: 4, name: 'IV Bimestre', startDate: '2027-10-11', endDate: '2027-12-17' },
      ],
      annualCalculationMode: 'LAST_PERIOD', startDate: day(2027, 3, 8), endDate: day(2027, 12, 17), isActive: false,
    },
  });
  const Y = year.id;

  const THRESHOLDS: LetterScaleThresholds = { AD: 18, A: 14, B: 11 };
  for (const level of ['INITIAL', 'PRIMARY', 'SECONDARY'] as const) {
    await prisma.gradingScale.createMany({
      data: [
        { schoolId: S, level, letterGrade: 'AD', minNumeric: 18, maxNumeric: 20, description: 'Logro destacado' },
        { schoolId: S, level, letterGrade: 'A', minNumeric: 14, maxNumeric: 17.9, description: 'Logro esperado' },
        { schoolId: S, level, letterGrade: 'B', minNumeric: 11, maxNumeric: 13.9, description: 'En proceso' },
        { schoolId: S, level, letterGrade: 'C', minNumeric: 0, maxNumeric: 10.9, description: 'En inicio' },
      ],
    });
  }

  const criteriaByLevel: Record<EducationLevel, Array<{ id: string; shortName: string; weight: number }>> = { INITIAL: [], PRIMARY: [], SECONDARY: [] };
  const CRITERIA_SPEC: Record<EducationLevel, Array<{ name: string; shortName: string; weight: number }>> = {
    INITIAL: [
      { name: 'Lista de cotejo', shortName: 'LC', weight: 1 },
      { name: 'Portafolio de evidencias', shortName: 'PF', weight: 1 },
    ],
    PRIMARY: [
      { name: 'Prácticas calificadas', shortName: 'PC', weight: 2 },
      { name: 'Tareas y participación', shortName: 'TP', weight: 1 },
      { name: 'Proyecto o exposición', shortName: 'PR', weight: 2 },
      { name: 'Evaluación bimestral', shortName: 'EB', weight: 3 },
    ],
    SECONDARY: [
      { name: 'Prácticas calificadas', shortName: 'PC', weight: 2 },
      { name: 'Tareas y participación', shortName: 'TP', weight: 1 },
      { name: 'Proyecto o exposición', shortName: 'PR', weight: 2 },
      { name: 'Evaluación bimestral', shortName: 'EB', weight: 3 },
    ],
  };
  for (const level of ['INITIAL', 'PRIMARY', 'SECONDARY'] as const) {
    let order = 1;
    for (const c of CRITERIA_SPEC[level]) {
      const row = await prisma.evaluationCriterion.create({ data: { schoolId: S, educationLevel: level, order: order++, isActive: true, ...c } });
      criteriaByLevel[level].push({ id: row.id, shortName: row.shortName, weight: row.weight });
    }
  }

  await prisma.schoolHoliday.createMany({ data: HOLIDAYS.map(([d, name]) => ({ schoolId: S, date: new Date(`${d}T00:00:00Z`), name })) });
  await prisma.attendanceScheduleConfig.createMany({
    data: [
      { schoolId: S, scope: 'GENERAL', entryTime: '07:45', lateToleranceTime: '08:00', autoCloseTime: '09:00', autoCloseEnabled: false },
      { schoolId: S, scope: 'INITIAL', entryTime: '08:15', lateToleranceTime: '08:30', autoCloseTime: '09:30', autoCloseEnabled: true },
      { schoolId: S, scope: 'PRIMARY', entryTime: '07:45', lateToleranceTime: '08:00', autoCloseTime: '09:00', autoCloseEnabled: true },
      { schoolId: S, scope: 'SECONDARY', entryTime: '07:30', lateToleranceTime: '07:45', autoCloseTime: '08:45', autoCloseEnabled: true },
    ],
  });

  // --------------------------------------------------------------------------
  // 4. Aulas con tutores
  // --------------------------------------------------------------------------
  console.log('🚪 Aulas...');
  const mkRoom = (educationLevel: EducationLevel, grade: number, tutorTeacherId: string, capacity: number) =>
    prisma.classroom.create({ data: { schoolId: S, educationLevel, grade, section: 'A', shift: 'MORNING', capacity, tutorTeacherId } });
  const rooms = {
    ini5: await mkRoom('INITIAL', 5, T.rosa.id, 20),
    pri1: await mkRoom('PRIMARY', 1, T.carmen.id, 25),
    pri3: await mkRoom('PRIMARY', 3, T.miguel.id, 25),
    pri5: await mkRoom('PRIMARY', 5, T.jorge.id, 25),
    sec1: await mkRoom('SECONDARY', 1, T.pedro.id, 30),
    sec3: await mkRoom('SECONDARY', 3, T.lucia.id, 30),
  };
  const allRooms = Object.values(rooms);

  // --------------------------------------------------------------------------
  // 5. Plan de estudios CNEB
  // --------------------------------------------------------------------------
  console.log('📚 Plan de estudios...');
  const curriculum = new CurriculumService();
  await curriculum.applyTemplate(S, Y, 'INITIAL', [5]);
  await curriculum.applyTemplate(S, Y, 'PRIMARY', [1, 3, 5], ['ING']);
  await curriculum.applyTemplate(S, Y, 'SECONDARY', [1, 3]);
  await curriculum.createSubcourses(S, Y, 'SECONDARY', [1, 3], 'MAT', [
    { name: 'Aritmética y Estadística', cnebNumbers: [23, 26] },
    { name: 'Álgebra', cnebNumbers: [24] },
    { name: 'Geometría y Trigonometría', cnebNumbers: [25] },
  ]);
  await curriculum.addWorkshop(S, Y, 'PRIMARY', [5], 'Robótica', 2);
  await curriculum.addWorkshop(S, Y, 'SECONDARY', [1, 3], 'Razonamiento Matemático', 2);

  const HOURS: Record<EducationLevel, Record<string, number>> = {
    INITIAL: { PS: 5, PSI: 4, COM: 6, MAT: 5, CYT: 4 },
    PRIMARY: { PS: 3, EF: 3, COM: 6, ART: 2, ING: 3, MAT: 6, CYT: 3, REL: 2 },
    SECONDARY: { DPCC: 2, CCSS: 3, EF: 2, ART: 2, COM: 5, ING: 3, MAT: 2, CYT: 4, EPT: 2, REL: 2 },
  };
  const planRows = await prisma.studyPlanCourse.findMany({ where: { academicYearId: Y }, include: { area: true } });
  for (const p of planRows) {
    if (p.area.kind === 'WORKSHOP') continue;
    const hours = p.area.officialAreaCode ? HOURS[p.educationLevel][p.area.officialAreaCode] : undefined;
    if (hours !== undefined) await prisma.studyPlanCourse.update({ where: { id: p.id }, data: { weeklyHours: hours } });
  }

  // --------------------------------------------------------------------------
  // 6. Carga docente (usa el servicio real, con sus validaciones)
  // --------------------------------------------------------------------------
  console.log('🧑‍🏫 Carga docente...');
  const teachingLoad = new TeachingLoadService();
  const pickTeacher = (room: (typeof allRooms)[number], area: { kind: string; officialAreaCode: string | null; isTransversal: boolean; name: string }): string | null => {
    if (area.isTransversal) return null; // lo asigna syncTutorTransversal
    const code = area.officialAreaCode;
    if (room.educationLevel === 'INITIAL') return room.tutorTeacherId;
    if (room.educationLevel === 'PRIMARY') {
      if (area.kind === 'WORKSHOP') return T.sofia.id;
      if (code === 'EF') return T.luis.id;
      if (code === 'ING') return T.andrea.id;
      if (code === 'REL') return T.elena.id;
      return room.tutorTeacherId;
    }
    if (area.kind === 'SUBCOURSE' || area.kind === 'WORKSHOP') return T.lucia.id;
    switch (code) {
      case 'COM': return T.pedro.id;
      case 'ING': return T.andrea.id;
      case 'EF': return T.luis.id;
      case 'REL':
      case 'ART': return T.elena.id;
      case 'CYT':
      case 'EPT': return T.ricardo.id;
      case 'CCSS':
      case 'DPCC': return T.sofia.id;
      default: return null;
    }
  };
  const changes: Array<{ classroomId: string; areaId: string; teacherId: string }> = [];
  for (const room of allRooms) {
    for (const p of planRows.filter((x) => x.educationLevel === room.educationLevel && x.grade === room.grade)) {
      const teacherId = pickTeacher(room, p.area);
      if (teacherId) changes.push({ classroomId: room.id, areaId: p.areaId, teacherId });
    }
  }
  await teachingLoad.saveChanges(S, Y, changes);
  for (const room of allRooms) await teachingLoad.syncTutorTransversal(S, room.id);

  const assignments = await prisma.courseAssignment.findMany({
    where: { academicYearId: Y, deletedAt: null },
    include: { area: { include: { competences: { where: { isActive: true } } } }, classroom: true },
    orderBy: [{ classroom: { educationLevel: 'asc' } }, { classroom: { grade: 'asc' } }, { area: { name: 'asc' } }],
  });

  // Criterios propios de un curso: Álgebra de 3.° Secundaria usa solo PC y EB
  const algebra3 = assignments.find((a) => a.classroomId === rooms.sec3.id && a.area.name === 'Álgebra')!;
  const secPC = criteriaByLevel.SECONDARY.find((c) => c.shortName === 'PC')!;
  const secEB = criteriaByLevel.SECONDARY.find((c) => c.shortName === 'EB')!;
  await prisma.courseAssignmentCriterion.createMany({
    data: [
      { courseAssignmentId: algebra3.id, criterionId: secPC.id, weight: 1 },
      { courseAssignmentId: algebra3.id, criterionId: secEB.id, weight: 2 },
    ],
  });
  const criteriaForAssignment = (a: (typeof assignments)[number]) =>
    a.id === algebra3.id
      ? [{ id: secPC.id, shortName: 'PC', weight: 1 }, { id: secEB.id, shortName: 'EB', weight: 2 }]
      : criteriaByLevel[a.classroom.educationLevel];

  // --------------------------------------------------------------------------
  // 7. Familias y estudiantes
  // --------------------------------------------------------------------------
  console.log('🎒 Estudiantes y familias...');
  type Profile = 'normal' | 'struggling' | 'late' | 'withdrawn' | 'transferred';
  interface SeedStudent {
    studentId: string; enrollmentId: string; roomId: string; level: EducationLevel; fullName: string;
    ability: number; profile: Profile; exoReligion: boolean; active: boolean;
  }
  const students: SeedStudent[] = [];

  const parents = {
    silvaPadre: await mkUser({ email: 'padre.doshijos@innova.edu.pe', role: 'PARENT', firstName: 'Ricardo', lastNamePaternal: 'Silva', lastNameMaternal: 'Gutiérrez', passwordHash: passParent }),
    silvaMadre: await mkUser({ email: 'madre.silva@innova.edu.pe', role: 'PARENT', firstName: 'Claudia', lastNamePaternal: 'Gutiérrez', lastNameMaternal: 'Lozano', passwordHash: passParent }),
    mendoza: await mkUser({ email: 'padre.unhijo@innova.edu.pe', role: 'PARENT', firstName: 'Alejandro', lastNamePaternal: 'Mendoza', lastNameMaternal: 'Alarcón', passwordHash: passParent }),
    castillo: await mkUser({ email: 'madre.castillo@innova.edu.pe', role: 'PARENT', firstName: 'Verónica', lastNamePaternal: 'Castillo', lastNameMaternal: 'Rojas', passwordHash: passParent }),
    ramos: await mkUser({ email: 'madre.ramos@innova.edu.pe', role: 'PARENT', firstName: 'Lorena', lastNamePaternal: 'Ramos', lastNameMaternal: 'Ibáñez', passwordHash: passParent }),
    campos: await mkUser({ email: 'padre.campos@innova.edu.pe', role: 'PARENT', firstName: 'Hugo', lastNamePaternal: 'Campos', lastNameMaternal: 'Tello', passwordHash: passParent }),
  };

  const birthYearFor = (level: EducationLevel, grade: number) => (level === 'INITIAL' ? 2021 : level === 'PRIMARY' ? 2020 - grade : 2014 - grade);

  async function addStudent(room: (typeof allRooms)[number], opts: {
    firstNames?: string; lastNamePaternal?: string; lastNameMaternal?: string; gender?: Gender; ability?: number; profile?: Profile;
    noCode?: boolean; password?: string; exoReligion?: boolean; guardians?: Array<{ userId: string; type: 'FATHER' | 'MOTHER' | 'GRANDPARENT'; payer: boolean }>;
    customPension?: number; discountReason?: string;
  } = {}): Promise<SeedStudent> {
    const gender: Gender = opts.gender ?? (rng() > 0.5 ? 'MALE' : 'FEMALE');
    const names = gender === 'MALE' ? FIRST_MALE : FIRST_FEMALE;
    const firstNames = opts.firstNames ?? `${pick(names)} ${pick(names)}`;
    const lastNamePaternal = opts.lastNamePaternal ?? pick(LAST);
    let lastNameMaternal = opts.lastNameMaternal ?? pick(LAST);
    if (!opts.lastNameMaternal) while (lastNameMaternal === lastNamePaternal) lastNameMaternal = pick(LAST);
    const by = birthYearFor(room.educationLevel, room.grade);
    const profile = opts.profile ?? 'normal';
    const student = await prisma.student.create({
      data: {
        schoolId: S, firstNames, lastNamePaternal, lastNameMaternal, documentType: 'DNI', documentId: nextStudentDni(), gender,
        birthDate: day(by, between(1, 12), between(1, 28)), studentCode: opts.noCode ? null : nextStudentCode(),
        address: `Calle ${pick(LAST)} ${between(100, 999)}, Santiago de Surco`, birthUbigeo: '150140', residenceUbigeo: '150140',
        passwordHash: opts.password ?? null, mustChangePassword: !opts.password,
      },
    });
    const active = profile !== 'withdrawn' && profile !== 'transferred';
    const enrollment = await prisma.enrollment.create({
      data: {
        schoolId: S, studentId: student.id, academicYearId: Y, classroomId: room.id, enrollmentDate: day(2026, 2, between(2, 27)),
        enrollmentState: profile === 'withdrawn' ? 'WITHDRAWN' : profile === 'transferred' ? 'TRANSFERRED' : 'REGISTERED',
        condition: room.educationLevel === 'INITIAL' ? 'INGRESANTE' : 'CONTINUO', isActive: active,
        customPensionAmount: opts.customPension ?? null, discountReason: opts.discountReason ?? null,
      },
    });
    for (const g of opts.guardians ?? []) {
      await prisma.familyRelationship.create({
        data: { studentId: student.id, userId: g.userId, relationshipType: g.type, isLegalGuardian: true, isFinancialResponsible: g.payer, livesWithStudent: g.type !== 'GRANDPARENT' },
      });
    }
    const ability = opts.ability ?? round1(11.5 + ((rng() + rng() + rng()) / 3) * 8.5);
    const s: SeedStudent = {
      studentId: student.id, enrollmentId: enrollment.id, roomId: room.id, level: room.educationLevel,
      fullName: `${lastNamePaternal} ${lastNameMaternal}, ${firstNames}`, ability, profile, exoReligion: !!opts.exoReligion, active,
    };
    students.push(s);
    return s;
  }

  // Estudiantes con nombre (casos de prueba)
  const sofiaRamos = await addStudent(rooms.ini5, { firstNames: 'Sofía Isabel', lastNamePaternal: 'Ramos', lastNameMaternal: 'Ibáñez', gender: 'FEMALE', ability: 16.5, guardians: [{ userId: parents.ramos.id, type: 'MOTHER', payer: true }] });
  const gabriel = await addStudent(rooms.pri1, { firstNames: 'Gabriel Alejandro', lastNamePaternal: 'Mendoza', lastNameMaternal: 'Torres', gender: 'MALE', ability: 14.5, guardians: [{ userId: parents.mendoza.id, type: 'FATHER', payer: true }] });
  const lucas = await addStudent(rooms.pri3, { firstNames: 'Lucas Matías', lastNamePaternal: 'Silva', lastNameMaternal: 'Gutiérrez', gender: 'MALE', ability: 18.2, guardians: [{ userId: parents.silvaPadre.id, type: 'FATHER', payer: true }, { userId: parents.silvaMadre.id, type: 'MOTHER', payer: false }] });
  const bruno = await addStudent(rooms.pri3, { firstNames: 'Bruno Esteban', lastNamePaternal: 'Castillo', lastNameMaternal: 'Rojas', gender: 'MALE', ability: 10.2, profile: 'struggling', guardians: [{ userId: parents.castillo.id, type: 'MOTHER', payer: true }] });
  await addStudent(rooms.pri5, { firstNames: 'Tomás Ignacio', lastNamePaternal: 'Vega', lastNameMaternal: 'Prado', gender: 'MALE', noCode: true });
  const mia = await addStudent(rooms.sec1, { firstNames: 'Mía Alejandra', lastNamePaternal: 'Campos', lastNameMaternal: 'Rivas', gender: 'FEMALE', ability: 15.8, exoReligion: true, guardians: [{ userId: parents.campos.id, type: 'FATHER', payer: true }] });
  const andres = await addStudent(rooms.sec1, { firstNames: 'Andrés Felipe', lastNamePaternal: 'Huamán', lastNameMaternal: 'Torres', gender: 'MALE', ability: 13.5, profile: 'late' });
  const diego = await addStudent(rooms.sec1, { firstNames: 'Diego Fernando', lastNamePaternal: 'Vargas', lastNameMaternal: 'Cruz', gender: 'MALE', ability: 14.8, password: passStudent });
  const valeria = await addStudent(rooms.sec3, { firstNames: 'Valeria Sofía', lastNamePaternal: 'Silva', lastNameMaternal: 'Gutiérrez', gender: 'FEMALE', ability: 17.6, password: passStudent, customPension: 405, discountReason: 'Descuento por hermano (10 %)', guardians: [{ userId: parents.silvaPadre.id, type: 'FATHER', payer: true }, { userId: parents.silvaMadre.id, type: 'MOTHER', payer: false }] });
  await addStudent(rooms.sec3, { firstNames: 'Joaquín Andrés', lastNamePaternal: 'Paredes', lastNameMaternal: 'Lozano', gender: 'MALE', profile: 'withdrawn' });
  await addStudent(rooms.sec3, { firstNames: 'Renata Lucía', lastNamePaternal: 'Soto', lastNameMaternal: 'Benavides', gender: 'FEMALE', profile: 'transferred' });

  // Resto de cada aula
  const TARGET: Record<string, number> = { [rooms.ini5.id]: 16, [rooms.pri1.id]: 20, [rooms.pri3.id]: 22, [rooms.pri5.id]: 22, [rooms.sec1.id]: 24, [rooms.sec3.id]: 24 };
  for (const room of allRooms) {
    while (students.filter((s) => s.roomId === room.id).length < TARGET[room.id]) await addStudent(room);
  }
  console.log(`  ✅ ${students.length} estudiantes matriculados`);

  // Recojo autorizado
  await prisma.authorizedPickup.createMany({
    data: [
      { schoolId: S, studentId: sofiaRamos.studentId, fullName: 'Teresa Ibáñez Cornejo', documentId: nextAdultDni(), relationship: 'Abuela', cellphone: '987654321', createdById: secretaria.id },
      { schoolId: S, studentId: sofiaRamos.studentId, fullName: 'Movilidad Escolar "Los Pinos" — Juan Quispe', documentId: nextAdultDni(), relationship: 'Movilidad escolar', cellphone: '976543210', createdById: secretaria.id },
      { schoolId: S, studentId: gabriel.studentId, fullName: 'Paola Mendoza Alarcón', documentId: nextAdultDni(), relationship: 'Tía', cellphone: '965432109', createdById: secretaria.id },
    ],
  });

  // --------------------------------------------------------------------------
  // 8. Notas, resultados y conclusiones
  // --------------------------------------------------------------------------
  console.log('📝 Notas de los cuatro bimestres...');
  const gradeRows: Prisma.DetailedGradeCreateManyInput[] = [];
  const resultRows: Prisma.CompetencePeriodResultCreateManyInput[] = [];
  const conclusionRows: Prisma.CompetenceConclusionCreateManyInput[] = [];

  const B_TEXTS = [
    'Muestra avances en {c}, aunque aún necesita apoyo para aplicar lo aprendido de forma autónoma. Se recomienda practicar en casa con actividades guiadas.',
    'Está en proceso de lograr {c}. Participa en clase, pero requiere reforzar los procedimientos y revisar sus errores con acompañamiento del docente.',
    'Comprende las ideas principales de {c}, pero todavía comete errores al resolver situaciones nuevas. Se trabajará con ejercicios graduados.',
  ];
  const C_TEXTS = [
    'Se encuentra en inicio en {c}. Necesita acompañamiento continuo del docente y de la familia; se le brindará un plan de refuerzo en el siguiente periodo.',
    'Presenta dificultades importantes en {c}. Se coordinará con la familia un horario de refuerzo y se hará seguimiento semanal a sus avances.',
  ];
  const shortOf = (c: { name: string; cnebNumber: number | null }) => c.name.length > 70 ? `${c.name.slice(0, 67)}…` : c.name;
  const competenceText = (letter: ResultLetter, comp: { name: string; cnebNumber: number | null }) =>
    pick(letter === 'C' ? C_TEXTS : B_TEXTS).replace('{c}', `"${shortOf(comp).toLowerCase()}"`);

  // Bimestre 4: unos cursos completos, otros a medias y otros sin notas
  const p4Mode = (idx: number): 'full' | 'half' | 'none' => (idx % 5 === 0 ? 'none' : idx % 5 === 1 ? 'half' : 'full');

  assignments.forEach((a, aIdx) => {
    const level = a.classroom.educationLevel;
    const criteria = criteriaForAssignment(a);
    const roomStudents = students.filter((s) => s.roomId === a.classroomId);
    const isReligion = a.area.officialAreaCode === 'REL';
    for (let period = 1; period <= 4; period++) {
      const mode = period < 4 ? 'full' : p4Mode(aIdx);
      if (mode === 'none') continue;
      roomStudents.forEach((s, sIdx) => {
        if (!s.active && period > 1) return; // retirado/trasladado: solo bimestre 1
        if (mode === 'half' && sIdx % 2 === 1) return;
        for (const comp of a.area.competences) {
          const scores: Array<{ weight: number; numericScore: number | null; literalScore: string | null; isExonerated: boolean }> = [];
          const compBias = (comp.cnebNumber ?? 0) % 3 === 0 ? -0.6 : 0.3;
          for (const cr of criteria) {
            let numericScore: number | null = null;
            let literalScore: string | null = null;
            let isExonerated = false;
            if (isReligion && s.exoReligion) {
              literalScore = 'EXO';
              isExonerated = true;
            } else {
              const raw = clamp(round1(s.ability + compBias + (period - 2) * 0.35 + (rng() - 0.5) * 4), 0, 20);
              if (level === 'INITIAL') {
                literalScore = raw >= THRESHOLDS.AD ? 'AD' : raw >= THRESHOLDS.A ? 'A' : raw >= THRESHOLDS.B ? 'B' : 'C';
              } else {
                numericScore = raw;
              }
            }
            gradeRows.push({ schoolId: S, enrollmentId: s.enrollmentId, courseAssignmentId: a.id, competenceId: comp.id, criterionId: cr.id, periodNumber: period, numericScore, literalScore, isExonerated });
            scores.push({ weight: cr.weight, numericScore, literalScore, isExonerated });
          }
          const { computedScore, suggestedLetter } = computeCompetencePeriod(scores, THRESHOLDS);
          if (!suggestedLetter) continue;
          resultRows.push({ id: randomUUID(), schoolId: S, enrollmentId: s.enrollmentId, courseAssignmentId: a.id, competenceId: comp.id, periodNumber: period, computedScore, suggestedLetter, finalLetter: suggestedLetter, isOverridden: false });
          // Conclusiones: completas en bimestres 1-3; en el 4 solo la mitad (para probar pendientes)
          if (s.active && needsConclusion(suggestedLetter) && (period < 4 || sIdx % 2 === 0)) {
            conclusionRows.push({ schoolId: S, enrollmentId: s.enrollmentId, courseAssignmentId: a.id, competenceId: comp.id, periodNumber: period, conclusion: competenceText(suggestedLetter, comp) });
          }
        }
      });
    }
  });

  // Ajustes del docente (nota de juicio) en el III Bimestre de Matemática de 3.° Primaria
  const mat3 = assignments.find((a) => a.classroomId === rooms.pri3.id && a.area.officialAreaCode === 'MAT')!;
  const cantidad3 = mat3.area.competences.find((c) => c.cnebNumber === 23)!;
  const UP: Record<string, ResultLetter> = { C: 'B', B: 'A', A: 'AD', AD: 'AD' };
  let adjusted = 0;
  for (const r of resultRows) {
    if (adjusted >= 2) break;
    if (r.courseAssignmentId === mat3.id && r.competenceId === cantidad3.id && r.periodNumber === 3 && r.suggestedLetter !== 'AD' && r.enrollmentId !== lucas.enrollmentId) {
      r.finalLetter = UP[r.suggestedLetter as string];
      r.isOverridden = true;
      r.overriddenById = T.miguel.id;
      r.overriddenAt = day(2026, 10, 1);
      adjusted++;
    }
  }

  const chunks = <T,>(arr: T[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
  for (const c of chunks(gradeRows, 2000)) await prisma.detailedGrade.createMany({ data: c });
  for (const c of chunks(resultRows, 2000)) await prisma.competencePeriodResult.createMany({ data: c });
  for (const c of chunks(conclusionRows, 2000)) await prisma.competenceConclusion.createMany({ data: c });
  console.log(`  ✅ ${gradeRows.length} notas · ${resultRows.length} calificativos · ${conclusionRows.length} conclusiones`);

  // Estados de periodo: I, II y III cerrados; IV abierto con fecha límite
  for (const p of [1, 2, 3]) {
    await prisma.academicPeriodStatus.create({
      data: { schoolId: S, academicYearId: Y, periodNumber: p, status: 'CLOSED', changedById: director.id, changedAt: new Date(`${PERIODS[p - 1].endDate}T22:00:00Z`), reason: 'Cierre regular del bimestre' },
    });
  }
  await prisma.academicPeriodStatus.create({
    data: { schoolId: S, academicYearId: Y, periodNumber: 4, status: 'OPEN', gradingDeadline: day(2026, 12, 11), changedById: director.id },
  });

  // --------------------------------------------------------------------------
  // 9. Asistencia de todo el año
  // --------------------------------------------------------------------------
  console.log('✋ Asistencia...');
  const days = schoolDaysUntilYesterday();
  const attendanceRows: Prisma.AttendanceCreateManyInput[] = [];
  const lastDays = days.slice(-3).map((d) => ymd(d.date));
  const entryHour = (level: EducationLevel) => (level === 'INITIAL' ? [8, 15] : level === 'PRIMARY' ? [7, 45] : [7, 30]);

  for (const s of students) {
    const [h, m] = entryHour(s.level);
    for (const { date, period } of days) {
      if (!s.active && period > 1) continue;
      const key = ymd(date);
      let status: AttendanceStatus = 'PRESENT';
      let origin: AttendanceOrigin = 'QR_SCAN';
      let notes: string | null = null;
      const r = rng();
      if (s.profile === 'struggling' && lastDays.includes(key)) {
        status = 'ABSENT_UNJUSTIFIED';
      } else if (s.profile === 'struggling') {
        status = r < 0.1 ? 'ABSENT_UNJUSTIFIED' : r < 0.18 ? 'LATE_UNJUSTIFIED' : 'PRESENT';
      } else if (s.profile === 'late') {
        status = r < 0.03 ? 'ABSENT_UNJUSTIFIED' : r < 0.3 ? 'LATE_UNJUSTIFIED' : 'PRESENT';
      } else {
        status = r < 0.015 ? 'ABSENT_UNJUSTIFIED' : r < 0.03 ? 'ABSENT_JUSTIFIED' : r < 0.08 ? 'LATE_UNJUSTIFIED' : r < 0.09 ? 'LATE_JUSTIFIED' : 'PRESENT';
      }
      let checkInTime: Date | null = null;
      if (status === 'PRESENT') checkInTime = limaTime(date, h, m - between(5, 25));
      if (status === 'LATE_UNJUSTIFIED' || status === 'LATE_JUSTIFIED') checkInTime = limaTime(date, h, m + between(16, 35));
      if (status === 'ABSENT_UNJUSTIFIED') { origin = 'AUTO_CLOSE'; notes = 'Cierre automático: no registró ingreso'; }
      if (status === 'ABSENT_JUSTIFIED') { origin = 'MANUAL'; notes = 'Justificada por el apoderado'; }
      if (status === 'LATE_JUSTIFIED') notes = 'Tardanza justificada (cita médica)';
      const isRecentPickup = (s.level === 'INITIAL' || s.level === 'PRIMARY') && checkInTime && key === days[days.length - 1]?.date.toISOString().slice(0, 10);
      attendanceRows.push({
        schoolId: S, enrollmentId: s.enrollmentId, date, status, origin, notes, checkInTime,
        ...(isRecentPickup ? { checkOutTime: limaTime(date, s.level === 'INITIAL' ? 12 : 13, between(0, 20)), checkOutById: secretaria.id, pickedUpByName: 'Apoderado registrado' } : {}),
      });
    }
  }

  // Casos con justificación: forzar el estado del día correspondiente
  const b4Days = days.filter((d) => d.period === 4);
  const setDay = (enrollmentId: string, dateKey: string, status: AttendanceStatus, notes: string) => {
    const row = attendanceRows.find((r) => r.enrollmentId === enrollmentId && ymd(r.date as Date) === dateKey);
    if (row) { row.status = status; row.checkInTime = null; row.origin = status === 'ABSENT_JUSTIFIED' ? 'MANUAL' : 'AUTO_CLOSE'; row.notes = notes; }
  };
  const lucasDay = b4Days[1] ? ymd(b4Days[1].date) : null;
  const gabrielDay = b4Days[3] ? ymd(b4Days[3].date) : null;
  if (lucasDay) setDay(lucas.enrollmentId, lucasDay, 'ABSENT_JUSTIFIED', 'Justificación aprobada: descanso médico');
  if (gabrielDay) setDay(gabriel.enrollmentId, gabrielDay, 'ABSENT_UNJUSTIFIED', 'Cierre automático: no registró ingreso');

  // Hoy (si es día lectivo): ingresos parciales para probar el escáner y el cierre automático
  if (isSchoolDay(todayLima)) {
    students.filter((s) => s.active).forEach((s, i) => {
      if (i % 7 === 0 || s.profile === 'struggling') return; // sin marcar todavía
      const [h, m] = entryHour(s.level);
      const late = s.profile === 'late' || i % 11 === 0;
      attendanceRows.push({
        schoolId: S, enrollmentId: s.enrollmentId, date: todayLima, origin: 'QR_SCAN',
        status: late ? 'LATE_UNJUSTIFIED' : 'PRESENT', checkInTime: limaTime(todayLima, h, late ? m + between(16, 30) : m - between(3, 20)),
      });
    });
  }
  for (const c of chunks(attendanceRows, 2000)) await prisma.attendance.createMany({ data: c });
  console.log(`  ✅ ${attendanceRows.length} registros de asistencia (${days.length} días lectivos)`);

  // Justificaciones
  const justifications: Prisma.AttendanceJustificationCreateManyInput[] = [];
  if (lastDays.length) {
    justifications.push({
      schoolId: S, enrollmentId: bruno.enrollmentId, dateFrom: new Date(`${lastDays[lastDays.length - 1]}T00:00:00Z`), dateTo: new Date(`${lastDays[lastDays.length - 1]}T00:00:00Z`),
      reason: 'MEDICAL', description: 'Bruno amaneció con fiebre y lo llevamos al médico. Adjuntaré la receta.', status: 'PENDING',
      requestedById: parents.castillo.id, requestedByRole: 'PARENT',
    });
  }
  if (lucasDay) {
    justifications.push({
      schoolId: S, enrollmentId: lucas.enrollmentId, dateFrom: new Date(`${lucasDay}T00:00:00Z`), dateTo: new Date(`${lucasDay}T00:00:00Z`),
      reason: 'MEDICAL', description: 'Descanso médico por infección estomacal.', status: 'APPROVED',
      requestedById: parents.silvaPadre.id, requestedByRole: 'PARENT', reviewedById: secretaria.id, reviewedAt: new Date(`${lucasDay}T20:00:00Z`), reviewNote: 'Conforme con el certificado médico.',
    });
  }
  if (gabrielDay) {
    justifications.push({
      schoolId: S, enrollmentId: gabriel.enrollmentId, dateFrom: new Date(`${gabrielDay}T00:00:00Z`), dateTo: new Date(`${gabrielDay}T00:00:00Z`),
      reason: 'TRANSPORT', description: 'Se nos pasó la movilidad.', status: 'REJECTED',
      requestedById: parents.mendoza.id, requestedByRole: 'PARENT', reviewedById: secretaria.id, reviewedAt: new Date(`${gabrielDay}T21:00:00Z`), reviewNote: 'El motivo no corresponde a una inasistencia justificable según el reglamento interno.',
    });
  }
  if (justifications.length) await prisma.attendanceJustification.createMany({ data: justifications });

  // Alertas tempranas
  const alertDay = days[days.length - 1]?.date ?? todayLima;
  await prisma.attendanceAlert.createMany({
    data: [
      { schoolId: S, enrollmentId: bruno.enrollmentId, reason: 'CONSECUTIVE_ABSENCES', metricValue: 3, threshold: 3, triggeredOn: alertDay, status: 'OPEN' },
      { schoolId: S, enrollmentId: andres.enrollmentId, reason: 'REPEATED_LATENESS', metricValue: 6, threshold: 5, triggeredOn: alertDay, status: 'OPEN' },
      { schoolId: S, enrollmentId: bruno.enrollmentId, reason: 'MONTHLY_ABSENCE_RATE', metricValue: 12, threshold: 10, triggeredOn: day(2026, 9, 15), status: 'ATTENDED', attendedById: T.miguel.id, attendedAt: day(2026, 9, 16), attendedNote: 'Se conversó con la madre; se acordó seguimiento semanal.' },
    ],
  });
  await prisma.school.update({ where: { id: S }, data: { lastRiskEvaluationOn: alertDay } });

  // --------------------------------------------------------------------------
  // 10. Incidencias
  // --------------------------------------------------------------------------
  console.log('📒 Incidencias...');
  await prisma.studentIncident.createMany({
    data: [
      { schoolId: S, enrollmentId: valeria.enrollmentId, authorId: T.lucia.id, type: 'MERITO', severity: 'LOW', title: 'Primer puesto en olimpiada de matemática', description: 'Obtuvo el primer lugar en la olimpiada interna de matemática.', createdAt: day(2026, 9, 25) },
      { schoolId: S, enrollmentId: lucas.enrollmentId, authorId: T.miguel.id, type: 'MERITO', severity: 'LOW', title: 'Apoyo a compañeros', description: 'Ayudó espontáneamente a dos compañeros con la tarea de fracciones.', createdAt: day(2026, 10, 20) },
      { schoolId: S, enrollmentId: bruno.enrollmentId, authorId: T.miguel.id, type: 'DEMERITO', severity: 'MEDIUM', title: 'Incumplimiento reiterado de tareas', description: 'No presentó las tareas de las últimas dos semanas.', actionTaken: 'Se informó a la madre por la agenda.', createdAt: day(2026, 10, 28) },
      { schoolId: S, enrollmentId: bruno.enrollmentId, authorId: director.id, type: 'CITACION_PADRES', severity: 'HIGH', title: 'Citación por rendimiento y asistencia', description: 'Se cita a la madre para revisar el plan de refuerzo y las inasistencias recientes.', citationDate: limaTime(day(2026, 11, 17), 8, 30), createdAt: todayLima },
      { schoolId: S, enrollmentId: gabriel.enrollmentId, authorId: T.carmen.id, type: 'ATENCION_TOPICO', severity: 'LOW', title: 'Golpe leve en recreo', description: 'Se golpeó la rodilla jugando en el patio.', actionTaken: 'Se aplicó hielo en tópico y se avisó al padre.', acknowledgedAt: day(2026, 10, 15), acknowledgedByUserId: parents.mendoza.id, createdAt: day(2026, 10, 14) },
      { schoolId: S, enrollmentId: andres.enrollmentId, authorId: T.pedro.id, type: 'DEMERITO', severity: 'HIGH', title: 'Agresión verbal entre compañeros', description: 'Insultos reiterados a un compañero durante el recreo.', actionTaken: 'Se registró el caso en el SíseVe y se coordinó con psicología.', isViolenceCase: true, siseveCode: 'SV-2026-0001234', siseveReportedAt: day(2026, 10, 30), createdAt: day(2026, 10, 29) },
    ],
  });

  // --------------------------------------------------------------------------
  // 11. Pensiones y pagos (solo RECIBO_INTERNO)
  // --------------------------------------------------------------------------
  console.log('💰 Pensiones...');
  const PENSION: Record<EducationLevel, number> = { INITIAL: 380, PRIMARY: 420, SECONDARY: 450 };
  const MONTHS = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const obligations: Prisma.PaymentObligationCreateManyInput[] = [];
  const transactions: Prisma.PaymentTransactionCreateManyInput[] = [];
  let receipt = 0;
  const methods = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD'] as const;

  for (const [idx, s] of students.entries()) {
    const enr = await prisma.enrollment.findUniqueOrThrow({ where: { id: s.enrollmentId }, select: { customPensionAmount: true } });
    const pension = enr.customPensionAmount ? Number(enr.customPensionAmount) : PENSION[s.level];
    // Hasta qué mes pagó (índice en MONTHS). Deudores: ~12 %.
    let paidThrough = 8; // hasta noviembre
    if (s.profile === 'struggling') paidThrough = 5;           // debe desde setiembre
    else if (s.enrollmentId === lucas.enrollmentId) paidThrough = 7; // debe noviembre (vencido)
    else if (idx % 8 === 3) paidThrough = between(4, 6);
    else if (idx % 3 === 0) paidThrough = 7;
    const items = [{ title: `Matrícula ${YEAR}`, concept: 'MATRICULA', amount: 350, due: day(YEAR, 2, 20), monthIdx: -1 },
      ...MONTHS.map((mName, i) => ({ title: `Pensión ${mName} ${YEAR}`, concept: 'PENSION', amount: pension, due: day(YEAR, i + 3, 10), monthIdx: i }))];
    for (const it of items) {
      const id = randomUUID();
      const cancelled = !s.active && it.monthIdx >= 2;
      const paid = !cancelled && it.monthIdx <= paidThrough;
      const partial = !paid && !cancelled && idx === 5 && it.monthIdx === paidThrough + 1;
      obligations.push({ id, schoolId: S, enrollmentId: s.enrollmentId, title: it.title, concept: it.concept, amountDue: it.amount, dueDate: it.due, status: cancelled ? 'CANCELLED' : paid ? 'PAID' : partial ? 'PARTIAL' : 'PENDING' });
      if (paid || partial) {
        receipt++;
        transactions.push({
          schoolId: S, obligationId: id, amountPaid: partial ? Math.round(it.amount / 2) : it.amount, paymentDate: new Date(it.due.getTime() - between(0, 6) * 86400000),
          paymentMethod: pick([...methods]), operationNumber: `OP-${between(100000, 999999)}`, receiptType: 'RECIBO_INTERNO', receiptNumber: `REC-${String(receipt).padStart(6, '0')}`,
        });
      }
    }
  }
  for (const c of chunks(obligations, 2000)) await prisma.paymentObligation.createMany({ data: c });
  for (const c of chunks(transactions, 2000)) await prisma.paymentTransaction.createMany({ data: c });
  await prisma.school.update({ where: { id: S }, data: { receiptCounter: receipt } });
  console.log(`  ✅ ${obligations.length} obligaciones · ${transactions.length} pagos`);

  // --------------------------------------------------------------------------
  // 12. Aula virtual y asistencia por curso
  // --------------------------------------------------------------------------
  console.log('💻 Aula virtual...');
  const aritSec3 = assignments.find((a) => a.classroomId === rooms.sec3.id && a.area.name === 'Aritmética y Estadística')!;
  const comPri3 = assignments.find((a) => a.classroomId === rooms.pri3.id && a.area.officialAreaCode === 'COM')!;
  await prisma.courseContent.create({ data: { schoolId: S, courseAssignmentId: aritSec3.id, teacherId: T.lucia.id, bimester: 4, contentType: 'LESSON_MATERIAL', title: 'Medidas de tendencia central', description: 'Repaso de media, mediana y moda con ejemplos de la vida diaria. Revisen los ejercicios resueltos de la clase.' } });
  await prisma.courseContent.create({ data: { schoolId: S, courseAssignmentId: aritSec3.id, teacherId: T.lucia.id, bimester: 4, contentType: 'HOMEWORK', title: 'Encuesta y tabla de frecuencias', description: 'Realiza una encuesta a 10 familiares sobre su fruta favorita y organiza los datos en una tabla de frecuencias.', dueDate: new Date(todayLima.getTime() + 5 * 86400000) } });
  await prisma.courseContent.create({ data: { schoolId: S, courseAssignmentId: mat3.id, teacherId: T.miguel.id, bimester: 4, contentType: 'HOMEWORK', title: 'Problemas con fracciones', description: 'Resuelve los problemas 1 al 6 de la página 84 del libro.', dueDate: new Date(todayLima.getTime() + 3 * 86400000) } });
  const forum = await prisma.courseContent.create({ data: { schoolId: S, courseAssignmentId: comPri3.id, teacherId: T.miguel.id, bimester: 4, contentType: 'FORUM', title: 'Foro: mi libro favorito', description: 'Cuéntanos cuál es tu libro favorito y por qué lo recomendarías a tus compañeros.' } });
  await prisma.forumComment.createMany({
    data: [
      { schoolId: S, courseContentId: forum.id, userId: T.miguel.id, content: 'Recuerden escribir al menos tres oraciones y respetar la opinión de los demás.' },
      { schoolId: S, courseContentId: forum.id, userId: parents.silvaPadre.id, content: 'Lucas eligió "El Principito" porque le gustan los viajes del protagonista.' },
    ],
  });

  const recentB4 = b4Days.slice(-3);
  const sec3Active = students.filter((s) => s.roomId === rooms.sec3.id && s.active);
  for (const d of recentB4) {
    const session = await prisma.courseAttendanceSession.create({ data: { schoolId: S, courseAssignmentId: aritSec3.id, date: d.date, periodLabel: '2', takenById: T.lucia.id } });
    await prisma.courseAttendanceRecord.createMany({
      data: sec3Active.map((s, i) => ({ sessionId: session.id, enrollmentId: s.enrollmentId, status: (i % 13 === 0 ? 'LATE_UNJUSTIFIED' : 'PRESENT') as AttendanceStatus })),
    });
  }

  // --------------------------------------------------------------------------
  // 13. Comunicados y notificaciones
  // --------------------------------------------------------------------------
  console.log('📣 Comunicados y notificaciones...');
  await prisma.announcement.createMany({
    data: [
      { schoolId: S, authorId: director.id, title: 'Entrega de libretas del III Bimestre', content: 'Las libretas del III Bimestre ya están disponibles en el portal. Las reuniones con tutores serán del 12 al 16 de octubre.', priority: 'IMPORTANT', targetRoles: ['PARENT', 'TEACHER'], publishedAt: day(2026, 10, 5) },
      { schoolId: S, authorId: director.id, title: 'Fecha límite de registro de notas del IV Bimestre', content: 'Docentes: el registro de calificativos y conclusiones del IV Bimestre vence el 11 de diciembre.', priority: 'URGENT', targetRoles: ['TEACHER'], publishedAt: todayLima },
      { schoolId: S, authorId: secretaria.id, title: 'Aniversario del colegio', content: 'El viernes 23 de octubre no habrá clases por el aniversario institucional. ¡Los esperamos en la actuación central!', priority: 'NORMAL', targetRoles: ['PARENT', 'TEACHER', 'ADMINISTRATIVE'], publishedAt: day(2026, 10, 16), classroomId: null },
      { schoolId: S, authorId: T.miguel.id, classroomId: rooms.pri3.id, title: '3.° A: salida al museo', content: 'El jueves 26 de noviembre visitaremos el Museo de Arte de Lima. Enviar la autorización firmada.', priority: 'NORMAL', targetRoles: ['PARENT'], publishedAt: todayLima },
    ],
  });
  await prisma.notification.createMany({
    data: [
      { schoolId: S, userId: parents.silvaPadre.id, title: 'Libreta disponible', message: 'La libreta del III Bimestre de Lucas y Valeria ya está disponible.', type: 'ACADEMIC', link: '/grades', createdAt: day(2026, 10, 5) },
      { schoolId: S, userId: parents.silvaPadre.id, title: 'Pensión vencida', message: 'La pensión de noviembre de Lucas venció el 10/11.', type: 'PAYMENT', link: '/payments' },
      { schoolId: S, userId: parents.castillo.id, title: 'Bruno no registró ingreso', message: 'Bruno no registró ingreso hoy. Si faltó por un motivo justificado, puedes enviar la justificación.', type: 'ATTENDANCE', link: '/attendance' },
      { schoolId: S, userId: T.miguel.id, title: 'Alerta de asistencia', message: 'Bruno Castillo acumula 3 faltas injustificadas seguidas.', type: 'ATTENDANCE', link: '/attendance-alerts' },
      { schoolId: S, userId: T.lucia.id, title: 'Notas pendientes', message: 'Tienes calificativos pendientes del IV Bimestre.', type: 'ACADEMIC', link: '/my-courses' },
    ],
  });

  // --------------------------------------------------------------------------
  // RESUMEN
  // --------------------------------------------------------------------------
  const pending = await prisma.courseAssignment.count({ where: { academicYearId: Y, deletedAt: null } });
  console.log(`\n🎉 SEED COMPLETADO — ${allRooms.length} aulas · ${pending} cursos asignados · ${students.length} estudiantes\n`);
  console.log('🔑 CREDENCIALES');
  console.log('  Super admin ........ superadmin@saaschool.com          / Admin123!');
  console.log('  Director(a) ........ admin.pro@innova.edu.pe           / Admin123!');
  console.log('  Secretaría ......... secretaria.pro@innova.edu.pe      / Admin123!');
  console.log('  Docentes (Teacher123!):');
  console.log('    docente.pro@innova.edu.pe ........ Miguel · tutor 3.° Primaria A (casi todo el aula)');
  console.log('    lucia.docente@innova.edu.pe ...... Lucía · Matemática Secundaria (3 cursos) + Raz. Mat. · tutora 3.° Sec A');
  console.log('    rosa.inicial@innova.edu.pe ....... Rosa · Inicial 5 años (unidocente)');
  console.log('    carmen.primaria@ · jorge.primaria@ · pedro.comunicacion@ · andrea.ingles@');
  console.log('    luis.edfisica@ · elena.religion@ · ricardo.ciencias@ · sofia.sociales@ (todos @innova.edu.pe)');
  console.log('    martin.nuevo@innova.edu.pe ....... sin carga (para probar "docentes sin cursos")');
  console.log('  Familias (Parent123!):');
  console.log('    padre.doshijos@innova.edu.pe / madre.silva@innova.edu.pe → Lucas (3.° Pri A) y Valeria (3.° Sec A)');
  console.log('    padre.unhijo@innova.edu.pe → Gabriel (1.° Pri A) · madre.castillo@innova.edu.pe → Bruno (3.° Pri A)');
  console.log('    madre.ramos@innova.edu.pe → Sofía (Inicial 5 años) · padre.campos@innova.edu.pe → Mía (1.° Sec A)');
  const vCode = await prisma.student.findUniqueOrThrow({ where: { id: valeria.studentId }, select: { documentId: true } });
  const dCode = await prisma.student.findUniqueOrThrow({ where: { id: diego.studentId }, select: { documentId: true } });
  console.log('  Estudiantes (Student123!, ingresan con su DNI):');
  console.log(`    Valeria Silva (3.° Sec A) → ${vCode.documentId}`);
  console.log(`    Diego Vargas (1.° Sec A) → ${dCode.documentId}`);
  console.log(`\n  Mía Campos (${mia.fullName}) está exonerada de Religión. Hoy en Lima: ${ymd(todayLima)}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
