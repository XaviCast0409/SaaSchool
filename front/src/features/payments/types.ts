export interface PaymentTransaction {
  id: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD';
  operationNumber?: string;
  receiptType?: string;
  receiptNumber?: string;
}

export interface PaymentObligation {
  id: string;
  schoolId: string;
  enrollmentId: string;
  title: string;
  concept: string;
  amountDue: number;
  dueDate: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  createdAt: string;
  transactions: PaymentTransaction[];
}
