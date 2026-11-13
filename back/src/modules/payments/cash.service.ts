import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { deliver } from '../automations/delivery';
import { TRANSACTION_INCLUDE } from './payment.repository';
import {
  can,
  cashDifference,
  computeSessionTotals,
  differenceLabel,
  formatExpenseNumber,
  validateExpenseAmount,
  voidBlockReason,
  type FinanceLevel,
} from './finance.rules';
import type { CashSessionFilterDto, CloseCashSessionDto, CreateCashExpenseDto, OpenCashSessionDto } from './payment.schema';

export interface CashActor {
  userId: string;
  role: string;
  level: FinanceLevel;
}

const PERSON = { select: { id: true, firstName: true, lastNamePaternal: true } } as const;

const MOVEMENTS_SELECT = {
  transactions: { select: { amountPaid: true, paymentMethod: true, status: true } },
  expenses: { select: { amount: true, status: true } },
} as const;

const EXPENSE_INCLUDE = { registeredBy: PERSON, voidedBy: PERSON } as const;

/** Caja: apertura con fondo, cobros, egresos de caja chica, cierre con arqueo y revisión. */
export class CashService {
  /** Lee la caja con sus movimientos y calcula los totales en vivo. */
  private async loadSession(schoolId: string, sessionId: string) {
    const session = await prisma.cashSession.findFirst({
      where: { id: sessionId, schoolId },
      include: {
        cashier: PERSON,
        reviewedBy: PERSON,
        transactions: { include: TRANSACTION_INCLUDE, orderBy: { paymentDate: 'desc' } },
        expenses: { include: EXPENSE_INCLUDE, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!session) throw new AppError('Caja no encontrada.', 404);
    const totals = computeSessionTotals({
      openingAmount: session.openingAmount,
      payments: session.transactions,
      expenses: session.expenses,
    });
    return { ...session, totals };
  }

  private assertCanSee(actor: CashActor, cashierId: string) {
    if (cashierId !== actor.userId && !can(actor.level, 'view')) {
      throw new AppError('Solo puedes ver tu propia caja.', 403);
    }
  }

  async getCurrent(schoolId: string, actor: CashActor) {
    const open = await prisma.cashSession.findFirst({
      where: { schoolId, cashierId: actor.userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    });
    const last = open
      ? null
      : await prisma.cashSession.findFirst({
          where: { schoolId, cashierId: actor.userId },
          orderBy: { openedAt: 'desc' },
          select: { id: true, status: true, closedAt: true, difference: true, countedCash: true, openedAt: true },
        });
    return { session: open ? await this.loadSession(schoolId, open.id) : null, lastSession: last };
  }

  async open(schoolId: string, actor: CashActor, dto: OpenCashSessionDto) {
    return prisma.$transaction(async (tx) => {
      // Bloquea a la persona para que no abra dos cajas a la vez (doble clic, dos pestañas)
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${actor.userId} FOR UPDATE`;
      const existing = await tx.cashSession.findFirst({
        where: { schoolId, cashierId: actor.userId, status: 'OPEN' },
        select: { id: true },
      });
      if (existing) throw new AppError('Ya tienes una caja abierta. Ciérrala antes de abrir otra.', 409);
      return tx.cashSession.create({
        data: {
          schoolId,
          cashierId: actor.userId,
          openingAmount: dto.openingAmount,
          openingNote: dto.openingNote?.trim() || null,
        },
      });
    });
  }

  async close(schoolId: string, sessionId: string, actor: CashActor, dto: CloseCashSessionDto) {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CashSession" WHERE "id" = ${sessionId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const session = await tx.cashSession.findFirst({
        where: { id: sessionId, schoolId },
        include: { ...MOVEMENTS_SELECT, cashier: PERSON },
      });
      if (!session) throw new AppError('Caja no encontrada.', 404);
      if (session.cashierId !== actor.userId && !can(actor.level, 'manage')) {
        throw new AppError('Solo puedes cerrar tu propia caja.', 403);
      }
      if (session.status !== 'OPEN') throw new AppError('Esta caja ya está cerrada.', 400);

      const totals = computeSessionTotals({
        openingAmount: session.openingAmount,
        payments: session.transactions,
        expenses: session.expenses,
      });
      const difference = cashDifference(totals.expectedCash, dto.countedCash);
      const closed = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          expectedCash: totals.expectedCash,
          countedCash: dto.countedCash,
          difference,
          totalsByMethod: totals as unknown as Prisma.InputJsonValue,
          closingNote: dto.closingNote?.trim() || null,
        },
      });
      return { closed, totals, difference, cashierName: `${session.cashier.firstName} ${session.cashier.lastNamePaternal}` };
    });

    if (result.difference !== 0) void this.notifyDifference(schoolId, result).catch(() => undefined);
    return result.closed;
  }

  /** Avisa a Dirección y a tesorería cuando un cierre no cuadra. */
  private async notifyDifference(
    schoolId: string,
    data: { closed: { id: string }; difference: number; cashierName: string },
  ) {
    const recipients = await prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [{ role: 'SCHOOL_ADMIN' }, { role: 'ADMINISTRATIVE', financeRole: 'TREASURER' }],
      },
      select: { id: true },
    });
    if (recipients.length === 0) return;
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
    await deliver(
      schoolId,
      recipients.map((r) => ({ userId: r.id })),
      {
        title: 'Cierre de caja con diferencia',
        message: `La caja de ${data.cashierName} se cerró con ${differenceLabel(data.difference).toLowerCase()}. Revísala en Caja → Cierres.`,
        type: 'PAYMENT',
        link: '/payments/cash',
      },
      { schoolName: school?.name ?? 'SaaSchool' },
    );
  }

  async review(schoolId: string, sessionId: string, actor: CashActor, reviewNote?: string | null) {
    const session = await prisma.cashSession.findFirst({ where: { id: sessionId, schoolId } });
    if (!session) throw new AppError('Caja no encontrada.', 404);
    if (session.status !== 'CLOSED') throw new AppError('Solo se pueden revisar cajas cerradas.', 400);
    if (session.cashierId === actor.userId && actor.level !== 'ADMIN') {
      throw new AppError('Otra persona (tesorería o Dirección) debe revisar tu propio cierre.', 403);
    }
    if (session.difference && Number(session.difference) !== 0 && !reviewNote?.trim()) {
      throw new AppError('El cierre tiene diferencia: escribe una observación al revisarlo.', 400);
    }
    const updated = await prisma.cashSession.updateMany({
      where: { id: sessionId, status: 'CLOSED' },
      data: { status: 'REVIEWED', reviewedAt: new Date(), reviewedById: actor.userId, reviewNote: reviewNote?.trim() || null },
    });
    if (updated.count === 0) throw new AppError('Esta caja ya fue revisada.', 409);
    return prisma.cashSession.findUniqueOrThrow({ where: { id: sessionId } });
  }

  /** Reabre una caja cerrada (no revisada) para corregir algo. Queda constancia del cierre anterior. */
  async reopen(schoolId: string, sessionId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CashSession" WHERE "id" = ${sessionId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const before = await tx.cashSession.findFirst({ where: { id: sessionId, schoolId } });
      if (!before) throw new AppError('Caja no encontrada.', 404);
      if (before.status === 'REVIEWED') throw new AppError('Una caja ya revisada no se puede reabrir.', 400);
      if (before.status !== 'CLOSED') throw new AppError('Esta caja ya está abierta.', 400);
      const otherOpen = await tx.cashSession.findFirst({
        where: { schoolId, cashierId: before.cashierId, status: 'OPEN' },
        select: { id: true },
      });
      if (otherOpen) throw new AppError('Este cajero ya tiene otra caja abierta; debe cerrarla primero.', 409);
      const after = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          status: 'OPEN',
          closedAt: null,
          expectedCash: null,
          countedCash: null,
          difference: null,
          totalsByMethod: Prisma.DbNull,
          closingNote: null,
          reopenCount: { increment: 1 },
        },
      });
      return { before, after };
    });
  }

  async list(schoolId: string, actor: CashActor, filters: CashSessionFilterDto) {
    const where: Prisma.CashSessionWhereInput = {
      schoolId,
      ...(can(actor.level, 'view') ? (filters.cashierId ? { cashierId: filters.cashierId } : {}) : { cashierId: actor.userId }),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            openedAt: {
              ...(filters.startDate ? { gte: new Date(`${filters.startDate}T00:00:00.000-05:00`) } : {}),
              ...(filters.endDate ? { lte: new Date(`${filters.endDate}T23:59:59.999-05:00`) } : {}),
            },
          }
        : {}),
    };
    const sessions = await prisma.cashSession.findMany({
      where,
      include: { cashier: PERSON, reviewedBy: PERSON, ...MOVEMENTS_SELECT },
      orderBy: { openedAt: 'desc' },
      take: 200,
    });
    return sessions.map(({ transactions, expenses, ...s }) => ({
      ...s,
      totals: computeSessionTotals({ openingAmount: s.openingAmount, payments: transactions, expenses }),
    }));
  }

  async detail(schoolId: string, sessionId: string, actor: CashActor) {
    const session = await this.loadSession(schoolId, sessionId);
    this.assertCanSee(actor, session.cashierId);
    return session;
  }

  /** Personas que han tenido caja (para filtrar reportes por cajero). */
  async cashiers(schoolId: string) {
    const rows = await prisma.cashSession.findMany({
      where: { schoolId },
      distinct: ['cashierId'],
      select: { cashier: PERSON },
    });
    return rows.map((r) => r.cashier);
  }

  async createExpense(schoolId: string, actor: CashActor, dto: CreateCashExpenseDto) {
    return prisma.$transaction(async (tx) => {
      const sessions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "CashSession"
        WHERE "schoolId" = ${schoolId} AND "cashierId" = ${actor.userId} AND "status" = 'OPEN'
        ORDER BY "openedAt" DESC LIMIT 1 FOR UPDATE`;
      const sessionId = sessions[0]?.id;
      if (!sessionId) throw new AppError('Para registrar un egreso primero abre tu caja del día.', 400);

      const session = await tx.cashSession.findUniqueOrThrow({ where: { id: sessionId }, include: MOVEMENTS_SELECT });
      const totals = computeSessionTotals({
        openingAmount: session.openingAmount,
        payments: session.transactions,
        expenses: session.expenses,
      });
      const amountError = validateExpenseAmount(totals.expectedCash, dto.amount);
      if (amountError) throw new AppError(amountError, 400);

      const school = await tx.school.update({
        where: { id: schoolId },
        data: { expenseCounter: { increment: 1 } },
        select: { expenseCounter: true },
      });
      return tx.cashExpense.create({
        data: {
          schoolId,
          cashSessionId: sessionId,
          expenseNumber: formatExpenseNumber(school.expenseCounter),
          category: dto.category,
          description: dto.description,
          amount: dto.amount,
          beneficiary: dto.beneficiary?.trim() || null,
          documentType: dto.documentType ?? null,
          documentNumber: dto.documentNumber?.trim() || null,
          attachmentUrl: dto.attachmentUrl || null,
          registeredById: actor.userId,
        },
        include: EXPENSE_INCLUDE,
      });
    });
  }

  async voidExpense(schoolId: string, expenseId: string, actor: CashActor, reason: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "CashExpense" WHERE "id" = ${expenseId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const before = await tx.cashExpense.findFirst({
        where: { id: expenseId, schoolId },
        include: { cashSession: { select: { status: true } } },
      });
      if (!before) throw new AppError('Egreso no encontrado.', 404);
      const blocked = voidBlockReason({ status: before.status, cashSessionStatus: before.cashSession.status });
      if (blocked) throw new AppError(blocked, 400);
      const after = await tx.cashExpense.update({
        where: { id: expenseId },
        data: { status: 'VOIDED', voidedAt: new Date(), voidedById: actor.userId, voidReason: reason.trim() },
        include: EXPENSE_INCLUDE,
      });
      return { before, after };
    });
  }

  async listExpenses(schoolId: string, filters: { startDate?: string; endDate?: string }) {
    return prisma.cashExpense.findMany({
      where: {
        schoolId,
        ...(filters.startDate || filters.endDate
          ? {
              createdAt: {
                ...(filters.startDate ? { gte: new Date(`${filters.startDate}T00:00:00.000-05:00`) } : {}),
                ...(filters.endDate ? { lte: new Date(`${filters.endDate}T23:59:59.999-05:00`) } : {}),
              },
            }
          : {}),
      },
      include: { ...EXPENSE_INCLUDE, cashSession: { select: { id: true, status: true, cashier: PERSON } } },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
  }
}
