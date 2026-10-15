import { Router } from 'express';
import { FamilyRelationshipRepository } from './family-relationship.repository';
import { FamilyRelationshipService } from './family-relationship.service';
import { FamilyRelationshipController } from './family-relationship.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const familyRelationshipRepository = new FamilyRelationshipRepository();
const familyRelationshipService = new FamilyRelationshipService(familyRelationshipRepository);
const familyRelationshipController = new FamilyRelationshipController(familyRelationshipService);

export const familyRelationshipRouter = Router();

familyRelationshipRouter.use(authMiddleware, tenantMiddleware);

// Listado general de relaciones del colegio
familyRelationshipRouter.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  familyRelationshipController.getAll,
);

// Detalle de una relación específica
familyRelationshipRouter.get(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  familyRelationshipController.getById,
);

// Crear vínculo padre ↔ alumno
familyRelationshipRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  familyRelationshipController.create,
);

// Actualizar tipo de relación o apoderado legal
familyRelationshipRouter.patch(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  familyRelationshipController.update,
);

// Eliminar vínculo
familyRelationshipRouter.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  familyRelationshipController.delete,
);

// ──────────────────────────────────────────────────────────────────
// Rutas anidadas — exportamos el controller para montarlo en otros routers
// ──────────────────────────────────────────────────────────────────
export { familyRelationshipController };
