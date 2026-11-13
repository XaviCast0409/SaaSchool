import { Router, type NextFunction, type Request, type Response } from 'express';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { requireFinance } from './finance-access';
import { cashRouter } from './cash.routes';
import { adjustmentRouter } from './adjustment.routes';
import { reportRouter } from './report.routes';

const paymentRepository = new PaymentRepository();
const paymentService = new PaymentService(paymentRepository);
const paymentController = new PaymentController(paymentService);

/**
 * Permisos de caja y tesorería (ver finance.rules.ts):
 * - collect (cajero, tesorero, Dirección): cobrar, crear cuotas sueltas, su caja y egresos.
 * - manage (tesorero, Dirección): cuotas masivas, editar/anular cuotas, anular cobros, revisar cierres.
 * - view (contador, tesorero, Dirección): ver todo sin modificar.
 */
const parentOr = (...anyOf: Parameters<typeof requireFinance>) => {
  const finance = requireFinance(...anyOf);
  return (req: Request, res: Response, next: NextFunction) =>
    req.user?.role === 'PARENT' ? next() : finance(req, res, next);
};

export const paymentRouter = Router();

paymentRouter.use(authMiddleware, tenantMiddleware);

// Qué puede hacer la persona en caja y tesorería (para mostrar u ocultar botones)
paymentRouter.get(
  '/access',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  paymentController.getAccess,
);

// Caja diaria y egresos
paymentRouter.use('/cash', cashRouter);

// Descuentos, becas, moras, notas de crédito y configuración de mora
paymentRouter.use(adjustmentRouter);

// Estados de cuenta (alumno, familia, apoderado) y reportes financieros
paymentRouter.use(reportRouter);

// ──────────────────────────────────────────────────────────────────
// RESUMEN FINANCIERO Y REPORTES
// ──────────────────────────────────────────────────────────────────
paymentRouter.get('/summary', requireFinance('view'), paymentController.getSummary);

// Resumen del día de todas las cajas
paymentRouter.get('/daily-cash-close', requireFinance('view'), paymentController.getDailyCashClose);

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
paymentRouter.post('/obligations/bulk', requireFinance('manage'), paymentController.bulkCreateObligations);

// Recordatorio masivo por morosidad
paymentRouter.post('/obligations/remind-overdue', requireFinance('manage'), paymentController.sendBulkReminders);

// Recordatorio individual
paymentRouter.post('/obligations/:id/remind', requireFinance('collect', 'manage'), paymentController.sendReminder);

// Listar todas las obligaciones (con filtros de estado, sección, búsqueda)
paymentRouter.get('/obligations', requireFinance('collect', 'view'), paymentController.getAllObligations);

// Detalle de obligación específica (incluye cobros anulados para el personal)
paymentRouter.get('/obligations/:id', parentOr('collect', 'view'), paymentController.getObligationById);

// Crear obligación individual (opcionalmente cobrada al momento)
paymentRouter.post('/obligations', requireFinance('collect'), paymentController.createObligation);

// Editar obligación (título, concepto, vencimiento; monto solo sin cobros y con motivo)
paymentRouter.patch('/obligations/:id', requireFinance('manage'), paymentController.updateObligation);

// Anular obligación con motivo (no se borra)
paymentRouter.post('/obligations/:id/cancel', requireFinance('manage'), paymentController.cancelObligation);

// ──────────────────────────────────────────────────────────────────
// COBROS
// ──────────────────────────────────────────────────────────────────
paymentRouter.get('/transactions', requireFinance('collect', 'view'), paymentController.getAllTransactions);

// Registrar cobro (queda a nombre de quien cobra y en su caja abierta)
paymentRouter.post('/transactions', requireFinance('collect'), paymentController.registerTransaction);

// Datos del recibo (también de recibos anulados)
paymentRouter.get('/transactions/:id/receipt', parentOr('collect', 'view'), paymentController.getTransactionReceipt);

// Anular cobro con motivo: el recibo se conserva como ANULADO y la cuota recupera su saldo
paymentRouter.post('/transactions/:id/void', requireFinance('manage'), paymentController.voidTransaction);
