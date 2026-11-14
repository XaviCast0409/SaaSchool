import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { formatDateOnly, getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { deliver } from '../automations/delivery';
import { guardiansByStudent, studentShortName } from '../automations/recipients';
import { remainingBalance } from '../payments/payment.rules';
import { activeYear } from '../schedule/schedule.access';
import {
  ADMISSION_STATUSES,
  DOCUMENT_LABEL,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  canMoveAdmission,
  canMoveDocument,
  daysUntil,
  debtHoldApplies,
  gradeLabel,
} from './secretariat.rules';
import { emailExternal, notifySecretariat } from './secretariat.notify';

/**
 * Secretaría digital: embudo de admisión, ratificación de matrícula, trámites documentarios
 * y respuesta al Libro de Reclamaciones. Las familias usan /family/* para ratificar y pedir documentos.
 */
export const secretariatRouter = Router();
secretariatRouter.use(authMiddleware, tenantMiddleware);

const staffOnly = authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE');
const parentOnly = authorizeRoles('PARENT');
const idParam = z.object({ id: z.string().uuid() });
const schoolName = async (schoolId: string) => (await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }))?.name ?? 'Colegio';

/** Deuda vencida del alumno (cuotas pendientes con fecha pasada, descontando pagos vigentes). */
async function overdueDebt(schoolId: string, studentId: string): Promise<number> {
  const obligations = await prisma.paymentObligation.findMany({
    where: { schoolId, enrollment: { studentId }, status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: new Date() } },
    select: { amountDue: true, transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
  });
  return obligations.reduce((sum, o) => sum + remainingBalance(o.amountDue, o.transactions), 0);
}

// ================================================================== Configuración y resumen

secretariatRouter.get('/settings', staffOnly, async (req: Request, res: Response) => {
  const school = await prisma.school.findUnique({
    where: { id: req.user!.schoolId },
    select: {
      id: true,
      admissionsOpen: true,
      admissionsYear: true,
      admissionsMessage: true,
      ratificationOpen: true,
      ratificationYear: true,
      ratificationDeadline: true,
      blockCertificatesOnOverdue: true,
    },
  });
  const schoolId = req.user!.schoolId;
  const [admissions, documents, complaints] = await Promise.all([
    prisma.admissionApplication.count({ where: { schoolId, status: { in: ['NEW', 'INTERVIEW'] } } }),
    prisma.documentRequest.count({ where: { schoolId, status: { in: ['REQUESTED', 'IN_PROCESS'] } } }),
    prisma.complaint.count({ where: { schoolId, status: 'OPEN' } }),
  ]);
  res.status(200).json({ status: 'success', data: { ...school, pending: { admissions, documents, complaints } } });
});

