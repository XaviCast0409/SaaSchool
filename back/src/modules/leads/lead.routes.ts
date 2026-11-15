import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { publicFormRateLimiter } from '../../core/middlewares/rate-limiter.middleware';
import { isLikelyBot } from '../secretariat/secretariat.rules';
import { LEAD_STATUSES } from './lead.rules';
import { LeadService, createLeadSchema, updateLeadSchema } from './lead.service';

const leadService = new LeadService();

/** RUTA PÚBLICA INTENCIONAL: formulario de la web de marketing (sin sesión, límite por IP y campo trampa). */
export const publicLeadRouter: Router = Router();

publicLeadRouter.post('/', publicFormRateLimiter, async (request: Request, response: Response) => {
  // A un bot se le responde como si todo hubiera ido bien, sin guardar nada.
  if (isLikelyBot(request.body?.website)) {
    response.status(201).json({ status: 'success', data: { id: null } });
    return;
  }
  const dto = createLeadSchema.parse(request.body);
  const data = await leadService.create(dto);
  response.status(201).json({ status: 'success', data });
});

/** Bandeja de leads: solo administradores de la plataforma. */
export const leadAdminRouter: Router = Router();
leadAdminRouter.use(authMiddleware, authorizeRoles('SUPER_ADMIN'));

const listQuerySchema = z.object({ status: z.enum(LEAD_STATUSES).optional() });

leadAdminRouter.get('/', async (request: Request, response: Response) => {
  const { status } = listQuerySchema.parse(request.query);
  response.status(200).json({ status: 'success', data: await leadService.list(status) });
});

leadAdminRouter.patch('/:id', async (request: Request, response: Response) => {
  const dto = updateLeadSchema.parse(request.body);
  const data = await leadService.update(request.params.id as string, dto);
  response.status(200).json({ status: 'success', data });
});
