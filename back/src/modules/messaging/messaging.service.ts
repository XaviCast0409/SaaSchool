import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import { limaWeekday } from '../attendance/attendance.rules';
import { deliver } from '../automations/delivery';
import { classroomLabel, studentShortName } from '../automations/recipients';
import {
  isArchived,
  isWithinOfficeHours,
  MAX_MESSAGE_LENGTH,
  normalizeMessageBody,
  previewOf,
  STAFF_CHAT_ROLES,
  staffGroupOf,
  staffPair,
} from './messaging.rules';

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
  const contacts = new Map<string, { id: string; name: string; avatarUrl: string | null; roleLabel: string; subjects: string[]; isTutor: boolean }>();

  if (enrollment) {
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId, deletedAt: null, teacher: { isActive: true } },
      select: { area: { select: { name: true } }, teacher: { select: { id: true, firstName: true, lastNamePaternal: true, avatarUrl: true } } },
    });
    for (const a of assignments) {
      const c = contacts.get(a.teacher.id) ?? { id: a.teacher.id, name: fullName(a.teacher), avatarUrl: a.teacher.avatarUrl, roleLabel: 'Docente', subjects: [], isTutor: false };
      if (!c.subjects.includes(a.area.name)) c.subjects.push(a.area.name);
      contacts.set(a.teacher.id, c);
    }
    const tutorId = enrollment.classroom.tutorTeacherId;
    if (tutorId) {
      const tutor = contacts.get(tutorId) ?? (await prisma.user.findFirst({ where: { id: tutorId, schoolId, isActive: true }, select: { id: true, firstName: true, lastNamePaternal: true, avatarUrl: true } }).then((t) => (t ? { id: t.id, name: fullName(t), avatarUrl: t.avatarUrl, roleLabel: 'Docente', subjects: [], isTutor: false } : null)));
      if (tutor) contacts.set(tutorId, { ...tutor, isTutor: true, roleLabel: 'Tutor(a)' });
    }
  }

  const admins = await prisma.user.findMany({
    where: { schoolId, role: 'SCHOOL_ADMIN', isActive: true },
    select: { id: true, firstName: true, lastNamePaternal: true, avatarUrl: true },
  });
  for (const a of admins) if (!contacts.has(a.id)) contacts.set(a.id, { id: a.id, name: fullName(a), avatarUrl: a.avatarUrl, roleLabel: 'Dirección', subjects: [], isTutor: false });

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

type ConvParticipants = {
  parentId: string;
  parentLastReadAt: Date | null;
  staffLastReadAt: Date | null;
  parentArchivedAt: Date | null;
  staffArchivedAt: Date | null;
};

const myLastRead = (conv: ConvParticipants, userId: string) => (conv.parentId === userId ? conv.parentLastReadAt : conv.staffLastReadAt);
const myArchivedAt = (conv: ConvParticipants, userId: string) => (conv.parentId === userId ? conv.parentArchivedAt : conv.staffArchivedAt);

const PERSON_SELECT = { id: true, firstName: true, lastNamePaternal: true, role: true, avatarUrl: true } as const;

type Person = { id: string; firstName: string; lastNamePaternal: string; role: string; avatarUrl: string | null };

/** Alumno con su aula actual, para agrupar las conversaciones con familias. */
const STUDENT_WITH_CLASSROOM = {
  select: {
    id: true,
    firstNames: true,
    lastNamePaternal: true,
    enrollments: {
      where: { isActive: true },
      take: 1,
      select: { classroom: { select: { grade: true, section: true, educationLevel: true } } },
    },
  },
};

function counterpartOf(conv: { parentId: string; parent: Person; staff: Person }, userId: string) {
  const other = conv.parentId === userId ? conv.staff : conv.parent;
  return {
    id: other.id,
    name: fullName(other),
    avatarUrl: other.avatarUrl,
    role: other.role,
    roleLabel: ROLE_LABEL[other.role] ?? 'Personal',
    group: staffGroupOf(other.role),
  };
}

/**
 * Bandeja de conversaciones con su conteo de no leídos.
 * Apoderados: solo conversaciones con el colegio. Personal: con familias y con el equipo.
 */
export async function listConversations(user: MessagingUser) {
  const where =
    user.role === 'PARENT'
      ? { schoolId: user.schoolId, parentId: user.userId, kind: 'FAMILY' as const }
      : { schoolId: user.schoolId, OR: [{ staffId: user.userId }, { parentId: user.userId, kind: 'STAFF' as const }] };
  const convs = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: 300,
    select: {
      id: true,
      kind: true,
      parentId: true,
      staffId: true,
      lastMessageAt: true,
      lastMessageText: true,
      parentLastReadAt: true,
      staffLastReadAt: true,
      parentArchivedAt: true,
      staffArchivedAt: true,
      student: STUDENT_WITH_CLASSROOM,
      parent: { select: PERSON_SELECT },
      staff: { select: PERSON_SELECT },
    },
  });
  // Solo se cuentan mensajes en conversaciones con actividad posterior a mi última lectura
  const unreadCounts = await Promise.all(
    convs.map((c) => {
      const lastRead = myLastRead(c, user.userId);
      if (lastRead && lastRead >= c.lastMessageAt) return Promise.resolve(0);
      return prisma.message.count({
        where: { conversationId: c.id, senderId: { not: user.userId }, ...(lastRead ? { createdAt: { gt: lastRead } } : {}) },
      });
    }),
  );
  return convs.map((c, i) => {
    const classroom = c.student?.enrollments[0]?.classroom;
    return {
      id: c.id,
      kind: c.kind,
      student: c.student
        ? { id: c.student.id, name: studentShortName(c.student), classroom: classroom ? classroomLabel(classroom) : null }
        : null,
      counterpart: counterpartOf(c, user.userId),
      lastMessageAt: c.lastMessageAt,
      lastMessageText: c.lastMessageText,
      unread: unreadCounts[i],
      archived: isArchived(myArchivedAt(c, user.userId), c.lastMessageAt),
    };
  });
}

