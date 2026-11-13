import { randomUUID } from 'crypto';
import { getSchoolNow } from '../../utils/timezone.util';
import { prisma } from '../../config/prisma';
import { computeSessionTotals } from './finance.rules';
import type { PaymentObligation, PaymentTransaction, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import type {
  CreateObligationDto,
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
  // Solo cobros vigentes: los anulados no cuentan para el saldo (se consultan aparte)
  transactions: {
    where: { status: 'ACTIVE' },
    orderBy: { paymentDate: 'asc' },
    include: { collectedBy: { select: { id: true, firstName: true, lastNamePaternal: true } } },
  },
} as const;

const PERSON = { select: { id: true, firstName: true, lastNamePaternal: true } } as const;

export const TRANSACTION_INCLUDE = {
  collectedBy: PERSON,
  voidedBy: PERSON,
  cashSession: { select: { id: true, status: true, openedAt: true } },
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
        originalAmount: data.amountDue,
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
  ): Promise<{ count: number; ids: string[] }> {
    if (items.length === 0) return { count: 0, ids: [] };
    // Ids generados aquí para poder aplicar después las becas vigentes a estas cuotas
    const rows = items.map((item) => ({ id: randomUUID(), ...item }));
    const result = await prisma.paymentObligation.createMany({
      data: rows.map((item) => ({
        id: item.id,
        schoolId,
        enrollmentId: item.enrollmentId,
        title: data.title,
        concept: data.concept,
        amountDue: item.amountDue,
        originalAmount: item.amountDue,
        dueDate: new Date(data.dueDate),
      })),
    });
    return { count: result.count, ids: rows.map((r) => r.id) };
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
        // Corregir el monto (sin cobros ni ajustes) corrige también el monto original
        ...(data.amountDue !== undefined ? { amountDue: data.amountDue, originalAmount: data.amountDue } : {}),
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
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
   * Obtiene el listado de transacciones/cobros realizados en el colegio.
   */
  async findAllTransactionsBySchool(
    schoolId: string,
    filters: TransactionFilterDto = {},
  ): Promise<PaymentTransaction[]> {
    const where: Prisma.PaymentTransactionWhereInput = {
      schoolId,
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.collectedById ? { collectedById: filters.collectedById } : {}),
      ...(filters.cashSessionId ? { cashSessionId: filters.cashSessionId } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            paymentDate: {
              // Días del colegio (America/Lima, UTC-5)
              ...(filters.startDate ? { gte: new Date(`${filters.startDate}T00:00:00.000-05:00`) } : {}),
              ...(filters.endDate ? { lte: new Date(`${filters.endDate}T23:59:59.999-05:00`) } : {}),
            },
          }
        : {}),
    };

    return prisma.paymentTransaction.findMany({
      where,
      include: TRANSACTION_INCLUDE,
      orderBy: { paymentDate: 'desc' },
      take: 2000,
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
   * Calcula el resumen financiero (recaudado, pendiente, vencido) del colegio.
   */
  async getFinancialSummary(schoolId: string) {
    // Las pensiones anuladas (retiros y traslados) no cuentan como deuda ni como monto esperado
    const obligations = await prisma.paymentObligation.findMany({
      where: { schoolId, status: { not: 'CANCELLED' } },
      include: { transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
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
   * Resumen del día (todas las cajas): cobros vigentes por medio de pago, anulados, egresos
   * y el estado de cada caja abierta ese día.
   */
  async getDailyCashClose(schoolId: string, targetDateStr: string) {
    // Zona horaria oficial del colegio (America/Lima, UTC-5)
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000-05:00`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999-05:00`);

    const [transactions, expenses, sessions] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where: { schoolId, paymentDate: { gte: startOfDay, lte: endOfDay } },
        include: TRANSACTION_INCLUDE,
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.cashExpense.findMany({
        where: { schoolId, createdAt: { gte: startOfDay, lte: endOfDay } },
        include: { registeredBy: PERSON, voidedBy: PERSON },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cashSession.findMany({
        where: { schoolId, openedAt: { gte: startOfDay, lte: endOfDay } },
        include: { cashier: PERSON, reviewedBy: PERSON },
        orderBy: { openedAt: 'asc' },
      }),
    ]);

    const totals = computeSessionTotals({ openingAmount: 0, payments: transactions, expenses });

    return {
      date: targetDateStr,
      totalCollected: totals.totalCollected,
      byMethod: totals.byMethod,
      countByMethod: totals.countByMethod,
      transactionsCount: totals.paymentsCount,
      voidedCount: totals.voidedCount,
      expensesTotal: totals.expensesTotal,
      expensesCount: totals.expensesCount,
      /** Efectivo neto del día: cobros en efectivo − egresos (sin fondos iniciales). */
      netCash: Number((totals.byMethod.CASH - totals.expensesTotal).toFixed(2)),
      transactions,
      expenses,
      sessions,
    };
  }
}
