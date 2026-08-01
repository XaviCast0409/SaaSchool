import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { globalErrorHandler } from './core/middlewares/error-handler.middleware';

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

const app = express();

// ============================================================================
// MIDDLEWARES GLOBALES
// ============================================================================
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use(`${API_PREFIX}/auth`, authRouter);
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
