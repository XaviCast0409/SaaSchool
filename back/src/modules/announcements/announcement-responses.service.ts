import type { Announcement, EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { deliver } from '../automations/delivery';
import { classroomLabel, studentShortName } from '../automations/recipients';
import { isPastDeadline, summarizeByStudent, validateResponse, type ExpectedPair, type ResponseType } from './announcement-response.rules';

export interface Viewer {
  userId: string;
  role: string;
  schoolId: string;
  studentId?: string | null;
}

async function activeYearId(schoolId: string) {
  const y = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true }, orderBy: { year: 'desc' } });
  return y?.id ?? null;
}

type AnnouncementScope = Pick<Announcement, 'classroomId' | 'targetLevel' | 'targetGrade'>;
type ClassroomRef = { id: string; educationLevel: EducationLevel; grade: number };

/** ¿El comunicado llega a esta aula? (todo el colegio, su nivel, su grado o el aula misma) */
export function appliesToClassroom(a: AnnouncementScope, c: ClassroomRef): boolean {
  if (a.classroomId) return a.classroomId === c.id;
  if (a.targetLevel) return a.targetLevel === c.educationLevel && (a.targetGrade == null || a.targetGrade === c.grade);
  return true;
}

/** Filtro de matrículas del público del comunicado. */
function scopeEnrollmentWhere(a: AnnouncementScope): Prisma.EnrollmentWhereInput {
  if (a.classroomId) return { classroomId: a.classroomId };
  if (a.targetLevel) return { classroom: { educationLevel: a.targetLevel, ...(a.targetGrade != null ? { grade: a.targetGrade } : {}) } };
  return {};
}

/** Aulas (año activo) de los hijos de un apoderado, o del propio alumno. */
export async function viewerClassrooms(viewer: Viewer): Promise<ClassroomRef[]> {
  const yearId = await activeYearId(viewer.schoolId);
  if (!yearId) return [];
  const studentIds =
    viewer.role === 'STUDENT' && viewer.studentId
      ? [viewer.studentId]
      : (await prisma.familyRelationship.findMany({ where: { userId: viewer.userId }, select: { studentId: true } })).map((r) => r.studentId);
  if (studentIds.length === 0) return [];
  const enr = await prisma.enrollment.findMany({
    where: { schoolId: viewer.schoolId, academicYearId: yearId, isActive: true, studentId: { in: studentIds } },
    select: { classroom: { select: { id: true, educationLevel: true, grade: true } } },
  });
  const byId = new Map(enr.map((e) => [e.classroom.id, e.classroom]));
  return [...byId.values()];
}

export async function viewerClassroomIds(viewer: Viewer): Promise<string[]> {
  return (await viewerClassrooms(viewer)).map((c) => c.id);
}

/** Filtro de visibilidad: familias y alumnos ven lo general, lo de su nivel o grado y lo de su aula. */
export async function visibilityWhere(viewer: Viewer): Promise<Prisma.AnnouncementWhereInput> {
  if (viewer.role !== 'PARENT' && viewer.role !== 'STUDENT') return {};
  const classrooms = await viewerClassrooms(viewer);
  const or: Prisma.AnnouncementWhereInput[] = [{ classroomId: null, targetLevel: null }];
  if (classrooms.length) or.push({ classroomId: { in: classrooms.map((c) => c.id) } });
  for (const c of classrooms) {
    or.push({ classroomId: null, targetLevel: c.educationLevel, targetGrade: null });
    or.push({ classroomId: null, targetLevel: c.educationLevel, targetGrade: c.grade });
  }
  return { OR: or };
}

/** Pares apoderado–alumno que deben responder un comunicado. */
export async function expectedRespondents(a: Pick<Announcement, 'schoolId' | 'classroomId' | 'targetLevel' | 'targetGrade'>): Promise<Array<ExpectedPair & { studentName: string; classroom: string }>> {
  const yearId = await activeYearId(a.schoolId);
  if (!yearId) return [];
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId: a.schoolId, academicYearId: yearId, isActive: true, enrollmentState: 'REGISTERED', ...scopeEnrollmentWhere(a) },
    select: {
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      student: {
        select: {
          id: true,
          firstNames: true,
          lastNamePaternal: true,
          familyRelations: { where: { user: { isActive: true } }, select: { userId: true } },
        },
      },
    },
  });
  return enrollments.flatMap((e) =>
    e.student.familyRelations.map((r) => ({
      userId: r.userId,
      studentId: e.student.id,
      studentName: studentShortName(e.student),
      classroom: classroomLabel(e.classroom),
    })),
  );
}

async function loadAnnouncement(schoolId: string, id: string) {
  const a = await prisma.announcement.findFirst({ where: { id, schoolId, isActive: true } });
  if (!a) throw new AppError('Comunicado no encontrado.', 404);
  return a;
}