const settingsSchema = z.object({
  admissionsOpen: z.boolean(),
  admissionsYear: z.number().int().min(2020).max(2100).nullable(),
  admissionsMessage: z.string().trim().max(3000).nullable(),
  ratificationOpen: z.boolean(),
  ratificationYear: z.number().int().min(2020).max(2100).nullable(),
  ratificationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

secretariatRouter.put('/settings', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: Request, res: Response) => {
  const dto = settingsSchema.parse(req.body);
  if (dto.admissionsOpen && !dto.admissionsYear) throw new AppError('Indica el año escolar al que postulan.', 400);
  if (dto.ratificationOpen && !dto.ratificationYear) throw new AppError('Indica el año que se ratifica.', 400);
  const updated = await prisma.school.update({
    where: { id: req.user!.schoolId },
    data: {
      admissionsOpen: dto.admissionsOpen,
      admissionsYear: dto.admissionsYear,
      admissionsMessage: dto.admissionsMessage || null,
      ratificationOpen: dto.ratificationOpen,
      ratificationYear: dto.ratificationYear,
      ratificationDeadline: dto.ratificationDeadline ? parseSchoolDate(dto.ratificationDeadline) : null,
    },
    select: { admissionsOpen: true, ratificationOpen: true },
  });
  recordAudit(req, { action: 'SECRETARIAT_SETTINGS_UPDATED', entity: 'School', entityId: req.user!.schoolId, after: dto });
  res.status(200).json({ status: 'success', data: updated });
});

// ================================================================== Admisión

secretariatRouter.get('/admissions', staffOnly, async (req: Request, res: Response) => {
  const f = z.object({ year: z.coerce.number().int().optional(), q: z.string().trim().max(80).optional() }).parse(req.query);
  const where: Prisma.AdmissionApplicationWhereInput = {
    schoolId: req.user!.schoolId,
    ...(f.year ? { targetYear: f.year } : {}),
    ...(f.q
      ? {
          OR: [
            { studentFirstNames: { contains: f.q, mode: 'insensitive' } },
            { studentLastNamePaternal: { contains: f.q, mode: 'insensitive' } },
            { studentDocumentId: { contains: f.q } },
            { guardianLastNames: { contains: f.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, years] = await Promise.all([
    prisma.admissionApplication.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.admissionApplication.findMany({ where: { schoolId: req.user!.schoolId }, distinct: ['targetYear'], select: { targetYear: true } }),
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      rows: rows.map((r) => ({ ...r, ipAddress: undefined, gradeLabel: gradeLabel(r.educationLevel, r.grade) })),
      years: years.map((y) => y.targetYear).sort((a, b) => b - a),
    },
  });
});

const admissionUpdate = z.object({
  status: z.enum(ADMISSION_STATUSES).optional(),
  staffNotes: z.string().trim().max(3000).nullable().optional(),
  interviewAt: z.string().datetime({ offset: true }).nullable().optional(),
});

secretariatRouter.patch('/admissions/:id', staffOnly, async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params);
  const dto = admissionUpdate.parse(req.body);
  const app = await prisma.admissionApplication.findFirst({ where: { id, schoolId: req.user!.schoolId } });
  if (!app) throw new AppError('Postulación no encontrada.', 404);
  if (dto.status && dto.status !== app.status) {
    if (dto.status === 'ENROLLED') throw new AppError('Usa «Registrar como estudiante» para pasar a matriculado.', 400);
    if (!canMoveAdmission(app.status, dto.status)) throw new AppError('Ese cambio de estado no está permitido.', 400);
  }
  const updated = await prisma.admissionApplication.update({
    where: { id },
    data: {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.staffNotes !== undefined ? { staffNotes: dto.staffNotes || null } : {}),
      ...(dto.interviewAt !== undefined ? { interviewAt: dto.interviewAt ? new Date(dto.interviewAt) : null } : {}),
    },
  });
  if (dto.status && dto.status !== app.status) {
    recordAudit(req, { action: 'ADMISSION_STATUS_CHANGED', entity: 'AdmissionApplication', entityId: id, before: { estado: app.status }, after: { estado: dto.status } });
    const name = await schoolName(req.user!.schoolId);
    const student = `${app.studentFirstNames} ${app.studentLastNamePaternal}`;
    if (dto.status === 'ADMITTED') {
      emailExternal(app.guardianEmail, name, 'Resultado de admisión', '¡Felicitaciones!', [
        `Hola, ${app.guardianFirstName}. ${student} fue admitido(a) para ${gradeLabel(app.educationLevel, app.grade)} ${app.targetYear}.`,
        'La Secretaría se comunicará con usted para completar la matrícula.',
      ]);
    } else if (dto.status === 'INTERVIEW' && updated.interviewAt) {
      emailExternal(app.guardianEmail, name, 'Entrevista de admisión', 'Entrevista programada', [
        `Hola, ${app.guardianFirstName}. Le esperamos para la entrevista de admisión de ${student} el ${updated.interviewAt.toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'full', timeStyle: 'short' })}.`,
      ]);
    }
  }
  res.status(200).json({ status: 'success', data: updated });
});

/**
 * Convierte a la persona admitida en estudiante del colegio (ficha básica). Si ya existe un alumno
 * con el mismo documento se vincula en lugar de duplicarlo. La matrícula en aula y el apoderado se
 * completan luego en la ficha del estudiante, como cualquier alumno.
 */
secretariatRouter.post('/admissions/:id/convert', staffOnly, async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params);
  const schoolId = req.user!.schoolId;
  const app = await prisma.admissionApplication.findFirst({ where: { id, schoolId } });
  if (!app) throw new AppError('Postulación no encontrada.', 404);
  if (app.status !== 'ADMITTED') throw new AppError('Solo se registran como estudiantes las postulaciones admitidas.', 400);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.student.findFirst({
      where: { schoolId, documentType: app.studentDocumentType, documentId: app.studentDocumentId },
      select: { id: true },
    });
    const student =
      existing ??
      (await tx.student.create({
        data: {
          schoolId,
          firstNames: app.studentFirstNames,
          lastNamePaternal: app.studentLastNamePaternal,
          lastNameMaternal: app.studentLastNameMaternal,
          documentType: app.studentDocumentType,
          documentId: app.studentDocumentId,
          gender: app.studentGender,
          birthDate: app.studentBirthDate,
        },
        select: { id: true },
      }));
    await tx.admissionApplication.update({ where: { id }, data: { status: 'ENROLLED', studentId: student.id } });
    return { studentId: student.id, linkedExisting: Boolean(existing) };
  });
  recordAudit(req, { action: 'ADMISSION_CONVERTED', entity: 'AdmissionApplication', entityId: id, after: { alumno: `${app.studentFirstNames} ${app.studentLastNamePaternal}` } });
  res.status(201).json({ status: 'success', data: result });
});

