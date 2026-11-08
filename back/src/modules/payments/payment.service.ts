import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import { sendReminderNotification } from '../../utils/notification.util';
import { getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
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
import type { PaymentObligation, PaymentTransaction } from '@prisma/client';

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
      // Transacción atómica: Crear obligación PAGADA y registrar pago en caja con recibo correlativo
      return prisma.$transaction(async (tx) => {
        const obligation = await tx.paymentObligation.create({
          data: {
            schoolId,
            enrollmentId: enrollmentId!,
            title: createObligationDto.title,
            concept: createObligationDto.concept,
            amountDue: createObligationDto.amountDue,
            dueDate: parseSchoolDate(createObligationDto.dueDate),
            status: 'PAID',
          },
        });

        let receiptNumber = createObligationDto.receiptNumber?.trim();
        if (!receiptNumber) {
          const updatedSchool = await tx.school.update({
            where: { id: schoolId },
            data: { receiptCounter: { increment: 1 } },
            select: { receiptCounter: true },
          });
          receiptNumber = `REC-${String(updatedSchool.receiptCounter).padStart(6, '0')}`;
        }

        await tx.paymentTransaction.create({
          data: {
            schoolId,
            obligationId: obligation.id,
            amountPaid: createObligationDto.amountDue,
            paymentMethod: createObligationDto.paymentMethod || 'CASH',
            operationNumber: createObligationDto.operationNumber,
            receiptType: createObligationDto.receiptType || 'RECIBO_INTERNO',
            receiptNumber,
            notes: createObligationDto.notes,
            paymentDate: new Date(),
          },
        });

        const obligationWithIncludes = await tx.paymentObligation.findUnique({
          where: { id: obligation.id },
          include: {
            enrollment: {
              include: {
                student: true,
                classroom: true,
              },
            },
            transactions: true,
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
  ): Promise<{ count: number; skippedCount: number; totalMatriculados: number }> {
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

    return {
      count: createdResult.count,
      skippedCount: existingEnrollmentIds.size + integralScholarshipCount,
      totalMatriculados: enrollments.length,
    };
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
          message: `Estimado(a) ${recipientName}, le recordamos el pago pendiente de S/ ${obWithDetails.amountDue.toFixed(2)} correspondiente a "${obWithDetails.title}" para ${studentName}. Vence el ${new Date(obWithDetails.dueDate).toLocaleDateString('es-PE')}.`,
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
  ): Promise<{ message: string; totalQueued: number }> {
    const { data: obligations } = await this.getAllObligations(schoolId, { status: 'PENDING', page: 1, limit: 1000 });
    const now = new Date();
    const overdueObligations = obligations.filter((o) => new Date(o.dueDate) < now);

    // Encolar y procesar envíos secuenciales en segundo plano (2000ms delay para evitar bloqueo SMTP)
    void (async () => {
      for (const ob of overdueObligations) {
        try {
          await this.sendObligationReminder(ob.id, schoolId, channel);
        } catch (err) {
          console.error(`[OverdueReminderError] Error al enviar recordatorio de obligación ${ob.id}:`, err);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    })();

    return {
      message: 'Envío de recordatorios iniciado en segundo plano',
      totalQueued: overdueObligations.length,
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