/** Datos de respuesta para la lista: lo que le toca responder al apoderado, o el avance para el personal. */
export async function enrichForViewer<T extends Announcement>(viewer: Viewer, list: T[]) {
  const withResponse = list.filter((a) => a.responseType !== 'NONE');
  if (withResponse.length === 0) return list.map((a) => ({ ...a, myTargets: [] as unknown[], responseStats: null }));

  if (viewer.role === 'PARENT') {
    const children = await prisma.familyRelationship.findMany({
      where: { userId: viewer.userId },
      select: { student: { select: { id: true, firstNames: true, lastNamePaternal: true } } },
    });
    const yearId = await activeYearId(viewer.schoolId);
    const enr = yearId
      ? await prisma.enrollment.findMany({
          where: { academicYearId: yearId, isActive: true, studentId: { in: children.map((c) => c.student.id) } },
          select: { studentId: true, classroom: { select: { id: true, educationLevel: true, grade: true } } },
        })
      : [];
    const classroomOf = new Map(enr.map((e) => [e.studentId, e.classroom]));
    const myResponses = await prisma.announcementResponse.findMany({
      where: { userId: viewer.userId, announcementId: { in: withResponse.map((a) => a.id) } },
      select: { announcementId: true, studentId: true, response: true, respondedAt: true },
    });
    return list.map((a) => {
      if (a.responseType === 'NONE') return { ...a, myTargets: [], responseStats: null };
      const targets = children
        .filter((c) => { const room = classroomOf.get(c.student.id); return !!room && appliesToClassroom(a, room); })
        .map((c) => {
          const r = myResponses.find((x) => x.announcementId === a.id && x.studentId === c.student.id);
          return { studentId: c.student.id, studentName: studentShortName(c.student), response: r?.response ?? null, respondedAt: r?.respondedAt ?? null };
        });
      return { ...a, myTargets: targets, responseStats: null };
    });
  }

  const canSeeStats = (a: T) => viewer.role === 'SCHOOL_ADMIN' || viewer.role === 'SUPER_ADMIN' || viewer.role === 'ADMINISTRATIVE' || a.authorId === viewer.userId;
  const stats = new Map<string, { expected: number; responded: number; tally: Record<string, number> }>();
  const visibleStats = withResponse.filter(canSeeStats);
  if (visibleStats.length > 0) {
    // Una consulta por alcance (todo el colegio o un aula) y una sola para todas las respuestas,
    // en vez de recargar matrículas y familias por cada comunicado de la página
    const scopeKey = (a: AnnouncementScope) => `${a.classroomId ?? ''}|${a.targetLevel ?? ''}|${a.targetGrade ?? ''}`;
    const scopeByKey = new Map(visibleStats.map((a) => [scopeKey(a), { classroomId: a.classroomId, targetLevel: a.targetLevel, targetGrade: a.targetGrade }]));
    const scopes = [...scopeByKey.keys()];
    const [expectedByScope, responses] = await Promise.all([
      Promise.all(scopes.map((k) => expectedRespondents({ schoolId: viewer.schoolId, ...scopeByKey.get(k)! }))).then(
        (lists) => new Map(scopes.map((k, i) => [k, lists[i]])),
      ),
      prisma.announcementResponse.findMany({
        where: { announcementId: { in: visibleStats.map((a) => a.id) } },
        select: { announcementId: true, userId: true, studentId: true, response: true, respondedAt: true },
      }),
    ]);
    for (const a of visibleStats) {
      const s = summarizeByStudent(
        expectedByScope.get(scopeKey(a)) ?? [],
        responses.filter((r) => r.announcementId === a.id),
      );
      stats.set(a.id, { expected: s.expectedStudents, responded: s.respondedStudents, tally: s.tally });
    }
  }
  return list.map((a) => ({ ...a, myTargets: [], responseStats: stats.get(a.id) ?? null }));
}

export async function respond(
  viewer: Viewer,
  announcementId: string,
  input: { studentId: string; response: string; comment?: string },
  meta: { ip?: string; userAgent?: string },
) {
  if (viewer.role !== 'PARENT') throw new AppError('Solo los apoderados pueden responder.', 403);
  const a = await loadAnnouncement(viewer.schoolId, announcementId);
  const error = validateResponse(a.responseType as ResponseType, input.response, a.pollOptions);
  if (error) throw new AppError(error, 400);
  if (isPastDeadline(a.responseDeadline)) throw new AppError('El plazo para responder ya venció.', 400);

  const rel = await prisma.familyRelationship.findFirst({ where: { userId: viewer.userId, studentId: input.studentId }, select: { id: true } });
  if (!rel) throw new AppError('Solo puedes responder por tus hijos.', 403);
  if (a.classroomId || a.targetLevel) {
    const classrooms = await viewerClassrooms(viewer);
    if (!classrooms.some((c) => appliesToClassroom(a, c))) throw new AppError('Este comunicado no es para el aula de tu hijo(a).', 403);
  }

  const data = {
    response: input.response,
    comment: input.comment?.trim() || null,
    ipAddress: meta.ip?.slice(0, 64) ?? null,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    respondedAt: new Date(),
  };
  return prisma.announcementResponse.upsert({
    where: { announcementId_userId_studentId: { announcementId, userId: viewer.userId, studentId: input.studentId } },
    create: { schoolId: viewer.schoolId, announcementId, userId: viewer.userId, studentId: input.studentId, ...data },
    update: data,
    select: { id: true, response: true, respondedAt: true, studentId: true },
  });
}

