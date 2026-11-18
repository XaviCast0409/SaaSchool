import { describe, it, expect, vi } from 'vitest';
import { createAppQueryClient } from '@/lib/queryClient';
import { paymentsKeys, feeSchedules, invalidatePaymentViews, invalidateCashViews } from '../keys';
import { paymentReportsKeys } from '@/features/payment-reports/api/keys';

describe('paymentsKeys and paymentReportsKeys', () => {
  it.each([
    ['obligations.all', paymentsKeys.obligations.all, ['payments-obligations']],
    [
      'obligations.list',
      paymentsKeys.obligations.list({
        page: 1,
        limit: 10,
        status: 'PENDING',
        classroomId: 'c1',
        search: 'x',
        overdue: true,
      }),
      ['payments-obligations', 1, 10, 'PENDING', 'c1', 'x', true],
    ],
    ['parentObligations.all', paymentsKeys.parentObligations.all, ['parent-payments-obligations']],
    ['parentObligations.root', paymentsKeys.parentObligations.root(), ['parent-payments-obligations']],
    ['summary.all', paymentsKeys.summary.all, ['financial-summary']],
    ['summary.root', paymentsKeys.summary.root(), ['financial-summary']],
    ['transactions.all', paymentsKeys.transactions.all, ['payments-transactions']],
    [
      'transactions.list args',
      paymentsKeys.transactions.list('2026-01-01', '2026-01-31', 'CASH'),
      ['payments-transactions', '2026-01-01', '2026-01-31', 'CASH'],
    ],
    [
      'transactions.list filter',
      paymentsKeys.transactions.list({ startDate: '2026-01-01', endDate: '2026-01-31', paymentMethod: 'CASH' }),
      ['payments-transactions', '2026-01-01', '2026-01-31', 'CASH'],
    ],
    ['receipt.all', paymentsKeys.receipt.all, ['transaction-receipt']],
    ['receipt.detail', paymentsKeys.receipt.detail('tx-1'), ['transaction-receipt', 'tx-1']],
    ['access.all', paymentsKeys.access.all, ['finance-access']],
    ['access.root', paymentsKeys.access.root(), ['finance-access']],
    ['obligationDetail.all', paymentsKeys.obligationDetail.all, ['payment-obligation']],
    ['obligationDetail.detail', paymentsKeys.obligationDetail.detail('ob-1'), ['payment-obligation', 'ob-1']],
    ['dailyCashClose.all', paymentsKeys.dailyCashClose.all, ['daily-cash-close']],
    ['dailyCashClose.detail', paymentsKeys.dailyCashClose.detail('2026-03-01'), ['daily-cash-close', '2026-03-01']],
    ['cash.all', paymentsKeys.cash.all, ['cash']],
    ['cash.current', paymentsKeys.cash.current(), ['cash', 'current']],
    ['cash.sessions', paymentsKeys.cash.sessions({ cashierId: 'u1' }), ['cash', 'sessions', { cashierId: 'u1' }]],
    ['cash.session', paymentsKeys.cash.session('cs-1'), ['cash', 'session', 'cs-1']],
    ['cash.cashiers', paymentsKeys.cash.cashiers(), ['cash', 'cashiers']],
    ['feeSchedules.all', feeSchedules.all, ['fee-schedules']],
    ['feeSchedules.byYear', feeSchedules.byYear('ay-1'), ['fee-schedules', 'ay-1']],
    ['paymentsKeys.feeSchedules.all', paymentsKeys.feeSchedules.all, ['fee-schedules']],
    ['paymentsKeys.feeSchedules.byYear', paymentsKeys.feeSchedules.byYear('ay-1'), ['fee-schedules', 'ay-1']],
    ['schedulePreview.all', paymentsKeys.schedulePreview.all, ['schedule-preview']],
    [
      'schedulePreview.detail',
      paymentsKeys.schedulePreview.detail({ academicYearId: 'ay-1' }),
      ['schedule-preview', { academicYearId: 'ay-1' }],
    ],
    ['adjustments.all', paymentsKeys.adjustments.all, ['adjustments']],
    ['adjustments.list', paymentsKeys.adjustments.list({ type: 'DISCOUNT' }), ['adjustments', { type: 'DISCOUNT' }]],
    ['scholarships.all', paymentsKeys.scholarships.all, ['scholarships']],
    ['scholarships.list', paymentsKeys.scholarships.list(true), ['scholarships', true]],
    ['lateFees.all', paymentsKeys.lateFees.all, ['late-fees']],
    ['lateFees.settings', paymentsKeys.lateFees.settings(), ['late-fees', 'settings']],
    ['lateFees.preview', paymentsKeys.lateFees.preview(), ['late-fees', 'preview']],
    ['statement.all', paymentsKeys.statement.all, ['statement']],
    ['statement.student', paymentsKeys.statement.student('st-1'), ['statement', 'student', 'st-1']],
    ['statement.family', paymentsKeys.statement.family('u-1'), ['statement', 'family', 'u-1']],
    ['statement.mine', paymentsKeys.statement.mine(), ['statement', 'mine']],
    ['statement.guardians', paymentsKeys.statement.guardians('Perez'), ['statement', 'guardians', 'Perez']],
    ['report.all', paymentsKeys.report.all, ['report']],
    [
      'report.collections',
      paymentsKeys.report.collections({ cashierId: 'u1' }),
      ['report', 'collections', { cashierId: 'u1' }],
    ],
    ['report.aging', paymentsKeys.report.aging('c1'), ['report', 'aging', 'c1']],
    ['report.monthly', paymentsKeys.report.monthly(2026), ['report', 'monthly', 2026]],
    [
      'report.expenses',
      paymentsKeys.report.expenses({ startDate: '2026-01-01', endDate: '2026-01-31' }),
      ['report', 'expenses', { startDate: '2026-01-01', endDate: '2026-01-31' }],
    ],
    ['paymentReportsKeys.all', paymentReportsKeys.all, ['payment-reports']],
    ['paymentReportsKeys.instructions', paymentReportsKeys.instructions(), ['payment-reports', 'instructions']],
    ['paymentReportsKeys.mine', paymentReportsKeys.mine(), ['payment-reports', 'mine']],
    ['paymentReportsKeys.treasury', paymentReportsKeys.treasury('PENDING'), ['payment-reports', 'treasury', 'PENDING']],
    ['paymentReportsKeys.pendingCount', paymentReportsKeys.pendingCount(), ['payment-reports', 'pending-count']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });

  describe('invalidatePaymentViews', () => {
    it('invalidates default set (obligations and summary)', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidatePaymentViews(client);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['financial-summary'] });
    });

    it('invalidates with obligationDetail (cancel obligation)', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidatePaymentViews(client, { obligationDetail: true });

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['financial-summary'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payment-obligation'] });
    });

    it('invalidates with parent, transactions, cashClose (update / individual)', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidatePaymentViews(client, { parent: true, transactions: true, cashClose: true });

      expect(spy).toHaveBeenCalledTimes(5);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['parent-payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['financial-summary'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-transactions'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['daily-cash-close'] });
    });

    it('invalidates with parent, transactions, cashClose, cash (register transaction)', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidatePaymentViews(client, { parent: true, transactions: true, cashClose: true, cash: true });

      expect(spy).toHaveBeenCalledTimes(6);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['parent-payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['financial-summary'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-transactions'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['daily-cash-close'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['cash'] });
    });

    it('invalidates with parent, transactions, cashClose, obligationDetail, cash (void transaction)', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidatePaymentViews(client, {
        parent: true,
        transactions: true,
        cashClose: true,
        obligationDetail: true,
        cash: true,
      });

      expect(spy).toHaveBeenCalledTimes(7);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['parent-payments-obligations'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['financial-summary'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-transactions'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['daily-cash-close'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payment-obligation'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['cash'] });
    });
  });

  describe('invalidateCashViews', () => {
    it('invalidates cash, daily-cash-close, and payments-transactions', () => {
      const client = createAppQueryClient();
      const spy = vi.spyOn(client, 'invalidateQueries');

      invalidateCashViews(client);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith({ queryKey: ['cash'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['daily-cash-close'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['payments-transactions'] });
    });
  });
});
