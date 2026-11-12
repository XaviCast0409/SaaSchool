import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import { limaWeekday } from '../attendance/attendance.rules';
import { deliver } from '../automations/delivery';
import { classroomLabel, studentShortName } from '../automations/recipients';
import { isWithinOfficeHours, MAX_MESSAGE_LENGTH, normalizeMessageBody, previewOf } from './messaging.rules';

export interface MessagingUser {
  userId: string;
  role: string;
  schoolId: string;
  studentId?: string | null;
}

const STAFF_ROLES = new Set(['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'SUPER_ADMIN']);
const isStaff = (u: MessagingUser) => STAFF_ROLES.has(u.role);
const isWideStaff = (u: MessagingUser) => u.role === 'SCHOOL_ADMIN' || u.role === 'ADMINISTRATIVE' || u.role === 'SUPER_ADMIN';

const fullName = (u: { firstName: string; lastNamePaternal: string }) => `${u.firstName} ${u.lastNamePaternal}`;

const RELATIONSHIP_LABEL: Record<string, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  GRANDPARENT: 'Abuelo(a)',
  UNCLE_AUNT: 'Tío(a)',
  TUTOR_LEGAL: 'Tutor(a) legal',
  OTHER: 'Familiar',
};

const ROLE_LABEL: Record<string, string> = {
  SCHOOL_ADMIN: 'Dirección',
  ADMINISTRATIVE: 'Secretaría',
  TEACHER: 'Docente',
  PARENT: 'Apoderado(a)',
};

async function activeYearId(schoolId: string): Promise<string | null> {
  const y = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true }, orderBy: { year: 'desc' } });
  return y?.id ?? null;
}

async function currentEnrollment(schoolId: string, studentId: string) {
  const yearId = await activeYearId(schoolId);
  if (!yearId) return null;
  return prisma.enrollment.findFirst({
    where: { schoolId, studentId, academicYearId: yearId, isActive: true },
    select: {
      classroomId: true,
      academicYearId: true,
      classroom: { select: { grade: true, section: true, educationLevel: true, tutorTeacherId: true } },
    },
  });
}

async function assertSchoolSettings(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, messagingEnabled: true, messagingStartTime: true, messagingEndTime: true },
  });
  if (!school) throw new AppError('Colegio no encontrado.', 404);
  if (!school.messagingEnabled) throw new AppError('La mensajería no está activada en este colegio.', 403);
  return school;
}

/** Personal con quien un apoderado puede conversar sobre su hijo: tutor, docentes del aula y Dirección. */
export async function staffContactsForStudent(schoolId: string, studentId: string) {
  const enrollment = await currentEnrollment(schoolId, studentId);
  const contacts = new Map<string, { id: string; name: string; roleLabel: string; subjects: string[]; isTutor: boolean }>();

  if (enrollment) {
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId, deletedAt: null, teacher: { isActive: true } },
      select: { area: { select: { name: true } }, teacher: { select: { id: true, firstName: true, lastNamePaternal: true } } },
    });
    for (const a of assignments) {
      const c = contacts.get(a.teacher.id) ?? { id: a.teacher.id, name: fullName(a.teacher), roleLabel: 'Docente', subjects: [], isTutor: false };
      if (!c.subjects.includes(a.area.name)) c.subjects.push(a.area.name);
      contacts.set(a.teacher.id, c);
    }
    const tutorId = enrollment.classroom.tutorTeacherId;
    if (tutorId) {
      const tutor = contacts.get(tutorId) ?? (await prisma.user.findFirst({ where: { id: tutorId, schoolId, isActive: true }, select: { id: true, firstName: true, lastNamePaternal: true } }).then((t) => (t ? { id: t.id, name: fullName(t), roleLabel: 'Docente', subjects: [], isTutor: false } : null)));
      if (tutor) contacts.set(tutorId, { ...tutor, isTutor: true, roleLabel: 'Tutor(a)' });
    }
  }

  const admins = await prisma.user.findMany({
    where: { schoolId, role: 'SCHOOL_ADMIN', isActive: true },
    select: { id: true, firstName: true, lastNamePaternal: true },
  });
  for (const a of admins) if (!contacts.has(a.id)) contacts.set(a.id, { id: a.id, name: fullName(a), roleLabel: 'Dirección', subjects: [], isTutor: false });

  return [...contacts.values()].sort((a, b) => Number(b.isTutor) - Number(a.isTutor) || a.roleLabel.localeCompare(b.roleLabel) || a.name.localeCompare(b.name));
}

