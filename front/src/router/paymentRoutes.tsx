import { Route } from 'react-router-dom';
import { RoleGuard } from './guards';
import { OFFICE } from '@/lib/roles';
import {
  PaymentsPage,
  CashPage,
  FeeSchedulesPage,
  BenefitsPage,
  FinanceReportsPage,
} from './lazyPages';

export const renderPaymentRoutes = () => (
  <>
    <Route
      path="/payments"
      element={
        <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'PARENT']} disallowStudents>
          <PaymentsPage />
        </RoleGuard>
      }
    />
    <Route
      path="/payments/cash"
      element={
        <RoleGuard allowedRoles={OFFICE}>
          <CashPage />
        </RoleGuard>
      }
    />
    <Route
      path="/payments/fee-schedules"
      element={
        <RoleGuard allowedRoles={OFFICE}>
          <FeeSchedulesPage />
        </RoleGuard>
      }
    />
    <Route
      path="/payments/benefits"
      element={
        <RoleGuard allowedRoles={OFFICE}>
          <BenefitsPage />
        </RoleGuard>
      }
    />
    <Route
      path="/payments/reports"
      element={
        <RoleGuard allowedRoles={OFFICE}>
          <FinanceReportsPage />
        </RoleGuard>
      }
    />
  </>
);
