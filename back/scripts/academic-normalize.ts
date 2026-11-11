/**
 * Normaliza los datos académicos existentes al modelo nuevo:
 * año activo único, nivel y tipo de cada curso, número CNEB de cada competencia, sub-cursos con
 * competencias propias, año en la carga docente, plan de estudios, estados de periodo.
 *
 * Uso:
 *   npx ts-node --transpile-only scripts/academic-normalize.ts           (simulación, no guarda nada)
 *   npx ts-node --transpile-only scripts/academic-normalize.ts --apply   (aplica los cambios)
 */
import { PrismaClient, Prisma, type EducationLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  CNEB_AREAS, competenceName, getOfficialArea, isValidGrade, legacyAreaCode, matchCnebNumberByName,
} from '../src/modules/academic/cneb.catalog';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const lines: string[] = [];
const blocking: string[] = [];
const log = (msg: string) => { lines.push(msg); console.log(msg); };
const block = (msg: string) => { blocking.push(msg); log(`  ⛔ ${msg}`); };

class DryRunRollback extends Error {}

const SUBCOURSE_CODE = /^(MAT|COM|CT|CYT|CCSS)-(ALG|GEO|ARI|TRI|EST|LIT|LEN|BIO|QUI|FIS|HP|HU)$/i;
const LEVEL_ORDER: EducationLevel[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

function levelFromLegacy(area: { name: string; officialCode: string | null }): EducationLevel | null {
  const code = (area.officialCode ?? '').toUpperCase();
  const name = area.name.toLowerCase();
  if (code.includes('-INI') || code.startsWith('INI-') || name.includes('inicial')) return 'INITIAL';
  if (code.includes('-PRI') || code.startsWith('PRI-') || name.includes('primaria')) return 'PRIMARY';
  if (code.includes('-SEC') || code.startsWith('SEC-') || name.includes('secundaria')) return 'SECONDARY';
  return null;
}

async function remapCompetence(tx: Prisma.TransactionClient, assignmentIds: string[], fromCompetenceId: string, toCompetenceId: string) {
  if (assignmentIds.length === 0 || fromCompetenceId === toCompetenceId) return;
  const rows = await tx.detailedGrade.findMany({ where: { courseAssignmentId: { in: assignmentIds }, competenceId: fromCompetenceId } });
  for (const r of rows) {
    const clash = await tx.detailedGrade.findFirst({
      where: { enrollmentId: r.enrollmentId, courseAssignmentId: r.courseAssignmentId, competenceId: toCompetenceId, criterionId: r.criterionId, periodNumber: r.periodNumber },
    });
    if (clash) { log(`    · Nota duplicada descartada (${r.id})`); await tx.detailedGrade.delete({ where: { id: r.id } }); }
    else await tx.detailedGrade.update({ where: { id: r.id }, data: { competenceId: toCompetenceId } });
  }
  const concs = await tx.competenceConclusion.findMany({ where: { courseAssignmentId: { in: assignmentIds }, competenceId: fromCompetenceId } });
  for (const c of concs) {
    const clash = await tx.competenceConclusion.findFirst({
      where: { enrollmentId: c.enrollmentId, courseAssignmentId: c.courseAssignmentId, competenceId: toCompetenceId, periodNumber: c.periodNumber },
    });
    if (clash) await tx.competenceConclusion.delete({ where: { id: c.id } });
    else await tx.competenceConclusion.update({ where: { id: c.id }, data: { competenceId: toCompetenceId } });
  }
  await tx.grade.updateMany({ where: { competenceId: fromCompetenceId, entry: { courseAssignmentId: { in: assignmentIds } } }, data: { competenceId: toCompetenceId } });
}

async function ensureOfficialArea(tx: Prisma.TransactionClient, schoolId: string, level: EducationLevel, code: string) {
  const spec = getOfficialArea(level, code)!;
  let area = await tx.curricularArea.findFirst({
    where: { schoolId, educationLevel: level, officialAreaCode: code, kind: 'OFFICIAL' },
    include: { competences: true },
  });
  if (!area) {
    area = await tx.curricularArea.create({
      data: {
        schoolId, name: spec.name, educationLevel: level, kind: 'OFFICIAL', officialAreaCode: code,
        officialCode: `${code}-${level}`, isTransversal: !!spec.isTransversal, isActive: true,
        competences: { create: spec.competences.map((n) => ({ name: competenceName(n), cnebNumber: n })) },
      },
      include: { competences: true },
    });
    log(`    + Área oficial creada: ${spec.name} (${level})`);
  }
  return area;
}

async function normalizeSchool(tx: Prisma.TransactionClient, schoolId: string, schoolName: string) {
  log(`\n=== Colegio: ${schoolName} (${schoolId}) ===`);

  // 1. Año lectivo activo único
  const years = await tx.academicYear.findMany({ where: { schoolId }, orderBy: { year: 'desc' } });
  const actives = years.filter((y) => y.isActive);
  let activeYear = actives[0] ?? null;
  if (actives.length > 1) {
    log(`  • ${actives.length} años activos: se deja activo ${actives[0].year}`);
    await tx.academicYear.updateMany({ where: { id: { in: actives.slice(1).map((y) => y.id) } }, data: { isActive: false } });
  }
  if (!activeYear && years.length > 0) {
    activeYear = years[0];
    await tx.academicYear.update({ where: { id: activeYear.id }, data: { isActive: true } });
    log(`  • No había año activo: se activa ${activeYear.year}`);
  }
  if (!activeYear) { log('  • Sin años lectivos: nada que normalizar.'); return; }

  // 2. Aulas: duplicados y grados inválidos (no se corrigen automáticamente)
  const classrooms = await tx.classroom.findMany({ where: { schoolId } });
  const seen = new Map<string, string>();
  for (const c of classrooms) {
    const key = `${c.educationLevel}|${c.grade}|${c.section.trim().toUpperCase()}|${c.shift}`;
    if (seen.has(key)) block(`Aula duplicada: ${c.educationLevel} ${c.grade} "${c.section}" ${c.shift} (${seen.get(key)} y ${c.id}). Fusiónalas a mano antes de la migración final.`);
    else seen.set(key, c.id);
    if (!isValidGrade(c.educationLevel as EducationLevel, c.grade)) block(`Aula con grado inválido: ${c.educationLevel} ${c.grade} "${c.section}" (${c.id}).`);
  }

  // 3. Nivel de cada curso (clonando cursos usados en varios niveles)
  const areas = await tx.curricularArea.findMany({
    where: { schoolId },
    include: {
      competences: true,
      assignments: { include: { classroom: true } },
      subAreas: { include: { assignments: { include: { classroom: true } } } },
    },
  });
  for (const area of areas) {
    if (area.educationLevel) continue;
    const ownLevels = area.assignments.map((a) => a.classroom.educationLevel as EducationLevel);
    const subLevels = area.subAreas.flatMap((s) => s.assignments.map((a) => a.classroom.educationLevel as EducationLevel));
    const used = [...new Set(ownLevels.length > 0 ? ownLevels : subLevels)].sort(
      (a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b),
    );
    if (used.length === 0) {
      const lvl = levelFromLegacy(area);
      if (!lvl) {
        const compIds = area.competences.map((c) => c.id);
        const refs =
          (await tx.detailedGrade.count({ where: { competenceId: { in: compIds } } })) +
          (await tx.competenceConclusion.count({ where: { competenceId: { in: compIds } } })) +
          (await tx.grade.count({ where: { competenceId: { in: compIds } } }));
        if (refs > 0) {
          block(`"${area.name}" no tiene nivel y sus competencias tienen notas: asígnale nivel a mano.`);
          continue;
        }
        log(`  • Curso sin uso y sin nivel, se elimina: "${area.name}"`);
        await tx.curricularArea.updateMany({ where: { parentAreaId: area.id }, data: { parentAreaId: null } });
        await tx.curricularCompetence.deleteMany({ where: { areaId: area.id } });
        await tx.curricularArea.delete({ where: { id: area.id } });
        continue;
      }
      await tx.curricularArea.update({ where: { id: area.id }, data: { educationLevel: lvl } });
      continue;
    }
    const legacy = levelFromLegacy(area);
    const primary = legacy && used.includes(legacy) ? legacy : used[0];
    await tx.curricularArea.update({ where: { id: area.id }, data: { educationLevel: primary } });
    for (const lvl of used.filter((l) => l !== primary)) {
      const clone = await tx.curricularArea.create({
        data: {
          schoolId, name: area.name, officialCode: area.officialCode, officialAreaCode: area.officialAreaCode,
          isTransversal: area.isTransversal, parentAreaId: area.parentAreaId, evaluatedCompetenceIds: area.evaluatedCompetenceIds,
          isActive: area.isActive, educationLevel: lvl,
        },
      });
      const moved = area.assignments.filter((a) => a.classroom.educationLevel === lvl).map((a) => a.id);
      for (const comp of area.competences) {
        const newComp = await tx.curricularCompetence.create({
          data: { areaId: clone.id, name: comp.name, description: comp.description, officialCompetenceCode: comp.officialCompetenceCode, isActive: comp.isActive },
        });
        await remapCompetence(tx, moved, comp.id, newComp.id);
      }
      await tx.courseAssignment.updateMany({ where: { id: { in: moved } }, data: { areaId: clone.id } });
      log(`  • "${area.name}" se usaba en varios niveles: se creó una copia para ${lvl} (${moved.length} asignaciones movidas)`);
    }
  }

  // 3b. Tipo y código oficial
  const leveled = await tx.curricularArea.findMany({ where: { schoolId }, include: { parentArea: true } });
  for (const area of leveled) {
    const level = area.educationLevel as EducationLevel;
    const ownCode = legacyAreaCode(area.officialCode, area.officialAreaCode, area.name);
    const parentCode = area.parentArea ? legacyAreaCode(area.parentArea.officialCode, area.parentArea.officialAreaCode, area.parentArea.name) : null;
    let kind: 'OFFICIAL' | 'SUBCOURSE' | 'WORKSHOP' = 'WORKSHOP';
    let code: string | null = null;
    const subCode = parentCode ?? ownCode;
    if (area.parentAreaId && subCode && getOfficialArea(level, subCode)) {
      kind = 'SUBCOURSE'; code = subCode;
    } else if (ownCode && getOfficialArea(level, ownCode)) {
      kind = area.officialCode && SUBCOURSE_CODE.test(area.officialCode) ? 'SUBCOURSE' : 'OFFICIAL';
      code = ownCode;
    }
    await tx.curricularArea.update({ where: { id: area.id }, data: { kind, officialAreaCode: code, isTransversal: code === 'TRANS' } });
    if (kind === 'WORKSHOP') log(`  • "${area.name}" (${level}) queda como TALLER (no va al SIAGIE). Revisar con Dirección.`);
  }

  // 4. Número CNEB de cada competencia
  const typed = await tx.curricularArea.findMany({ where: { schoolId }, include: { competences: true } });
  for (const area of typed) {
    const level = area.educationLevel as EducationLevel;
    if (area.kind === 'WORKSHOP') {
      await tx.curricularCompetence.updateMany({ where: { areaId: area.id }, data: { cnebNumber: null } });
      if (area.competences.length === 0) await tx.curricularCompetence.create({ data: { areaId: area.id, name: 'Desempeño en el taller' } });
      continue;
    }
    const spec = getOfficialArea(level, area.officialAreaCode!)!;
    const used = new Set<number>();
    for (const comp of area.competences) {
      if (comp.cnebNumber) { used.add(comp.cnebNumber); continue; }
      const codeMatch = /(28|29)$/.exec(comp.officialCompetenceCode ?? '');
      const n = codeMatch ? Number(codeMatch[1]) : matchCnebNumberByName(comp.name);
      if (!n || !spec.competences.includes(n)) {
        log(`  • Competencia "${comp.name}" no corresponde a ${spec.name} (${level}): se desactiva.`);
        await tx.curricularCompetence.update({ where: { id: comp.id }, data: { isActive: false, cnebNumber: null } });
        continue;
      }
      if (used.has(n)) {
        log(`  • Competencia repetida "${comp.name}" en "${area.name}": se desactiva la copia.`);
        await tx.curricularCompetence.update({ where: { id: comp.id }, data: { isActive: false } });
        continue;
      }
      used.add(n);
      await tx.curricularCompetence.update({ where: { id: comp.id }, data: { cnebNumber: n, name: competenceName(n), isActive: true } });
    }
    if (area.kind === 'OFFICIAL') {
      for (const n of spec.competences.filter((x) => !used.has(x))) {
        await tx.curricularCompetence.create({ data: { areaId: area.id, name: competenceName(n), cnebNumber: n } });
        log(`    + Competencia faltante agregada a ${spec.name} (${level}): ${competenceName(n)}`);
      }
    }
  }

  // 5. Sub-cursos con competencias propias y notas reubicadas
  const subs = await tx.curricularArea.findMany({
    where: { schoolId, kind: 'SUBCOURSE' },
    include: { competences: true, parentArea: { include: { competences: true } }, assignments: { select: { id: true } } },
  });
  for (const sub of subs) {
    const level = sub.educationLevel as EducationLevel;
    const code = sub.officialAreaCode!;
    const official = await ensureOfficialArea(tx, schoolId, level, code);
    const oldParentComps = sub.parentArea?.competences ?? [];
    let desired: number[] = sub.evaluatedCompetenceIds
      .map((id) => {
        const pc = oldParentComps.find((c) => c.id === id);
        return pc ? pc.cnebNumber ?? matchCnebNumberByName(pc.name) : null;
      })
      .filter((n): n is number => typeof n === 'number');
    if (desired.length === 0) desired = sub.competences.filter((c) => c.isActive && c.cnebNumber).map((c) => c.cnebNumber!);
    if (desired.length === 0) desired = getOfficialArea(level, code)!.competences;
    const own = new Map<number, string>();
    for (const c of sub.competences) if (c.isActive && c.cnebNumber) own.set(c.cnebNumber, c.id);
    for (const n of desired) {
      if (!own.has(n)) {
        const created = await tx.curricularCompetence.create({ data: { areaId: sub.id, name: competenceName(n), cnebNumber: n } });
        own.set(n, created.id);
      }
    }
    const assignmentIds = sub.assignments.map((a) => a.id);
    const foreign = [
      ...(await tx.detailedGrade.findMany({
        where: { courseAssignmentId: { in: assignmentIds }, competence: { areaId: { not: sub.id } } },
        select: { competenceId: true, competence: { select: { cnebNumber: true, name: true } } },
        distinct: ['competenceId'],
      })),
      ...(await tx.competenceConclusion.findMany({
        where: { courseAssignmentId: { in: assignmentIds }, competence: { areaId: { not: sub.id } } },
        select: { competenceId: true, competence: { select: { cnebNumber: true, name: true } } },
        distinct: ['competenceId'],
      })),
    ];
    for (const f of foreign) {
      const n = f.competence.cnebNumber ?? matchCnebNumberByName(f.competence.name);
      const target = n ? own.get(n) : undefined;
      if (!target) { block(`Notas de "${sub.name}" en una competencia que el sub-curso no evalúa ("${f.competence.name}"). Revisar a mano.`); continue; }
      await remapCompetence(tx, assignmentIds, f.competenceId, target);
    }
    await tx.curricularArea.update({ where: { id: sub.id }, data: { parentAreaId: official.id } });
    log(`  • Sub-curso "${sub.name}" (${level}) → ${code}: competencias ${desired.join(', ')}`);
  }

  // 6. Año lectivo en la carga docente
  const updatedAssignments = await tx.courseAssignment.updateMany({
    where: { schoolId, academicYearId: null },
    data: { academicYearId: activeYear.id },
  });
  log(`  • Carga docente: ${updatedAssignments.count} asignaciones vinculadas al año ${activeYear.year}`);

  // 7. Plan de estudios a partir de la carga docente actual
  const assignments = await tx.courseAssignment.findMany({
    where: { schoolId, academicYearId: activeYear.id, deletedAt: null },
    include: { classroom: true },
  });
  for (const a of assignments) {
    await tx.studyPlanCourse.upsert({
      where: {
        academicYearId_educationLevel_grade_areaId: {
          academicYearId: activeYear.id, educationLevel: a.classroom.educationLevel, grade: a.classroom.grade, areaId: a.areaId,
        },
      },
      update: {},
      create: { schoolId, academicYearId: activeYear.id, educationLevel: a.classroom.educationLevel, grade: a.classroom.grade, areaId: a.areaId },
    });
  }
  const plans = await tx.studyPlanCourse.findMany({
    where: { schoolId, academicYearId: activeYear.id },
    include: { area: { include: { competences: true } } },
  });
  const groups = new Map<string, typeof plans>();
  for (const p of plans) {
    const key = `${p.educationLevel}|${p.grade}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  for (const [key, rows] of groups) {
    const [level] = key.split('|') as [EducationLevel];
    for (const spec of CNEB_AREAS[level]) {
      const contrib = rows.filter((r) => r.area.officialAreaCode === spec.code && r.area.kind !== 'WORKSHOP');
      if (contrib.length === 0) continue;
      if (contrib.some((r) => r.area.kind === 'OFFICIAL') && contrib.some((r) => r.area.kind === 'SUBCOURSE')) {
        log(`  ⚠ Plan ${key}: ${spec.name} está como área completa y también dividida. Corregir en "Plan de estudios".`);
      }
      const covered = new Set(contrib.flatMap((r) => r.area.competences.filter((c) => c.isActive && c.cnebNumber).map((c) => c.cnebNumber!)));
      const missing = spec.competences.filter((n) => !covered.has(n));
      if (missing.length) log(`  ⚠ Plan ${key}: ${spec.name} no cubre ${missing.map(competenceName).join('; ')}`);
    }
  }

  // 8. Cierres antiguos -> estados de periodo
  const locks = await tx.gradingPeriodLock.findMany({ where: { schoolId, isLocked: true } });
  for (const l of locks) {
    const exists = await tx.academicPeriodStatus.findFirst({
      where: { academicYearId: activeYear.id, classroomId: l.classroomId, periodNumber: l.periodNumber },
    });
    if (!exists) {
      await tx.academicPeriodStatus.create({
        data: {
          schoolId, academicYearId: activeYear.id, classroomId: l.classroomId, periodNumber: l.periodNumber,
          status: 'CLOSED', reason: l.reason, changedById: l.lockedById, changedAt: l.lockedAt,
        },
      });
    }
  }
  log(`  • Cierres migrados: ${locks.length}`);

  // 9. Matrículas de años no activos
  const deactivated = await tx.enrollment.updateMany({
    where: { schoolId, academicYearId: { not: activeYear.id }, isActive: true },
    data: { isActive: false },
  });
  log(`  • Matrículas de otros años desactivadas: ${deactivated.count}`);
}

async function main() {
  log(`Normalización académica — modo ${APPLY ? 'APLICAR' : 'SIMULACIÓN'} — ${new Date().toISOString()}`);
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  for (const s of schools) {
    try {
      await prisma.$transaction(async (tx) => {
        await normalizeSchool(tx, s.id, s.name);
        if (!APPLY) throw new DryRunRollback();
      }, { timeout: 300_000, maxWait: 30_000 });
    } catch (e) {
      if (!(e instanceof DryRunRollback)) throw e;
    }
  }
  log(`\nBloqueantes para la migración final: ${blocking.length}`);
  blocking.forEach((b) => log(` - ${b}`));
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `academic-normalize-${Date.now()}.txt`);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log(`\nInforme: ${file}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
