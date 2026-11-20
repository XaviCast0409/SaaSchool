import { lazy } from 'react';

export const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
export const StudentsPage = lazy(() =>
  import('@/features/students/pages/StudentsPage').then((m) => ({ default: m.StudentsPage })),
);
export const PaymentsPage = lazy(() =>
  import('@/features/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
export const CashPage = lazy(() => import('@/features/payments/pages/CashPage').then((m) => ({ default: m.CashPage })));
export const FeeSchedulesPage = lazy(() =>
  import('@/features/payments/pages/FeeSchedulesPage').then((m) => ({ default: m.FeeSchedulesPage })),
);
export const BenefitsPage = lazy(() =>
  import('@/features/payments/pages/BenefitsPage').then((m) => ({ default: m.BenefitsPage })),
);
export const FinanceReportsPage = lazy(() =>
  import('@/features/payments/pages/FinanceReportsPage').then((m) => ({ default: m.FinanceReportsPage })),
);
export const GradesPage = lazy(() =>
  import('@/features/grades/pages/GradesPage').then((m) => ({ default: m.GradesPage })),
);
export const AttendancePage = lazy(() =>
  import('@/features/attendance/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })),
);
export const AttendanceJustificationsPage = lazy(() =>
  import('@/features/attendance/pages/AttendanceJustificationsPage').then((m) => ({
    default: m.AttendanceJustificationsPage,
  })),
);
export const AttendanceAlertsPage = lazy(() =>
  import('@/features/attendance/pages/AttendanceAlertsPage').then((m) => ({
    default: m.AttendanceAlertsPage,
  })),
);
export const CourseAttendancePage = lazy(() =>
  import('@/features/course-attendance/pages/CourseAttendancePage').then((m) => ({
    default: m.CourseAttendancePage,
  })),
);
export const DirectoryPage = lazy(() =>
  import('@/features/users/pages/DirectoryPage').then((m) => ({ default: m.DirectoryPage })),
);
export const AnnouncementsPage = lazy(() =>
  import('@/features/announcements/pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })),
);
export const ClassroomsPage = lazy(() =>
  import('@/features/classrooms/pages/ClassroomsPage').then((m) => ({ default: m.ClassroomsPage })),
);
export const AcademicYearsPage = lazy(() =>
  import('@/features/academic-years/pages/AcademicYearsPage').then((m) => ({ default: m.AcademicYearsPage })),
);
export const EvaluationCriteriaPage = lazy(() =>
  import('@/features/grades/pages/EvaluationCriteriaPage').then((m) => ({ default: m.EvaluationCriteriaPage })),
);
export const SuperAdminPage = lazy(() =>
  import('@/features/super-admin/pages/SuperAdminPage').then((m) => ({ default: m.SuperAdminPage })),
);
export const SchoolDetailPage = lazy(() =>
  import('@/features/super-admin/pages/SchoolDetailPage').then((m) => ({ default: m.SchoolDetailPage })),
);
export const PlatformAnnouncementsPage = lazy(() =>
  import('@/features/super-admin/pages/PlatformAnnouncementsPage').then((m) => ({
    default: m.PlatformAnnouncementsPage,
  })),
);
export const PlatformHealthPage = lazy(() =>
  import('@/features/super-admin/pages/PlatformHealthPage').then((m) => ({ default: m.PlatformHealthPage })),
);
export const LeadsPage = lazy(() =>
  import('@/features/super-admin/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })),
);
export const LandingPage = lazy(() =>
  import('@/features/marketing/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
export const StudentCoursesPage = lazy(() =>
  import('@/features/course-contents/pages/StudentCoursesPage').then((m) => ({ default: m.StudentCoursesPage })),
);
export const VirtualClassroomSupervisionPage = lazy(() =>
  import('@/features/course-contents/pages/VirtualClassroomSupervisionPage').then((m) => ({
    default: m.VirtualClassroomSupervisionPage,
  })),
);
export const LegacyAcademicReportsPage = lazy(() =>
  import('@/features/academic-reports/pages/AcademicReportsPage').then((m) => ({ default: m.AcademicReportsPage })),
);
export const AcademicHomePage = lazy(() =>
  import('@/features/academic/pages/AcademicHomePage').then((m) => ({ default: m.AcademicHomePage })),
);
export const StudyPlanPage = lazy(() =>
  import('@/features/academic/pages/StudyPlanPage').then((m) => ({ default: m.StudyPlanPage })),
);
export const TeachingLoadPage = lazy(() =>
  import('@/features/academic/pages/TeachingLoadPage').then((m) => ({ default: m.TeachingLoadPage })),
);
export const PeriodProgressPage = lazy(() =>
  import('@/features/academic/pages/PeriodProgressPage').then((m) => ({ default: m.PeriodProgressPage })),
);
export const AcademicReportsPage = lazy(() =>
  import('@/features/academic/pages/AcademicReportsPage').then((m) => ({ default: m.AcademicReportsPage })),
);
export const ReportCardsPrintPage = lazy(() =>
  import('@/features/academic/pages/ReportCardsPrintPage').then((m) => ({ default: m.ReportCardsPrintPage })),
);
export const MyCoursesPage = lazy(() =>
  import('@/features/academic/pages/MyCoursesPage').then((m) => ({ default: m.MyCoursesPage })),
);
export const TutorReportPage = lazy(() =>
  import('@/features/academic/pages/TutorReportPage').then((m) => ({ default: m.TutorReportPage })),
);
export const GradebookPage = lazy(() =>
  import('@/features/academic/pages/GradebookPage').then((m) => ({ default: m.GradebookPage })),
);
export const IncidentsPage = lazy(() =>
  import('@/features/incidents/pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage })),
);
export const AutomationsPage = lazy(() =>
  import('@/features/automations/pages/AutomationsPage').then((m) => ({ default: m.AutomationsPage })),
);
export const NotificationPreferencesPage = lazy(() =>
  import('@/features/notifications/pages/NotificationPreferencesPage').then((m) => ({
    default: m.NotificationPreferencesPage,
  })),
);
export const MessagesPage = lazy(() =>
  import('@/features/messages/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
export const MeetingsPage = lazy(() =>
  import('@/features/meetings/pages/MeetingsPage').then((m) => ({ default: m.MeetingsPage })),
);
export const SchedulePage = lazy(() =>
  import('@/features/schedule/pages/SchedulePage').then((m) => ({ default: m.SchedulePage })),
);
export const CalendarPage = lazy(() =>
  import('@/features/calendar/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
export const TeacherResourcesPage = lazy(() =>
  import('@/features/teacher-resources/pages/TeacherResourcesPage').then((m) => ({ default: m.TeacherResourcesPage })),
);
export const QuickGradePage = lazy(() =>
  import('@/features/academic/pages/QuickGradePage').then((m) => ({ default: m.QuickGradePage })),
);
export const InsightsPage = lazy(() =>
  import('@/features/insights/pages/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);
export const GatePage = lazy(() =>
  import('@/features/family/pages/GatePage').then((m) => ({ default: m.GatePage })),
);
export const SecretariatPage = lazy(() =>
  import('@/features/secretariat/pages/SecretariatPage').then((m) => ({ default: m.SecretariatPage })),
);
export const ProceduresPage = lazy(() =>
  import('@/features/secretariat/pages/ProceduresPage').then((m) => ({ default: m.ProceduresPage })),
);
export const PublicAdmissionPage = lazy(() =>
  import('@/features/secretariat/pages/PublicAdmissionPage').then((m) => ({ default: m.PublicAdmissionPage })),
);
export const PublicComplaintsBookPage = lazy(() =>
  import('@/features/secretariat/pages/PublicComplaintsBookPage').then((m) => ({
    default: m.PublicComplaintsBookPage,
  })),
);
export const AuditLogsPage = lazy(() =>
  import('@/features/audit-logs/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })),
);