/** ¿El personal puede escribir a las familias de este alumno? Dirección/Secretaría: todos; docente: sus aulas. */
async function staffCanContactStudent(user: MessagingUser, studentId: string): Promise<boolean> {
  if (isWideStaff(user)) {
    const s = await prisma.student.findFirst({ where: { id: studentId, schoolId: user.schoolId }, select: { id: true } });
    return Boolean(s);
  }
  if (user.role !== 'TEACHER') return false;
  const enrollment = await currentEnrollment(user.schoolId, studentId);
  if (!enrollment) return false;
  if (enrollment.classroom.tutorTeacherId === user.userId) return true;
  const count = await prisma.courseAssignment.count({
    where: { schoolId: user.schoolId, classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId, teacherId: user.userId, deletedAt: null },
  });
  return count > 0;
}

async function parentOfStudent(parentId: string, studentId: string): Promise<boolean> {
  const rel = await prisma.familyRelationship.findFirst({ where: { userId: parentId, studentId }, select: { id: true } });
  return Boolean(rel);
}

/** Lista de contactos para iniciar una conversación. */
export async function getContacts(user: MessagingUser, query: { studentId?: string; search?: string }) {
  await assertSchoolSettings(user.schoolId);

  if (user.role === 'PARENT') {
    const children = await prisma.familyRelationship.findMany({
      where: { userId: user.userId, student: { schoolId: user.schoolId } },
      select: { student: { select: { id: true, firstNames: true, lastNamePaternal: true } } },
    });
    const result = [];
    for (const c of children) {
      if (query.studentId && c.student.id !== query.studentId) continue;
      result.push({ student: { id: c.student.id, name: studentShortName(c.student) }, contacts: await staffContactsForStudent(user.schoolId, c.student.id) });
    }
    return { kind: 'PARENT' as const, children: result };
  }

  if (!isStaff(user)) throw new AppError('No tienes acceso a la mensajería.', 403);

  // Personal: buscar alumnos de sus aulas (o de todo el colegio) y sus apoderados
  const yearId = await activeYearId(user.schoolId);
  if (!yearId) return { kind: 'STAFF' as const, students: [] };
  let classroomIds: string[] | undefined;
  if (!isWideStaff(user)) {
    const [assigned, tutored] = await Promise.all([
      prisma.courseAssignment.findMany({ where: { schoolId: user.schoolId, academicYearId: yearId, teacherId: user.userId, deletedAt: null }, select: { classroomId: true } }),
      prisma.classroom.findMany({ where: { schoolId: user.schoolId, tutorTeacherId: user.userId }, select: { id: true } }),
    ]);
    classroomIds = [...new Set([...assigned.map((a) => a.classroomId), ...tutored.map((t) => t.id)])];
  }
  const search = query.search?.trim();
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolId: user.schoolId,
      academicYearId: yearId,
      isActive: true,
      ...(classroomIds ? { classroomId: { in: classroomIds } } : {}),
      ...(search
        ? { student: { OR: [{ firstNames: { contains: search, mode: 'insensitive' } }, { lastNamePaternal: { contains: search, mode: 'insensitive' } }, { documentId: { contains: search } }] } }
        : {}),
    },
    take: 40,
    orderBy: { student: { lastNamePaternal: 'asc' } },
    select: {
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      student: {
        select: {
          id: true,
          firstNames: true,
          lastNamePaternal: true,
          familyRelations: { where: { user: { isActive: true } }, select: { relationshipType: true, user: { select: { id: true, firstName: true, lastNamePaternal: true } } } },
        },
      },
    },
  });
  return {
    kind: 'STAFF' as const,
    students: enrollments.map((e) => ({
      student: { id: e.student.id, name: studentShortName(e.student), classroom: classroomLabel(e.classroom) },
      contacts: e.student.familyRelations.map((r) => ({ id: r.user.id, name: fullName(r.user), roleLabel: RELATIONSHIP_LABEL[r.relationshipType] ?? 'Familiar' })),
    })),
  };
}

