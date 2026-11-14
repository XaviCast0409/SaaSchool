import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { env } from './config/env';
import { AppError } from './core/errors/app-error';
import { globalErrorHandler } from './core/middlewares/error-handler.middleware';
import {
  authIpRateLimiter,
  apiRateLimiter,
  ipFloodRateLimiter,
  fileContentRateLimiter,
} from './core/middlewares/rate-limiter.middleware';

import { authRouter } from './modules/auth/auth.routes';
import { schoolRouter } from './modules/schools/school.routes';
import { userRouter } from './modules/users/user.routes';
import { studentRouter } from './modules/students/student.routes';
import { academicYearRouter } from './modules/academic-years/academic-year.routes';
import { classroomRouter } from './modules/classrooms/classroom.routes';
import { enrollmentRouter } from './modules/enrollments/enrollment.routes';
import { paymentRouter } from './modules/payments/payment.routes';
import { gradeRouter } from './modules/grades/grade.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { familyRelationshipRouter } from './modules/family-relationships/family-relationship.routes';
import { announcementRouter } from './modules/announcements/announcement.routes';
import { courseAssignmentRouter } from './modules/course-assignments/course-assignment.routes';
import { courseContentRouter } from './modules/course-contents/course-content.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { uploadRouter } from './modules/uploads/upload.routes';
import { academicReportRouter } from './modules/academic-reports/academic-report.routes';
import { incidentRouter } from './modules/incidents/incident.routes';
import { fileRouter } from './modules/files/file.routes';
import { auditLogRouter } from './modules/audit-logs/audit-log.routes';
import { legalRouter } from './modules/legal/legal.routes';
import { pickupRouter } from './modules/pickups/pickup.routes';
import { courseAttendanceRouter } from './modules/course-attendance/course-attendance.routes';
import { academicRouter } from './modules/academic/academic.routes';
import { siagieRouter } from './modules/siagie/siagie.routes';
import { automationRouter } from './modules/automations/automation.routes';
import { messagingRouter } from './modules/messaging/messaging.routes';
import { meetingRouter } from './modules/meetings/meeting.routes';
import { scheduleRouter } from './modules/schedule/schedule.routes';
import { scheduleGeneratorRouter } from './modules/schedule/schedule-generator.routes';
import { calendarRouter } from './modules/calendar/calendar.routes';
import { paymentReportRouter } from './modules/payment-reports/payment-report.routes';
import { familyRouter } from './modules/family/family.routes';
import { insightsRouter } from './modules/insights/insights.routes';
import { teacherResourcesRouter } from './modules/teacher-resources/teacher-resources.routes';
import { calendarFeedRouter } from './modules/calendar/calendar-feed.routes';
import { secretariatRouter } from './modules/secretariat/secretariat.routes';
import { secretariatPublicRouter } from './modules/secretariat/secretariat.public.routes';
import { notificationPreferenceRouter } from './modules/notifications/notification-preference.routes';

const app = express();

// Render (y cualquier PaaS) entrega las peticiones a través de un proxy: confiar en el primer salto
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ============================================================================
// SEGURIDAD
// ============================================================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError('Origen no permitido', 403));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id'],
    maxAge: 86400,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(ipFloodRateLimiter);

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SaaSchool API' });
});

// ============================================================================
// RUTAS
// ============================================================================
const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authIpRateLimiter, authRouter);

// Archivos: la descarga firmada no lleva token, por eso tiene su propio limitador
app.use(`${API_PREFIX}/files`, fileContentRateLimiter, fileRouter);

app.use(API_PREFIX, apiRateLimiter);

app.use(`${API_PREFIX}/schools`, schoolRouter);
app.use(`${API_PREFIX}/users`, userRouter);
app.use(`${API_PREFIX}/students`, studentRouter);
app.use(`${API_PREFIX}/academic-years`, academicYearRouter);
app.use(`${API_PREFIX}/classrooms`, classroomRouter);
app.use(`${API_PREFIX}/enrollments`, enrollmentRouter);
app.use(`${API_PREFIX}/payments`, paymentRouter);
app.use(`${API_PREFIX}/grades`, gradeRouter);
app.use(`${API_PREFIX}/attendance`, attendanceRouter);
app.use(`${API_PREFIX}/family-relationships`, familyRelationshipRouter);
app.use(`${API_PREFIX}/announcements`, announcementRouter);
app.use(`${API_PREFIX}/course-assignments`, courseAssignmentRouter);
app.use(`${API_PREFIX}/notifications/preferences`, notificationPreferenceRouter);
app.use(`${API_PREFIX}/notifications`, notificationRouter);
app.use(`${API_PREFIX}/automations`, automationRouter);
app.use(`${API_PREFIX}/messages`, messagingRouter);
app.use(`${API_PREFIX}/meetings`, meetingRouter);
app.use(`${API_PREFIX}/schedule/generator`, scheduleGeneratorRouter);
app.use(`${API_PREFIX}/schedule`, scheduleRouter);
app.use(`${API_PREFIX}/calendar`, calendarRouter);
app.use(`${API_PREFIX}/payment-reports`, paymentReportRouter);
app.use(`${API_PREFIX}/family`, familyRouter);
app.use(`${API_PREFIX}/insights`, insightsRouter);
app.use(`${API_PREFIX}/teacher-resources`, teacherResourcesRouter);
app.use(`${API_PREFIX}/secretariat`, secretariatRouter);
// Formularios públicos (admisión y Libro de Reclamaciones): sin sesión, con límite propio por IP
app.use(`${API_PREFIX}/public/schools`, secretariatPublicRouter);
// Pública con firma HMAC (suscripción .ics desde Google Calendar / iPhone)
app.use(`${API_PREFIX}/calendar-feed`, fileContentRateLimiter, calendarFeedRouter);
app.use(`${API_PREFIX}/uploads`, uploadRouter);
app.use(`${API_PREFIX}/course-contents`, courseContentRouter);
app.use(`${API_PREFIX}/academic-reports`, academicReportRouter);
app.use(`${API_PREFIX}/incidents`, incidentRouter);
app.use(`${API_PREFIX}/audit-logs`, auditLogRouter);
app.use(`${API_PREFIX}/legal`, legalRouter);
app.use(`${API_PREFIX}/pickups`, pickupRouter);
app.use(`${API_PREFIX}/course-attendance`, courseAttendanceRouter);
app.use(`${API_PREFIX}/academic`, academicRouter);
app.use(`${API_PREFIX}/siagie`, siagieRouter);

app.use((_req, res) => {
  res.status(404).json({ status: 'fail', message: 'Ruta no encontrada' });
});

app.use(globalErrorHandler);

export { app };
