import { Router } from 'express';
import { IncidentRepository } from './incident.repository';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const incidentRepository = new IncidentRepository();
const incidentService = new IncidentService(incidentRepository);
const incidentController = new IncidentController(incidentService);

export const incidentRouter: Router = Router();

incidentRouter.use(authMiddleware, tenantMiddleware);

incidentRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  incidentController.create,
);

incidentRouter.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  incidentController.getAll,
);

incidentRouter.get(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'),
  incidentController.getById,
);

incidentRouter.patch(
  '/:id/acknowledge',
  authorizeRoles('PARENT'),
  incidentController.acknowledge,
);

