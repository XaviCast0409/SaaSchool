import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import { daysOverdue, fromCents, toCents } from './payment.rules';
import { AGING_BUCKETS, addTotals, agingBucket, groupSum, obligationTotals, type AgingBucket } from './report.rules';

const PERSON = { select: { id: true, firstName: true, lastNamePaternal: true } } as const;
const isoDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const range = (startDate?: string, endDate?: string) =>
  startDate || endDate
    ? {
        ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000-05:00`) } : {}),
        ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999-05:00`) } : {}),
      }
    : undefined;
/** Día del colegio (America/Lima) de una fecha y hora. */
const limaDay = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 10);

const TOTAL_KEYS = ['original', 'discounts', 'lateFees', 'net', 'paid', 'balance', 'overdue'] as const;

/** Estados de cuenta y reportes para tesorería y el contador. */
export class ReportService {
  // ────────────────────────────────────────────────────────────────
  // Estados de cuenta
  // ────────────────────────────────────────────────────────────────

  /**
   * Estado de cuenta de un alumno: cada cuota con su monto original, descuentos/becas, moras,
   * cobros (con recibo) y saldo. `includeVoided` muestra también lo anulado (solo personal).
   */
  async studentStatement(schoolId: string, studentId: string, opts: { academicYearId?: string; includeVoided?: boolean } = {}) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        firstNames: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        documentId: true,
        studentCode: true,
        familyRelations: {
          select: {
            relationshipType: true,
            isFinancialResponsible: true,
            isLegalGuardian: true,
            user: { select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true, cellphone: true, email: true, documentId: true } },
          },
        },
        enrollments: {
          where: opts.academicYearId ? { academicYearId: opts.academicYearId } : { academicYear: { isActive: true } },
          select: {
            id: true,
            academicYear: { select: { id: true, year: true } },
            classroom: { select: { grade: true, section: true, educationLevel: true } },
          },
        },
      },
    });
    if (!student) throw new AppError('Estudiante no encontrado.', 404);

    const enrollmentIds = student.enrollments.map((e) => e.id);
    const statusFilter = opts.includeVoided ? {} : { status: 'ACTIVE' as const };
    const obligations = await prisma.paymentObligation.findMany({
      where: { schoolId, enrollmentId: { in: enrollmentIds }, ...(opts.includeVoided ? {} : { status: { not: 'CANCELLED' } }) },
      select: {
        id: true,
        title: true,
        concept: true,
        dueDate: true,
        status: true,
        amountDue: true,
        originalAmount: true,
        cancelReason: true,
        adjustments: {
          where: statusFilter,
          select: { id: true, number: true, type: true, amount: true, reason: true, status: true, createdAt: true, voidReason: true },
          orderBy: { createdAt: 'asc' },
        },
        transactions: {
          where: statusFilter,
          select: {
            id: true,
            receiptNumber: true,
            paymentDate: true,
            paymentMethod: true,
            operationNumber: true,
            amountPaid: true,
            status: true,
            voidReason: true,
            collectedBy: PERSON,
          },
          orderBy: { paymentDate: 'asc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = getSchoolNow().dateObj;
    const rows = obligations.map((o) => {
      const t = obligationTotals({ originalAmount: o.originalAmount, amountDue: o.amountDue, adjustments: o.adjustments, payments: o.transactions });
      const cancelled = o.status === 'CANCELLED';
      const days = !cancelled && t.balance > 0 ? daysOverdue(o.dueDate, now) : 0;
      return {
        id: o.id,
        title: o.title,
        concept: o.concept,
        dueDate: isoDate(o.dueDate),
        status: o.status,
        cancelReason: o.cancelReason,
        daysOverdue: days,
        ...(cancelled ? { original: t.original, discounts: 0, lateFees: 0, net: 0, paid: 0, balance: 0 } : t),
        overdue: days > 0 ? t.balance : 0,
        adjustments: o.adjustments,
        payments: o.transactions,
      };
    });

    const guardians = student.familyRelations
      .filter((r) => r.isFinancialResponsible || r.isLegalGuardian)
      .map((r) => ({ ...r.user, relationshipType: r.relationshipType, isFinancialResponsible: r.isFinancialResponsible }));
    const enrollment = student.enrollments[0];
    return {
      student: {
        id: student.id,
        fullName: `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`,
        documentId: student.documentId,
        studentCode: student.studentCode,
        classroom: enrollment ? `${enrollment.classroom.grade}° "${enrollment.classroom.section}"` : null,
        year: enrollment?.academicYear.year ?? null,
      },
      guardians,
      obligations: rows,
      totals: addTotals(rows, [...TOTAL_KEYS]),
      generatedAt: new Date(),
    };
  }

  /** Estado de cuenta de la familia: todos los hijos de un apoderado, con totales consolidados. */
  async familyStatement(schoolId: string, guardianUserId: string, opts: { includeVoided?: boolean } = {}) {
    const guardian = await prisma.user.findFirst({
      where: { id: guardianUserId, schoolId },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        documentId: true,
        cellphone: true,
        email: true,
        familyRelations: { select: { studentId: true } },
      },
    });
    if (!guardian) throw new AppError('Apoderado no encontrado.', 404);
    const children = [];
    for (const rel of guardian.familyRelations) {
      const st = await this.studentStatement(schoolId, rel.studentId, opts);
      if (st.obligations.length > 0 || st.student.classroom) children.push(st);
    }
    const { familyRelations: _omit, ...g } = guardian;
    return {
      guardian: { ...g, fullName: `${g.lastNamePaternal} ${g.lastNameMaternal}, ${g.firstName}` },
      children,
      totals: addTotals(children.map((c) => c.totals), [...TOTAL_KEYS]),
      generatedAt: new Date(),
    };
  }

  /** Apoderados con hijos matriculados (para elegir de quién sacar el estado de cuenta familiar). */
  async searchGuardians(schoolId: string, search: string) {
    const term = search.trim();
    if (term.length < 2) return [];
    return prisma.user.findMany({
      where: {
        schoolId,
        role: 'PARENT',
        familyRelations: { some: {} },
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastNamePaternal: { contains: term, mode: 'insensitive' } },
          { lastNameMaternal: { contains: term, mode: 'insensitive' } },
          { documentId: { contains: term } },
          { familyRelations: { some: { student: { OR: [{ lastNamePaternal: { contains: term, mode: 'insensitive' } }, { documentId: { contains: term } }] } } } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        lastNameMaternal: true,
        documentId: true,
        familyRelations: { select: { student: { select: { id: true, firstNames: true, lastNamePaternal: true } } } },
      },
      take: 20,
      orderBy: { lastNamePaternal: 'asc' },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Reportes
  // ────────────────────────────────────────────────────────────────

  /** Ingresos (cobros vigentes) en un rango, agrupados por día, medio, concepto y cajero. */
  async collections(
    schoolId: string,
    f: { startDate?: string; endDate?: string; cashierId?: string; method?: string; concept?: string },
  ) {
    const where = {
      schoolId,
      paymentDate: range(f.startDate, f.endDate),
      ...(f.cashierId ? { collectedById: f.cashierId } : {}),
      ...(f.method ? { paymentMethod: f.method as never } : {}),
      ...(f.concept ? { obligation: { concept: f.concept } } : {}),
    };
    const [rows, voided] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where: { ...where, status: 'ACTIVE' },
        select: {
          id: true,
          receiptNumber: true,
          paymentDate: true,
          paymentMethod: true,
          operationNumber: true,
          amountPaid: true,
          cashSessionId: true,
          collectedBy: PERSON,
          obligation: {
            select: {
              title: true,
              concept: true,
              enrollment: {
                select: {
                  student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true, documentId: true } },
                  classroom: { select: { grade: true, section: true } },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: 'asc' },
        take: 20_000,
      }),
      prisma.paymentTransaction.aggregate({ where: { ...where, status: 'VOIDED' }, _count: true, _sum: { amountPaid: true } }),
    ]);
    const cashierName = (r: (typeof rows)[number]) =>
      r.collectedBy ? `${r.collectedBy.firstName} ${r.collectedBy.lastNamePaternal}` : 'Voucher validado / sin cajero';
    return {
      rows,
      total: fromCents(rows.reduce((s, r) => s + toCents(r.amountPaid), 0)),
      count: rows.length,
      voided: { count: voided._count, total: Number(voided._sum.amountPaid ?? 0) },
      byDay: groupSum(rows, (r) => limaDay(r.paymentDate), (r) => r.amountPaid),
      byMethod: groupSum(rows, (r) => r.paymentMethod, (r) => r.amountPaid),
      byConcept: groupSum(rows, (r) => r.obligation.concept, (r) => r.amountPaid),
      byCashier: groupSum(rows, cashierName, (r) => r.amountPaid),
    };
  }

  /**
   * Morosidad y antigüedad de deuda al día de hoy: saldo vencido por alumno en tramos
   * 0-30, 31-60, 61-90 y +90 días, con el apoderado responsable de pagos.
   */
  async aging(schoolId: string, f: { classroomId?: string }) {
    const now = getSchoolNow().dateObj;
    const obligations = await prisma.paymentObligation.findMany({
      where: {
        schoolId,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
        enrollment: { isActive: true, ...(f.classroomId ? { classroomId: f.classroomId } : {}) },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        amountDue: true,
        transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } },
        enrollment: {
          select: {
            student: {
              select: {
                id: true,
                firstNames: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                documentId: true,
                familyRelations: {
                  select: { isFinancialResponsible: true, user: { select: { firstName: true, lastNamePaternal: true, cellphone: true, email: true } } },
                },
              },
            },
            classroom: { select: { id: true, grade: true, section: true, educationLevel: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    type Row = {
      studentId: string;
      student: string;
      documentId: string | null;
      classroom: string;
      guardian: string;
      phone: string | null;
      email: string | null;
      cuotas: number;
      oldestDueDate: string;
      maxDays: number;
      buckets: Record<AgingBucket, number>;
      total: number;
      items: Array<{ title: string; dueDate: string; days: number; balance: number }>;
    };
    const byStudent = new Map<string, Row & { cents: Record<AgingBucket, number> }>();
    const bucketCents: Record<AgingBucket, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    for (const o of obligations) {
      const balanceCents = toCents(o.amountDue) - o.transactions.reduce((s, t) => s + toCents(t.amountPaid), 0);
      if (balanceCents <= 0) continue;
      const days = daysOverdue(o.dueDate, now);
      if (days <= 0) continue;
      const bucket = agingBucket(days);
      const st = o.enrollment.student;
      const rel = st.familyRelations.find((r) => r.isFinancialResponsible) ?? st.familyRelations[0];
      let row = byStudent.get(st.id);
      if (!row) {
        row = {
          studentId: st.id,
          student: `${st.lastNamePaternal} ${st.lastNameMaternal}, ${st.firstNames}`,
          documentId: st.documentId,
          classroom: `${o.enrollment.classroom.grade}° "${o.enrollment.classroom.section}"`,
          guardian: rel ? `${rel.user.firstName} ${rel.user.lastNamePaternal}` : '—',
          phone: rel?.user.cellphone ?? null,
          email: rel?.user.email ?? null,
          cuotas: 0,
          oldestDueDate: isoDate(o.dueDate),
          maxDays: 0,
          buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          cents: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          total: 0,
          items: [],
        };
        byStudent.set(st.id, row);
      }
      row.cuotas++;
      row.maxDays = Math.max(row.maxDays, days);
      row.cents[bucket] += balanceCents;
      bucketCents[bucket] += balanceCents;
      row.items.push({ title: o.title, dueDate: isoDate(o.dueDate), days, balance: fromCents(balanceCents) });
    }

    const rows: Row[] = [...byStudent.values()]
      .map(({ cents, ...r }) => {
        for (const b of AGING_BUCKETS) r.buckets[b] = fromCents(cents[b]);
        r.total = fromCents(AGING_BUCKETS.reduce((s, b) => s + cents[b], 0));
        return r;
      })
      .sort((a, b) => b.total - a.total);

    const buckets = Object.fromEntries(AGING_BUCKETS.map((b) => [b, fromCents(bucketCents[b])])) as Record<AgingBucket, number>;
    return {
      asOf: isoDate(now),
      rows,
      buckets,
      total: fromCents(AGING_BUCKETS.reduce((s, b) => s + bucketCents[b], 0)),
      students: rows.length,
    };
  }

  /**
   * Resumen mensual del año: por mes de vencimiento, lo emitido, rebajas, moras, neto, cobrado y
   * pendiente; y por mes de pago, el dinero realmente ingresado (flujo de caja) y egresos.
   */
  async monthly(schoolId: string, year: number) {
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));
    const [obligations, payments, expenses] = await Promise.all([
      prisma.paymentObligation.findMany({
        where: { schoolId, dueDate: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
        select: {
          dueDate: true,
          amountDue: true,
          originalAmount: true,
          adjustments: { where: { status: 'ACTIVE' }, select: { type: true, amount: true, status: true } },
          transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true, status: true } },
        },
      }),
      prisma.paymentTransaction.findMany({
        where: { schoolId, status: 'ACTIVE', paymentDate: { gte: new Date(`${year}-01-01T00:00:00.000-05:00`), lt: new Date(`${year + 1}-01-01T00:00:00.000-05:00`) } },
        select: { paymentDate: true, amountPaid: true },
      }),
      prisma.cashExpense.findMany({
        where: { schoolId, status: 'ACTIVE', createdAt: { gte: new Date(`${year}-01-01T00:00:00.000-05:00`), lt: new Date(`${year + 1}-01-01T00:00:00.000-05:00`) } },
        select: { createdAt: true, amount: true },
      }),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      original: 0,
      discounts: 0,
      lateFees: 0,
      net: 0,
      paid: 0,
      balance: 0,
      cashIn: 0,
      expenses: 0,
    }));
    const cents = months.map(() => ({ original: 0, discounts: 0, lateFees: 0, net: 0, paid: 0, balance: 0, cashIn: 0, expenses: 0 }));
    for (const o of obligations) {
      const m = o.dueDate.getUTCMonth();
      const t = obligationTotals({ originalAmount: o.originalAmount, amountDue: o.amountDue, adjustments: o.adjustments, payments: o.transactions });
      cents[m].original += toCents(t.original);
      cents[m].discounts += toCents(t.discounts);
      cents[m].lateFees += toCents(t.lateFees);
      cents[m].net += toCents(t.net);
      cents[m].paid += toCents(t.paid);
      cents[m].balance += toCents(t.balance);
    }
    for (const p of payments) cents[Number(limaDay(p.paymentDate).slice(5, 7)) - 1].cashIn += toCents(p.amountPaid);
    for (const e of expenses) cents[Number(limaDay(e.createdAt).slice(5, 7)) - 1].expenses += toCents(e.amount);
    months.forEach((row, i) => {
      for (const k of Object.keys(cents[i]) as Array<keyof (typeof cents)[number]>) row[k] = fromCents(cents[i][k]);
    });
    return {
      year,
      months,
      totals: addTotals(months, ['original', 'discounts', 'lateFees', 'net', 'paid', 'balance', 'cashIn', 'expenses']),
    };
  }
}
