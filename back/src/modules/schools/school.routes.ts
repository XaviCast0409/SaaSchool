import { Router } from 'express';
import { SchoolRepository } from './school.repository';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { SubscriptionPaymentController } from './subscription-payment.controller';
import { SchoolOverviewService } from './school-overview.service';
import { SchoolOverviewController } from './school-overview.controller';

const schoolRepository = new SchoolRepository();
const schoolService = new SchoolService(schoolRepository);
const schoolController = new SchoolController(schoolService);
const paymentController = new SubscriptionPaymentController(new SubscriptionPaymentService());
const overviewController = new SchoolOverviewController(new SchoolOverviewService());
const SUPER_ADMIN = authorizeRoles('SUPER_ADMIN');

export const schoolRouter: Router = Router();

schoolRouter.use(authMiddleware);

// Rutas administrativas de Colegios
schoolRouter.get('/', authorizeRoles('SUPER_ADMIN'), schoolController.getAll);
schoolRouter.post('/', authorizeRoles('SUPER_ADMIN'), schoolController.create);
schoolRouter.get('/plans', SUPER_ADMIN, schoolController.getPlans);
schoolRouter.get('/billing-summary', SUPER_ADMIN, paymentController.billingSummary);

// Pagos de la suscripción del colegio a la plataforma
schoolRouter.get('/:id/subscription-payments', SUPER_ADMIN, paymentController.list);
schoolRouter.get('/:id/subscription-payments/preview', SUPER_ADMIN, paymentController.preview);
schoolRouter.post('/:id/subscription-payments', SUPER_ADMIN, paymentController.create);
schoolRouter.post('/:id/subscription-payments/:paymentId/void', SUPER_ADMIN, paymentController.void);

// Ficha del colegio (solo plataforma): puesta en marcha y notas internas del equipo
schoolRouter.get('/:id/onboarding', SUPER_ADMIN, overviewController.onboarding);
schoolRouter.get('/:id/notes', SUPER_ADMIN, overviewController.listNotes);
schoolRouter.post('/:id/notes', SUPER_ADMIN, overviewController.createNote);
schoolRouter.patch('/:id/notes/:noteId', SUPER_ADMIN, overviewController.updateNote);
schoolRouter.delete('/:id/notes/:noteId', SUPER_ADMIN, overviewController.deleteNote);
schoolRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'), schoolController.getById);
schoolRouter.patch('/:id/reactivate', authorizeRoles('SUPER_ADMIN'), schoolController.reactivate);
schoolRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), schoolController.update);
schoolRouter.delete('/:id', authorizeRoles('SUPER_ADMIN'), schoolController.deactivate);

// Acción exclusiva de SuperAdmin: Restablecer clave del administrador principal
schoolRouter.post('/:id/reset-admin-password', authorizeRoles('SUPER_ADMIN'), schoolController.resetAdminPassword);