// ================================================================== Ratificación (vista del personal)

secretariatRouter.get('/ratifications', staffOnly, async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { ratificationYear: true } });
  const year = await activeYear(schoolId);
  if (!year || !school?.ratificationYear) {
    res.status(200).json({ status: 'success', data: { targetYear: school?.ratificationYear ?? null, rows: [] } });
    return;
  }
  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId, academicYearId: year.id, isActive: true },
    select: {
      studentId: true,
      student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true } },
      classroom: { select: { grade: true, section: true, educationLevel: true } },
    },
    orderBy: [{ classroom: { educationLevel: 'asc' } }, { classroom: { grade: 'asc' } }, { classroom: { section: 'asc' } }, { student: { lastNamePaternal: 'asc' } }],
  });
  const ratifications = await prisma.enrollmentRatification.findMany({
    where: { schoolId, targetYear: school.ratificationYear },
    include: { ratifiedBy: { select: { firstName: true, lastNamePaternal: true } } },
  });
  const byStudent = new Map(ratifications.map((r) => [r.studentId, r]));
  res.status(200).json({
    status: 'success',
    data: {
      targetYear: school.ratificationYear,
      rows: enrollments.map((e) => {
        const r = byStudent.get(e.studentId);
        return {
          studentId: e.studentId,
          studentName: `${e.student.lastNamePaternal} ${e.student.lastNameMaternal ?? ''}, ${e.student.firstNames}`.replace('  ', ' '),
          classroom: `${gradeLabel(e.classroom.educationLevel, e.classroom.grade)} "${e.classroom.section}"`,
          decision: r?.decision ?? null,
          comment: r?.comment ?? null,
          signedBy: r ? `${r.ratifiedBy.firstName} ${r.ratifiedBy.lastNamePaternal}` : null,
          signedAt: r?.updatedAt ?? null,
        };
      }),
    },
  });
});

/** Recordatorio a las familias que aún no ratifican. */
secretariatRouter.post('/ratifications/remind', staffOnly, async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, ratificationOpen: true, ratificationYear: true, ratificationDeadline: true } });
  const year = await activeYear(schoolId);
  if (!school?.ratificationOpen || !school.ratificationYear || !year) throw new AppError('La ratificación en línea no está activa.', 409);
  const [enrollments, done] = await Promise.all([
    prisma.enrollment.findMany({ where: { schoolId, academicYearId: year.id, isActive: true }, select: { studentId: true } }),
    prisma.enrollmentRatification.findMany({ where: { schoolId, targetYear: school.ratificationYear }, select: { studentId: true } }),
  ]);
  const doneSet = new Set(done.map((d) => d.studentId));
  const pending = enrollments.map((e) => e.studentId).filter((id) => !doneSet.has(id));
  const guardians = await guardiansByStudent(pending);
  const recipients = [...guardians.values()].flat();
  const deadline = school.ratificationDeadline ? ` antes del ${formatDateOnly(school.ratificationDeadline)}` : '';
  const result = await deliver(
    schoolId,
    recipients,
    {
      title: `Ratifique la matrícula ${school.ratificationYear}`,
      message: `Confirme si su hijo(a) continuará en el colegio el ${school.ratificationYear}${deadline}. Toma menos de un minuto.`,
      type: 'GENERAL',
      link: '/procedures',
      email: {
        subject: `Ratificación de matrícula ${school.ratificationYear}`,
        heading: 'Ratificación de matrícula',
        bodyHtml: `<p>Confirme desde la plataforma si su hijo(a) continuará en el colegio el ${school.ratificationYear}${deadline}.</p>`,
        text: `Confirme desde la plataforma si su hijo(a) continuará en el colegio el ${school.ratificationYear}${deadline}.`,
        ctaLabel: 'Ratificar ahora',
      },
    },
    { schoolName: school.name },
  );
  res.status(200).json({ status: 'success', data: { families: recipients.length, students: pending.length, ...result } });
});