function myLastRead(conv: { parentId: string; parentLastReadAt: Date | null; staffLastReadAt: Date | null }, userId: string) {
  return conv.parentId === userId ? conv.parentLastReadAt : conv.staffLastReadAt;
}

/** Bandeja de conversaciones con su conteo de no leídos. */
export async function listConversations(user: MessagingUser) {
  const where = user.role === 'PARENT' ? { schoolId: user.schoolId, parentId: user.userId } : { schoolId: user.schoolId, staffId: user.userId };
  const convs = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
    select: {
      id: true,
      parentId: true,
      staffId: true,
      lastMessageAt: true,
      lastMessageText: true,
      parentLastReadAt: true,
      staffLastReadAt: true,
      student: { select: { id: true, firstNames: true, lastNamePaternal: true } },
      parent: { select: { id: true, firstName: true, lastNamePaternal: true } },
      staff: { select: { id: true, firstName: true, lastNamePaternal: true, role: true } },
    },
  });
  const unreadCounts = await Promise.all(
    convs.map((c) => {
      const lastRead = myLastRead(c, user.userId);
      return prisma.message.count({
        where: { conversationId: c.id, senderId: { not: user.userId }, ...(lastRead ? { createdAt: { gt: lastRead } } : {}) },
      });
    }),
  );
  return convs.map((c, i) => {
    const iAmParent = c.parentId === user.userId;
    const other = iAmParent ? c.staff : c.parent;
    return {
      id: c.id,
      student: { id: c.student.id, name: studentShortName(c.student) },
      counterpart: { id: other.id, name: fullName(other), roleLabel: iAmParent ? ROLE_LABEL[(c.staff as { role: string }).role] ?? 'Personal' : 'Apoderado(a)' },
      lastMessageAt: c.lastMessageAt,
      lastMessageText: c.lastMessageText,
      unread: unreadCounts[i],
    };
  });
}

export async function unreadTotal(user: MessagingUser): Promise<number> {
  const list = await listConversations(user);
  return list.reduce((s, c) => s + c.unread, 0);
}

/** Abre (o crea) la conversación entre apoderado y personal sobre un alumno, validando el vínculo. */
export async function openConversation(user: MessagingUser, input: { studentId: string; counterpartId: string }) {
  await assertSchoolSettings(user.schoolId);
  let parentId: string;
  let staffId: string;

  if (user.role === 'PARENT') {
    if (!(await parentOfStudent(user.userId, input.studentId))) throw new AppError('Solo puedes escribir sobre tus hijos.', 403);
    const allowed = await staffContactsForStudent(user.schoolId, input.studentId);
    if (!allowed.some((c) => c.id === input.counterpartId)) throw new AppError('Esta persona no enseña a tu hijo(a).', 403);
    parentId = user.userId;
    staffId = input.counterpartId;
  } else if (isStaff(user)) {
    if (!(await staffCanContactStudent(user, input.studentId))) throw new AppError('Este alumno no está en tus aulas.', 403);
    if (!(await parentOfStudent(input.counterpartId, input.studentId))) throw new AppError('Esa persona no es apoderada del alumno.', 403);
    parentId = input.counterpartId;
    staffId = user.userId;
  } else {
    throw new AppError('No tienes acceso a la mensajería.', 403);
  }

  const conv = await prisma.conversation.upsert({
    where: { studentId_parentId_staffId: { studentId: input.studentId, parentId, staffId } },
    create: { schoolId: user.schoolId, studentId: input.studentId, parentId, staffId },
    update: {},
    select: { id: true },
  });
  return conv;
}