async function assertCanManage(viewer: Viewer, a: Announcement) {
  const ok = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVE'].includes(viewer.role) || a.authorId === viewer.userId;
  if (!ok) throw new AppError('Solo la Dirección o el autor pueden ver las respuestas.', 403);
}

/** Detalle de respuestas por alumno (para la Dirección o el autor). */
export async function getResponses(viewer: Viewer, announcementId: string) {
  const a = await loadAnnouncement(viewer.schoolId, announcementId);
  await assertCanManage(viewer, a);
  const [expected, responses] = await Promise.all([
    expectedRespondents(a),
    prisma.announcementResponse.findMany({
      where: { announcementId },
      select: { userId: true, studentId: true, response: true, comment: true, respondedAt: true, user: { select: { firstName: true, lastNamePaternal: true } } },
      orderBy: { respondedAt: 'desc' },
    }),
  ]);
  const summary = summarizeByStudent(expected, responses);
  const byStudent = new Map<string, { studentId: string; studentName: string; classroom: string; response: string | null; respondedBy: string | null; respondedAt: Date | null; comment: string | null }>();
  for (const e of expected) {
    if (byStudent.has(e.studentId)) continue;
    const r = responses.find((x) => x.studentId === e.studentId);
    byStudent.set(e.studentId, {
      studentId: e.studentId,
      studentName: e.studentName,
      classroom: e.classroom,
      response: r?.response ?? null,
      respondedBy: r ? `${r.user.firstName} ${r.user.lastNamePaternal}` : null,
      respondedAt: r?.respondedAt ?? null,
      comment: r?.comment ?? null,
    });
  }
  const rows = [...byStudent.values()].sort((x, y) => Number(Boolean(x.response)) - Number(Boolean(y.response)) || x.classroom.localeCompare(y.classroom) || x.studentName.localeCompare(y.studentName));
  return {
    responseType: a.responseType,
    pollOptions: a.pollOptions,
    deadline: a.responseDeadline,
    expected: summary.expectedStudents,
    responded: summary.respondedStudents,
    tally: summary.tally,
    rows,
  };
}

/** Recordatorio solo a las familias que aún no responden. */
export async function remindPending(viewer: Viewer, announcementId: string) {
  const a = await loadAnnouncement(viewer.schoolId, announcementId);
  await assertCanManage(viewer, a);
  if (a.responseType === 'NONE') throw new AppError('Este comunicado no requiere respuesta.', 400);
  if (isPastDeadline(a.responseDeadline)) throw new AppError('El plazo ya venció.', 400);

  const [expected, responses, school] = await Promise.all([
    expectedRespondents(a),
    prisma.announcementResponse.findMany({ where: { announcementId }, select: { studentId: true } }),
    prisma.school.findUnique({ where: { id: viewer.schoolId }, select: { name: true } }),
  ]);
  const answered = new Set(responses.map((r) => r.studentId));
  const pendingParents = [...new Set(expected.filter((e) => !answered.has(e.studentId)).map((e) => e.userId))];
  if (pendingParents.length === 0) return { reminded: 0 };

  const verb = a.responseType === 'AUTHORIZATION' ? 'autorizar' : a.responseType === 'POLL' ? 'responder la encuesta' : 'confirmar la lectura';
  await deliver(
    viewer.schoolId,
    pendingParents.map((userId) => ({ userId })),
    { title: `Pendiente: ${a.title}`, message: `Le pedimos ${verb} de este comunicado.`, type: 'ANNOUNCEMENT', link: '/announcements' },
    { schoolName: school?.name ?? '' },
  );
  return { reminded: pendingParents.length };
}

/** Destinatarios de un comunicado nuevo (respeta el aula) para notificarlos con push. */
export async function announcementRecipients(a: Pick<Announcement, 'schoolId' | 'classroomId' | 'targetLevel' | 'targetGrade' | 'targetRoles' | 'authorId'>) {
  const recipients = new Set<string>();
  const roles = a.targetRoles.filter((r) => r !== 'PARENT');
  if (roles.length > 0) {
    const users = await prisma.user.findMany({
      where: { schoolId: a.schoolId, isActive: true, role: { in: roles }, id: { not: a.authorId } },
      select: { id: true },
    });
    users.forEach((u) => recipients.add(u.id));
  }
  if (a.targetRoles.includes('PARENT')) {
    if (a.classroomId || a.targetLevel) {
      (await expectedRespondents(a)).forEach((e) => recipients.add(e.userId));
    } else {
      const parents = await prisma.user.findMany({ where: { schoolId: a.schoolId, isActive: true, role: 'PARENT' }, select: { id: true } });
      parents.forEach((p) => recipients.add(p.id));
    }
  }
  recipients.delete(a.authorId);
  return [...recipients];
}
