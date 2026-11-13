import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { scoreToLetter } from '../grades/letter-scale';
import { assertPeriod, fullNameOf, getActiveYear, getThresholds, isAdmin, periodName, type AcademicUser } from './academic.context';
import { PeriodService } from './period.service';

/** Largo máximo de los comentarios de la libreta interna (conducta y tutor). */
export const TUTOR_COMMENT_MAX = 1000;
const LETTERS = ['AD', 'A', 'B', 'C'] as const;
type ConductLetter = (typeof LETTERS)[number];

export interface TutorReportRowInput {
  enrollmentId: string;
  conductScore?: number | null;
  conductLetter?: ConductLetter | null;
  conductComment?: string | null;
  tutorComment?: string | null;
}

const cleanText = (t: string | null | undefined) => {
  const v = (t ?? '').replace(/\r\n/g, '\n').trim();
  return v ? v.slice(0, TUTOR_COMMENT_MAX) : null;
};

/**
 * Libreta interna: conducta (nota numérica y/o literal + comentario) y comentario del tutor o tutora
 * sobre el desempeño general, por estudiante y periodo. No va al SIAGIE.
 */
export class TutorReportService {
  private readonly periods = new PeriodService();

  private async loadClassroom(schoolId: string, user: AcademicUser, classroomId: string) {
    const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId } });
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    const canEdit = isAdmin(user) || (user.role === 'TEACHER' && classroom.tutorTeacherId === user.userId);
    const canView = canEdit || user.role === 'ADMINISTRATIVE';
    if (!canView) throw new AppError('Solo el tutor o tutora del aula registra la conducta y el comentario de la libreta.', 403);
    return { classroom, canEdit };
  }

  async getForClassroom(schoolId: string, user: AcademicUser, classroomId: string, periodNumber: number) {
    const { classroom, canEdit } = await this.loadClassroom(schoolId, user, classroomId);
    const year = await getActiveYear(schoolId);
    assertPeriod(year, periodNumber);
    const status = await this.periods.getEffectiveStatus(year.id, periodNumber, classroom.id);
    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, classroomId, academicYearId: year.id, enrollmentState: 'REGISTERED' },
      include: { student: { select: { lastNamePaternal: true, lastNameMaternal: true, firstNames: true } } },
      orderBy: [{ student: { lastNamePaternal: 'asc' } }, { student: { lastNameMaternal: 'asc' } }, { student: { firstNames: 'asc' } }],
    });
    const rows = await prisma.studentPeriodReport.findMany({ where: { enrollmentId: { in: enrollments.map((e) => e.id) }, periodNumber } });
    const thresholds = await getThresholds(schoolId, classroom.educationLevel as EducationLevel);
    return {
      classroomId,
      periodNumber,
      periodName: periodName(year, periodNumber),
      periodStatus: status,
      canEdit: canEdit && (status !== 'CLOSED' || isAdmin(user)),
      thresholds,
      maxCommentLength: TUTOR_COMMENT_MAX,
      students: enrollments.map((e) => {
        const r = rows.find((x) => x.enrollmentId === e.id);
        return {
          enrollmentId: e.id,
          fullName: fullNameOf(e.student),
          conductScore: r?.conductScore ?? null,
          conductLetter: r?.conductLetter ?? null,
          conductComment: r?.conductComment ?? '',
          tutorComment: r?.tutorComment ?? '',
        };
      }),
    };
  }

  async save(schoolId: string, user: AcademicUser, classroomId: string, periodNumber: number, input: TutorReportRowInput[]) {
    const { classroom, canEdit } = await this.loadClassroom(schoolId, user, classroomId);
    if (!canEdit) throw new AppError('Solo el tutor o tutora del aula puede registrar estos datos.', 403);
    const year = await getActiveYear(schoolId);
    assertPeriod(year, periodNumber);
    const status = await this.periods.getEffectiveStatus(year.id, periodNumber, classroom.id);
    if (status === 'CLOSED' && !isAdmin(user)) throw new AppError('El periodo está cerrado: pide a Dirección que lo reabra para editar.', 409);

    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, classroomId, academicYearId: year.id, id: { in: input.map((r) => r.enrollmentId) } },
      select: { id: true },
    });
    if (enrollments.length !== new Set(input.map((r) => r.enrollmentId)).size) {
      throw new AppError('Hay estudiantes que no pertenecen a esta aula.', 400);
    }
    const thresholds = await getThresholds(schoolId, classroom.educationLevel as EducationLevel);
    await prisma.$transaction(input.map((r) => {
      const score = r.conductScore === null || r.conductScore === undefined ? null : Math.round(r.conductScore * 10) / 10;
      if (score !== null && (score < 0 || score > 20)) throw new AppError('La nota de conducta va de 0 a 20.', 400);
      // Si hay nota numérica, la letra sale de la escala del colegio; si no, se usa la letra escrita.
      const letter = score !== null ? scoreToLetter(score, thresholds) : r.conductLetter ?? null;
      const data = {
        conductScore: score,
        conductLetter: letter,
        conductComment: cleanText(r.conductComment),
        tutorComment: cleanText(r.tutorComment),
        updatedById: user.userId,
      };
      return prisma.studentPeriodReport.upsert({
        where: { enrollmentId_periodNumber: { enrollmentId: r.enrollmentId, periodNumber } },
        update: data,
        create: { schoolId, enrollmentId: r.enrollmentId, periodNumber, ...data },
      });
    }));
    return { saved: input.length };
  }
}
