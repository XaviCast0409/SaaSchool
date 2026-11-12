import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PrivacyPolicyPage } from '@/features/legal/pages/PrivacyPolicyPage';
import { TermsPage } from '@/features/legal/pages/TermsPage';
import { PlanGuard } from '@/components/ui/PlanGuard';
import { PageLoader } from '@/components/ui/PageLoader';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const StudentsPage = lazy(() =>
  import('@/features/students/pages/StudentsPage').then((m) => ({ default: m.StudentsPage })),
);
const PaymentsPage = lazy(() =>
  import('@/features/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const GradesPage = lazy(() =>
  import('@/features/grades/pages/GradesPage').then((m) => ({ default: m.GradesPage })),
);
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

/** Guardia por Rol: previene navegación por URL si el usuario no tiene permisos */
const RoleGuard: React.FC<{
  allowedRoles: string[];
  disallowStudents?: boolean;
  children: React.ReactNode;
}> = ({ allowedRoles, disallowStudents = false, children }) => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  if (token && !user) {
    return null;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (disallowStudents && user.role === 'STUDENT') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Rutas Públicas Legales (Ley 29733) */}
          <Route path="/privacidad" element={<PrivacyPolicyPage />} />
          <Route path="/terminos" element={<TermsPage />} />

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
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <AnnouncementsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/directory"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <DirectoryPage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic-years"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <AcademicYearsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/classrooms"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <ClassroomsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/curricular-areas"
              element={<Navigate to="/academic/study-plan" replace />}
            />
            <Route
              path="/teacher-assignments"
              element={<TeacherAssignmentsRedirect />}
            />
            <Route
              path="/academic"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <AcademicHomePage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic/study-plan"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <StudyPlanPage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic/teaching-load"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <TeachingLoadPage />
                </RoleGuard>
              }
            />
            <Route
              path="/academic/progress"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <PlanGuard minPlan="PRO">
                    <PeriodProgressPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/academic/reports"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE']}>
                  <PlanGuard minPlan="PRO">
                    <AcademicReportsPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/academic/report-cards/print"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']}>
                  <PlanGuard minPlan="PRO">
                    <ReportCardsPrintPage />
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
              path="/gradebook/:assignmentId"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']}>
                  <PlanGuard minPlan="PRO">
                    <GradebookPage />
                  </PlanGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/students"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE']}>
                  <StudentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/payments"
              element={
                <RoleGuard
                  allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'PARENT']}
                  disallowStudents
                >
                  <PaymentsPage />
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
              path="/academic-reports"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']}>
                  <PlanGuard minPlan="PRO">
                    <LegacyAcademicReportsPage />
                  </PlanGuard>
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
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE']}>
                  <VirtualClassroomSupervisionPage />
                </RoleGuard>
              }
            />
            <Route
              path="/attendance"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <AttendancePage />
                </RoleGuard>
              }
            />
            <Route
              path="/attendance-justifications"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']}>
                  <AttendanceJustificationsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/attendance-alerts"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']}>
                  <AttendanceAlertsPage />
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
              path="/incidents"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <IncidentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/evaluation-criteria"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <EvaluationCriteriaPage />
                </RoleGuard>
              }
            />
            <Route
              path="/schedule"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <SchedulePage />
                </RoleGuard>
              }
            />
            <Route
              path="/calendar"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <CalendarPage />
                </RoleGuard>
              }
            />
            <Route
              path="/messages"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT']} disallowStudents>
                  <MessagesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/meetings"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT']} disallowStudents>
                  <MeetingsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/automations"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                  <AutomationsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/notification-preferences"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']}>
                  <NotificationPreferencesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
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
          </Route>

          {/* Default Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
