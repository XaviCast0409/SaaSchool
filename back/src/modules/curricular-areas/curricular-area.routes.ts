import { Router } from 'express';
import { CurricularAreaRepository } from './curricular-area.repository';
import { CurricularAreaService } from './curricular-area.service';
import { CurricularAreaController } from './curricular-area.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const curricularAreaRepository = new CurricularAreaRepository();
const curricularAreaService = new CurricularAreaService(curricularAreaRepository);
const curricularAreaController = new CurricularAreaController(curricularAreaService);

export const curricularAreaRouter = Router();

curricularAreaRouter.use(authMiddleware, tenantMiddleware);

curricularAreaRouter.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), curricularAreaController.getAll);
curricularAreaRouter.post('/', authorizeRoles('SCHOOL_ADMIN'), curricularAreaController.create);
curricularAreaRouter.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), curricularAreaController.getById);
curricularAreaRouter.patch('/:id', authorizeRoles('SCHOOL_ADMIN'), curricularAreaController.update);
curricularAreaRouter.post('/competences', authorizeRoles('SCHOOL_ADMIN'), curricularAreaController.createCompetence);
