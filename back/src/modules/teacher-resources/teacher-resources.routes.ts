import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { RESOURCE_KINDS, isSafeLink, normalizeRubric, normalizeTags } from './teacher-resources.rules';

/**
 * Herramientas del docente: banco de recursos compartido entre colegas del colegio y rúbricas
 * reutilizables. Solo para el personal (las familias y los alumnos no acceden).
 */
export const teacherResourcesRouter = Router();
teacherResourcesRouter.use(authMiddleware, tenantMiddleware, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'));

const LEVELS = ['INITIAL', 'PRIMARY', 'SECONDARY'] as const;
const isManager = (req: Request) => ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(req.user!.role);
const authorName = (a: { firstName: string; lastNamePaternal: string }) => `${a.firstName} ${a.lastNamePaternal}`;

// ------------------------------------------------------------------ Banco de recursos

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  kind: z.enum(RESOURCE_KINDS).optional(),
  level: z.enum(LEVELS).optional(),
  grade: z.coerce.number().int().min(0).max(6).optional(),
  area: z.string().trim().max(80).optional(),
  mine: z.enum(['true', 'false']).optional(),
});

teacherResourcesRouter.get('/resources', async (req: Request, res: Response) => {
  const f = listQuery.parse(req.query);
  const where: Prisma.SharedResourceWhereInput = {
    schoolId: req.user!.schoolId,
    ...(f.kind ? { kind: f.kind } : {}),
    ...(f.level ? { educationLevel: f.level } : {}),
    ...(f.grade !== undefined ? { grade: f.grade } : {}),
    ...(f.area ? { areaName: f.area } : {}),
    ...(f.mine === 'true' ? { authorId: req.user!.userId } : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: 'insensitive' } },
            { description: { contains: f.q, mode: 'insensitive' } },
            { tags: { has: f.q.toLowerCase().replace(/^#/, '') } },
          ],
        }
      : {}),
  };
  const [rows, areas] = await Promise.all([
    prisma.sharedResource.findMany({ where, orderBy: { createdAt: 'desc' }, take: 120, include: { author: { select: { id: true, firstName: true, lastNamePaternal: true } } } }),
    prisma.sharedResource.findMany({ where: { schoolId: req.user!.schoolId, areaName: { not: null } }, distinct: ['areaName'], select: { areaName: true } }),
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      rows: rows.map((r) => ({ ...r, author: undefined, authorName: authorName(r.author), canDelete: r.authorId === req.user!.userId || isManager(req) })),
      areas: areas.map((a) => a.areaName!).sort((a, b) => a.localeCompare(b)),
    },
  });
});

const resourceSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().max(1500).nullable().optional(),
    kind: z.enum(RESOURCE_KINDS),
    areaName: z.string().trim().max(80).nullable().optional(),
    educationLevel: z.enum(LEVELS).nullable().optional(),
    grade: z.number().int().min(0).max(6).nullable().optional(),
    fileUrl: z.string().regex(/^\/api\/files\/[0-9a-f-]{36}$/).nullable().optional(),
    fileName: z.string().trim().max(200).nullable().optional(),
    link: z.string().trim().max(500).nullable().optional(),
    tags: z.array(z.string()).max(20).default([]),
  })
  .refine((v) => v.fileUrl || v.link, { message: 'Adjunta un archivo o pega un enlace.', path: ['fileUrl'] })
  .refine((v) => !v.link || isSafeLink(v.link), { message: 'El enlace debe empezar con https://', path: ['link'] });

teacherResourcesRouter.post('/resources', async (req: Request, res: Response) => {
  const dto = resourceSchema.parse(req.body);
  const row = await prisma.sharedResource.create({
    data: {
      schoolId: req.user!.schoolId,
      authorId: req.user!.userId,
      title: dto.title,
      description: dto.description || null,
      kind: dto.kind,
      areaName: dto.areaName || null,
      educationLevel: dto.educationLevel || null,
      grade: dto.grade ?? null,
      fileUrl: dto.fileUrl || null,
      fileName: dto.fileName || null,
      link: dto.link || null,
      tags: normalizeTags(dto.tags),
    },
  });
  recordAudit(req, { action: 'RESOURCE_SHARED', entity: 'SharedResource', entityId: row.id, after: { titulo: row.title } });
  res.status(201).json({ status: 'success', data: row });
});

/** Cuenta una descarga/apertura (para que los colegas vean qué recursos sirven más). */
teacherResourcesRouter.post('/resources/:id/open', async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const updated = await prisma.sharedResource.updateMany({ where: { id, schoolId: req.user!.schoolId }, data: { downloads: { increment: 1 } } });
  if (!updated.count) throw new AppError('Recurso no encontrado.', 404);
  res.status(200).json({ status: 'success', data: { ok: true } });
});

