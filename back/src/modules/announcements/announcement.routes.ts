import { Router } from 'express';
import { AnnouncementRepository } from './announcement.repository';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { Request, Response } from 'express';
import { z } from 'zod';
import { respondAnnouncementSchema } from './announcement.schema';
import { getResponses, remindPending, respond, type Viewer } from './announcement-responses.service';
import { recordAudit } from '../../utils/audit.util';

const announcementRepository = new AnnouncementRepository();
const announcementService = new AnnouncementService(announcementRepository);
const announcementController = new AnnouncementController(announcementService);

export const announcementRouter = Router();

// Todas las rutas requieren token y contexto de colegio
announcementRouter.use(authMiddleware, tenantMiddleware);

announcementRouter.get('/', announcementController.getAll);
announcementRouter.get('/:id', announcementController.getById);

const viewerOf = (req: Request): Viewer => ({
  userId: req.user!.userId,
  role: req.user!.role,
  schoolId: req.user!.schoolId,
  studentId: req.user!.studentId,
});
const idParam = z.object({ id: z.string().uuid() });

/** Respuesta del apoderado (confirmación, autorización o encuesta), por hijo. */
announcementRouter.post('/:id/respond', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params);
  const body = respondAnnouncementSchema.parse(req.body);
  const saved = await respond(viewerOf(req), id, body, { ip: req.ip, userAgent: req.get('user-agent') });
  recordAudit(req, { action: 'ANNOUNCEMENT_RESPONSE', entity: 'Announcement', entityId: id, after: { respuesta: saved.response } });
  res.status(200).json({ status: 'success', data: saved });
});

/** Detalle de respuestas (Dirección, Secretaría o autor). */
announcementRouter.get(
  '/:id/responses',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  async (req: Request, res: Response) => {
    const { id } = idParam.parse(req.params);
    res.status(200).json({ status: 'success', data: await getResponses(viewerOf(req), id) });
  },
);

/** Recordatorio solo a las familias que aún no responden. */
announcementRouter.post(
  '/:id/remind',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  async (req: Request, res: Response) => {
    const { id } = idParam.parse(req.params);
    res.status(200).json({ status: 'success', data: await remindPending(viewerOf(req), id) });
  },
);

announcementRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  announcementController.create,
);

announcementRouter.put(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  announcementController.update,
);

announcementRouter.delete(
  '/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVE'),
  announcementController.delete,
);
