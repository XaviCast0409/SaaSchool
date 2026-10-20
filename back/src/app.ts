import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { globalErrorHandler } from './core/middlewares/error-handler.middleware';
import { authRateLimiter, apiRateLimiter } from './core/middlewares/rate-limiter.middleware';

// Importar todos los routers de los módulos
import { authRouter } from './modules/auth/auth.routes';
import { schoolRouter } from './modules/schools/school.routes';
import { userRouter } from './modules/users/user.routes';
import { studentRouter } from './modules/students/student.routes';
import { academicYearRouter } from './modules/academic-years/academic-year.routes';
import { classroomRouter } from './modules/classrooms/classroom.routes';
import { enrollmentRouter } from './modules/enrollments/enrollment.routes';
import { paymentRouter } from './modules/payments/payment.routes';
import { curricularAreaRouter } from './modules/curricular-areas/curricular-area.routes';
import { gradeRouter } from './modules/grades/grade.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { familyRelationshipRouter } from './modules/family-relationships/family-relationship.routes';
import { announcementRouter } from './modules/announcements/announcement.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { courseAssignmentRouter } from './modules/course-assignments/course-assignment.routes';
import { courseContentRouter } from './modules/course-contents/course-content.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { uploadRouter } from './modules/uploads/upload.routes';
import { academicReportRouter } from './modules/academic-reports/academic-report.routes';
import path from 'path';

const app = express();

// ============================================================================
// MIDDLEWARES GLOBALES Y SEGURIDAD
// ============================================================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos subidos (/uploads/materials/...)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SaaSchool API',
  });
});

// ============================================================================
// RUTAS DE LA API
// ============================================================================
const API_PREFIX = '/api';

// Aplicar Rate Limiters
app.use(`${API_PREFIX}/auth`, authRateLimiter, authRouter);
app.use(API_PREFIX, apiRateLimiter);

app.use(`${API_PREFIX}/schools`, schoolRouter);
app.use(`${API_PREFIX}/users`, userRouter);
app.use(`${API_PREFIX}/students`, studentRouter);
app.use(`${API_PREFIX}/academic-years`, academicYearRouter);
app.use(`${API_PREFIX}/classrooms`, classroomRouter);
app.use(`${API_PREFIX}/enrollments`, enrollmentRouter);
app.use(`${API_PREFIX}/payments`, paymentRouter);
app.use(`${API_PREFIX}/curricular-areas`, curricularAreaRouter);
app.use(`${API_PREFIX}/grades`, gradeRouter);
app.use(`${API_PREFIX}/attendance`, attendanceRouter);
app.use(`${API_PREFIX}/family-relationships`, familyRelationshipRouter);
app.use(`${API_PREFIX}/announcements`, announcementRouter);

// Catálogos MINEDU — sin autenticación (datos de referencia del sistema)
app.use(`${API_PREFIX}/catalog`, catalogRouter);
app.use(`${API_PREFIX}/course-assignments`, courseAssignmentRouter);
app.use(`${API_PREFIX}/notifications`, notificationRouter);
app.use(`${API_PREFIX}/uploads`, uploadRouter);
app.use(`${API_PREFIX}/course-contents`, courseContentRouter);
app.use(`${API_PREFIX}/academic-reports`, academicReportRouter);

// ============================================================================
// RUTA NO ENCONTRADA (404)
// ============================================================================
app.use((_req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Ruta no encontrada',
  });
});

// ============================================================================
// GLOBAL ERROR HANDLER (SIEMPRE ÚLTIMO)
// ============================================================================
app.use(globalErrorHandler);

export { app };
