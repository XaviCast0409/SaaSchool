import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
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
import { NoAccessPage, NotFoundPage } from '@/components/ui/StatusPages';
import { SectionTabsLayout } from '@/layouts/SectionTabsLayout';
import { currentSchoolSlug } from '@/lib/schoolDomain';
import { DIRECTION, OFFICE, STAFF, ALL_ROLES, type Role } from '@/lib/roles';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const StudentsPage = lazy(() =>
  import('@/features/students/pages/StudentsPage').then((m) => ({ default: m.StudentsPage })),
);
const PaymentsPage = lazy(() =>
  import('@/features/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const CashPage = lazy(() => import('@/features/payments/pages/CashPage').then((m) => ({ default: m.CashPage })));
const FeeSchedulesPage = lazy(() =>
  import('@/features/payments/pages/FeeSchedulesPage').then((m) => ({ default: m.FeeSchedulesPage })),
);
const BenefitsPage = lazy(() =>
  import('@/features/payments/pages/BenefitsPage').then((m) => ({ default: m.BenefitsPage })),
);
const FinanceReportsPage = lazy(() =>
  import('@/features/payments/pages/FinanceReportsPage').then((m) => ({ default: m.FinanceReportsPage })),
);
const GradesPage = lazy(() => import('@/features/grades/pages/GradesPage').then((m) => ({ default: m.GradesPage })));
const AttendancePage = lazy(() =>
  import('@/features/attendance/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })),
);
const AttendanceJustificationsPage = lazy(() =>
  import('@/features/attendance/pages/AttendanceJustificationsPage').then((m) => ({
    default: m.AttendanceJustificationsPage,
  })),
);
const AttendanceAlertsPage = lazy(() =>
  import('@/features/attendance/pages/AttendanceAlertsPage').then((m) => ({
    default: m.AttendanceAlertsPage,
  })),
);
const CourseAttendancePage = lazy(() =>
  import('@/features/course-attendance/pages/CourseAttendancePage').then((m) => ({
    default: m.CourseAttendancePage,
  })),
);
const DirectoryPage = lazy(() =>
  import('@/features/users/pages/DirectoryPage').then((m) => ({ default: m.DirectoryPage })),
);
const AnnouncementsPage = lazy(() =>
  import('@/features/announcements/pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })),
);
const ClassroomsPage = lazy(() =>
  import('@/features/classrooms/pages/ClassroomsPage').then((m) => ({ default: m.ClassroomsPage })),
);
const AcademicYearsPage = lazy(() =>
  import('@/features/academic-years/pages/AcademicYearsPage').then((m) => ({ default: m.AcademicYearsPage })),
);
const EvaluationCriteriaPage = lazy(() =>
  import('@/features/grades/pages/EvaluationCriteriaPage').then((m) => ({ default: m.EvaluationCriteriaPage })),
);
const SuperAdminPage = lazy(() =>
  import('@/features/super-admin/pages/SuperAdminPage').then((m) => ({ default: m.SuperAdminPage })),
);
const SchoolDetailPage = lazy(() =>
  import('@/features/super-admin/pages/SchoolDetailPage').then((m) => ({ default: m.SchoolDetailPage })),
);
const PlatformAnnouncementsPage = lazy(() =>
  import('@/features/super-admin/pages/PlatformAnnouncementsPage').then((m) => ({
    default: m.PlatformAnnouncementsPage,
  })),
);
const PlatformHealthPage = lazy(() =>
  import('@/features/super-admin/pages/PlatformHealthPage').then((m) => ({ default: m.PlatformHealthPage })),
);
const LeadsPage = lazy(() => import('@/features/super-admin/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const LandingPage = lazy(() =>
  import('@/features/marketing/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const StudentCoursesPage = lazy(() =>
  import('@/features/course-contents/pages/StudentCoursesPage').then((m) => ({ default: m.StudentCoursesPage })),
);
const VirtualClassroomSupervisionPage = lazy(() =>
  import('@/features/course-contents/pages/VirtualClassroomSupervisionPage').then((m) => ({
    default: m.VirtualClassroomSupervisionPage,
  })),
);
const LegacyAcademicReportsPage = lazy(() =>
  import('@/features/academic-reports/pages/AcademicReportsPage').then((m) => ({ default: m.AcademicReportsPage })),
);
const AcademicHomePage = lazy(() =>
  import('@/features/academic/pages/AcademicHomePage').then((m) => ({ default: m.AcademicHomePage })),
);
const StudyPlanPage = lazy(() =>
  import('@/features/academic/pages/StudyPlanPage').then((m) => ({ default: m.StudyPlanPage })),
);
const TeachingLoadPage = lazy(() =>
  import('@/features/academic/pages/TeachingLoadPage').then((m) => ({ default: m.TeachingLoadPage })),
);
const PeriodProgressPage = lazy(() =>
  import('@/features/academic/pages/PeriodProgressPage').then((m) => ({ default: m.PeriodProgressPage })),
);
const AcademicReportsPage = lazy(() =>
  import('@/features/academic/pages/AcademicReportsPage').then((m) => ({ default: m.AcademicReportsPage })),
);
const ReportCardsPrintPage = lazy(() =>
  import('@/features/academic/pages/ReportCardsPrintPage').then((m) => ({ default: m.ReportCardsPrintPage })),
);
const MyCoursesPage = lazy(() =>
  import('@/features/academic/pages/MyCoursesPage').then((m) => ({ default: m.MyCoursesPage })),
);
const TutorReportPage = lazy(() =>
  import('@/features/academic/pages/TutorReportPage').then((m) => ({ default: m.TutorReportPage })),
);
const GradebookPage = lazy(() =>
  import('@/features/academic/pages/GradebookPage').then((m) => ({ default: m.GradebookPage })),
);
const IncidentsPage = lazy(() =>
  import('@/features/incidents/pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage })),
);
const AutomationsPage = lazy(() =>
  import('@/features/automations/pages/AutomationsPage').then((m) => ({ default: m.AutomationsPage })),
);
const NotificationPreferencesPage = lazy(() =>
  import('@/features/notifications/pages/NotificationPreferencesPage').then((m) => ({
    default: m.NotificationPreferencesPage,
  })),
);
const MessagesPage = lazy(() =>
  import('@/features/messages/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const MeetingsPage = lazy(() =>
  import('@/features/meetings/pages/MeetingsPage').then((m) => ({ default: m.MeetingsPage })),
);
const SchedulePage = lazy(() =>
  import('@/features/schedule/pages/SchedulePage').then((m) => ({ default: m.SchedulePage })),
);
const CalendarPage = lazy(() =>
  import('@/features/calendar/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const TeacherResourcesPage = lazy(() =>
  import('@/features/teacher-resources/pages/TeacherResourcesPage').then((m) => ({ default: m.TeacherResourcesPage })),
);
const QuickGradePage = lazy(() =>
  import('@/features/academic/pages/QuickGradePage').then((m) => ({ default: m.QuickGradePage })),
);
const InsightsPage = lazy(() =>
  import('@/features/insights/pages/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);
const GatePage = lazy(() => import('@/features/family/pages/GatePage').then((m) => ({ default: m.GatePage })));
const SecretariatPage = lazy(() =>
  import('@/features/secretariat/pages/SecretariatPage').then((m) => ({ default: m.SecretariatPage })),
);
const ProceduresPage = lazy(() =>
  import('@/features/secretariat/pages/ProceduresPage').then((m) => ({ default: m.ProceduresPage })),
);
const PublicAdmissionPage = lazy(() =>
  import('@/features/secretariat/pages/PublicAdmissionPage').then((m) => ({ default: m.PublicAdmissionPage })),
);
const PublicComplaintsBookPage = lazy(() =>
  import('@/features/secretariat/pages/PublicComplaintsBookPage').then((m) => ({
    default: m.PublicComplaintsBookPage,
  })),
);
const AuditLogsPage = lazy(() =>
  import('@/features/audit-logs/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })),
);

const TeacherAssignmentsRedirect: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  return <Navigate to={role === 'TEACHER' ? '/my-courses' : '/academic/teaching-load'} replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

/** Guardia por Rol: si el usuario entra por URL a una sección que su rol no incluye, se le avisa */
const RoleGuard: React.FC<{
  allowedRoles: readonly Role[];
  disallowStudents?: boolean;
  children: React.ReactNode;
}> = ({ allowedRoles, disallowStudents = false, children }) => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  if (token && !user) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Sin permiso: se explica en lugar de redirigir en silencio al inicio
  if (!allowedRoles.includes(user.role as Role) || (disallowStudents && user.role === 'STUDENT')) {
    return <NoAccessPage />;
  }

  return <>{children}</>;
};

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
          {/* En el subdominio de un colegio la portada es su página de ingreso, no la web de KIPUX */}
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
            <Route
              path="/directory"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <DirectoryPage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic-years"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <AcademicYearsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/classrooms"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <ClassroomsPage />
                </RoleGuard>
              }
            />
            <Route path="/curricular-areas" element={<Navigate to="/academic/study-plan" replace />} />
            <Route path="/teacher-assignments" element={<TeacherAssignmentsRedirect />} />
            <Route
              path="/academic"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <AcademicHomePage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic/study-plan"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <StudyPlanPage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic/teaching-load"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <TeachingLoadPage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic/progress"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <PlanGuard minPlan="PRO">
                    <PeriodProgressPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/academic/report-cards/print"
              element={
                <RoleGuard allowedRoles={STAFF}>
                  <PlanGuard minPlan="PRO">
                    <ReportCardsPrintPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/academic/tutor-report"
              element={
                <RoleGuard allowedRoles={STAFF}>
                  <PlanGuard minPlan="PRO">
                    <TutorReportPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/my-courses"
              element={
                <RoleGuard allowedRoles={['TEACHER']}>
                  <MyCoursesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/gradebook/:assignmentId/quick"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']}>
                  <PlanGuard minPlan="PRO">
                    <QuickGradePage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/gradebook/:assignmentId"
              element={
                <RoleGuard allowedRoles={STAFF}>
                  <PlanGuard minPlan="PRO">
                    <GradebookPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/students"
              element={
                <RoleGuard allowedRoles={OFFICE}>
                  <StudentsPage />
                </RoleGuard>
              }
            />
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
              path="/evaluation-criteria"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <PlanGuard minPlan="PRO">
                    <EvaluationCriteriaPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/teacher-resources"
              element={
                <RoleGuard allowedRoles={STAFF}>
                  <TeacherResourcesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/secretariat"
              element={
                <RoleGuard allowedRoles={OFFICE}>
                  <SecretariatPage />
                </RoleGuard>
              }
            />
            <Route
              path="/procedures"
              element={
                <RoleGuard allowedRoles={['PARENT']}>
                  <ProceduresPage />
                </RoleGuard>
              }
            />
            <Route
              path="/insights"
              element={
                <RoleGuard allowedRoles={STAFF}>
                  <PlanGuard minPlan="PRO">
                    <InsightsPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/gate"
              element={
                <RoleGuard allowedRoles={OFFICE}>
                  <GatePage />
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
              path="/automations"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <AutomationsPage />
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
            <Route
              path="/audit-logs"
              element={
                <RoleGuard allowedRoles={DIRECTION}>
                  <AuditLogsPage />
                </RoleGuard>
              }
            />
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

            {/* Dirección inexistente: se explica dentro de la app (sin sesión, ProtectedRoute lleva al ingreso) */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
