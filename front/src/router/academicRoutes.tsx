import { Route } from 'react-router-dom';
import { PlanGuard } from '@/components/ui/PlanGuard';
import { RoleGuard } from './guards';
import { DIRECTION, OFFICE, STAFF } from '@/lib/roles';
import {
  DirectoryPage,
  AcademicYearsPage,
  ClassroomsPage,
  AcademicHomePage,
  StudyPlanPage,
  TeachingLoadPage,
  PeriodProgressPage,
  ReportCardsPrintPage,
  TutorReportPage,
  MyCoursesPage,
  QuickGradePage,
  GradebookPage,
  StudentsPage,
  EvaluationCriteriaPage,
  TeacherResourcesPage,
  SecretariatPage,
  ProceduresPage,
  InsightsPage,
  GatePage,
  AutomationsPage,
  AuditLogsPage,
} from './lazyPages';

export const renderAcademicRoutes = () => (
  <>
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
      path="/automations"
      element={
        <RoleGuard allowedRoles={DIRECTION}>
          <AutomationsPage />
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
  </>
);
