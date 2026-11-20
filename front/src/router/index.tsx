import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { SchoolCodePage } from '@/features/auth/pages/SchoolCodePage';
import { SchoolLoginPage } from '@/features/auth/pages/SchoolLoginPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PrivacyPolicyPage } from '@/features/legal/pages/PrivacyPolicyPage';
import { TermsPage } from '@/features/legal/pages/TermsPage';
import { PlanGuard } from '@/components/ui/PlanGuard';
import { PageLoader } from '@/components/ui/PageLoader';
import { NotFoundPage } from '@/components/ui/StatusPages';
import { SectionTabsLayout } from '@/layouts/SectionTabsLayout';
import { currentSchoolSlug } from '@/lib/schoolDomain';
import { OFFICE, STAFF, ALL_ROLES } from '@/lib/roles';
import { ProtectedRoute, PublicRoute, RoleGuard, TeacherAssignmentsRedirect } from './guards';
import {
  DashboardPage,
  GradesPage,
  AttendancePage,
  AttendanceJustificationsPage,
  AttendanceAlertsPage,
  CourseAttendancePage,
  AnnouncementsPage,
  LandingPage,
  StudentCoursesPage,
  VirtualClassroomSupervisionPage,
  LegacyAcademicReportsPage,
  AcademicReportsPage,
  IncidentsPage,
  NotificationPreferencesPage,
  MessagesPage,
  MeetingsPage,
  SchedulePage,
  CalendarPage,
  PublicAdmissionPage,
  PublicComplaintsBookPage,
} from './lazyPages';
import { renderAcademicRoutes } from './academicRoutes';
import { renderPaymentRoutes } from './paymentRoutes';
import { renderSuperAdminRoutes } from './superAdminRoutes';

export { ProtectedRoute, PublicRoute, RoleGuard, TeacherAssignmentsRedirect };

export const AppRouter: React.FC = () => {
  React.useEffect(() => {
    if (currentSchoolSlug) {
      let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex,nofollow');

      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.remove();
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Web de marketing de KIPUX (pública) */}
          <Route
            path="/"
            element={
              currentSchoolSlug ? (
                <PublicRoute>
                  <SchoolLoginPage codeOverride={currentSchoolSlug} />
                </PublicRoute>
              ) : (
                <LandingPage />
              )
            }
          />

          {/* Ingreso: primero el código del colegio, luego la página propia de ese colegio */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                {currentSchoolSlug ? <SchoolLoginPage codeOverride={currentSchoolSlug} /> : <SchoolCodePage />}
              </PublicRoute>
            }
          />
          <Route
            path="/c/:code"
            element={
              <PublicRoute>
                <SchoolLoginPage />
              </PublicRoute>
            }
          />
          {/* Ingreso general sin código (administración de la plataforma y accesos de prueba) */}
          <Route
            path="/login/general"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Recuperación de contraseña (P1) */}
          <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/restablecer" element={<ResetPasswordPage />} />

          {/* Rutas Públicas Legales (Ley 29733) */}
          <Route path="/privacidad" element={<PrivacyPolicyPage />} />
          <Route path="/terminos" element={<TermsPage />} />

          {/* Formularios públicos del colegio (sin cuenta): admisión y Libro de Reclamaciones */}
          <Route path="/admision/:schoolId" element={<PublicAdmissionPage />} />
          <Route path="/reclamaciones/:schoolId" element={<PublicComplaintsBookPage />} />

          {/* Protected Dashboard Layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Rutas protegidas por Rol */}
            <Route
              path="/announcements"
              element={
                <RoleGuard allowedRoles={ALL_ROLES}>
                  <AnnouncementsPage />
                </RoleGuard>
              }
            />

            <Route path="/curricular-areas" element={<Navigate to="/academic/study-plan" replace />} />
            <Route path="/teacher-assignments" element={<TeacherAssignmentsRedirect />} />

            {renderAcademicRoutes()}
            {renderPaymentRoutes()}

            <Route
              path="/grades"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <GradesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/virtual-classroom"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <StudentCoursesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/virtual-classroom-supervision"
              element={
                <RoleGuard allowedRoles={OFFICE}>
                  <PlanGuard minPlan="PRO">
                    <VirtualClassroomSupervisionPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />

            {/* Asistencia: cuatro pantallas bajo una sola entrada del menú, como pestañas */}
            <Route element={<SectionTabsLayout group="attendance" />}>
              <Route
                path="/attendance"
                element={
                  <RoleGuard allowedRoles={ALL_ROLES}>
                    <AttendancePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/course-attendance"
                element={
                  <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']}>
                    <CourseAttendancePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/attendance-justifications"
                element={
                  <RoleGuard allowedRoles={STAFF}>
                    <AttendanceJustificationsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/attendance-alerts"
                element={
                  <RoleGuard allowedRoles={STAFF}>
                    <AttendanceAlertsPage />
                  </RoleGuard>
                }
              />
            </Route>

            {/* Reportes académicos: los dos centros de reportes, como pestañas */}
            <Route element={<SectionTabsLayout group="reports" />}>
              <Route
                path="/academic/reports"
                element={
                  <RoleGuard allowedRoles={OFFICE}>
                    <PlanGuard minPlan="PRO">
                      <AcademicReportsPage />
                    </PlanGuard>
                  </RoleGuard>
                }
              />
              <Route
                path="/academic-reports"
                element={
                  <RoleGuard allowedRoles={STAFF}>
                    <PlanGuard minPlan="PRO">
                      <LegacyAcademicReportsPage />
                    </PlanGuard>
                  </RoleGuard>
                }
              />
            </Route>

            <Route
              path="/incidents"
              element={
                <RoleGuard allowedRoles={ALL_ROLES}>
                  <IncidentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/schedule"
              element={
                <RoleGuard allowedRoles={ALL_ROLES}>
                  <SchedulePage />
                </RoleGuard>
              }
            />
            <Route
              path="/calendar"
              element={
                <RoleGuard allowedRoles={ALL_ROLES}>
                  <CalendarPage />
                </RoleGuard>
              }
            />
            <Route
              path="/messages"
              element={
                <RoleGuard
                  allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT']}
                  disallowStudents
                >
                  <MessagesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/meetings"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT']} disallowStudents>
                  <MeetingsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/notification-preferences"
              element={
                <RoleGuard allowedRoles={ALL_ROLES}>
                  <NotificationPreferencesPage />
                </RoleGuard>
              }
            />

            {renderSuperAdminRoutes()}

            {/* Dirección inexistente: se explica dentro de la app (sin sesión, ProtectedRoute lleva al ingreso) */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