teacherResourcesRouter.delete('/resources/:id', async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const row = await prisma.sharedResource.findFirst({ where: { id, schoolId: req.user!.schoolId } });
  if (!row) throw new AppError('Recurso no encontrado.', 404);
  if (row.authorId !== req.user!.userId && !isManager(req)) throw new AppError('Solo quien lo compartió o la Dirección pueden quitarlo.', 403);
  await prisma.sharedResource.delete({ where: { id } });
  recordAudit(req, { action: 'RESOURCE_DELETED', entity: 'SharedResource', entityId: id, before: { titulo: row.title } });
  res.status(200).json({ status: 'success', data: { deleted: true } });
});

// ------------------------------------------------------------------ Rúbricas

teacherResourcesRouter.get('/rubrics', async (req: Request, res: Response) => {
  const f = z.object({ q: z.string().trim().max(80).optional(), level: z.enum(LEVELS).optional(), mine: z.enum(['true', 'false']).optional() }).parse(req.query);
  const rows = await prisma.rubric.findMany({
    where: {
      schoolId: req.user!.schoolId,
      OR: [{ isShared: true }, { authorId: req.user!.userId }],
      ...(f.level ? { educationLevel: f.level } : {}),
      ...(f.mine === 'true' ? { authorId: req.user!.userId } : {}),
      ...(f.q ? { AND: [{ OR: [{ title: { contains: f.q, mode: 'insensitive' } }, { areaName: { contains: f.q, mode: 'insensitive' } }] }] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 120,
    include: { author: { select: { firstName: true, lastNamePaternal: true } } },
  });
  res.status(200).json({
    status: 'success',
    data: rows.map((r) => ({ ...r, author: undefined, authorName: authorName(r.author), canEdit: r.authorId === req.user!.userId || isManager(req) })),
  });
});

const rubricSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(1000).nullable().optional(),
  areaName: z.string().trim().max(80).nullable().optional(),
  educationLevel: z.enum(LEVELS).nullable().optional(),
  isShared: z.boolean().default(true),
  criteria: z.array(z.object({ name: z.string().max(120), levels: z.record(z.string().max(600)) })).max(20),
});

function toRubricData(dto: z.infer<typeof rubricSchema>) {
  const result = normalizeRubric(dto.criteria);
  if ('error' in result) throw new AppError(result.error, 400);
  return {
    title: dto.title,
    description: dto.description || null,
    areaName: dto.areaName || null,
    educationLevel: dto.educationLevel || null,
    isShared: dto.isShared,
    criteria: result.criteria as unknown as Prisma.InputJsonValue,
  };
}

teacherResourcesRouter.post('/rubrics', async (req: Request, res: Response) => {
  const dto = rubricSchema.parse(req.body);
  const row = await prisma.rubric.create({ data: { ...toRubricData(dto), schoolId: req.user!.schoolId, authorId: req.user!.userId } });
  recordAudit(req, { action: 'RUBRIC_CREATED', entity: 'Rubric', entityId: row.id, after: { titulo: row.title } });
  res.status(201).json({ status: 'success', data: row });
});

async function loadOwnRubric(req: Request, id: string) {
  const row = await prisma.rubric.findFirst({ where: { id, schoolId: req.user!.schoolId } });
  if (!row) throw new AppError('Rúbrica no encontrada.', 404);
  if (row.authorId !== req.user!.userId && !isManager(req)) throw new AppError('Solo quien creó la rúbrica o la Dirección pueden modificarla. Puedes duplicarla para hacer tu versión.', 403);
  return row;
}

teacherResourcesRouter.put('/rubrics/:id', async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const dto = rubricSchema.parse(req.body);
  await loadOwnRubric(req, id);
  const row = await prisma.rubric.update({ where: { id }, data: toRubricData(dto) });
  res.status(200).json({ status: 'success', data: row });
});

/** Duplicar una rúbrica de un colega para adaptarla (queda como propia y privada). */
teacherResourcesRouter.post('/rubrics/:id/duplicate', async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const src = await prisma.rubric.findFirst({ where: { id, schoolId: req.user!.schoolId, OR: [{ isShared: true }, { authorId: req.user!.userId }] } });
  if (!src) throw new AppError('Rúbrica no encontrada.', 404);
  const row = await prisma.rubric.create({
    data: {
      schoolId: req.user!.schoolId,
      authorId: req.user!.userId,
      title: `${src.title} (copia)`.slice(0, 150),
      description: src.description,
      areaName: src.areaName,
      educationLevel: src.educationLevel,
      isShared: false,
      criteria: src.criteria as Prisma.InputJsonValue,
    },
  });
  res.status(201).json({ status: 'success', data: row });
});

teacherResourcesRouter.delete('/rubrics/:id', async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const row = await loadOwnRubric(req, id);
  await prisma.rubric.delete({ where: { id } });
  recordAudit(req, { action: 'RUBRIC_DELETED', entity: 'Rubric', entityId: id, before: { titulo: row.title } });
  res.status(200).json({ status: 'success', data: { deleted: true } });
});
