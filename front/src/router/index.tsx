import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { StudentsPage } from '@/features/students/pages/StudentsPage';
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage';
import { GradesPage } from '@/features/grades/pages/GradesPage';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { DirectoryPage } from '@/features/users/pages/DirectoryPage';
import { AnnouncementsPage } from '@/features/announcements/pages/AnnouncementsPage';
import { ClassroomsPage } from '@/features/classrooms/pages/ClassroomsPage';
import { CurricularAreasPage } from '@/features/curricular-areas/pages/CurricularAreasPage';
import { TeacherAssignmentsPage } from '@/features/course-assignments/pages/TeacherAssignmentsPage';
import { AcademicYearsPage } from '@/features/academic-years/pages/AcademicYearsPage';
import { EvaluationCriteriaPage } from '@/features/grades/pages/EvaluationCriteriaPage';
import { SuperAdminPage } from '@/features/super-admin/pages/SuperAdminPage';
import { StudentCoursesPage } from '@/features/course-contents/pages/StudentCoursesPage';
import { VirtualClassroomSupervisionPage } from '@/features/course-contents/pages/VirtualClassroomSupervisionPage';
import { AcademicReportsPage } from '@/features/academic-reports/pages/AcademicReportsPage';
import { PlanGuard } from '@/components/ui/PlanGuard';

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

  const isStudent = Boolean(
    user.email &&
      (user.email.toLowerCase().includes('alumno') || user.email.toLowerCase().includes('estudiante')),
  );

  if (disallowStudents && isStudent) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
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
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT']}>
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
            element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']}>
                <CurricularAreasPage />
              </RoleGuard>
            }
          />
          <Route
            path="/teacher-assignments"
            element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER']}>
                <TeacherAssignmentsPage />
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
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT']}>
                <GradesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/academic-reports"
            element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']}>
                <PlanGuard minPlan="PRO">
                  <AcademicReportsPage />
                </PlanGuard>
              </RoleGuard>
            }
          />
          <Route
            path="/virtual-classroom"
            element={
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT']}>
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
              <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT']}>
                <AttendancePage />
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
    </BrowserRouter>
  );
};
