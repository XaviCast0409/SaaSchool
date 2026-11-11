import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getActiveYear, resolveYear } from './academic.context';

export interface TeachingLoadChange {
  classroomId: string;
  areaId: string;
  teacherId: string | null;
}

export class TeachingLoadService {
  async getMatrix(schoolId: string, academicYearId: string | undefined, level: EducationLevel) {
    const year = await resolveYear(schoolId, academicYearId);
    const [classrooms, plan, assignments, teachers] = await Promise.all([
      prisma.classroom.findMany({
        where: { schoolId, educationLevel: level },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }],
        select: { id: true, grade: true, section: true, shift: true, tutorTeacherId: true },
      }),
      prisma.studyPlanCourse.findMany({
        where: { schoolId, academicYearId: year.id, educationLevel: level },
        include: { area: { select: { id: true, name: true, kind: true, officialAreaCode: true, isTransversal: true } } },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.courseAssignment.findMany({
        where: { schoolId, academicYearId: year.id, deletedAt: null, classroom: { educationLevel: level } },
        select: { id: true, classroomId: true, areaId: true, teacherId: true },
      }),
      prisma.user.findMany({
        where: { schoolId, role: 'TEACHER', isActive: true },
        select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true },
        orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
      }),
    ]);
    const gradedIds = new Set(
      (await prisma.detailedGrade.groupBy({ by: ['courseAssignmentId'], where: { courseAssignmentId: { in: assignments.map((a) => a.id) } } }))
        .map((g) => g.courseAssignmentId),
    );
    const rows = classrooms.map((c) => ({
      ...c,
      courses: plan
        .filter((p) => p.grade === c.grade)
        .map((p) => {
          const a = assignments.find((x) => x.classroomId === c.id && x.areaId === p.areaId);
          return {
            areaId: p.areaId, name: p.area.name, kind: p.area.kind, isTransversal: p.area.isTransversal,
            weeklyHours: p.weeklyHours, assignmentId: a?.id ?? null, teacherId: a?.teacherId ?? null,
            hasGrades: a ? gradedIds.has(a.id) : false,
          };
        }),
    }));
    const teacherLoad = teachers.map((t) => {
      const mine = rows.flatMap((r) => r.courses.filter((c) => c.teacherId === t.id));
      return { teacherId: t.id, courses: mine.length, weeklyHours: mine.reduce((acc, c) => acc + (c.weeklyHours ?? 0), 0) };
    });
    return { academicYearId: year.id, level, teachers, classrooms: rows, teacherLoad };
  }

  async saveChanges(schoolId: string, academicYearId: string | undefined, changes: TeachingLoadChange[]) {
    const year = await resolveYear(schoolId, academicYearId);
    if (changes.length === 0) return { updated: 0 };
    const classroomIds = [...new Set(changes.map((c) => c.classroomId))];
    const classrooms = await prisma.classroom.findMany({ where: { id: { in: classroomIds }, schoolId } });
    if (classrooms.length !== classroomIds.length) throw new AppError('Una o más aulas no pertenecen al colegio.', 400);
    const teacherIds = [...new Set(changes.map((c) => c.teacherId).filter((t): t is string => !!t))];
    const validTeachers = await prisma.user.count({ where: { id: { in: teacherIds }, schoolId, role: 'TEACHER', isActive: true } });
    if (validTeachers !== teacherIds.length) throw new AppError('Uno o más docentes no son válidos o están inactivos.', 400);
    const plan = await prisma.studyPlanCourse.findMany({
      where: { academicYearId: year.id, areaId: { in: [...new Set(changes.map((c) => c.areaId))] } },
      include: { area: { select: { name: true } } },
    });
    for (const ch of changes) {
      const c = classrooms.find((x) => x.id === ch.classroomId)!;
      if (!plan.some((p) => p.areaId === ch.areaId && p.educationLevel === c.educationLevel && p.grade === c.grade)) {
        throw new AppError(`Un curso no pertenece al plan de estudios de ${c.grade}.° "${c.section}". Revisa el plan primero.`, 400);
      }
    }
    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const ch of changes) {
        const existing = await tx.courseAssignment.findFirst({
          where: { schoolId, academicYearId: year.id, classroomId: ch.classroomId, areaId: ch.areaId },
        });
        if (ch.teacherId === null) {
          if (!existing || existing.deletedAt) continue;
          const graded =
            (await tx.detailedGrade.count({ where: { courseAssignmentId: existing.id } })) +
            (await tx.competencePeriodResult.count({ where: { courseAssignmentId: existing.id } })) +
            (await tx.competenceConclusion.count({ where: { courseAssignmentId: existing.id } }));
          if (graded > 0) {
            const c = classrooms.find((x) => x.id === ch.classroomId)!;
            const name = plan.find((p) => p.areaId === ch.areaId)?.area.name ?? 'El curso';
            throw new AppError(`"${name}" de ${c.grade}.° "${c.section}" ya tiene notas: no se puede dejar sin docente. Asigna otro docente.`, 409);
          }
          await tx.courseAssignment.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
        } else if (existing) {
          await tx.courseAssignment.update({ where: { id: existing.id }, data: { teacherId: ch.teacherId, deletedAt: null } });
        } else {
          await tx.courseAssignment.create({
            data: { schoolId, academicYearId: year.id, classroomId: ch.classroomId, areaId: ch.areaId, teacherId: ch.teacherId },
          });
        }
        updated += 1;
      }
    }, { timeout: 60_000 });
    return { updated };
  }

  async assignWholeClassroom(schoolId: string, academicYearId: string | undefined, classroomId: string, teacherId: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId } });
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    const plan = await prisma.studyPlanCourse.findMany({
      where: { academicYearId: year.id, educationLevel: classroom.educationLevel, grade: classroom.grade },
      include: { area: { select: { isTransversal: true } } },
    });
    const changes = plan
      .filter((p) => !(p.area.isTransversal && classroom.tutorTeacherId))
      .map((p) => ({ classroomId, areaId: p.areaId, teacherId }));
    return this.saveChanges(schoolId, year.id, changes);
  }

  async copyFromYear(schoolId: string, fromAcademicYearId: string, toAcademicYearId: string) {
    const from = await resolveYear(schoolId, fromAcademicYearId);
    const to = await resolveYear(schoolId, toAcademicYearId);
    if (from.id === to.id) throw new AppError('Elige dos años distintos.', 400);
    const [source, targetPlan, existing] = await Promise.all([
      prisma.courseAssignment.findMany({
        where: { schoolId, academicYearId: from.id, deletedAt: null, teacher: { isActive: true } },
        include: { classroom: true },
      }),
      prisma.studyPlanCourse.findMany({ where: { academicYearId: to.id } }),
      prisma.courseAssignment.findMany({ where: { academicYearId: to.id, deletedAt: null }, select: { classroomId: true, areaId: true } }),
    ]);
    const pending = source
      .filter((a) => targetPlan.some((p) => p.areaId === a.areaId && p.educationLevel === a.classroom.educationLevel && p.grade === a.classroom.grade))
      .filter((a) => !existing.some((e) => e.classroomId === a.classroomId && e.areaId === a.areaId))
      .map((a) => ({ classroomId: a.classroomId, areaId: a.areaId, teacherId: a.teacherId }));
    return this.saveChanges(schoolId, to.id, pending);
  }

  /** El tutor o tutora registra las competencias transversales del aula. */
  async syncTutorTransversal(schoolId: string, classroomId: string): Promise<void> {
    const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId } });
    if (!classroom?.tutorTeacherId) return;
    const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!year) return;
    const trans = await prisma.studyPlanCourse.findFirst({
      where: { academicYearId: year.id, educationLevel: classroom.educationLevel, grade: classroom.grade, area: { isTransversal: true } },
    });
    if (!trans) return;
    await this.saveChanges(schoolId, year.id, [{ classroomId, areaId: trans.areaId, teacherId: classroom.tutorTeacherId }]);
  }

  async getMyCourses(schoolId: string, teacherId: string) {
    const year = await getActiveYear(schoolId);
    return prisma.courseAssignment.findMany({
      where: { schoolId, teacherId, academicYearId: year.id, deletedAt: null },
      include: {
        classroom: { select: { id: true, educationLevel: true, grade: true, section: true, tutorTeacherId: true } },
        area: { select: { id: true, name: true, kind: true, officialAreaCode: true, isTransversal: true } },
      },
      orderBy: [{ classroom: { educationLevel: 'asc' } }, { classroom: { grade: 'asc' } }, { classroom: { section: 'asc' } }],
    });
  }
}