// ================================================================== Trámites (vista del personal)

secretariatRouter.get('/documents', staffOnly, async (req: Request, res: Response) => {
  const f = z.object({ status: z.enum(DOCUMENT_STATUSES).optional() }).parse(req.query);
  const rows = await prisma.documentRequest.findMany({
    where: { schoolId: req.user!.schoolId, ...(f.status ? { status: f.status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: {
      student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true } },
      requestedBy: { select: { firstName: true, lastNamePaternal: true, cellphone: true } },
    },
  });
  res.status(200).json({
    status: 'success',
    data: rows.map((r) => ({
      id: r.id,
      type: r.type,
      typeLabel: DOCUMENT_LABEL[r.type],
      purpose: r.purpose,
      copies: r.copies,
      status: r.status,
      debtHold: r.debtHold,
      staffNote: r.staffNote,
      fileUrl: r.fileUrl,
      createdAt: r.createdAt,
      readyAt: r.readyAt,
      deliveredAt: r.deliveredAt,
      studentId: r.studentId,
      studentName: `${r.student.lastNamePaternal} ${r.student.lastNameMaternal ?? ''}, ${r.student.firstNames}`.replace('  ', ' '),
      requestedBy: `${r.requestedBy.firstName} ${r.requestedBy.lastNamePaternal}`,
      requestedByPhone: r.requestedBy.cellphone,
    })),
  });
});

const documentUpdate = z.object({
  status: z.enum(DOCUMENT_STATUSES).optional(),
  staffNote: z.string().trim().max(1500).nullable().optional(),
  fileUrl: z.string().regex(/^\/api\/files\/[0-9a-f-]{36}$/).nullable().optional(),
  releaseHold: z.boolean().optional(),
});

secretariatRouter.patch('/documents/:id', staffOnly, async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params);
  const dto = documentUpdate.parse(req.body);
  const doc = await prisma.documentRequest.findFirst({ where: { id, schoolId: req.user!.schoolId }, include: { student: { select: { firstNames: true, lastNamePaternal: true } } } });
  if (!doc) throw new AppError('Trámite no encontrado.', 404);
  const statusChanged = dto.status && dto.status !== doc.status;
  if (statusChanged && !canMoveDocument(doc.status, dto.status!)) throw new AppError('Ese cambio de estado no está permitido.', 400);
  const holdActive = doc.debtHold && !dto.releaseHold;
  if (statusChanged && holdActive && (dto.status === 'READY' || dto.status === 'DELIVERED')) {
    throw new AppError('Este certificado está retenido por deuda vencida. Libera la retención (si la familia ya regularizó) antes de entregarlo.', 409);
  }
  if (statusChanged && dto.status === 'REJECTED' && !(dto.staffNote ?? doc.staffNote)) throw new AppError('Indica el motivo para la familia.', 400);

  const updated = await prisma.documentRequest.update({
    where: { id },
    data: {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.staffNote !== undefined ? { staffNote: dto.staffNote || null } : {}),
      ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl } : {}),
      ...(dto.releaseHold ? { debtHold: false } : {}),
      ...(statusChanged && dto.status === 'READY' ? { readyAt: new Date() } : {}),
      ...(statusChanged && dto.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      handledById: req.user!.userId,
    },
  });
  if (dto.releaseHold && doc.debtHold) recordAudit(req, { action: 'DOCUMENT_HOLD_RELEASED', entity: 'DocumentRequest', entityId: id, after: { tramite: DOCUMENT_LABEL[doc.type] } });

  if (statusChanged && (dto.status === 'READY' || dto.status === 'REJECTED')) {
    recordAudit(req, { action: 'DOCUMENT_REQUEST_UPDATED', entity: 'DocumentRequest', entityId: id, before: { estado: doc.status }, after: { estado: dto.status } });
    const name = await schoolName(req.user!.schoolId);
    const label = `${DOCUMENT_LABEL[doc.type]} de ${studentShortName(doc.student)}`;
    const ready = dto.status === 'READY';
    const message = ready
      ? `${label} está listo${updated.fileUrl ? ' y puede descargarlo desde la plataforma' : ' para recoger en Secretaría'}.`
      : `${label} fue observado: ${updated.staffNote}`;
    await deliver(
      req.user!.schoolId,
      [{ userId: doc.requestedById }],
      {
        title: ready ? 'Su trámite está listo' : 'Su trámite fue observado',
        message,
        type: 'GENERAL',
        link: '/procedures',
        email: { subject: ready ? 'Su trámite está listo' : 'Trámite observado', heading: ready ? 'Trámite listo' : 'Trámite observado', bodyHtml: `<p>${message.replace(/</g, '&lt;')}</p>`, text: message, ctaLabel: 'Ver mis trámites' },
      },
      { schoolName: name },
    ).catch(() => undefined);
  }
  res.status(200).json({ status: 'success', data: updated });
});

