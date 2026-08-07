import { School, SubscriptionPlan } from '@/features/schools/types';

export interface SchoolWithStats extends School {
  _count?: {
    users: number;
    students: number;
  };
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
