import type { EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import {
  CNEB_AREAS, CNEB_COMPETENCES, LEVEL_GRADES, competenceName, getOfficialArea, isValidGrade,
} from './cneb.catalog';
import { resolveYear, shortNameOf, sortCompetences } from './academic.context';
import { getPreuniversityCourse, preuniversityCoursesFor } from './preuniversity.catalog';

type Tx = Prisma.TransactionClient;

export interface SubcourseInput {
  name: string;
  cnebNumbers: number[];
  weight?: number;
  catalogKey?: string | null;
}

export async function ensureOfficialArea(tx: Tx, schoolId: string, level: EducationLevel, code: string) {
  const spec = getOfficialArea(level, code);
  if (!spec) throw new AppError(`El área ${code} no existe en este nivel.`, 400);
  let area = await tx.curricularArea.findFirst({
    where: { schoolId, educationLevel: level, officialAreaCode: spec.code, kind: 'OFFICIAL' },
    include: { competences: true },
  });
  if (!area) {
    return tx.curricularArea.create({
      data: {
        schoolId, name: spec.name, educationLevel: level, kind: 'OFFICIAL', officialAreaCode: spec.code,
        officialCode: `${spec.code}-${level}`, isTransversal: !!spec.isTransversal, isActive: true,
        competences: { create: spec.competences.map((n) => ({ name: competenceName(n), cnebNumber: n })) },
      },
      include: { competences: true },
    });
  }
  for (const n of spec.competences) {
    const existing = area.competences.find((c) => c.cnebNumber === n);
    if (!existing) await tx.curricularCompetence.create({ data: { areaId: area.id, name: competenceName(n), cnebNumber: n } });
    else if (!existing.isActive) await tx.curricularCompetence.update({ where: { id: existing.id }, data: { isActive: true } });
  }
  area = await tx.curricularArea.findUniqueOrThrow({ where: { id: area.id }, include: { competences: true } });
  return area;
}

async function assignmentsWithGrades(tx: Tx, assignmentIds: string[]): Promise<Set<string>> {
  if (assignmentIds.length === 0) return new Set();
  const [g, r] = await Promise.all([
    tx.detailedGrade.groupBy({ by: ['courseAssignmentId'], where: { courseAssignmentId: { in: assignmentIds } } }),
    tx.competencePeriodResult.groupBy({ by: ['courseAssignmentId'], where: { courseAssignmentId: { in: assignmentIds } } }),
  ]);
  return new Set([...g, ...r].map((x) => x.courseAssignmentId));
}

/** Quita un curso del plan de un grado: bloquea si hay notas; si no, borra lógicamente sus asignaciones. */
async function removeAreaFromGrade(tx: Tx, schoolId: string, academicYearId: string, level: EducationLevel, grade: number, areaId: string, label: string) {
  const assignments = await tx.courseAssignment.findMany({
    where: { schoolId, academicYearId, areaId, deletedAt: null, classroom: { educationLevel: level, grade } },
    select: { id: true },
  });
  const graded = await assignmentsWithGrades(tx, assignments.map((a) => a.id));
  if (graded.size > 0) {
    throw new AppError(`"${label}" ya tiene notas registradas en este grado: no se puede quitar del plan.`, 409);
  }
  if (assignments.length) {
    await tx.courseAssignment.updateMany({ where: { id: { in: assignments.map((a) => a.id) } }, data: { deletedAt: new Date() } });
  }
  await tx.studyPlanCourse.deleteMany({ where: { academicYearId, educationLevel: level, grade, areaId } });
}

export class CurriculumService {
  getCatalog() {
    return { competences: CNEB_COMPETENCES, areas: CNEB_AREAS, grades: LEVEL_GRADES };
  }

  async getStudyPlan(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grade: number) {
    if (!isValidGrade(level, grade)) throw new AppError('Grado no válido para el nivel.', 400);
    const year = await resolveYear(schoolId, academicYearId);
    const rows = await prisma.studyPlanCourse.findMany({
      where: { schoolId, academicYearId: year.id, educationLevel: level, grade },
      include: { area: { include: { competences: { where: { isActive: true } } } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, deletedAt: null, areaId: { in: rows.map((r) => r.areaId) }, classroom: { educationLevel: level, grade } },
      select: { id: true, areaId: true },
    });
    const graded = await assignmentsWithGrades(prisma as unknown as Tx, assignments.map((a) => a.id));

    const courses = rows.map((r) => ({
      planCourseId: r.id,
      areaId: r.areaId,
      name: r.area.name,
      kind: r.area.kind,
      catalogKey: r.area.catalogKey,
      officialAreaCode: r.area.officialAreaCode,
      parentAreaId: r.area.parentAreaId,
      weeklyHours: r.weeklyHours,
      order: r.order,
      competences: sortCompetences(level, r.area.officialAreaCode, r.area.competences).map((c) => ({
        id: c.id, cnebNumber: c.cnebNumber, name: c.name, shortName: shortNameOf(c), weight: c.weight,
      })),
      assignedClassrooms: assignments.filter((a) => a.areaId === r.areaId).length,
      hasGrades: assignments.some((a) => a.areaId === r.areaId && graded.has(a.id)),
    }));

    const coverage = CNEB_AREAS[level].map((spec) => {
      const contributing = courses.filter((c) => c.officialAreaCode === spec.code && c.kind !== 'WORKSHOP');
      const covered = new Set(contributing.flatMap((c) => c.competences.map((k) => k.cnebNumber).filter((n): n is number => n !== null)));
      return {
        code: spec.code,
        name: spec.name,
        optional: !!spec.optional,
        isTransversal: !!spec.isTransversal,
        inPlan: contributing.length > 0,
        required: spec.competences,
        covered: spec.competences.filter((n) => covered.has(n)),
        missing: contributing.length > 0 ? spec.competences.filter((n) => !covered.has(n)) : [],
        conflict: contributing.some((c) => c.kind === 'OFFICIAL') && contributing.some((c) => c.kind === 'SUBCOURSE'),
      };
    });
    const requiredMissing = coverage.filter((c) => !c.optional && !c.inPlan).map((c) => c.name);
    const isValid = coverage.every((c) => c.missing.length === 0 && !c.conflict) && requiredMissing.length === 0;
    return { academicYearId: year.id, level, grade, courses, coverage, requiredMissing, isValid };
  }

  async applyTemplate(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grades: number[], includeOptional: string[] = []) {
    const year = await resolveYear(schoolId, academicYearId);
    grades.forEach((g) => { if (!isValidGrade(level, g)) throw new AppError(`Grado ${g} no válido para el nivel.`, 400); });
    await prisma.$transaction(async (tx) => {
      for (const grade of grades) {
        let order = 0;
        for (const spec of CNEB_AREAS[level]) {
          order += 1;
          if (spec.optional && !includeOptional.includes(spec.code)) continue;
          const hasSub = await tx.studyPlanCourse.findFirst({
            where: { academicYearId: year.id, educationLevel: level, grade, area: { officialAreaCode: spec.code, kind: 'SUBCOURSE' } },
          });
          if (hasSub) continue;
          const area = await ensureOfficialArea(tx, schoolId, level, spec.code);
          await tx.studyPlanCourse.upsert({
            where: { academicYearId_educationLevel_grade_areaId: { academicYearId: year.id, educationLevel: level, grade, areaId: area.id } },
            update: {},
            create: { schoolId, academicYearId: year.id, educationLevel: level, grade, areaId: area.id, order },
          });
        }
      }
    }, { timeout: 60_000 });
    return { applied: grades.length };
  }

  async createSubcourses(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grades: number[], officialAreaCode: string, subcourses: SubcourseInput[]) {
    const year = await resolveYear(schoolId, academicYearId);
    const spec = getOfficialArea(level, officialAreaCode);
    if (!spec || spec.isTransversal) throw new AppError('Esta área no se puede dividir.', 400);
    if (subcourses.length < 2) throw new AppError('Para dividir un área necesitas al menos dos cursos.', 400);
    const names = subcourses.map((s) => s.name.trim().toLowerCase());
    if (names.some((n) => n.length < 2)) throw new AppError('Escribe el nombre de cada curso.', 400);
    if (new Set(names).size !== names.length) throw new AppError('Hay cursos con el mismo nombre.', 400);
    for (const s of subcourses) {
      if (s.cnebNumbers.length === 0) throw new AppError(`"${s.name}" debe evaluar al menos una competencia.`, 400);
      if (s.cnebNumbers.some((n) => !spec.competences.includes(n))) throw new AppError(`"${s.name}" tiene competencias que no son de ${spec.name}.`, 400);
    }
    const covered = new Set(subcourses.flatMap((s) => s.cnebNumbers));
    const missing = spec.competences.filter((n) => !covered.has(n));
    if (missing.length) {
      throw new AppError(`Faltan competencias por cubrir: ${missing.map((n) => CNEB_COMPETENCES[n].shortName).join(', ')}.`, 400);
    }
    grades.forEach((g) => { if (!isValidGrade(level, g)) throw new AppError(`Grado ${g} no válido para el nivel.`, 400); });

    await prisma.$transaction(async (tx) => {
      const official = await ensureOfficialArea(tx, schoolId, level, spec.code);
      const subAreaIds: string[] = [];
      for (const s of subcourses) {
        const name = s.name.trim();
        const desired = [...new Set(s.cnebNumbers)].sort((a, b) => a - b);
        const existing = await tx.curricularArea.findFirst({
          where: { schoolId, educationLevel: level, kind: 'SUBCOURSE', officialAreaCode: spec.code, name: { equals: name, mode: 'insensitive' } },
          include: { competences: { where: { isActive: true } } },
        });
        if (existing) {
          const current = existing.competences.map((c) => c.cnebNumber).filter((n): n is number => n !== null).sort((a, b) => a - b);
          if (current.join(',') !== desired.join(',')) {
            throw new AppError(`Ya existe el curso "${name}" con otras competencias. Usa otro nombre o edítalo desde su ficha.`, 409);
          }
          if (s.catalogKey && !existing.catalogKey) {
            await tx.curricularArea.update({ where: { id: existing.id }, data: { catalogKey: s.catalogKey } });
          }
          subAreaIds.push(existing.id);
          continue;
        }
        const created = await tx.curricularArea.create({
          data: {
            schoolId, name, educationLevel: level, kind: 'SUBCOURSE', officialAreaCode: spec.code, parentAreaId: official.id, isActive: true,
            catalogKey: s.catalogKey ?? null,
            competences: { create: desired.map((n) => ({ name: competenceName(n), cnebNumber: n, weight: s.weight && s.weight > 0 ? s.weight : 1 })) },
          },
        });
        subAreaIds.push(created.id);
      }
      for (const grade of grades) {
        const officialRow = await tx.studyPlanCourse.findFirst({
          where: { academicYearId: year.id, educationLevel: level, grade, areaId: official.id },
        });
        if (officialRow) await removeAreaFromGrade(tx, schoolId, year.id, level, grade, official.id, spec.name);
        let order = officialRow?.order ?? 50;
        for (const areaId of subAreaIds) {
          await tx.studyPlanCourse.upsert({
            where: { academicYearId_educationLevel_grade_areaId: { academicYearId: year.id, educationLevel: level, grade, areaId } },
            update: {},
            create: { schoolId, academicYearId: year.id, educationLevel: level, grade, areaId, order: order++ },
          });
        }
      }
    }, { timeout: 60_000 });
    return { created: subcourses.length };
  }

  /** Catálogo preuniversitario de un nivel con el estado de cada curso en un grado. */
  async getPreuniversityCatalog(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grade: number) {
    if (!isValidGrade(level, grade)) throw new AppError('Grado no válido para el nivel.', 400);
    const year = await resolveYear(schoolId, academicYearId);
    const rows = await prisma.studyPlanCourse.findMany({
      where: { schoolId, academicYearId: year.id, educationLevel: level, grade, area: { kind: 'SUBCOURSE' } },
      include: { area: { include: { competences: { where: { isActive: true } } } } },
    });
    const courses = preuniversityCoursesFor(level);
    const areas = [...new Set(courses.map((c) => c.areaCode))]
      .map((code) => getOfficialArea(level, code))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((spec) => {
        const inArea = rows.filter((r) => r.area.officialAreaCode === spec.code);
        return {
          code: spec.code,
          name: spec.name,
          competences: spec.competences,
          customCourses: inArea.filter((r) => !r.area.catalogKey).map((r) => ({
            areaId: r.areaId,
            name: r.area.name,
            competences: r.area.competences.map((c) => c.cnebNumber).filter((n): n is number => n !== null),
          })),
          courses: courses.filter((c) => c.areaCode === spec.code).map((c) => {
            const active = inArea.find((r) => r.area.catalogKey === c.key);
            return {
              ...c,
              active: !!active,
              weight: active?.area.competences[0]?.weight ?? 1,
              planCourseId: active?.id ?? null,
            };
          }),
        };
      });
    return { level, grade, areas };
  }

  /**
   * Activa en uno o varios grados los cursos del catálogo preuniversitario elegidos para un área.
   * Los cursos del catálogo que no se eligen se cierran (si no tienen notas). Con una lista vacía,
   * el área vuelve a ser un único curso oficial.
   */
  async configurePreuniversity(
    schoolId: string,
    academicYearId: string | undefined,
    level: EducationLevel,
    grades: number[],
    officialAreaCode: string,
    items: Array<{ key: string; weight?: number }>,
  ) {
    const year = await resolveYear(schoolId, academicYearId);
    const spec = getOfficialArea(level, officialAreaCode);
    if (!spec || spec.isTransversal) throw new AppError('Esta área no se puede dividir en cursos.', 400);
    if (grades.length === 0) throw new AppError('Elige al menos un grado.', 400);
    grades.forEach((g) => { if (!isValidGrade(level, g)) throw new AppError(`Grado ${g} no válido para el nivel.`, 400); });
    const available = preuniversityCoursesFor(level, spec.code);
    const chosen = items.map((i) => {
      const course = available.find((c) => c.key === i.key);
      if (!course) {
        const any = getPreuniversityCourse(i.key);
        throw new AppError(any ? `"${any.name}" no pertenece a ${spec.name} en este nivel.` : 'Curso del catálogo no reconocido.', 400);
      }
      return { ...course, weight: i.weight && i.weight > 0 ? i.weight : 1 };
    });
    if (new Set(chosen.map((c) => c.key)).size !== chosen.length) throw new AppError('Hay cursos repetidos.', 400);

    // Validación de cobertura para todos los grados antes de tocar nada.
    const perGrade: Array<{ grade: number; inputs: SubcourseInput[]; current: Array<{ areaId: string; name: string; catalogKey: string | null }> }> = [];
    for (const grade of grades) {
      const current = await prisma.studyPlanCourse.findMany({
        where: { academicYearId: year.id, educationLevel: level, grade, area: { officialAreaCode: spec.code, kind: 'SUBCOURSE' } },
        include: { area: { include: { competences: { where: { isActive: true } } } } },
      });
      const custom = current.filter((r) => !r.area.catalogKey);
      const inputs: SubcourseInput[] = [
        ...chosen.map((c) => ({ name: c.name, cnebNumbers: c.competences, weight: c.weight, catalogKey: c.key })),
        ...custom.map((r) => ({
          name: r.area.name,
          cnebNumbers: r.area.competences.map((k) => k.cnebNumber).filter((n): n is number => n !== null),
          weight: r.area.competences[0]?.weight ?? 1,
        })),
      ];
      if (chosen.length > 0) {
        const covered = new Set(inputs.flatMap((i) => i.cnebNumbers));
        const missing = spec.competences.filter((n) => !covered.has(n));
        if (missing.length) {
          const hints = missing.map((n) => {
            const options = available.filter((c) => c.competences.includes(n)).map((c) => c.name);
            return `«${CNEB_COMPETENCES[n].shortName}»${options.length ? ` (agrega ${options.join(' o ')})` : ''}`;
          });
          throw new AppError(`Con esos cursos ${spec.name} queda incompleta: falta ${hints.join(', ')}.`, 400);
        }
        if (inputs.length < 2) throw new AppError('Para dividir un área necesitas al menos dos cursos.', 400);
      }
      perGrade.push({ grade, inputs, current: current.map((r) => ({ areaId: r.areaId, name: r.area.name, catalogKey: r.area.catalogKey })) });
    }

    const result = { grades: grades.length, activated: chosen.length, closed: 0 };
    for (const { grade, inputs, current } of perGrade) {
      if (chosen.length === 0) {
        // Volver al área oficial única
        await prisma.$transaction(async (tx) => {
          for (const r of current) await removeAreaFromGrade(tx, schoolId, year.id, level, grade, r.areaId, r.name);
          const official = await ensureOfficialArea(tx, schoolId, level, spec.code);
          await tx.studyPlanCourse.upsert({
            where: { academicYearId_educationLevel_grade_areaId: { academicYearId: year.id, educationLevel: level, grade, areaId: official.id } },
            update: {},
            create: {
              schoolId, academicYearId: year.id, educationLevel: level, grade, areaId: official.id,
              order: CNEB_AREAS[level].findIndex((a) => a.code === spec.code) + 1,
            },
          });
        }, { timeout: 60_000 });
        result.closed += current.length;
        continue;
      }

      const toClose = current.filter((r) => r.catalogKey && !chosen.some((c) => c.key === r.catalogKey));
      if (toClose.length) {
        await prisma.$transaction(async (tx) => {
          for (const r of toClose) await removeAreaFromGrade(tx, schoolId, year.id, level, grade, r.areaId, r.name);
        }, { timeout: 60_000 });
        result.closed += toClose.length;
      }
      // Si un curso del catálogo ya existe, se actualiza el peso de sus competencias.
      for (const c of chosen) {
        await prisma.curricularCompetence.updateMany({
          where: { isActive: true, area: { schoolId, educationLevel: level, kind: 'SUBCOURSE', catalogKey: c.key, officialAreaCode: spec.code } },
          data: { weight: c.weight },
        });
      }
      await this.createSubcourses(schoolId, year.id, level, [grade], spec.code, inputs);
    }
    return result;
  }

  async addWorkshop(schoolId: string, academicYearId: string | undefined, level: EducationLevel, grades: number[], name: string, weeklyHours?: number | null) {
    const year = await resolveYear(schoolId, academicYearId);
    const clean = name.trim();
    if (clean.length < 2) throw new AppError('Escribe el nombre del taller.', 400);
    grades.forEach((g) => { if (!isValidGrade(level, g)) throw new AppError(`Grado ${g} no válido para el nivel.`, 400); });
    await prisma.$transaction(async (tx) => {
      let area = await tx.curricularArea.findFirst({
        where: { schoolId, educationLevel: level, kind: 'WORKSHOP', name: { equals: clean, mode: 'insensitive' } },
      });
      if (!area) {
        area = await tx.curricularArea.create({
          data: { schoolId, name: clean, educationLevel: level, kind: 'WORKSHOP', isActive: true, competences: { create: [{ name: 'Desempeño en el taller' }] } },
        });
      }
      for (const grade of grades) {
        await tx.studyPlanCourse.upsert({
          where: { academicYearId_educationLevel_grade_areaId: { academicYearId: year.id, educationLevel: level, grade, areaId: area.id } },
          update: { weeklyHours: weeklyHours ?? null },
          create: { schoolId, academicYearId: year.id, educationLevel: level, grade, areaId: area.id, weeklyHours: weeklyHours ?? null, order: 90 },
        });
      }
    });
    return { added: grades.length };
  }

  async updatePlanCourse(schoolId: string, planCourseId: string, data: { weeklyHours?: number | null; order?: number }) {
    const row = await prisma.studyPlanCourse.findFirst({ where: { id: planCourseId, schoolId } });
    if (!row) throw new AppError('Curso del plan no encontrado.', 404);
    return prisma.studyPlanCourse.update({ where: { id: row.id }, data });
  }

  async removePlanCourse(schoolId: string, planCourseId: string) {
    const row = await prisma.studyPlanCourse.findFirst({ where: { id: planCourseId, schoolId }, include: { area: true } });
    if (!row) throw new AppError('Curso del plan no encontrado.', 404);
    await prisma.$transaction((tx) => removeAreaFromGrade(tx, schoolId, row.academicYearId, row.educationLevel, row.grade, row.areaId, row.area.name));
    return { removed: true };
  }

  async copyPlan(schoolId: string, fromAcademicYearId: string, toAcademicYearId: string) {
    const from = await resolveYear(schoolId, fromAcademicYearId);
    const to = await resolveYear(schoolId, toAcademicYearId);
    if (from.id === to.id) throw new AppError('Elige dos años distintos.', 400);
    const rows = await prisma.studyPlanCourse.findMany({ where: { academicYearId: from.id } });
    const result = await prisma.studyPlanCourse.createMany({
      data: rows.map((r) => ({
        schoolId, academicYearId: to.id, educationLevel: r.educationLevel, grade: r.grade, areaId: r.areaId, weeklyHours: r.weeklyHours, order: r.order,
      })),
      skipDuplicates: true,
    });
    return { copied: result.count };
  }

  async updateCourseCompetences(schoolId: string, areaId: string, items: Array<{ cnebNumber: number; weight?: number }>) {
    const area = await prisma.curricularArea.findFirst({ where: { id: areaId, schoolId }, include: { competences: true } });
    if (!area) throw new AppError('Curso no encontrado.', 404);
    if (area.kind !== 'SUBCOURSE') throw new AppError('Solo se pueden editar las competencias de un curso dividido.', 400);
    const spec = getOfficialArea(area.educationLevel as EducationLevel, area.officialAreaCode ?? '');
    if (!spec) throw new AppError('El curso no tiene un área oficial válida.', 400);
    if (items.length === 0) throw new AppError('El curso debe evaluar al menos una competencia.', 400);
    if (items.some((i) => !spec.competences.includes(i.cnebNumber))) throw new AppError(`Hay competencias que no son de ${spec.name}.`, 400);
    const desired = new Set(items.map((i) => i.cnebNumber));
    const toRemove = area.competences.filter((c) => c.isActive && c.cnebNumber !== null && !desired.has(c.cnebNumber));
    for (const c of toRemove) {
      const used = (await prisma.detailedGrade.count({ where: { competenceId: c.id } })) + (await prisma.competencePeriodResult.count({ where: { competenceId: c.id } }));
      if (used > 0) throw new AppError(`"${shortNameOf(c)}" ya tiene notas en este curso: no se puede quitar.`, 409);
    }
    await prisma.$transaction(async (tx) => {
      for (const c of toRemove) await tx.curricularCompetence.update({ where: { id: c.id }, data: { isActive: false } });
      for (const i of items) {
        const existing = area.competences.find((c) => c.cnebNumber === i.cnebNumber);
        const weight = i.weight && i.weight > 0 ? i.weight : 1;
        if (existing) await tx.curricularCompetence.update({ where: { id: existing.id }, data: { isActive: true, weight } });
        else await tx.curricularCompetence.create({ data: { areaId: area.id, name: competenceName(i.cnebNumber), cnebNumber: i.cnebNumber, weight } });
      }
    });
    return { updated: true };
  }

  async renameCourse(schoolId: string, areaId: string, name: string) {
    const area = await prisma.curricularArea.findFirst({ where: { id: areaId, schoolId } });
    if (!area) throw new AppError('Curso no encontrado.', 404);
    if (area.kind === 'OFFICIAL') throw new AppError('Las áreas oficiales no se renombran.', 400);
    if (name.trim().length < 2) throw new AppError('Escribe un nombre válido.', 400);
    return prisma.curricularArea.update({ where: { id: area.id }, data: { name: name.trim() } });
  }

  /** Lista de verificación para "Inicio académico". */
  async getSetupStatus(schoolId: string, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const [classrooms, plans, assignments, teachers] = await Promise.all([
      prisma.classroom.findMany({ where: { schoolId }, select: { id: true, educationLevel: true, grade: true, section: true, tutorTeacherId: true } }),
      prisma.studyPlanCourse.findMany({ where: { academicYearId: year.id }, select: { educationLevel: true, grade: true, areaId: true } }),
      prisma.courseAssignment.findMany({ where: { schoolId, academicYearId: year.id, deletedAt: null }, select: { classroomId: true, areaId: true, teacherId: true } }),
      prisma.user.findMany({ where: { schoolId, role: 'TEACHER', isActive: true }, select: { id: true } }),
    ]);
    const gradesInUse = [...new Set(classrooms.map((c) => `${c.educationLevel}|${c.grade}`))];
    const invalidPlans: Array<{ level: EducationLevel; grade: number }> = [];
    for (const key of gradesInUse) {
      const [level, g] = key.split('|') as [EducationLevel, string];
      if (!isValidGrade(level, Number(g))) continue;
      const plan = await this.getStudyPlan(schoolId, year.id, level, Number(g));
      if (!plan.isValid || plan.courses.length === 0) invalidPlans.push({ level, grade: Number(g) });
    }
    let coursesWithoutTeacher = 0;
    for (const c of classrooms) {
      const planAreas = plans.filter((p) => p.educationLevel === c.educationLevel && p.grade === c.grade).map((p) => p.areaId);
      coursesWithoutTeacher += planAreas.filter((areaId) => !assignments.some((a) => a.classroomId === c.id && a.areaId === areaId)).length;
    }
    const withLoad = new Set(assignments.map((a) => a.teacherId));
    return {
      academicYear: {
        id: year.id, year: year.year, periodType: year.periodType,
        hasPeriods: Array.isArray(year.periodsConfig) && (year.periodsConfig as unknown[]).length > 0,
      },
      gradesInUse: gradesInUse.length,
      invalidPlans,
      classrooms: classrooms.length,
      classroomsWithoutTutor: classrooms.filter((c) => !c.tutorTeacherId).length,
      coursesWithoutTeacher,
      teachers: teachers.length,
      teachersWithoutLoad: teachers.filter((t) => !withLoad.has(t.id)).length,
    };
  }
}