async function loadConversationForUser(user: MessagingUser, conversationId: string) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, schoolId: user.schoolId },
    include: {
      student: { select: { id: true, firstNames: true, lastNamePaternal: true } },
      parent: { select: { id: true, firstName: true, lastNamePaternal: true, email: true, isActive: true } },
      staff: { select: { id: true, firstName: true, lastNamePaternal: true, role: true, email: true, isActive: true } },
    },
  });
  if (!conv || (conv.parentId !== user.userId && conv.staffId !== user.userId)) {
    throw new AppError('Conversación no encontrada.', 404);
  }
  return conv;
}

export async function getMessages(user: MessagingUser, conversationId: string, before?: string) {
  const conv = await loadConversationForUser(user, conversationId);
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { messagingStartTime: true, messagingEndTime: true } });
  const messages = await prisma.message.findMany({
    where: { conversationId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, senderId: true, body: true, createdAt: true },
  });
  const iAmParent = conv.parentId === user.userId;
  const other = iAmParent ? conv.staff : conv.parent;
  const otherLastRead = iAmParent ? conv.staffLastReadAt : conv.parentLastReadAt;
  return {
    conversation: {
      id: conv.id,
      student: { id: conv.student.id, name: studentShortName(conv.student) },
      counterpart: { id: other.id, name: fullName(other), roleLabel: iAmParent ? ROLE_LABEL[conv.staff.role] ?? 'Personal' : 'Apoderado(a)', isActive: other.isActive },
      otherLastReadAt: otherLastRead,
      officeHours: school ? { start: school.messagingStartTime, end: school.messagingEndTime } : null,
    },
    messages: messages.reverse().map((m) => ({ ...m, mine: m.senderId === user.userId })),
    hasMore: messages.length === 50,
  };
}

export async function sendMessage(user: MessagingUser, conversationId: string, rawBody: string) {
  const school = await assertSchoolSettings(user.schoolId);
  const conv = await loadConversationForUser(user, conversationId);
  const body = normalizeMessageBody(rawBody);
  if (!body) throw new AppError('El mensaje está vacío.', 400);
  if (body.length > MAX_MESSAGE_LENGTH) throw new AppError(`El mensaje supera los ${MAX_MESSAGE_LENGTH} caracteres.`, 400);

  const iAmParent = conv.parentId === user.userId;
  const recipient = iAmParent ? conv.staff : conv.parent;
  if (!recipient.isActive) throw new AppError('Esta persona ya no tiene una cuenta activa en el colegio.', 400);

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { schoolId: user.schoolId, conversationId, senderId: user.userId, body }, select: { id: true, senderId: true, body: true, createdAt: true } }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now, lastMessageText: previewOf(body), ...(iAmParent ? { parentLastReadAt: now } : { staffLastReadAt: now }) },
    }),
  ]);

  // Push al destinatario. Mensajes de familias fuera del horario de atención: sin push (el docente lo verá al entrar).
  const lima = getSchoolNow();
  const nowTime = `${String(lima.hour).padStart(2, '0')}:${String(lima.minute).padStart(2, '0')}`;
  const outsideHours = iAmParent && !isWithinOfficeHours(nowTime, limaWeekday(), school.messagingStartTime, school.messagingEndTime);
  if (!outsideHours) {
    const sender = iAmParent ? conv.parent : conv.staff;
    void deliver(
      user.schoolId,
      [{ userId: recipient.id }],
      {
        title: `Mensaje de ${fullName(sender)}`,
        message: `${studentShortName(conv.student)}: ${previewOf(body, 120)}`,
        type: 'MESSAGE',
        link: `/messages?c=${conversationId}`,
        skipInApp: true,
      },
      { schoolName: school.name, nowTime },
    ).catch((e) => console.error('[Mensajería] Error enviando push:', e));
  }

  return { message: { ...message, mine: true }, outsideHours };
}

export async function markRead(user: MessagingUser, conversationId: string) {
  const conv = await loadConversationForUser(user, conversationId);
  const data = conv.parentId === user.userId ? { parentLastReadAt: new Date() } : { staffLastReadAt: new Date() };
  await prisma.conversation.update({ where: { id: conversationId }, data });
  return { ok: true };
}