// ================================================================== Libro de Reclamaciones (vista del personal)

secretariatRouter.get('/complaints', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), async (req: Request, res: Response) => {
  const rows = await prisma.complaint.findMany({
    where: { schoolId: req.user!.schoolId },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { respondedBy: { select: { firstName: true, lastNamePaternal: true } } },
  });
  const today = getSchoolNow().dateStr;
  res.status(200).json({
    status: 'success',
    data: rows.map((r) => ({
      ...r,
      ipAddress: undefined,
      respondedBy: r.respondedBy ? `${r.respondedBy.firstName} ${r.respondedBy.lastNamePaternal}` : null,
      daysLeft: r.status === 'OPEN' ? daysUntil(today, r.dueDate.toISOString().slice(0, 10)) : null,
    })),
  });
});

secretariatRouter.post('/complaints/:id/respond', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params);
  const { response } = z.object({ response: z.string().trim().min(10).max(5000) }).parse(req.body);
  const c = await prisma.complaint.findFirst({ where: { id, schoolId: req.user!.schoolId } });
  if (!c) throw new AppError('Registro no encontrado.', 404);
  if (c.status === 'ANSWERED') throw new AppError('Este reclamo ya fue respondido.', 409);
  const updated = await prisma.complaint.update({
    where: { id },
    data: { status: 'ANSWERED', response, respondedAt: new Date(), respondedById: req.user!.userId },
  });
  recordAudit(req, { action: 'COMPLAINT_ANSWERED', entity: 'Complaint', entityId: id, after: { codigo: c.code } });
  const name = await schoolName(req.user!.schoolId);
  emailExternal(c.consumerEmail, name, `Respuesta a su ${c.kind === 'RECLAMO' ? 'reclamo' : 'queja'} ${c.code}`, `Respuesta a ${c.code}`, [
    `Estimado(a) ${c.consumerName}:`,
    response,
    `Atentamente, ${name}.`,
  ]);
  res.status(200).json({ status: 'success', data: updated });
});

// ================================================================== Familias: ratificar y pedir documentos

