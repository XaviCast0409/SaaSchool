import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { CATEGORY_LABEL, actionsForCategory, presentAuditLogs, type AuditCategory } from './audit-log.presenter';

export const auditLogRouter = Router();

const CATEGORIES = Object.keys(CATEGORY_LABEL) as [AuditCategory, ...AuditCategory[]];

const querySchema = z.object({
  entity: z.string().trim().max(60).optional(),
  category: z.enum(CATEGORIES).optional(),
  onlyCorrections: z.enum(['true', 'false']).optional(),
  actorId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

auditLogRouter.use(authMiddleware, tenantMiddleware, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'));

/** Temas disponibles para filtrar (en español). */
auditLogRouter.get('/categories', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] })) });
});

/** Personas que aparecen en la bitácora (para el filtro "Usuario"). */
auditLogRouter.get('/actors', async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const actorIds = await prisma.auditLog.findMany({ where: { schoolId }, distinct: ['actorId'], select: { actorId: true } });
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds.map((a) => a.actorId) } },
    select: { id: true, firstName: true, lastNamePaternal: true, role: true },
    orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
  });
  res.status(200).json({ status: 'success', data: users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastNamePaternal}`, role: u.role })) });
});

auditLogRouter.get('/', async (req: Request, res: Response) => {
  const q = querySchema.parse(req.query);
  const schoolId = req.user!.schoolId;
  const actionFilters: Prisma.AuditLogWhereInput[] = [];
  if (q.category) actionFilters.push({ action: { in: actionsForCategory(q.category) } });
  if (q.onlyCorrections === 'true') actionFilters.push({ action: { endsWith: '_CORRECTION' } });
  const where: Prisma.AuditLogWhereInput = {
    schoolId,
    ...(q.entity && { entity: q.entity }),
    ...(q.actorId && { actorId: q.actorId }),
    ...(actionFilters.length > 0 && { AND: actionFilters }),
    ...((q.from || q.to) && {
      createdAt: {
        ...(q.from && { gte: new Date(`${q.from}T00:00:00-05:00`) }),
        ...(q.to && { lte: new Date(`${q.to}T23:59:59-05:00`) }),
      },
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.auditLog.count({ where }),
  ]);
  const data = await presentAuditLogs(schoolId, rows);
  res.status(200).json({
    status: 'success',
    data,
    meta: { total, page: q.page, limit: q.limit, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  });
});
