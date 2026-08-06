import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import { sendReminderNotification } from '../../utils/notification.util';
import type { PaymentRepository } from './payment.repository';
import type {
  BulkCreateObligationsDto,
  CreateObligationDto,
  CreateTransactionDto,
  ObligationFilterDto,
  TransactionFilterDto,
  UpdateObligationDto,
} from './payment.schema';
import type { PaymentObligation, PaymentTransaction } from '@prisma/client';

export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async getAllObligations(
    schoolId: string,
    filters: ObligationFilterDto = {},
  ): Promise<PaymentObligation[]> {
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
  ): Promise<PaymentObligation> {
    const obligation = await this.paymentRepository.findObligationById(obligationId, schoolId);

    if (!obligation) {
      throw new AppError(`Obligación de pago con id ${obligationId} no encontrada`, 404);
    }

    return obligation;
  }

  async createObligation(
    schoolId: string,
    createObligationDto: CreateObligationDto,
  ): Promise<PaymentObligation> {
    return this.paymentRepository.createObligation(schoolId, createObligationDto);
  }

  async bulkCreateObligations(
    schoolId: string,
    bulkDto: BulkCreateObligationsDto,
  ): Promise<{ count: number }> {
    // Buscar matrículas activas del colegio (filtrando por aula si se provee)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(bulkDto.classroomId ? { classroomId: bulkDto.classroomId } : {}),
      },
      select: { id: true },
    });

    if (enrollments.length === 0) {
      throw new AppError('No se encontraron estudiantes matriculados para generar obligaciones', 400);
    }

    const enrollmentIds = enrollments.map((e) => e.id);
    return this.paymentRepository.bulkCreateObligations(schoolId, enrollmentIds, {
      title: bulkDto.title,
      concept: bulkDto.concept,
      amountDue: bulkDto.amountDue,
      dueDate: bulkDto.dueDate,
    });
  }

  async updateObligation(
    obligationId: string,
    schoolId: string,
    updateDto: UpdateObligationDto,
  ): Promise<PaymentObligation> {
    await this.getObligationById(obligationId, schoolId);
    return this.paymentRepository.updateObligation(obligationId, schoolId, updateDto);
  }

  async cancelObligation(
    obligationId: string,
    schoolId: string,
  ): Promise<PaymentObligation> {
    await this.getObligationById(obligationId, schoolId);
    return this.paymentRepository.updateObligationStatus(obligationId, schoolId, 'CANCELLED');
  }

  async registerTransaction(
    schoolId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<PaymentTransaction> {
    const obligation = await this.getObligationById(
      createTransactionDto.obligationId,
      schoolId,
    );

    if (obligation.status === 'PAID' || obligation.status === 'CANCELLED') {
      throw new AppError(
        `No se puede registrar un pago en una obligación con estado ${obligation.status}`,
        400,
      );
    }

    const transaction = await this.paymentRepository.createTransaction(
      schoolId,
      createTransactionDto,
    );

    // Re-calcular el total pagado para actualizar el estado de la obligación
    const updatedObligation = await this.getObligationById(obligation.id, schoolId);
    const totalPaid = (
      updatedObligation as PaymentObligation & { transactions: PaymentTransaction[] }
    ).transactions.reduce((sum, tx) => sum + tx.amountPaid, 0);

    const newStatus =
      totalPaid >= updatedObligation.amountDue
        ? 'PAID'
        : totalPaid > 0
        ? 'PARTIAL'
        : 'PENDING';

    await this.paymentRepository.updateObligationStatus(
      obligation.id,
      schoolId,
      newStatus,
    );

    return transaction;
  }

  async getAllTransactions(
    schoolId: string,
    filters: TransactionFilterDto = {},
  ): Promise<PaymentTransaction[]> {
    return this.paymentRepository.findAllTransactionsBySchool(schoolId, filters);
  }

  async deleteTransaction(
    transactionId: string,
    schoolId: string,
  ): Promise<PaymentTransaction> {
    const transaction = await this.paymentRepository.findTransactionById(transactionId, schoolId);

    if (!transaction) {
      throw new AppError(`Transacción con id ${transactionId} no encontrada`, 404);
    }

    const deleted = await this.paymentRepository.deleteTransaction(transactionId, schoolId);

    // Re-calcular el estado de la obligación tras revertir el pago
    const obligation = await this.getObligationById(transaction.obligationId, schoolId);
    const totalPaid = (
      obligation as PaymentObligation & { transactions: PaymentTransaction[] }
    ).transactions.reduce((sum, tx) => sum + tx.amountPaid, 0);

    const newStatus =
      totalPaid >= obligation.amountDue
        ? 'PAID'
        : totalPaid > 0
        ? 'PARTIAL'
        : 'PENDING';

    await this.paymentRepository.updateObligationStatus(
      obligation.id,
      schoolId,
      newStatus,
    );

    return deleted;
  }

  async getTransactionReceipt(transactionId: string, schoolId: string) {
    const transaction = await this.paymentRepository.findTransactionById(transactionId, schoolId);

    if (!transaction) {
      throw new AppError(`Transacción con id ${transactionId} no encontrada`, 404);
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
        receiptType: txWithDetails.receiptType || 'BOLETA DE VENTA SIMPLE',
        receiptNumber: txWithDetails.receiptNumber || `REC-${txWithDetails.id.substring(0, 8).toUpperCase()}`,
        paymentDate: txWithDetails.paymentDate,
      },
      student: {
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`,
        documentId: student.documentId,
        classroom: `${classroom.grade}° ${classroom.section}`,
      },
      payment: {
        concept: txWithDetails.obligation.concept,
        title: txWithDetails.obligation.title,
        paymentMethod: txWithDetails.paymentMethod,
        operationNumber: txWithDetails.operationNumber || '—',
        amountPaid: txWithDetails.amountPaid,
        notes: txWithDetails.notes,
      },
    };
  }

  async sendObligationReminder(
    obligationId: string,
    schoolId: string,
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH' = 'BOTH',
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
      student.familyRelations.find((r) => r.isFinancialResponsible) ||
      student.familyRelations[0];

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

    return {
      obligationId,
      studentName,
      recipientName,
      notifications: results,
    };
  }

  async sendBulkOverdueReminders(
    schoolId: string,
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH' = 'BOTH',
  ) {
    const obligations = await this.getAllObligations(schoolId, { status: 'PENDING' });
    const now = new Date();
    const overdueObligations = obligations.filter((o) => new Date(o.dueDate) < now);

    const results = [];
    for (const ob of overdueObligations) {
      try {
        const res = await this.sendObligationReminder(ob.id, schoolId, channel);
        results.push(res);
      } catch (err) {
        console.error(`Error sending reminder for obligation ${ob.id}:`, err);
      }
    }

    return {
      processedCount: overdueObligations.length,
      sentCount: results.length,
      details: results,
    };
  }

  async getFinancialSummary(schoolId: string) {
    return this.paymentRepository.getFinancialSummary(schoolId);
  }
}
