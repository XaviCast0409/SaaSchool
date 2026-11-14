export type SubscriptionPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';

/** Ciclo de un plan vencido: vigente → gracia → solo lectura → bloqueado (lo calcula el back). */
export type PlanAccess = 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'BLOCKED';

export interface PlanStatus {
  access: PlanAccess;
  daysUntilExpiry: number | null;
  daysOverdue: number;
  readOnlyFrom: string | null;
  blockedFrom: string | null;
}

export interface School {
  id: string;
  modularCode?: string | null;
  localCode?: string | null;
  name: string;
  documentId: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  plan: SubscriptionPlan;
  planExpiresAt?: string | null;
  monthlyFee?: number | null; // Mensualidad pactada; null = precio de lista
  effectiveMonthlyFee?: number;
  planStatus?: PlanStatus;
  isActive: boolean;
  blockCertificatesOnOverdue?: boolean;
  brandColor?: string | null;
  notifyAbsencesToFamilies?: boolean;
  absenceAlertConsecutive?: number;
  absenceAlertMonthlyPercent?: number;
  lateAlertMonthlyCount?: number;
  messagingEnabled?: boolean;
  messagingStartTime?: string;
  messagingEndTime?: string;
  whatsappCountryCode?: string;
  slug?: string | null; // Código del colegio para su página de ingreso (/c/<slug>)
  loginBackgroundUrl?: string | null;
  loginTitle?: string | null;
  loginMessage?: string | null;
}

export interface UpdateSchoolPayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  department?: string;
  province?: string;
  district?: string;
  plan?: SubscriptionPlan;
  planExpiresAt?: string;
  blockCertificatesOnOverdue?: boolean;
  brandColor?: string | null;
  notifyAbsencesToFamilies?: boolean;
  absenceAlertConsecutive?: number;
  absenceAlertMonthlyPercent?: number;
  lateAlertMonthlyCount?: number;
  messagingEnabled?: boolean;
  messagingStartTime?: string;
  messagingEndTime?: string;
  whatsappCountryCode?: string;
  slug?: string;
  loginBackgroundUrl?: string | null;
  loginTitle?: string | null;
  loginMessage?: string | null;
}
