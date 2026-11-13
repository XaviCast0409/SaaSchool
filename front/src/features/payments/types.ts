export type ObligationStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'YAPE' | 'PLIN' | 'BANK_TRANSFER' | 'DEPOSIT' | 'CREDIT_CARD';

export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'DEPOSIT', 'CREDIT_CARD'];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  BANK_TRANSFER: 'Transferencia',
  DEPOSIT: 'Depósito',
  CREDIT_CARD: 'Tarjeta',
};

export const methodLabel = (m: string) => PAYMENT_METHOD_LABEL[m as PaymentMethod] ?? m;

export interface PersonRef {
  id: string;
  firstName: string;
  lastNamePaternal: string;
}

export const personName = (p?: PersonRef | null) => (p ? `${p.firstName} ${p.lastNamePaternal}` : '—');

export type FinanceRecordStatus = 'ACTIVE' | 'VOIDED';

export interface PaymentTransaction {
  id: string;
  schoolId: string;
  obligationId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  operationNumber?: string | null;
  receiptType?: string;
  receiptNumber?: string | null;
  notes?: string | null;
  status: FinanceRecordStatus;
  collectedBy?: PersonRef | null;
  voidedBy?: PersonRef | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  cashSessionId?: string | null;
  cashSession?: { id: string; status: CashSessionStatus; openedAt: string } | null;
}

// ── Permisos de caja y tesorería ──────────────────────────────────
export type FinanceLevel = 'ADMIN' | 'TREASURER' | 'CASHIER' | 'ACCOUNTANT' | 'NONE';

export interface FinanceAccess {
  level: FinanceLevel;
  label: string;
  can: { collect: boolean; manage: boolean; view: boolean };
}

// ── Caja diaria ───────────────────────────────────────────────────
export type CashSessionStatus = 'OPEN' | 'CLOSED' | 'REVIEWED';

export interface SessionTotals {
  byMethod: Record<PaymentMethod, number>;
  countByMethod: Record<PaymentMethod, number>;
  totalCollected: number;
  paymentsCount: number;
  voidedCount: number;
  expensesTotal: number;
  expensesCount: number;
  openingAmount: number;
  expectedCash: number;
}

export interface CashExpense {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  beneficiary?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  attachmentUrl?: string | null;
  status: FinanceRecordStatus;
  createdAt: string;
  registeredBy?: PersonRef | null;
  voidedBy?: PersonRef | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  cashSession?: { id: string; status: CashSessionStatus; cashier: PersonRef };
}

export interface CashSession {
  id: string;
  cashierId: string;
  status: CashSessionStatus;
  openedAt: string;
  openingAmount: number;
  openingNote?: string | null;
  closedAt?: string | null;
  expectedCash?: number | null;
  countedCash?: number | null;
  difference?: number | null;
  closingNote?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  reopenCount: number;
  cashier: PersonRef;
  reviewedBy?: PersonRef | null;
  totals: SessionTotals;
}

export interface CashSessionDetail extends CashSession {
  transactions: DailyCashCloseData['transactions'];
  expenses: CashExpense[];
}

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  UTILES_OFICINA: 'Útiles de oficina',
  LIMPIEZA: 'Limpieza',
  MANTENIMIENTO: 'Mantenimiento y reparaciones',
  MOVILIDAD: 'Movilidad y pasajes',
  REFRIGERIO: 'Refrigerios y atenciones',
  SERVICIOS: 'Servicios (luz, agua, internet)',
  MATERIAL_EDUCATIVO: 'Material educativo',
  DEVOLUCION: 'Devolución a familia',
  OTROS: 'Otros',
};

export const EXPENSE_DOCUMENT_LABEL: Record<string, string> = {
  BOLETA: 'Boleta',
  FACTURA: 'Factura',
  RECIBO_HONORARIOS: 'Recibo por honorarios',
  TICKET: 'Ticket',
  SIN_COMPROBANTE: 'Sin comprobante',
};

export interface PaymentObligation {
  id: string;
  schoolId: string;
  enrollmentId: string;
  title: string;
  concept: string;
  amountDue: number;
  dueDate: string;
  status: ObligationStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  /** Monto antes de descuentos, becas y moras (amountDue es el vigente). */
  originalAmount?: number | null;
  /** Solo en el detalle de una cuota, para el personal. */
  adjustments?: import('./api/useFinance').ObligationAdjustment[];
  /** Solo cobros vigentes (los anulados no cuentan para el saldo). */
  transactions: PaymentTransaction[];
  /** Solo en el detalle de una cuota, para el personal. */
  voidedTransactions?: PaymentTransaction[];
  enrollment?: {
    id: string;
    classroomId: string;
    student?: {
      id: string;
      firstNames: string;
      lastNamePaternal: string;
      lastNameMaternal: string;
      documentId: string;
      studentCode?: string;
      familyRelations?: Array<{
        user?: {
          id: string;
          firstName: string;
          lastNamePaternal: string;
          lastNameMaternal: string;
          cellphone?: string;
          email?: string;
        };
      }>;
    };
    classroom?: {
      id: string;
      grade: number;
      section: string;
      educationLevel: string;
    };
  };
}

export interface FinancialSummary {
  totalObligations: number;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  overdueCount: number;
}

export interface ReceiptData {
  receiptHeader: {
    receiptType: string;
    receiptNumber: string;
    paymentDate: string;
    status?: FinanceRecordStatus;
    collectedBy?: string | null;
  };
  voided?: { at: string | null; reason: string | null; by: string | null } | null;
  student: {
    fullName: string;
    documentId: string;
    classroom: string;
  };
  payment: {
    concept: string;
    title: string;
    paymentMethod: string;
    paymentMethodLabel?: string;
    operationNumber: string;
    amountPaid: number;
    notes?: string;
  };
}

export interface ObligationFilterParams {
  page?: number;
  limit?: number;
  status?: ObligationStatus;
  classroomId?: string;
  enrollmentId?: string;
  search?: string;
  overdue?: boolean;
}

export interface ObligationsPaginatedResponse {
  status: string;
  data: PaymentObligation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TransactionFilterParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  status?: FinanceRecordStatus;
  collectedById?: string;
  cashSessionId?: string;
}

export interface DailyCashCloseData {
  date: string;
  totalCollected: number;
  byMethod: Record<PaymentMethod, number>;
  countByMethod: Record<PaymentMethod, number>;
  transactionsCount: number;
  voidedCount: number;
  expensesTotal: number;
  expensesCount: number;
  netCash: number;
  expenses: CashExpense[];
  sessions: Array<Omit<CashSession, 'totals'>>;
  transactions: Array<
    PaymentTransaction & {
      obligation?: {
        title: string;
        concept: string;
        enrollment?: {
          student?: {
            firstNames: string;
            lastNamePaternal: string;
            lastNameMaternal: string;
            studentCode?: string;
          };
          classroom?: {
            grade: number;
            section: string;
            educationLevel: string;
          };
        };
      };
    }
  >;
}

export interface CreateIndividualObligationPayload {
  studentId?: string;
  enrollmentId?: string;
  title: string;
  concept: string;
  amountDue: number;
  dueDate: string;
  notes?: string;
  paidNow?: boolean;
  paymentMethod?: PaymentMethod;
  operationNumber?: string;
}
