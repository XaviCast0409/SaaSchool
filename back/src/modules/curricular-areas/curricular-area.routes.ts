import { Router } from 'express';
import { CurricularAreaController } from './curricular-area.controller';
import { CurricularAreaService } from './curricular-area.service';
import { CurricularAreaRepository } from './curricular-area.repository';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const repository = new CurricularAreaRepository();
const service = new CurricularAreaService(repository);
const controller = new CurricularAreaController(service);

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'), controller.getAll);
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'), controller.getById);

router.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  controller.create,
);

router.post(
  '/seed-minedu',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  controller.seedMinedu,
);

router.patch(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  controller.update,
);

router.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  controller.delete,
);

router.post(
  '/competences',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  controller.createCompetence,
);

export { router as curricularAreaRouter };