export async function unreadTotal(user: MessagingUser): Promise<number> {
  const list = await listConversations(user);
  return list.reduce((s, c) => s + c.unread, 0);
}

/** Personal del colegio con quien se puede abrir un chat interno. */
export async function getStaffContacts(user: MessagingUser) {
  await assertSchoolSettings(user.schoolId);
  if (!isStaff(user)) throw new AppError('El chat interno es solo para el personal del colegio.', 403);
  const people = await prisma.user.findMany({
    where: { schoolId: user.schoolId, isActive: true, role: { in: [...STAFF_CHAT_ROLES] }, id: { not: user.userId } },
    select: PERSON_SELECT,
    orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
  });
  const tutored = await prisma.classroom.findMany({
    where: { schoolId: user.schoolId, tutorTeacherId: { in: people.map((p) => p.id) } },
    select: { tutorTeacherId: true, grade: true, section: true, educationLevel: true },
  });
  const tutorOf = new Map(tutored.map((c) => [c.tutorTeacherId, classroomLabel(c)]));
  return people.map((p) => ({
    id: p.id,
    name: fullName(p),
    avatarUrl: p.avatarUrl,
    roleLabel: ROLE_LABEL[p.role] ?? 'Personal',
    group: staffGroupOf(p.role),
    detail: tutorOf.has(p.id) ? `Tutor(a) de ${tutorOf.get(p.id)}` : null,
  }));
}

/**
 * Abre (o crea) una conversación, validando el vínculo:
 * - Con alumno: apoderado ↔ personal que le enseña (o Dirección/Secretaría).
 * - Sin alumno: chat interno entre dos miembros del personal.
 */
export async function openConversation(user: MessagingUser, input: { studentId?: string; counterpartId: string }) {
  await assertSchoolSettings(user.schoolId);

  if (!input.studentId) {
    if (!isStaff(user)) throw new AppError('Elige sobre cuál de tus hijos quieres escribir.', 400);
    if (input.counterpartId === user.userId) throw new AppError('No puedes escribirte a ti mismo.', 400);
    const peer = await prisma.user.findFirst({
      where: { id: input.counterpartId, schoolId: user.schoolId, isActive: true, role: { in: [...STAFF_CHAT_ROLES] } },
      select: { id: true },
    });
    if (!peer) throw new AppError('Esa persona no forma parte del personal del colegio.', 404);
    const pair = staffPair(user.userId, peer.id);
    return prisma.conversation.upsert({
      where: { staffPairKey: pair.key },
      create: { schoolId: user.schoolId, kind: 'STAFF', parentId: pair.first, staffId: pair.second, staffPairKey: pair.key },
      update: {},
      select: { id: true },
    });
  }

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

  return prisma.conversation.upsert({
    where: { studentId_parentId_staffId: { studentId: input.studentId, parentId, staffId } },
    create: { schoolId: user.schoolId, kind: 'FAMILY', studentId: input.studentId, parentId, staffId },
    update: {},
    select: { id: true },
  });
}

async function loadConversationForUser(user: MessagingUser, conversationId: string) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, schoolId: user.schoolId },
    include: {
      student: { select: { id: true, firstNames: true, lastNamePaternal: true } },
      parent: { select: { id: true, firstName: true, lastNamePaternal: true, role: true, email: true, isActive: true, avatarUrl: true } },
      staff: { select: { id: true, firstName: true, lastNamePaternal: true, role: true, email: true, isActive: true, avatarUrl: true } },
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
  const otherLastRead = iAmParent ? conv.staffLastReadAt : conv.parentLastReadAt;
  const other = iAmParent ? conv.staff : conv.parent;
  return {
    conversation: {
      id: conv.id,
      kind: conv.kind,
      student: conv.student ? { id: conv.student.id, name: studentShortName(conv.student) } : null,
      counterpart: { ...counterpartOf(conv, user.userId), isActive: other.isActive },
      otherLastReadAt: otherLastRead,
      archived: isArchived(iAmParent ? conv.parentArchivedAt : conv.staffArchivedAt, conv.lastMessageAt),
      // El horario de atención solo aplica a las conversaciones con familias
      officeHours: conv.kind === 'FAMILY' && school ? { start: school.messagingStartTime, end: school.messagingEndTime } : null,
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
  const outsideHours = user.role === 'PARENT' && !isWithinOfficeHours(nowTime, limaWeekday(), school.messagingStartTime, school.messagingEndTime);
  if (!outsideHours) {
    const sender = iAmParent ? conv.parent : conv.staff;
    void deliver(
      user.schoolId,
      [{ userId: recipient.id }],
      {
        title: `Mensaje de ${fullName(sender)}`,
        message: conv.student ? `${studentShortName(conv.student)}: ${previewOf(body, 120)}` : previewOf(body, 120),
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

/** Archiva o recupera una conversación solo para mí. Un mensaje nuevo la devuelve a la bandeja. */
export async function setArchived(user: MessagingUser, conversationId: string, archived: boolean) {
  const conv = await loadConversationForUser(user, conversationId);
  const value = archived ? new Date() : null;
  const data = conv.parentId === user.userId ? { parentArchivedAt: value } : { staffArchivedAt: value };
  await prisma.conversation.update({ where: { id: conversationId }, data });
  return { archived };
}
