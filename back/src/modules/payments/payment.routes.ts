import { Router } from 'express';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const paymentRepository = new PaymentRepository();
const paymentService = new PaymentService(paymentRepository);
const paymentController = new PaymentController(paymentService);

export const paymentRouter = Router();

paymentRouter.use(authMiddleware, tenantMiddleware);

// Obligaciones de pago
paymentRouter.get('/obligations', authorizeRoles('SCHOOL_ADMIN'), paymentController.getAllObligations);
paymentRouter.get('/obligations/:id', authorizeRoles('SCHOOL_ADMIN'), paymentController.getObligationById);
paymentRouter.post('/obligations', authorizeRoles('SCHOOL_ADMIN'), paymentController.createObligation);

// Transacciones de pago
paymentRouter.post('/transactions', authorizeRoles('SCHOOL_ADMIN'), paymentController.registerTransaction);
