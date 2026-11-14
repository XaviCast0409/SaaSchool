import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import { getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { NotificationRepository } from '../notifications/notification.repository';
import { NotificationService } from '../notifications/notification.service';
import { resolveYear } from './academic.context';
import { TeachingLoadService } from './teaching-load.service';
import { teacherHistoryService } from './teacher-history.service';
import { validateReplacement } from './teacher-history.rules';

const LEVEL: Record<string, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const room = (c: { educationLevel: string; grade: number; section: string }) =>
  c.educationLevel === 'INITIAL' ? `${c.grade} años "${c.section}"` : `${c.grade}.° ${LEVEL[c.educationLevel]} "${c.section}"`;
const PERSON = { select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, email: true, isActive: true, role: true } } as const;
const name = (p: { firstName: string; lastNamePaternal: string }) => `${p.firstName} ${p.lastNamePaternal}`;

export interface ReplacementInput {
  outgoingTeacherId: string;
  incomingTeacherId: string;
  academicYearId?: string;
  kind: 'PERMANENT' | 'TEMPORARY';
  effectiveDate: string;
  untilDate?: string | null;
  reason: string;
  outgoingAction: 'KEEP' | 'REMOVE_FROM_YEAR' | 'DEACTIVATE';
  copyRubrics: boolean;
}

interface ReplacementDetail {
  assignmentIds: string[];
  tutorClassroomIds: string[];
  contentIds: string[];
  rubricIds: string[];
}

/**
 * Reemplazo de docente a mitad de año: el entrante recibe cursos (con sus notas, criterios,
 * asistencia, horario y contenidos), tutoría y, si se quiere, sus rúbricas; queda el historial de
 * quién dictó cada parte del año. Un reemplazo temporal se puede finalizar y todo vuelve al titular.
 */
export class TeacherReplacementService {
  private readonly notifications = new NotificationService(new NotificationRepository());

  private async tutorRowsOf(schoolId: string, academicYearId: string, teacherId: string) {
    return prisma.classroomYear.findMany({
      where: { schoolId, academicYearId, tutorTeacherId: teacherId },
      include: { classroom: { select: { id: true, educationLevel: true, grade: true, section: true } } },
    });
  }

