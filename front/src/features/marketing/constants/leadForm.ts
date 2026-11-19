import type { InterestPlan, StudentRange } from '../api/useCreateLead';

export interface FormState {
  schoolName: string;
  contactName: string;
  role: string;
  phone: string;
  studentRange: StudentRange | null;
  interestPlan: InterestPlan | null;
  city: string;
  email: string;
  message: string;
  consent: boolean;
  website: string;
}

export const ROLES = ['Director(a)', 'Promotor(a)', 'Administrador(a)', 'Subdirector(a)', 'Otro'];

export const RANGES: Array<{ value: StudentRange; label: string }> = [
  { value: '<150', label: 'Menos de 150' },
  { value: '150-500', label: '150 a 500' },
  { value: '>500', label: 'Más de 500' },
];

export const PLANS: Array<{ value: InterestPlan; label: string }> = [
  { value: 'BASIC', label: 'Básico' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];
