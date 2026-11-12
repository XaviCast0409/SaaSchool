import { getSchoolNow } from '../../utils/timezone.util';
import { prisma } from '../../config/prisma';
import type { PaymentObligation, PaymentTransaction, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import type {
  CreateObligationDto,
  CreateTransactionDto,
  ObligationFilterDto,
  TransactionFilterDto,
  UpdateObligationDto,
} from './payment.schema';

const OBLIGATION_INCLUDE = {
  enrollment: {
    include: {
      student: {
        select: {
          id: true,
          firstNames: true,
          lastNamePaternal: true,
          lastNameMaternal: true,
          documentId: true,
          studentCode: true,
          familyRelations: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastNamePaternal: true,
                  lastNameMaternal: true,
                  email: true,
                  cellphone: true,
                },
              },
            },
          },
        },
      },
      classroom: {
        select: {
          id: true,
          grade: true,
          section: true,
          educationLevel: true,
        },
      },
    },
  },
  transactions: true,
} as const;

const TRANSACTION_INCLUDE = {
  obligation: {
    include: {
      enrollment: {
        include: {
          student: {
            select: {
              id: true,
              firstNames: true,
              lastNamePaternal: true,
              lastNameMaternal: true,
              documentId: true,
              familyRelations: { select: { userId: true } },
            },
          },
          classroom: {
            select: {
              id: true,
              grade: true,
              section: true,
            },
          },
        },
      },
    },
  },
} as const;

