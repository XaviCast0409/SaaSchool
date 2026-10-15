import { Router } from 'express';
import { AnnouncementRepository } from './announcement.repository';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const announcementRepository = new AnnouncementRepository();
const announcementService = new AnnouncementService(announcementRepository);
const announcementController = new AnnouncementController(announcementService);

export const announcementRouter = Router();

// Todas las rutas requieren token y contexto de colegio
announcementRouter.use(authMiddleware, tenantMiddleware);

announcementRouter.get('/', announcementController.getAll);
announcementRouter.get('/:id', announcementController.getById);

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