secretariatRouter.get('/family', parentOnly, async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const [school, rels] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { ratificationOpen: true, ratificationYear: true, ratificationDeadline: true, blockCertificatesOnOverdue: true } }),
    prisma.familyRelationship.findMany({
      where: { userId: req.user!.userId, student: { schoolId } },
      select: { studentId: true, student: { select: { firstNames: true, lastNamePaternal: true } } },
    }),
  ]);
  const studentIds = rels.map((r) => r.studentId);
  const [ratifications, requests] = await Promise.all([
    school?.ratificationYear
      ? prisma.enrollmentRatification.findMany({ where: { studentId: { in: studentIds }, targetYear: school.ratificationYear } })
      : Promise.resolve([]),
    prisma.documentRequest.findMany({ where: { schoolId, studentId: { in: studentIds } }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const ratOf = new Map(ratifications.map((r) => [r.studentId, r]));
  res.status(200).json({
    status: 'success',
    data: {
      ratification: {
        open: Boolean(school?.ratificationOpen && school.ratificationYear),
        year: school?.ratificationYear ?? null,
        deadline: school?.ratificationDeadline ?? null,
      },
      children: rels.map((r) => {
        const rat = ratOf.get(r.studentId);
        return {
          studentId: r.studentId,
          name: studentShortName(r.student),
          ratification: rat ? { decision: rat.decision, comment: rat.comment, updatedAt: rat.updatedAt } : null,
        };
      }),
      requests: requests.map((d) => ({
        id: d.id,
        studentId: d.studentId,
        type: d.type,
        typeLabel: DOCUMENT_LABEL[d.type],
        purpose: d.purpose,
        copies: d.copies,
        status: d.status,
        debtHold: d.debtHold,
        staffNote: d.staffNote,
        fileUrl: d.status === 'READY' || d.status === 'DELIVERED' ? d.fileUrl : null,
        createdAt: d.createdAt,
      })),
    },
  });
});

async function assertOwnChild(userId: string, schoolId: string, studentId: string) {
  const rel = await prisma.familyRelationship.findFirst({
    where: { userId, studentId, student: { schoolId } },
    select: { student: { select: { firstNames: true, lastNamePaternal: true } } },
  });
  if (!rel) throw new AppError('Solo puedes hacer trámites de tus hijos.', 403);
  return rel.student;
}

secretariatRouter.post('/family/ratify', parentOnly, async (req: Request, res: Response) => {
  const dto = z
    .object({ studentId: z.string().uuid(), decision: z.enum(['CONFIRMED', 'DECLINED']), comment: z.string().trim().max(1000).optional() })
    .parse(req.body);
  const schoolId = req.user!.schoolId;
  const student = await assertOwnChild(req.user!.userId, schoolId, dto.studentId);
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, ratificationOpen: true, ratificationYear: true, ratificationDeadline: true } });
  if (!school?.ratificationOpen || !school.ratificationYear) throw new AppError('La ratificación de matrícula no está abierta.', 409);
  if (school.ratificationDeadline && getSchoolNow().dateStr > school.ratificationDeadline.toISOString().slice(0, 10)) {
    throw new AppError('El plazo de ratificación en línea venció. Comuníquese con Secretaría.', 409);
  }
  if (dto.decision === 'DECLINED' && !dto.comment) throw new AppError('Cuéntanos brevemente el motivo; nos ayuda a mejorar.', 400);

  const row = await prisma.enrollmentRatification.upsert({
    where: { studentId_targetYear: { studentId: dto.studentId, targetYear: school.ratificationYear } },
    create: { schoolId, studentId: dto.studentId, targetYear: school.ratificationYear, decision: dto.decision, comment: dto.comment || null, ratifiedById: req.user!.userId },
    update: { decision: dto.decision, comment: dto.comment || null, ratifiedById: req.user!.userId },
  });
  recordAudit(req, { action: 'ENROLLMENT_RATIFIED', entity: 'EnrollmentRatification', entityId: row.id, after: { alumno: studentShortName(student), decision: dto.decision, anio: school.ratificationYear } });
  if (dto.decision === 'DECLINED') {
    void notifySecretariat(schoolId, school.name, {
      title: 'Una familia no continuará',
      message: `${studentShortName(student)} no continuará el ${school.ratificationYear}. Motivo: ${dto.comment}`,
      link: '/secretariat?tab=ratification',
    });
  }
  res.status(200).json({ status: 'success', data: row });
});

secretariatRouter.post('/family/documents', parentOnly, async (req: Request, res: Response) => {
  const dto = z
    .object({
      studentId: z.string().uuid(),
      type: z.enum(DOCUMENT_TYPES),
      purpose: z.string().trim().max(300).optional(),
      copies: z.number().int().min(1).max(5).default(1),
    })
    .refine((v) => v.type !== 'OTRO' || v.purpose, { message: 'Describe qué documento necesitas.', path: ['purpose'] })
    .parse(req.body);
  const schoolId = req.user!.schoolId;
  const student = await assertOwnChild(req.user!.userId, schoolId, dto.studentId);
  const open = await prisma.documentRequest.count({ where: { studentId: dto.studentId, type: dto.type, status: { in: ['REQUESTED', 'IN_PROCESS'] } } });
  if (open) throw new AppError('Ya tienes una solicitud en trámite de este documento.', 409);

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, blockCertificatesOnOverdue: true } });
  const debt = school?.blockCertificatesOnOverdue && dto.type === 'CERTIFICADO_ESTUDIOS' ? await overdueDebt(schoolId, dto.studentId) : 0;
  const debtHold = Boolean(school?.blockCertificatesOnOverdue) && debtHoldApplies(dto.type, debt);

  const row = await prisma.documentRequest.create({
    data: { schoolId, studentId: dto.studentId, requestedById: req.user!.userId, type: dto.type, purpose: dto.purpose || null, copies: dto.copies, debtHold },
  });
  void notifySecretariat(schoolId, school?.name ?? 'Colegio', {
    title: 'Nueva solicitud de trámite',
    message: `${DOCUMENT_LABEL[dto.type]} para ${studentShortName(student)}${debtHold ? ' (retenido por deuda vencida)' : ''}.`,
    link: '/secretariat?tab=documents',
  });
  res.status(201).json({ status: 'success', data: { ...row, typeLabel: DOCUMENT_LABEL[row.type] } });
});
