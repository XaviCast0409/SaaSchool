import { AppError } from '../../core/errors/app-error';
import { computeObligationStatus, validateNewPayment } from './payment.rules';
import { formatReceiptNumber, PAYMENT_METHOD_LABEL, voidBlockReason, type PaymentMethodCode } from './finance.rules';
import { normalizeOperationNumber } from '../payment-reports/payment-report.rules';
import { TRANSACTION_INCLUDE } from './payment.repository';
import { ADJUSTMENT_INCLUDE, AdjustmentService } from './adjustment.service';
import { prisma } from '../../config/prisma';
import { sendReminderNotification } from '../../utils/notification.util';
import { formatDateOnly, getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import type { PaymentRepository } from './payment.repository';
import type {
  BulkCreateObligationsDto,
  CreateObligationDto,
  CreateTransactionDto,
  ObligationFilterDto,
  TransactionFilterDto,
  UpdateObligationDto,
} from './payment.schema';
import type { PaymentObligation, PaymentTransaction, Prisma } from '@prisma/client';

/** Quién realiza la operación (para dejar constancia del cajero o tesorero). */
export interface FinanceActor {
  userId: string;
  role: string;
}

interface RecordPaymentInput {
  obligationId: string;
  amountPaid: number;
  paymentMethod: PaymentMethodCode;
  operationNumber?: string | null;
  notes?: string | null;
  collectedById: string;
  /** Si es true, el cobro no entra a ninguna caja (p. ej. voucher validado por tesorería). */
  outsideCashSession?: boolean;
}

export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async getAllObligations(
    schoolId: string,
    filters: ObligationFilterDto = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<PaymentObligation>> {
    return this.paymentRepository.findAllObligationsBySchool(schoolId, filters);
  }

  async getObligationsByParent(
    userId: string,
    schoolId: string,
  ): Promise<PaymentObligation[]> {
    return this.paymentRepository.findObligationsByParent(userId, schoolId);
  }

  async getObligationById(
    obligationId: string,
    schoolId: string,
    userContext?: { userId: string; role: string },
  ): Promise<PaymentObligation> {
    const obligation = await this.paymentRepository.findObligationById(obligationId, schoolId);

    if (!obligation) {
      throw new AppError(`Obligación de pago con id ${obligationId} no encontrada`, 404);
    }

    if (userContext?.role === 'PARENT') {
      const relations = (obligation as unknown as {
        enrollment: { student: { familyRelations: Array<{ userId?: string; user?: { id: string } }> } };
      }).enrollment.student.familyRelations;
      const isGuardian = relations.some((r) => (r.userId ?? r.user?.id) === userContext.userId);
      if (!isGuardian) throw new AppError('No tienes permisos para ver este registro.', 403);
    }

    return obligation;
  }

  async createObligation(
    schoolId: string,
    createObligationDto: CreateObligationDto,
    actor?: FinanceActor,
  ): Promise<PaymentObligation> {
    let enrollmentId = createObligationDto.enrollmentId;

    if (!enrollmentId && createObligationDto.studentId) {
      const activeEnrollment = await prisma.enrollment.findFirst({
        where: {
          schoolId,
          studentId: createObligationDto.studentId,
          isActive: true,
          academicYear: { isActive: true },
          enrollmentState: 'REGISTERED',
        },
        select: { id: true },
      });

      if (!activeEnrollment) {
        const anyEnrollment = await prisma.enrollment.findFirst({
          where: { schoolId, studentId: createObligationDto.studentId, isActive: true },
          select: { id: true },
        });
        if (!anyEnrollment) {
          throw new AppError('No se encontró una matrícula activa para el estudiante.', 404);
        }
        enrollmentId = anyEnrollment.id;
      } else {
        enrollmentId = activeEnrollment.id;
      }
    }

    if (!enrollmentId) {
      throw new AppError('Se requiere el ID de matrícula del estudiante.', 400);
    }

    // Para pensiones, evitar duplicar el mismo concepto/título en el año
    if (createObligationDto.concept === 'PENSION') {
      const existing = await prisma.paymentObligation.findFirst({
        where: {
          schoolId,
          enrollmentId,
          title: { equals: createObligationDto.title, mode: 'insensitive' },
          concept: 'PENSION',
          status: { not: 'CANCELLED' },
        },
      });

      if (existing) {
        throw new AppError(
          `Ya existe una pensión emitida con el título "${createObligationDto.title}" para este estudiante.`,
          400,
        );
      }
    }

    const isPaidNow = Boolean(createObligationDto.paidNow || createObligationDto.paymentMethod);

    if (isPaidNow) {
      if (!actor) throw new AppError('No se pudo identificar al cajero.', 401);
      // Cuota y cobro en una sola transacción: si el cobro falla, la cuota tampoco se crea
      return prisma.$transaction(async (tx) => {
        const obligation = await tx.paymentObligation.create({
          data: {
            schoolId,
            enrollmentId: enrollmentId!,
            title: createObligationDto.title,
            concept: createObligationDto.concept,
            amountDue: createObligationDto.amountDue,
            originalAmount: createObligationDto.amountDue,
            dueDate: parseSchoolDate(createObligationDto.dueDate),
          },
        });
        await this.recordPayment(tx, schoolId, {
          obligationId: obligation.id,
          amountPaid: createObligationDto.amountDue,
          paymentMethod: createObligationDto.paymentMethod || 'CASH',
          operationNumber: createObligationDto.operationNumber,
          notes: createObligationDto.notes,
          collectedById: actor.userId,
        });
        const obligationWithIncludes = await tx.paymentObligation.findUnique({
          where: { id: obligation.id },
          include: {
            enrollment: { include: { student: true, classroom: true } },
            transactions: { where: { status: 'ACTIVE' } },
          },
        });
        return obligationWithIncludes || obligation;
      });
    }

    return this.paymentRepository.createObligation(schoolId, {
      ...createObligationDto,
      enrollmentId,
    });
  }

  async bulkCreateObligations(
    schoolId: string,
    bulkDto: BulkCreateObligationsDto,
    actor?: FinanceActor,
  ): Promise<{ count: number; skippedCount: number; totalMatriculados: number; scholarshipsApplied: number }> {
    // Buscar matrículas activas del colegio (filtrando por aula si se provee)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(bulkDto.classroomId ? { classroomId: bulkDto.classroomId } : {}),
      },
      select: { id: true, customPensionAmount: true },
    });

    if (enrollments.length === 0) {
      throw new AppError('No se encontraron estudiantes matriculados para generar obligaciones', 400);
    }

    const enrollmentIds = enrollments.map((e) => e.id);

    // Buscar obligaciones ya creadas para este mismo título y concepto
    const existingObligations = await prisma.paymentObligation.findMany({
      where: {
        schoolId,
        enrollmentId: { in: enrollmentIds },
        title: { equals: bulkDto.title, mode: 'insensitive' },
        concept: { equals: bulkDto.concept, mode: 'insensitive' },
        status: { not: 'CANCELLED' },
      },
      select: { enrollmentId: true },
    });

    const existingEnrollmentIds = new Set(existingObligations.map((o) => o.enrollmentId));
    const newEnrollments = enrollments.filter((e) => !existingEnrollmentIds.has(e.id));

    if (newEnrollments.length === 0) {
      throw new AppError(
        `Todas las matrículas seleccionadas (${enrollments.length}) ya tienen registrada la pensión "${bulkDto.title}".`,
        400,
      );
    }

    const itemsToCreate: Array<{ enrollmentId: string; amountDue: number }> = [];
    let integralScholarshipCount = 0;

    for (const enrollment of newEnrollments) {
      if (bulkDto.concept === 'PENSION' && enrollment.customPensionAmount !== null) {
        const customAmount = Number(enrollment.customPensionAmount);
        if (customAmount === 0) {
          // Beca Integral: omitir la creación de la deuda
          integralScholarshipCount++;
          continue;
        }
        itemsToCreate.push({
          enrollmentId: enrollment.id,
          amountDue: customAmount,
        });
      } else {
        itemsToCreate.push({
          enrollmentId: enrollment.id,
          amountDue: bulkDto.amountDue,
        });
      }
    }

    const createdResult = await this.paymentRepository.bulkCreateObligations(schoolId, itemsToCreate, {
      title: bulkDto.title,
      concept: bulkDto.concept,
      dueDate: bulkDto.dueDate,
    });

    // Becas vigentes de cada alumno: se aplican como ajuste a las cuotas recién creadas
    const scholarshipsApplied = actor
      ? await new AdjustmentService().applyActiveScholarshipsTo(schoolId, actor, createdResult.ids)
      : 0;

    return {
      count: createdResult.count,
      skippedCount: existingEnrollmentIds.size + integralScholarshipCount,
      totalMatriculados: enrollments.length,
      scholarshipsApplied,
    };
  }

  /**
   * Edita una cuota. El estado no se edita a mano (se calcula de los cobros). El monto solo se
   * cambia si la cuota no tiene cobros vigentes y siempre con motivo.
   */
  async updateObligation(
    obligationId: string,
    schoolId: string,
    updateDto: UpdateObligationDto,
  ): Promise<{ before: PaymentObligation; after: PaymentObligation }> {
    const before = await this.getObligationById(obligationId, schoolId);
    if (before.status === 'CANCELLED') throw new AppError('No se puede editar una cuota anulada.', 400);

    const activePayments = (before as PaymentObligation & { transactions: PaymentTransaction[] }).transactions;
    const amountChanges = updateDto.amountDue !== undefined && Number(updateDto.amountDue) !== Number(before.amountDue);
    if (amountChanges) {
      if (activePayments.length > 0) {
        throw new AppError('Esta cuota ya tiene cobros. Para cambiar el monto, primero anula los cobros.', 400);
      }
      const activeAdjustments = await prisma.obligationAdjustment.count({ where: { obligationId, status: 'ACTIVE' } });
      if (activeAdjustments > 0) {
        throw new AppError('Esta cuota tiene descuentos, becas o moras. Para cambiar el monto base, anula primero esos ajustes.', 400);
      }
      if (!updateDto.reason || updateDto.reason.trim().length < 5) {
        throw new AppError('Escribe el motivo del cambio de monto (mínimo 5 caracteres).', 400);
      }
    }

    const after = await this.paymentRepository.updateObligation(obligationId, schoolId, {
      ...updateDto,
      amountDue: amountChanges ? updateDto.amountDue : undefined,
    });
    return { before, after };
  }

  /** Anula una cuota (no se borra). Solo si no tiene cobros vigentes. */
  async cancelObligation(
    obligationId: string,
    schoolId: string,
    actor: FinanceActor,
    reason: string,
  ): Promise<PaymentObligation> {
    const obligation = await this.getObligationById(obligationId, schoolId);
    if (obligation.status === 'CANCELLED') throw new AppError('Esta cuota ya está anulada.', 400);
    const activePayments = (obligation as PaymentObligation & { transactions: PaymentTransaction[] }).transactions;
    if (activePayments.length > 0) {
      throw new AppError('Esta cuota tiene cobros vigentes. Anula primero los cobros y luego la cuota.', 400);
    }
    return prisma.paymentObligation.update({
      where: { id: obligationId, schoolId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: actor.userId, cancelReason: reason.trim() },
    });
  }

  /** Detalle de una cuota con sus cobros vigentes y, para el personal, también los anulados. */
  async getObligationDetail(
    obligationId: string,
    schoolId: string,
    userContext: { userId: string; role: string },
  ) {
    const obligation = await this.getObligationById(obligationId, schoolId, userContext);
    if (userContext.role === 'PARENT') return obligation;
    const voidedTransactions = await prisma.paymentTransaction.findMany({
      where: { obligationId, schoolId, status: 'VOIDED' },
      include: {
        collectedBy: { select: { id: true, firstName: true, lastNamePaternal: true } },
        voidedBy: { select: { id: true, firstName: true, lastNamePaternal: true } },
      },
      orderBy: { paymentDate: 'asc' },
    });
    const adjustments = await prisma.obligationAdjustment.findMany({
      where: { obligationId, schoolId },
      include: ADJUSTMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return { ...obligation, voidedTransactions, adjustments };
  }

  /**
   * Registra un cobro de forma atómica: bloquea la cuota (evita cobrar dos veces lo mismo si
   * dos personas registran a la vez), valida el saldo, numera el recibo, lo asigna a la caja
   * abierta del cajero y recalcula el estado de la cuota.
   */
  private async recordPayment(tx: Prisma.TransactionClient, schoolId: string, input: RecordPaymentInput) {
    await tx.$queryRaw`SELECT "id" FROM "PaymentObligation" WHERE "id" = ${input.obligationId} AND "schoolId" = ${schoolId} FOR UPDATE`;
    const obligation = await tx.paymentObligation.findFirst({
      where: { id: input.obligationId, schoolId },
      include: { transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
    });
    if (!obligation) throw new AppError('Cuota no encontrada.', 404);
    if (obligation.status === 'PAID') throw new AppError('Esta cuota ya está pagada por completo.', 400);
    if (obligation.status === 'CANCELLED') throw new AppError('Esta cuota está anulada; no se puede cobrar.', 400);

    const amountError = validateNewPayment(obligation.amountDue, obligation.transactions, input.amountPaid);
    if (amountError) throw new AppError(amountError, 400);

    const operationNumber = input.operationNumber?.trim() ? normalizeOperationNumber(input.operationNumber) : null;
    if (operationNumber && input.paymentMethod !== 'CASH') {
      const duplicate = await tx.paymentTransaction.findFirst({
        where: { schoolId, status: 'ACTIVE', operationNumber, paymentMethod: input.paymentMethod },
        select: { receiptNumber: true },
      });
      if (duplicate) {
        throw new AppError(
          `El número de operación ${operationNumber} (${PAYMENT_METHOD_LABEL[input.paymentMethod]}) ya está registrado en el recibo ${duplicate.receiptNumber ?? ''}.`,
          409,
        );
      }
    }

    let cashSessionId: string | null = null;
    if (!input.outsideCashSession) {
      const sessions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "CashSession"
        WHERE "schoolId" = ${schoolId} AND "cashierId" = ${input.collectedById} AND "status" = 'OPEN'
        ORDER BY "openedAt" DESC LIMIT 1 FOR UPDATE`;
      cashSessionId = sessions[0]?.id ?? null;
      if (!cashSessionId && input.paymentMethod === 'CASH') {
        throw new AppError('Para cobrar en efectivo primero abre tu caja del día (botón "Mi caja").', 400);
      }
    }

    const school = await tx.school.update({
      where: { id: schoolId },
      data: { receiptCounter: { increment: 1 } },
      select: { receiptCounter: true },
    });

    const transaction = await tx.paymentTransaction.create({
      data: {
        schoolId,
        obligationId: obligation.id,
        amountPaid: input.amountPaid,
        paymentMethod: input.paymentMethod,
        operationNumber,
        receiptType: 'RECIBO_INTERNO',
        receiptNumber: formatReceiptNumber(school.receiptCounter),
        notes: input.notes?.trim() || null,
        collectedById: input.collectedById,
        cashSessionId,
      },
      include: TRANSACTION_INCLUDE,
    });

    const status = computeObligationStatus(obligation.amountDue, [...obligation.transactions, { amountPaid: input.amountPaid }]);
    await tx.paymentObligation.update({ where: { id: obligation.id }, data: { status } });
    return transaction;
  }

  async registerTransaction(
    schoolId: string,
    createTransactionDto: CreateTransactionDto,
    actor: FinanceActor,
    options: { outsideCashSession?: boolean } = {},
  ): Promise<PaymentTransaction> {
    return prisma.$transaction((tx) =>
      this.recordPayment(tx, schoolId, {
        ...createTransactionDto,
        collectedById: actor.userId,
        outsideCashSession: options.outsideCashSession,
      }),
    );
  }

  async getAllTransactions(
    schoolId: string,
    filters: TransactionFilterDto = {},
  ): Promise<PaymentTransaction[]> {
    return this.paymentRepository.findAllTransactionsBySchool(schoolId, filters);
  }

  /**
   * Anula un cobro: el recibo se conserva (con su número) marcado como ANULADO, con motivo,
   * quién y cuándo. La cuota vuelve a tener saldo. No se permite si la caja ya está cerrada.
   */
  async voidTransaction(
    transactionId: string,
    schoolId: string,
    actor: FinanceActor,
    reason: string,
  ): Promise<{ before: PaymentTransaction; after: PaymentTransaction }> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentTransaction" WHERE "id" = ${transactionId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const before = await tx.paymentTransaction.findFirst({
        where: { id: transactionId, schoolId },
        include: TRANSACTION_INCLUDE,
      });
      if (!before) throw new AppError('Cobro no encontrado.', 404);
      const blocked = voidBlockReason({ status: before.status, cashSessionStatus: before.cashSession?.status });
      if (blocked) throw new AppError(blocked, 400);

      await tx.$queryRaw`SELECT "id" FROM "PaymentObligation" WHERE "id" = ${before.obligationId} FOR UPDATE`;
      const after = await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: 'VOIDED', voidedAt: new Date(), voidedById: actor.userId, voidReason: reason.trim() },
        include: TRANSACTION_INCLUDE,
      });

      const obligation = await tx.paymentObligation.findUniqueOrThrow({
        where: { id: before.obligationId },
        include: { transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
      });
      if (obligation.status !== 'CANCELLED') {
        await tx.paymentObligation.update({
          where: { id: obligation.id },
          data: { status: computeObligationStatus(obligation.amountDue, obligation.transactions) },
        });
      }
      return { before, after };
    });
  }

  async getTransactionReceipt(
    transactionId: string,
    schoolId: string,
    userContext?: { userId: string; role: string },
  ) {
    const transaction = await this.paymentRepository.findTransactionById(transactionId, schoolId);

    if (!transaction) {
      throw new AppError(`Transacción con id ${transactionId} no encontrada`, 404);
    }

    if (userContext?.role === 'PARENT') {
      const relations = (transaction as unknown as {
        obligation: { enrollment: { student: { familyRelations: Array<{ userId?: string; user?: { id: string } }> } } };
      }).obligation.enrollment.student.familyRelations;
      const isGuardian = relations?.some((r) => (r.userId ?? r.user?.id) === userContext.userId);
      if (!isGuardian) throw new AppError('No tienes permisos para ver este registro.', 403);
    }

    const txWithDetails = transaction as unknown as {
      id: string;
      amountPaid: number;
      paymentDate: Date;
      paymentMethod: string;
      operationNumber?: string;
      receiptType?: string;
      receiptNumber?: string;
      notes?: string;
      status: string;
      voidedAt?: Date | null;
      voidReason?: string | null;
      collectedBy?: { firstName: string; lastNamePaternal: string } | null;
      voidedBy?: { firstName: string; lastNamePaternal: string } | null;
      obligation: {
        title: string;
        concept: string;
        amountDue: number;
        enrollment: {
          student: {
            firstNames: string;
            lastNamePaternal: string;
            lastNameMaternal: string;
            documentId: string;
          };
          classroom: {
            grade: number;
            section: string;
          };
        };
      };
    };

    const student = txWithDetails.obligation.enrollment.student;
    const classroom = txWithDetails.obligation.enrollment.classroom;

    return {
      receiptHeader: {
        receiptType: txWithDetails.receiptType || 'RECIBO_INTERNO',
        receiptNumber: txWithDetails.receiptNumber || `REC-${txWithDetails.id.substring(0, 8).toUpperCase()}`,
        paymentDate: txWithDetails.paymentDate,
        status: txWithDetails.status,
        collectedBy: txWithDetails.collectedBy
          ? `${txWithDetails.collectedBy.firstName} ${txWithDetails.collectedBy.lastNamePaternal}`
          : null,
      },
      voided:
        txWithDetails.status === 'VOIDED'
          ? {
              at: txWithDetails.voidedAt ?? null,
              reason: txWithDetails.voidReason ?? null,
              by: txWithDetails.voidedBy
                ? `${txWithDetails.voidedBy.firstName} ${txWithDetails.voidedBy.lastNamePaternal}`
                : null,
            }
          : null,
      student: {
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`,
        documentId: student.documentId,
        classroom: `${classroom.grade}° ${classroom.section}`,
      },
      payment: {
        concept: txWithDetails.obligation.concept,
        title: txWithDetails.obligation.title,
        paymentMethod: txWithDetails.paymentMethod,
        paymentMethodLabel:
          PAYMENT_METHOD_LABEL[txWithDetails.paymentMethod as PaymentMethodCode] ?? txWithDetails.paymentMethod,
        operationNumber: txWithDetails.operationNumber || '—',
        amountPaid: txWithDetails.amountPaid,
        notes: txWithDetails.notes,
      },
      legalNotice: 'Documento interno de control de pagos. No es un comprobante de pago electrónico válido ante SUNAT.',
    };
  }

  async sendObligationReminder(
    obligationId: string,
    schoolId: string,
    channel: 'EMAIL' = 'EMAIL',
  ) {
    const obligation = await this.getObligationById(obligationId, schoolId);

    const obWithDetails = obligation as unknown as {
      id: string;
      title: string;
      amountDue: number;
      dueDate: Date;
      enrollment: {
        student: {
          firstNames: string;
          lastNamePaternal: string;
          familyRelations: Array<{
            isFinancialResponsible: boolean;
            user: {
              id: string;
              firstName: string;
              lastNamePaternal: string;
              email: string;
              cellphone?: string;
            };
          }>;
        };
      };
    };

    const student = obWithDetails.enrollment.student;
    const responsibleRelation =
      student.familyRelations?.find((r) => r.isFinancialResponsible) ||
      student.familyRelations?.[0];

    const parentUser = responsibleRelation?.user;

    const recipientName = parentUser
      ? `${parentUser.firstName} ${parentUser.lastNamePaternal}`
      : 'Apoderado';
    const recipientEmail = parentUser?.email;
    const recipientPhone = parentUser?.cellphone;

    const studentName = `${student.firstNames} ${student.lastNamePaternal}`;

    const results = await sendReminderNotification({
      channel,
      recipientName,
      recipientEmail,
      recipientPhone,
      studentName,
      obligationTitle: obWithDetails.title,
      amountDue: obWithDetails.amountDue,
      dueDate: obWithDetails.dueDate.toISOString(),
    });

    // Crear notificación In-App en la campanita para el padre/apoderado
    if (parentUser?.id) {
      await prisma.notification.create({
        data: {
          schoolId,
          userId: parentUser.id,
          title: 'Recordatorio de Pago Pendiente',
          message: `Estimado(a) ${recipientName}, le recordamos el pago pendiente de S/ ${obWithDetails.amountDue.toFixed(2)} correspondiente a "${obWithDetails.title}" para ${studentName}. Vence el ${formatDateOnly(obWithDetails.dueDate)}.`,
          type: 'PAYMENT',
          link: '/payments',
        },
      }).catch((err: unknown) => console.error('Error creating in-app payment notification:', err));
    }

    return {
      obligationId,
      studentName,
      recipientName,
      notifications: results,
    };
  }

  async sendBulkOverdueReminders(
    schoolId: string,
    channel: 'EMAIL' = 'EMAIL',
  ): Promise<{ message: string; totalQueued: number; sent: number; failed: number; skipped: number }> {
    const { data: obligations } = await this.getAllObligations(schoolId, { status: 'PENDING', page: 1, limit: 1000 });
    const now = new Date();
    const overdueObligations = obligations.filter((o) => new Date(o.dueDate) < now);

    const MAX_SENDS = 300;
    const toSend = overdueObligations.slice(0, MAX_SENDS);
    const skipped = Math.max(0, overdueObligations.length - MAX_SENDS);
    let sent = 0;
    let failed = 0;

    for (const ob of toSend) {
      try {
        const result = await this.sendObligationReminder(ob.id, schoolId, channel);
        if (result?.notifications?.some((r) => r.success)) {
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        console.error(`[OverdueReminderError] Error al enviar recordatorio de obligación ${ob.id}:`, err);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    return {
      message: 'Envío de recordatorios procesado',
      totalQueued: overdueObligations.length,
      sent,
      failed,
      skipped,
    };
  }

  async getFinancialSummary(schoolId: string) {
    return this.paymentRepository.getFinancialSummary(schoolId);
  }

  async getDailyCashClose(schoolId: string, dateStr?: string) {
    const targetDate = dateStr || getSchoolNow().dateStr;
    return this.paymentRepository.getDailyCashClose(schoolId, targetDate);
  }
}