export class PaymentRepository {
  /**
   * Obtiene las obligaciones de pago de un colegio filtrando por estado, aula o búsqueda con paginación.
   */
  async findAllObligationsBySchool(
    schoolId: string,
    filters: ObligationFilterDto = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<PaymentObligation>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentObligationWhereInput = {
      schoolId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.overdue
        ? { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: getSchoolNow().dateObj }, enrollment: { isActive: true } }
        : {}),
      ...(filters.enrollmentId ? { enrollmentId: filters.enrollmentId } : {}),
      ...(filters.classroomId
        ? {
            enrollment: {
              classroomId: filters.classroomId,
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { concept: { contains: filters.search, mode: 'insensitive' } },
              {
                enrollment: {
                  student: {
                    OR: [
                      { firstNames: { contains: filters.search, mode: 'insensitive' } },
                      { lastNamePaternal: { contains: filters.search, mode: 'insensitive' } },
                      { lastNameMaternal: { contains: filters.search, mode: 'insensitive' } },
                      { documentId: { contains: filters.search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.paymentObligation.findMany({
        where,
        skip,
        take: limit,
        include: OBLIGATION_INCLUDE,
        orderBy: { dueDate: 'asc' },
      }),
      prisma.paymentObligation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Obtiene las obligaciones de pago de los hijos vinculados a un apoderado (PARENT).
   */
  async findObligationsByParent(
    userId: string,
    schoolId: string,
  ): Promise<PaymentObligation[]> {
    return prisma.paymentObligation.findMany({
      where: {
        schoolId,
        enrollment: {
          student: {
            familyRelations: {
              some: { userId },
            },
          },
        },
      },
      include: OBLIGATION_INCLUDE,
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Obtiene una obligación de pago por ID asegurando pertenencia al colegio.
   */
  async findObligationById(
    obligationId: string,
    schoolId: string,
  ): Promise<PaymentObligation | null> {
    return prisma.paymentObligation.findFirst({
      where: { id: obligationId, schoolId },
      include: OBLIGATION_INCLUDE,
    });
  }

  /**
   * Crea una obligación de pago individual.
   */
  async createObligation(
    schoolId: string,
    data: CreateObligationDto & { enrollmentId: string },
  ): Promise<PaymentObligation> {
    return prisma.paymentObligation.create({
      data: {
        schoolId,
        enrollmentId: data.enrollmentId,
        title: data.title,
        concept: data.concept,
        amountDue: data.amountDue,
        dueDate: new Date(data.dueDate),
      },
      include: OBLIGATION_INCLUDE,
    });
  }

  /**
   * Crea obligaciones de pago en masa para estudiantes matriculados.
   */
  async bulkCreateObligations(
    schoolId: string,
    items: Array<{ enrollmentId: string; amountDue: number }>,
    data: { title: string; concept: string; dueDate: string },
  ): Promise<{ count: number }> {
    if (items.length === 0) return { count: 0 };
    return prisma.paymentObligation.createMany({
      data: items.map((item) => ({
        schoolId,
        enrollmentId: item.enrollmentId,
        title: data.title,
        concept: data.concept,
        amountDue: item.amountDue,
        dueDate: new Date(data.dueDate),
      })),
    });
  }

  /**
   * Actualiza una obligación de pago (título, concepto, monto o estado).
   */
  async updateObligation(
    obligationId: string,
    schoolId: string,
    data: UpdateObligationDto,
  ): Promise<PaymentObligation> {
    return prisma.paymentObligation.update({
      where: { id: obligationId, schoolId },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.concept ? { concept: data.concept } : {}),
        ...(data.amountDue !== undefined ? { amountDue: data.amountDue } : {}),
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
      include: OBLIGATION_INCLUDE,
    });
  }

  /**
   * Elimina/Cancela una obligación de pago.
   */
  async updateObligationStatus(
    obligationId: string,
    schoolId: string,
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED',
  ): Promise<PaymentObligation> {
    return prisma.paymentObligation.update({
      where: { id: obligationId, schoolId },
      data: { status },
      include: OBLIGATION_INCLUDE,
    });
  }

  /**
   * Registra una transacción/cobro manual.
   */
  async createTransaction(
    schoolId: string,
    data: CreateTransactionDto,
  ): Promise<PaymentTransaction> {
    let receiptNumber = data.receiptNumber?.trim();
    if (!receiptNumber) {
      const updatedSchool = await prisma.school.update({
        where: { id: schoolId },
        data: { receiptCounter: { increment: 1 } },
        select: { receiptCounter: true },
      });
      receiptNumber = `REC-${String(updatedSchool.receiptCounter).padStart(6, '0')}`;
    }

    return prisma.paymentTransaction.create({
      data: {
        schoolId,
        obligationId: data.obligationId,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        operationNumber: data.operationNumber,
        receiptType: 'RECIBO_INTERNO',
        receiptNumber,
        notes: data.notes,
      },
      include: TRANSACTION_INCLUDE,
    });
  }

  /**
   * Obtiene el listado de transacciones/cobros realizados en el colegio.
   */
  async findAllTransactionsBySchool(
    schoolId: string,
    filters: TransactionFilterDto = {},
  ): Promise<PaymentTransaction[]> {
    const where: Prisma.PaymentTransactionWhereInput = {
      schoolId,
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            paymentDate: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(`${filters.endDate}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    return prisma.paymentTransaction.findMany({
      where,
      include: TRANSACTION_INCLUDE,
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Busca una transacción por ID garantizando pertenencia al colegio.
   */
  async findTransactionById(
    transactionId: string,
    schoolId: string,
  ): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findFirst({
      where: { id: transactionId, schoolId },
      include: TRANSACTION_INCLUDE,
    });
  }

  /**
   * Elimina una transacción de pago.
   */
  async deleteTransaction(
    transactionId: string,
    schoolId: string,
  ): Promise<PaymentTransaction> {
    return prisma.paymentTransaction.delete({
      where: { id: transactionId, schoolId },
      include: TRANSACTION_INCLUDE,
    });
  }

  /**
   * Calcula el resumen financiero (recaudado, pendiente, vencido) del colegio.
   */
  async getFinancialSummary(schoolId: string) {
    // Las pensiones anuladas (retiros y traslados) no cuentan como deuda ni como monto esperado
    const obligations = await prisma.paymentObligation.findMany({
      where: { schoolId, status: { not: 'CANCELLED' } },
      include: { transactions: true },
    });

    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let overdueCount = 0;
    const now = new Date();

    for (const ob of obligations) {
      totalExpected += Number(ob.amountDue);
      const obPaid = ob.transactions.reduce((sum, tx) => sum + Number(tx.amountPaid), 0);
      totalCollected += obPaid;

      const remaining = Number(ob.amountDue) - obPaid;
      if (remaining > 0) {
        totalPending += remaining;
        if (new Date(ob.dueDate) < now && ob.status !== 'PAID') {
          overdueCount++;
        }
      }
    }

    return {
      totalObligations: obligations.length,
      totalExpected: Number(totalExpected.toFixed(2)),
      totalCollected: Number(totalCollected.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
      overdueCount,
    };
  }

  /**
   * Arqueo de caja diario: resumen por método y detalle de transacciones.
   */
  async getDailyCashClose(schoolId: string, targetDateStr: string) {
    // Zona horaria oficial del colegio (America/Lima, UTC-5):
    // Cubre desde las 00:00:00.000-05:00 hasta las 23:59:59.999-05:00 del día escolar
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000-05:00`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999-05:00`);

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        schoolId,
        paymentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: TRANSACTION_INCLUDE,
      orderBy: { paymentDate: 'desc' },
    });

    let totalCollected = 0;
    const byMethod: Record<string, number> = {
      CASH: 0,
      BANK_TRANSFER: 0,
      CREDIT_CARD: 0,
    };

    for (const tx of transactions) {
      const amountPaid = Number(tx.amountPaid);
      totalCollected += amountPaid;
      if (tx.paymentMethod in byMethod) {
        byMethod[tx.paymentMethod] += amountPaid;
      }
    }

    return {
      date: targetDateStr,
      totalCollected: Number(totalCollected.toFixed(2)),
      byMethod: {
        CASH: Number((byMethod.CASH || 0).toFixed(2)),
        BANK_TRANSFER: Number((byMethod.BANK_TRANSFER || 0).toFixed(2)),
        CREDIT_CARD: Number((byMethod.CREDIT_CARD || 0).toFixed(2)),
      },
      transactionsCount: transactions.length,
      transactions,
    };
  }
}
