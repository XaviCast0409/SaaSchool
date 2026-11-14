import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { publicFormRateLimiter } from '../../core/middlewares/rate-limiter.middleware';
import { formatDateOnly, getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { addBusinessDays, complaintCode, gradeLabel, isLikelyBot, isValidGrade } from './secretariat.rules';
import { emailExternal, notifySecretariat } from './secretariat.notify';

/**
 * RUTAS PÚBLICAS INTENCIONALES (sin sesión):
 *  - Formulario de admisión: las familias que aún no son parte del colegio postulan desde la web.
 *  - Libro de Reclamaciones virtual: obligatorio por Indecopi y debe estar al alcance de cualquier persona.
 * Protección: límite de envíos por IP, campo trampa contra bots y solo exponen datos públicos del colegio.
 */
export const secretariatPublicRouter = Router();

const schoolParam = z.object({ schoolId: z.string().uuid() });

async function loadSchool(schoolId: string) {
  const school = await prisma.school.findFirst({
    where: { id: schoolId, isActive: true },
    select: {
      id: true,
      name: true,
      documentId: true,
      address: true,
      district: true,
      province: true,
      department: true,
      phone: true,
      email: true,
      logoUrl: true,
      brandColor: true,
      offeredLevels: true,
      admissionsOpen: true,
      admissionsYear: true,
      admissionsMessage: true,
    },
  });
  if (!school) throw new AppError('Colegio no encontrado.', 404);
  return school;
}

secretariatPublicRouter.get('/:schoolId', async (req: Request, res: Response) => {
  const { schoolId } = schoolParam.parse(req.params);
  const school = await loadSchool(schoolId);
  res.status(200).json({ status: 'success', data: school });
});

// ------------------------------------------------------------------ Admisión

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const admissionSchema = z.object({
  educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']),
  grade: z.number().int(),
  studentFirstNames: trimmed(80),
  studentLastNamePaternal: trimmed(60),
  studentLastNameMaternal: optional(60),
  studentDocumentType: z.enum(['DNI', 'CE', 'CARNET_EXTRANJERIA', 'PASSPORT', 'PNA', 'CODIGO_TEMPORAL']).default('DNI'),
  studentDocumentId: z.string().trim().regex(/^[A-Za-z0-9-]{6,15}$/, 'Documento inválido.'),
  studentBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studentGender: z.enum(['MALE', 'FEMALE']),
  previousSchool: optional(150),
  guardianFirstName: trimmed(80),
  guardianLastNames: trimmed(120),
  guardianDocumentId: optional(15),
  guardianRelation: trimmed(30),
  guardianPhone: z.string().trim().regex(/^[0-9+ ]{6,20}$/, 'Celular inválido.'),
  guardianEmail: z.string().trim().email().max(150).optional().or(z.literal('')).transform((v) => v || null),
  familyNotes: optional(1500),
  consent: z.literal(true, { errorMap: () => ({ message: 'Debe aceptar el tratamiento de datos personales.' }) }),
  website: z.string().optional(), // campo trampa
});

secretariatPublicRouter.post('/:schoolId/admissions', publicFormRateLimiter, async (req: Request, res: Response) => {
  const { schoolId } = schoolParam.parse(req.params);
  const school = await loadSchool(schoolId);
  const dto = admissionSchema.parse(req.body);
  // Al bot se le responde "éxito" para que no reintente con otro truco
  if (isLikelyBot(dto.website)) {
    res.status(201).json({ status: 'success', data: { received: true } });
    return;
  }
  if (!school.admissionsOpen || !school.admissionsYear) throw new AppError('El proceso de admisión no está abierto en este momento.', 409);
  if (!school.offeredLevels.includes(dto.educationLevel)) throw new AppError('El colegio no ofrece ese nivel.', 400);
  if (!isValidGrade(dto.educationLevel, dto.grade)) throw new AppError('Grado inválido para el nivel elegido.', 400);
  const today = getSchoolNow().dateStr;
  if (dto.studentBirthDate >= today || dto.studentBirthDate < '1990-01-01') throw new AppError('Fecha de nacimiento inválida.', 400);

  const duplicate = await prisma.admissionApplication.findFirst({
    where: { schoolId, targetYear: school.admissionsYear, studentDocumentId: dto.studentDocumentId, status: { notIn: ['WITHDRAWN', 'REJECTED'] } },
    select: { id: true },
  });
  if (duplicate) throw new AppError('Ya recibimos una postulación para este estudiante. El colegio se comunicará con usted.', 409);

  const app = await prisma.admissionApplication.create({
    data: {
      schoolId,
      targetYear: school.admissionsYear,
      educationLevel: dto.educationLevel,
      grade: dto.grade,
      studentFirstNames: dto.studentFirstNames,
      studentLastNamePaternal: dto.studentLastNamePaternal,
      studentLastNameMaternal: dto.studentLastNameMaternal,
      studentDocumentType: dto.studentDocumentType,
      studentDocumentId: dto.studentDocumentId.toUpperCase(),
      studentBirthDate: parseSchoolDate(dto.studentBirthDate),
      studentGender: dto.studentGender,
      previousSchool: dto.previousSchool,
      guardianFirstName: dto.guardianFirstName,
      guardianLastNames: dto.guardianLastNames,
      guardianDocumentId: dto.guardianDocumentId,
      guardianRelation: dto.guardianRelation,
      guardianPhone: dto.guardianPhone,
      guardianEmail: dto.guardianEmail,
      familyNotes: dto.familyNotes,
      consentAt: new Date(),
      ipAddress: req.ip ?? null,
    },
  });

  const label = gradeLabel(dto.educationLevel, dto.grade);
  void notifySecretariat(schoolId, school.name, {
    title: 'Nueva postulación de admisión',
    message: `${dto.studentFirstNames} ${dto.studentLastNamePaternal} postula a ${label} ${school.admissionsYear}.`,
    link: '/secretariat?tab=admission',
  });
  emailExternal(dto.guardianEmail, school.name, 'Recibimos su postulación', 'Postulación recibida', [
    `Hola, ${dto.guardianFirstName}. Recibimos la postulación de ${dto.studentFirstNames} ${dto.studentLastNamePaternal} a ${label} para el año ${school.admissionsYear}.`,
    'La Secretaría revisará la información y se comunicará con usted por teléfono o correo para los siguientes pasos.',
  ]);

  res.status(201).json({ status: 'success', data: { received: true, id: app.id } });
});

// ------------------------------------------------------------------ Libro de Reclamaciones

const complaintSchema = z
  .object({
    kind: z.enum(['RECLAMO', 'QUEJA']),
    consumerName: trimmed(150),
    consumerDocType: z.enum(['DNI', 'CE', 'PASAPORTE', 'RUC']),
    consumerDocId: z.string().trim().regex(/^[A-Za-z0-9-]{6,15}$/, 'Documento inválido.'),
    consumerAddress: optional(200),
    consumerPhone: optional(20),
    consumerEmail: z.string().trim().email().max(150),
    isMinor: z.boolean().default(false),
    guardianName: optional(150),
    itemType: z.enum(['PRODUCTO', 'SERVICIO']).default('SERVICIO'),
    itemDescription: trimmed(300),
    amount: optional(30),
    detail: z.string().trim().min(10).max(4000),
    request: z.string().trim().min(5).max(2000),
    website: z.string().optional(),
  })
  .refine((v) => !v.isMinor || v.guardianName, { message: 'Si es menor de edad, indique el nombre del padre, madre o apoderado.', path: ['guardianName'] });

secretariatPublicRouter.post('/:schoolId/complaints', publicFormRateLimiter, async (req: Request, res: Response) => {
  const { schoolId } = schoolParam.parse(req.params);
  const school = await loadSchool(schoolId);
  const dto = complaintSchema.parse(req.body);
  if (isLikelyBot(dto.website)) {
    res.status(201).json({ status: 'success', data: { code: 'RCL-RECIBIDO' } });
    return;
  }
  const now = getSchoolNow();
  const dueDate = addBusinessDays(now.dateStr, 15);

  // El correlativo se reserva con un incremento atómico para que dos reclamos simultáneos no compartan número
  const complaint = await prisma.$transaction(async (tx) => {
    const { complaintCounter } = await tx.school.update({ where: { id: schoolId }, data: { complaintCounter: { increment: 1 } }, select: { complaintCounter: true } });
    return tx.complaint.create({
      data: {
        schoolId,
        code: complaintCode(Number(now.dateStr.slice(0, 4)), complaintCounter),
        kind: dto.kind,
        consumerName: dto.consumerName,
        consumerDocType: dto.consumerDocType,
        consumerDocId: dto.consumerDocId.toUpperCase(),
        consumerAddress: dto.consumerAddress,
        consumerPhone: dto.consumerPhone,
        consumerEmail: dto.consumerEmail,
        isMinor: dto.isMinor,
        guardianName: dto.isMinor ? dto.guardianName : null,
        itemType: dto.itemType,
        itemDescription: dto.itemDescription,
        amount: dto.amount,
        detail: dto.detail,
        request: dto.request,
        dueDate: parseSchoolDate(dueDate),
        ipAddress: req.ip ?? null,
      },
    });
  });

  const kindLabel = dto.kind === 'RECLAMO' ? 'reclamo' : 'queja';
  void notifySecretariat(schoolId, school.name, {
    title: `Libro de Reclamaciones: nuevo ${kindLabel}`,
    message: `${complaint.code} de ${dto.consumerName}. Plazo de respuesta: ${formatDateOnly(complaint.dueDate)}.`,
    link: '/secretariat?tab=complaints',
  });
  // Indecopi exige entregar copia de la hoja de reclamación al consumidor
  emailExternal(dto.consumerEmail, school.name, `Hoja de reclamación ${complaint.code}`, `Su ${kindLabel} fue registrado`, [
    `Código: ${complaint.code}`,
    `Fecha: ${formatDateOnly(parseSchoolDate(now.dateStr))}`,
    `Proveedor: ${school.name} (RUC ${school.documentId})`,
    `Bien contratado (${dto.itemType.toLowerCase()}): ${dto.itemDescription}`,
    `Detalle: ${dto.detail}`,
    `Pedido: ${dto.request}`,
    `El colegio le responderá a este correo a más tardar el ${formatDateOnly(complaint.dueDate)} (15 días hábiles).`,
    'La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el Indecopi.',
  ]);

  res.status(201).json({ status: 'success', data: { code: complaint.code, dueDate } });
});
