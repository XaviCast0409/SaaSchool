import { School, SubscriptionPlan } from '@/features/schools/types';

export interface SchoolWithStats extends School {
  _count?: {
    users: number;
    students: number;
  };
  /** Actividad reciente (personal, familias y alumnos; no cuenta el soporte) */
  activity?: {
    lastSeenAt: string | null;
    active7d: number;
    active30d: number;
  };
  lastPaymentOn?: string | null;
  createdAt?: string;
}

export type SubscriptionPaymentMethod = 'TRANSFER' | 'YAPE' | 'PLIN' | 'CASH' | 'CARD' | 'OTHER';

export const PAYMENT_METHOD_LABELS: Record<SubscriptionPaymentMethod, string> = {
  TRANSFER: 'Transferencia',
  YAPE: 'Yape',
  PLIN: 'Plin',
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

export interface SubscriptionPayment {
  id: string;
  schoolId: string;
  amount: number;
  paidOn: string;
  method: SubscriptionPaymentMethod;
  reference: string | null;
  notes: string | null;
  plan: string;
  monthsCovered: number;
  previousExpiresAt: string | null;
  newExpiresAt: string;
  createdByEmail: string | null;
  voidedAt: string | null;
  voidedByEmail: string | null;
  voidReason: string | null;
  createdAt: string;
}

export interface CreateSubscriptionPaymentPayload {
  amount: number;
  paidOn: string;
  method: SubscriptionPaymentMethod;
  monthsCovered: number;
  reference?: string | null;
  notes?: string | null;
}

export interface BillingSummary {
  period: string;
  collectedThisMonth: number;
  paymentsThisMonth: number;
  collectedLastMonth: number;
}

export interface CreateSchoolPayload {
  name: string;
  documentId: string;
  modularCode?: string;
  localCode?: string;
  email?: string;
  phone?: string;
  address?: string;
  department?: string;
  province?: string;
  district?: string;
  plan?: SubscriptionPlan;
  planExpiresAt?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastNamePaternal?: string;
  adminLastNameMaternal?: string;
  adminDocumentId?: string;
  adminCellphone?: string;
}
