import { Route } from 'react-router-dom';
import { RoleGuard } from './guards';
import {
  SuperAdminPage,
  SchoolDetailPage,
  PlatformAnnouncementsPage,
  PlatformHealthPage,
  LeadsPage,
} from './lazyPages';

export const renderSuperAdminRoutes = () => (
  <>
    <Route
      path="/super-admin"
      element={
        <RoleGuard allowedRoles={['SUPER_ADMIN']}>
          <SuperAdminPage />
        </RoleGuard>
      }
    />
    <Route
      path="/super-admin/schools/:schoolId"
      element={
        <RoleGuard allowedRoles={['SUPER_ADMIN']}>
          <SchoolDetailPage />
        </RoleGuard>
      }
    />
    <Route
      path="/super-admin/announcements"
      element={
        <RoleGuard allowedRoles={['SUPER_ADMIN']}>
          <PlatformAnnouncementsPage />
        </RoleGuard>
      }
    />
    <Route
      path="/super-admin/health"
      element={
        <RoleGuard allowedRoles={['SUPER_ADMIN']}>
          <PlatformHealthPage />
        </RoleGuard>
      }
    />
    <Route
      path="/super-admin/leads"
      element={
        <RoleGuard allowedRoles={['SUPER_ADMIN']}>
          <LeadsPage />
        </RoleGuard>
      }
    />
  </>
);
