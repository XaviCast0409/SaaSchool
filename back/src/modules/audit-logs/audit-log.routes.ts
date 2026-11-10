import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

export const auditLogRouter = Router();

const querySchema = z.object({
  entity: z.string().trim().max(60).optional(),
  actorId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

auditLogRouter.use(authMiddleware, tenantMiddleware, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'));

auditLogRouter.get('/', async (req: Request, res: Response) => {
  const q = querySchema.parse(req.query);
  const where = {
    schoolId: req.user!.schoolId,
    ...(q.entity && { entity: q.entity }),
    ...(q.actorId && { actorId: q.actorId }),
    ...((q.from || q.to) && {
      createdAt: {
        ...(q.from && { gte: new Date(`${q.from}T00:00:00-05:00`) }),
        ...(q.to && { lte: new Date(`${q.to}T23:59:59-05:00`) }),
      },
    }),
  };
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.auditLog.count({ where }),
  ]);
  res.status(200).json({
    status: 'success',
    data,
    meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
  });
});
