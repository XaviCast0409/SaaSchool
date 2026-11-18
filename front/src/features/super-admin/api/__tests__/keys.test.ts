import { describe, it, expect } from 'vitest';
import { superAdminKeys } from '../keys';

describe('superAdminKeys', () => {
  it.each([
    ['schools', superAdminKeys.schools, ['superadmin-schools']],
    ['planCatalog', superAdminKeys.planCatalog, ['superadmin-plan-catalog']],
    ['billingSummary', superAdminKeys.billingSummary, ['superadmin-billing-summary']],
    ['subscriptionPayments', superAdminKeys.subscriptionPayments('sch-1'), ['superadmin-subscription-payments', 'sch-1']],
    ['renewalPreview with months', superAdminKeys.renewalPreview('sch-1', 12), ['superadmin-renewal-preview', 'sch-1', 12]],
    ['renewalPreview without months', superAdminKeys.renewalPreview('sch-1'), ['superadmin-renewal-preview', 'sch-1']],
    ['leadsAll', superAdminKeys.leadsAll, ['platform-leads']],
    ['leads with status', superAdminKeys.leads('NEW'), ['platform-leads', 'NEW']],
    ['leads default status', superAdminKeys.leads(), ['platform-leads', 'ALL']],
    ['onboarding', superAdminKeys.onboarding('sch-1'), ['superadmin-onboarding', 'sch-1']],
    ['notes', superAdminKeys.notes('sch-1'), ['superadmin-notes', 'sch-1']],
    ['announcementsActive', superAdminKeys.announcementsActive, ['platform-announcements-active']],
    ['announcementsAll', superAdminKeys.announcementsAll, ['superadmin-platform-announcements']],
    ['health', superAdminKeys.health, ['superadmin-platform-health']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

