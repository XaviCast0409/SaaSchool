export type ObligationStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD';

export interface PaymentTransaction {
  id: string;
  schoolId: string;
  obligationId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  operationNumber?: string;
  receiptType?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface PaymentObligation {
  id: string;
  schoolId: string;
  enrollmentId: string;
  title: string;
  concept: string;
  amountDue: number;
  dueDate: string;
  status: ObligationStatus;
  createdAt: string;
  updatedAt: string;
  transactions: PaymentTransaction[];
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
  };
  student: {
    fullName: string;
    documentId: string;
    classroom: string;
  };
  payment: {
    concept: string;
    title: string;
    paymentMethod: string;
    operationNumber: string;
    amountPaid: number;
    notes?: string;
  };
}

export interface ObligationFilterParams {
  status?: ObligationStatus;
  classroomId?: string;
  enrollmentId?: string;
  search?: string;
}

export interface TransactionFilterParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
}
