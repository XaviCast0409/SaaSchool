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
// RESUMEN FINANCIERO Y REPORTES (Exclusivo Dirección)
// ──────────────────────────────────────────────────────────────────
paymentRouter.get(
  '/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
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
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.bulkCreateObligations,
);

// Recordatorio masivo por morosidad
paymentRouter.post(
  '/obligations/remind-overdue',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.sendBulkReminders,
);

// Recordatorio individual (WA/Email)
paymentRouter.post(
  '/obligations/:id/remind',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.sendReminder,
);

// Listar todas las obligaciones (con filtros de estado, sección, búsqueda)
paymentRouter.get(
  '/obligations',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.getAllObligations,
);

// Detalle de obligación específica
paymentRouter.get(
  '/obligations/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'PARENT'),
  paymentController.getObligationById,
);

// Crear obligación individual
paymentRouter.post(
  '/obligations',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.createObligation,
);

// Editar obligación (monto, vencimiento, concepto)
paymentRouter.patch(
  '/obligations/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.updateObligation,
);

// Anular/Cancelar obligación
paymentRouter.delete(
  '/obligations/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.cancelObligation,
);

// ──────────────────────────────────────────────────────────────────
// TRANSACCIONES Y REGISTRO MANUAL DE COBROS
// ──────────────────────────────────────────────────────────────────
// Historial de cobros/transacciones (Caja diaria)
paymentRouter.get(
  '/transactions',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.getAllTransactions,
);

// Registrar cobro manual (Efectivo, Transferencia, Tarjeta)
paymentRouter.post(
  '/transactions',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.registerTransaction,
);

// Datos formateados de recibo/boleta de pago
paymentRouter.get(
  '/transactions/:id/receipt',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'PARENT'),
  paymentController.getTransactionReceipt,
);

// Anular pago registrado por error (recalcula la deuda)
paymentRouter.delete(
  '/transactions/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVE'),
  paymentController.deleteTransaction,
);
