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

// ──────────────────────────────────────────────────────────────────
// RESUMEN FINANCIERO Y REPORTES
// ──────────────────────────────────────────────────────────────────
paymentRouter.get(
  '/summary',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.getSummary,
);

// ──────────────────────────────────────────────────────────────────
// OBLIGACIONES DE PAGO (Cronograma)
// ──────────────────────────────────────────────────────────────────
// Deudas de los hijos del apoderado (Portal de Padres)
paymentRouter.get(
  '/obligations/my-children',
  authorizeRoles('PARENT'),
  paymentController.getMyChildrenObligations,
);

// Generación masiva de cronograma (por aula o colegio completo)
paymentRouter.post(
  '/obligations/bulk',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.bulkCreateObligations,
);

// Recordatorio masivo por morosidad
paymentRouter.post(
  '/obligations/remind-overdue',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.sendBulkReminders,
);

// Recordatorio individual (WA/Email)
paymentRouter.post(
  '/obligations/:id/remind',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.sendReminder,
);

// Listar todas las obligaciones (con filtros de estado, sección, búsqueda)
paymentRouter.get(
  '/obligations',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.getAllObligations,
);

// Detalle de obligación específica
paymentRouter.get(
  '/obligations/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'PARENT'),
  paymentController.getObligationById,
);

// Crear obligación individual
paymentRouter.post(
  '/obligations',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.createObligation,
);

// Editar obligación (monto, vencimiento, concepto)
paymentRouter.patch(
  '/obligations/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.updateObligation,
);

// Anular/Cancelar obligación
paymentRouter.delete(
  '/obligations/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.cancelObligation,
);

// ──────────────────────────────────────────────────────────────────
// TRANSACCIONES Y REGISTRO MANUAL DE COBROS
// ──────────────────────────────────────────────────────────────────
// Historial de cobros/transacciones (Caja diaria)
paymentRouter.get(
  '/transactions',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.getAllTransactions,
);

// Registrar cobro manual (Efectivo, Transferencia, Tarjeta)
paymentRouter.post(
  '/transactions',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.registerTransaction,
);

// Datos formateados de recibo/boleta de pago
paymentRouter.get(
  '/transactions/:id/receipt',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'PARENT'),
  paymentController.getTransactionReceipt,
);

// Anular pago registrado por error (recalcula la deuda)
paymentRouter.delete(
  '/transactions/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  paymentController.deleteTransaction,
);