  /** Lo que se transferiría: cursos con su avance, tutoría, entregas por calificar y rúbricas. */
  async preview(schoolId: string, outgoingTeacherId: string, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const teacher = await prisma.user.findFirst({ where: { id: outgoingTeacherId, schoolId, role: 'TEACHER' }, ...PERSON });
    if (!teacher) throw new AppError('Docente no encontrado.', 404);
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, teacherId: outgoingTeacherId, deletedAt: null },
      include: {
        classroom: { select: { educationLevel: true, grade: true, section: true } },
        area: { select: { name: true } },
        _count: { select: { detailedGrades: true, contents: true, courseAttendanceSessions: true, scheduleBlocks: true } },
      },
      orderBy: [{ classroom: { educationLevel: 'asc' } }, { classroom: { grade: 'asc' } }, { classroom: { section: 'asc' } }],
    });
    const ids = assignments.map((a) => a.id);
    const [pendingByAssignment, tutorRows, rubrics] = await Promise.all([
      prisma.homeworkSubmission.groupBy({
        by: ['courseContentId'],
        where: { gradedAt: null, courseContent: { courseAssignmentId: { in: ids } } },
        _count: { _all: true },
      }),
      this.tutorRowsOf(schoolId, year.id, outgoingTeacherId),
      prisma.rubric.count({ where: { schoolId, authorId: outgoingTeacherId } }),
    ]);
    const contentToAssignment = new Map(
      (await prisma.courseContent.findMany({ where: { courseAssignmentId: { in: ids } }, select: { id: true, courseAssignmentId: true } })).map((c) => [c.id, c.courseAssignmentId]),
    );
    const pending = new Map<string, number>();
    for (const p of pendingByAssignment) {
      const a = contentToAssignment.get(p.courseContentId);
      if (a) pending.set(a, (pending.get(a) ?? 0) + p._count._all);
    }
    return {
      year: { id: year.id, year: year.year, isActive: year.isActive },
      teacher,
      courses: assignments.map((a) => ({
        id: a.id,
        course: a.area.name,
        classroom: room(a.classroom),
        grades: a._count.detailedGrades,
        contents: a._count.contents,
        attendanceSessions: a._count.courseAttendanceSessions,
        scheduleBlocks: a._count.scheduleBlocks,
        pendingSubmissions: pending.get(a.id) ?? 0,
      })),
      tutorOf: tutorRows.map((r) => room(r.classroom)),
      rubrics,
    };
  }

  async execute(schoolId: string, actorUserId: string, input: ReplacementInput) {
    const error = validateReplacement(input);
    if (error) throw new AppError(error, 400);
    const year = await resolveYear(schoolId, input.academicYearId);
    const [outgoing, incoming] = await Promise.all([
      prisma.user.findFirst({ where: { id: input.outgoingTeacherId, schoolId, role: 'TEACHER' }, ...PERSON }),
      prisma.user.findFirst({ where: { id: input.incomingTeacherId, schoolId, role: 'TEACHER' }, ...PERSON }),
    ]);
    if (!outgoing) throw new AppError('Docente saliente no encontrado.', 404);
    if (!incoming || !incoming.isActive) throw new AppError('El docente entrante no existe o está desactivado.', 400);

    const tutorRows = await this.tutorRowsOf(schoolId, year.id, outgoing.id);
    if (tutorRows.length > 0) {
      const incomingTutor = await prisma.classroomYear.findFirst({
        where: { academicYearId: year.id, tutorTeacherId: incoming.id },
        include: { classroom: { select: { educationLevel: true, grade: true, section: true } } },
      });
      if (incomingTutor) {
        throw new AppError(
          `${name(incoming)} ya es tutor(a) de ${room(incomingTutor.classroom)} en ${year.year} y no puede recibir la tutoría de ${room(tutorRows[0].classroom)}. Cambia uno de los tutores en Aulas primero.`,
          409,
        );
      }
    }

    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, teacherId: outgoing.id, deletedAt: null },
      select: { id: true },
    });
    if (assignments.length === 0 && tutorRows.length === 0) {
      throw new AppError(`${name(outgoing)} no tiene cursos ni tutoría en ${year.year}: no hay nada que transferir.`, 400);
    }
    const assignmentIds = assignments.map((a) => a.id);

    const replacement = await prisma.$transaction(async (tx) => {
      const rec = await tx.teacherReplacement.create({
        data: {
          schoolId,
          academicYearId: year.id,
          outgoingTeacherId: outgoing.id,
          incomingTeacherId: incoming.id,
          kind: input.kind,
          effectiveDate: parseSchoolDate(input.effectiveDate),
          untilDate: input.untilDate ? parseSchoolDate(input.untilDate) : null,
          reason: input.reason.trim(),
          detail: {},
          createdById: actorUserId,
        },
      });

      // Cursos: mismo registro (notas, criterios, asistencia, horario y contenidos siguen ahí)
      for (const id of assignmentIds) {
        await tx.courseAssignment.update({ where: { id }, data: { teacherId: incoming.id } });
        await teacherHistoryService.recordChange(tx, schoolId, id, incoming.id, input.effectiveDate, rec.id);
      }

      // Contenidos y tareas: el entrante puede editarlos y calificar; queda quién los creó
      const contents = await tx.courseContent.findMany({ where: { courseAssignmentId: { in: assignmentIds }, teacherId: outgoing.id }, select: { id: true } });
      const contentIds = contents.map((c) => c.id);
      if (contentIds.length) {
        await tx.courseContent.updateMany({ where: { id: { in: contentIds }, originalTeacherId: null }, data: { originalTeacherId: outgoing.id } });
        await tx.courseContent.updateMany({ where: { id: { in: contentIds } }, data: { teacherId: incoming.id } });
      }

      // Tutoría del año (y del aula si es el año vigente)
      const tutorClassroomIds = tutorRows.map((r) => r.classroomId);
      if (tutorClassroomIds.length) {
        await tx.classroomYear.updateMany({ where: { academicYearId: year.id, tutorTeacherId: outgoing.id }, data: { tutorTeacherId: incoming.id } });
        if (year.isActive) {
          await tx.classroom.updateMany({ where: { schoolId, id: { in: tutorClassroomIds }, tutorTeacherId: outgoing.id }, data: { tutorTeacherId: incoming.id } });
        }
      }

      // Rúbricas: copia para el entrante (las del saliente siguen siendo suyas)
      const rubricIds: string[] = [];
      if (input.copyRubrics) {
        const rubrics = await tx.rubric.findMany({ where: { schoolId, authorId: outgoing.id } });
        for (const r of rubrics) {
          const copy = await tx.rubric.create({
            data: {
              schoolId,
              authorId: incoming.id,
              title: r.title,
              description: r.description,
              areaName: r.areaName,
              educationLevel: r.educationLevel,
              criteria: r.criteria as object,
              isShared: r.isShared,
            },
          });
          rubricIds.push(copy.id);
        }
      }

      // Personal del año: el entrante queda contratado; el saliente según lo elegido
      await tx.staffYear.upsert({
        where: { userId_academicYearId: { userId: incoming.id, academicYearId: year.id } },
        create: { schoolId, userId: incoming.id, academicYearId: year.id },
        update: {},
      });
      if (input.outgoingAction !== 'KEEP') await tx.staffYear.deleteMany({ where: { userId: outgoing.id, academicYearId: year.id } });
      if (input.outgoingAction === 'DEACTIVATE') await tx.user.update({ where: { id: outgoing.id }, data: { isActive: false } });

      const detail: ReplacementDetail = { assignmentIds, tutorClassroomIds, contentIds, rubricIds };
      return tx.teacherReplacement.update({ where: { id: rec.id }, data: { detail: detail as unknown as object } });
    });

    if (input.outgoingAction === 'DEACTIVATE') invalidatePrincipalCache('user', outgoing.id);
    if (year.isActive) {
      const load = new TeachingLoadService();
      for (const classroomId of tutorRows.map((r) => r.classroomId)) await load.syncTutorTransversal(schoolId, classroomId);
    }
    await this.notifications
      .createNotification(schoolId, {
        userId: incoming.id,
        title: input.kind === 'TEMPORARY' ? 'Reemplazo temporal asignado' : 'Nuevos cursos a tu cargo',
        message: `Desde el ${input.effectiveDate.split('-').reverse().join('/')} tienes a tu cargo ${assignmentIds.length} curso(s)${tutorRows.length ? ' y una tutoría' : ''} que dictaba ${name(outgoing)}. Encontrarás sus notas, contenidos y asistencia.`,
        type: 'ACADEMIC',
        link: '/my-courses',
      })
      .catch(() => undefined);

    return { replacement, transferred: { courses: assignmentIds.length, tutorships: tutorRows.length, rubricsCopied: (replacement.detail as unknown as ReplacementDetail).rubricIds.length } };
  }

  /** Finaliza un reemplazo temporal: cursos, tutoría y contenidos vuelven al titular. */
  async endTemporary(schoolId: string, actorUserId: string, replacementId: string, returnDate?: string) {
    const rep = await prisma.teacherReplacement.findFirst({
      where: { id: replacementId, schoolId },
      include: { outgoing: PERSON, incoming: PERSON, academicYear: { select: { id: true, isActive: true } } },
    });
    if (!rep) throw new AppError('Reemplazo no encontrado.', 404);
    if (rep.kind !== 'TEMPORARY') throw new AppError('Solo un reemplazo temporal se puede finalizar.', 400);
    if (rep.status !== 'ACTIVE') throw new AppError('Este reemplazo ya fue finalizado.', 400);
    if (!rep.outgoing.isActive) throw new AppError(`${name(rep.outgoing)} está desactivado(a): reactívalo antes de devolverle sus cursos.`, 400);
    const date = returnDate ?? getSchoolNow().dateStr;
    const detail = rep.detail as unknown as ReplacementDetail;

    const returned = await prisma.$transaction(async (tx) => {
      // Solo lo que sigue a cargo del suplente (si Dirección ya movió un curso, no se toca)
      const still = await tx.courseAssignment.findMany({ where: { id: { in: detail.assignmentIds }, teacherId: rep.incomingTeacherId }, select: { id: true } });
      for (const a of still) {
        await tx.courseAssignment.update({ where: { id: a.id }, data: { teacherId: rep.outgoingTeacherId } });
        await teacherHistoryService.recordChange(tx, schoolId, a.id, rep.outgoingTeacherId, date, rep.id);
      }
      await tx.courseContent.updateMany({ where: { id: { in: detail.contentIds }, teacherId: rep.incomingTeacherId }, data: { teacherId: rep.outgoingTeacherId } });
      await tx.courseContent.updateMany({ where: { id: { in: detail.contentIds }, originalTeacherId: rep.outgoingTeacherId }, data: { originalTeacherId: null } });
      // Contenidos que creó el suplente quedan a cargo del titular (con su autor registrado)
      const newContents = await tx.courseContent.findMany({ where: { courseAssignmentId: { in: still.map((a) => a.id) }, teacherId: rep.incomingTeacherId }, select: { id: true } });
      if (newContents.length) {
        await tx.courseContent.updateMany({ where: { id: { in: newContents.map((c) => c.id) }, originalTeacherId: null }, data: { originalTeacherId: rep.incomingTeacherId } });
        await tx.courseContent.updateMany({ where: { id: { in: newContents.map((c) => c.id) } }, data: { teacherId: rep.outgoingTeacherId } });
      }
      if (detail.tutorClassroomIds.length) {
        const outgoingTutorElsewhere = await tx.classroomYear.findFirst({
          where: { academicYearId: rep.academicYearId, tutorTeacherId: rep.outgoingTeacherId, classroomId: { notIn: detail.tutorClassroomIds } },
        });
        if (!outgoingTutorElsewhere) {
          await tx.classroomYear.updateMany({
            where: { academicYearId: rep.academicYearId, classroomId: { in: detail.tutorClassroomIds }, tutorTeacherId: rep.incomingTeacherId },
            data: { tutorTeacherId: rep.outgoingTeacherId },
          });
          if (rep.academicYear.isActive) {
            await tx.classroom.updateMany({
              where: { schoolId, id: { in: detail.tutorClassroomIds }, tutorTeacherId: rep.incomingTeacherId },
              data: { tutorTeacherId: rep.outgoingTeacherId },
            });
          }
        }
      }
      await tx.teacherReplacement.update({ where: { id: rep.id }, data: { status: 'ENDED', endedAt: new Date(), endedById: actorUserId } });
      return still.length;
    });

    if (rep.academicYear.isActive) {
      const load = new TeachingLoadService();
      for (const classroomId of detail.tutorClassroomIds) await load.syncTutorTransversal(schoolId, classroomId);
    }
    await this.notifications
      .createNotification(schoolId, {
        userId: rep.outgoingTeacherId,
        title: 'Retomas tus cursos',
        message: `Desde el ${date.split('-').reverse().join('/')} vuelves a tener a cargo ${returned} curso(s) que dictó ${name(rep.incoming)}.`,
        type: 'ACADEMIC',
        link: '/my-courses',
      })
      .catch(() => undefined);
    return { returned };
  }

  async list(schoolId: string, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    return prisma.teacherReplacement.findMany({
      where: { schoolId, academicYearId: year.id },
      include: {
        outgoing: { select: { id: true, firstName: true, lastNamePaternal: true } },
        incoming: { select: { id: true, firstName: true, lastNamePaternal: true } },
        createdBy: { select: { firstName: true, lastNamePaternal: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const teacherReplacementService = new TeacherReplacementService();
