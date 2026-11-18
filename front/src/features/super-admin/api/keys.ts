export const superAdminKeys = {
  schools: ['superadmin-schools'] as const,
  planCatalog: ['superadmin-plan-catalog'] as const,
  billingSummary: ['superadmin-billing-summary'] as const,
  subscriptionPayments: (schoolId?: string | null) => ['superadmin-subscription-payments', schoolId] as const,
  renewalPreview: (schoolId?: string | null, months?: number | null) =>
    months !== undefined
      ? (['superadmin-renewal-preview', schoolId, months] as const)
      : (['superadmin-renewal-preview', schoolId] as const),
  leadsAll: ['platform-leads'] as const,
  leads: (status?: string | null) => ['platform-leads', status ?? 'ALL'] as const,
  onboarding: (schoolId?: string | null) => ['superadmin-onboarding', schoolId] as const,
  notes: (schoolId?: string | null) => ['superadmin-notes', schoolId] as const,
  announcementsActive: ['platform-announcements-active'] as const,
  announcementsAll: ['superadmin-platform-announcements'] as const,
  health: ['superadmin-platform-health'] as const,
} as const;

