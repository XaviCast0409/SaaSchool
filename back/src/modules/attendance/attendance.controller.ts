import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { recordAudit } from '../../utils/audit.util';
import {
  createAttendanceSchema,
  updateAttendanceSchema,
  bulkAttendanceSchema,
  attendanceFilterSchema,
  attendanceSummaryQuerySchema,
  attendanceExportQuerySchema,
  attendanceMatrixQuerySchema,
  studentAttendanceQuerySchema,
  scanAttendanceSchema,
  scanBatchSchema,
  attendanceSheetQuerySchema,
  saveAttendanceSheetSchema,
  upsertAttendanceScheduleConfigSchema,
  closeClassroomAttendanceSchema,
  createJustificationSchema,
  reviewJustificationSchema,
  justificationFilterSchema,
} from './attendance.schema';
import type { AttendanceService } from './attendance.service';
import { attendanceJustificationService } from './attendance-justification.service';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** GET /api/attendance?date=YYYY-MM-DD&classroomId=UUID&page=1&limit=50 */
  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const filters = attendanceFilterSchema.parse(request.query);
    const result = await this.attendanceService.getAttendanceByFilters(schoolId, filters, userContext);
    response.status(200).json({ status: 'success', ...result });
  };

  /** GET /api/attendance/summary?month=YYYY-MM&classroomId=UUID */
  getSummary = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const query = attendanceSummaryQuerySchema.parse(request.query);
    const summary = await this.attendanceService.getMonthlySummary(schoolId, query);
    response.status(200).json({ status: 'success', data: summary });
  };

  /** GET /api/attendance/export?month=YYYY-MM&classroomId=UUID */
  getExport = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const query = attendanceExportQuerySchema.parse(request.query);
    const rows = await this.attendanceService.getMonthlyExportData(schoolId, query);
    response.status(200).json({ status: 'success', data: rows });
  };

  /** GET /api/attendance/matrix?month=YYYY-MM&classroomId=UUID — Sábana mensual interactiva por días (1..31) */
  getMatrix = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const query = attendanceMatrixQuerySchema.parse(request.query);
    const matrix = await this.attendanceService.getMonthlyMatrixData(schoolId, query, userContext);
    response.status(200).json({ status: 'success', data: matrix });
  };

  /** GET /api/attendance/student/:enrollmentId/summary?month=YYYY-MM — Expediente individual del alumno */
  getStudentDetail = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollmentId = String(request.params.enrollmentId);

    if (request.user!.role === 'STUDENT') {
      const myStudentId = request.user!.studentId || request.user!.userId;
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { studentId: true },
      });
      if (!enrollment || enrollment.studentId !== myStudentId) {
        throw new AppError('No tienes permiso para consultar la asistencia de otro estudiante.', 403);
      }
    }

    const query = studentAttendanceQuerySchema.parse(request.query);
    const detail = await this.attendanceService.getStudentMonthlyDetail(
      schoolId,
      enrollmentId,
      query,
    );
    response.status(200).json({ status: 'success', data: detail });
  };

  /** GET /api/attendance/enrollment/:enrollmentId */
  getByEnrollment = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollmentId = String(request.params.enrollmentId);

    if (request.user!.role === 'STUDENT') {
      const myStudentId = request.user!.studentId || request.user!.userId;
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { studentId: true },
      });
      if (!enrollment || enrollment.studentId !== myStudentId) {
        throw new AppError('No tienes permiso para consultar la asistencia de otro estudiante.', 403);
      }
    }

    const attendances = await this.attendanceService.getAttendanceByEnrollment(
      enrollmentId,
      schoolId,
    );
    response.status(200).json({ status: 'success', data: attendances });
  };

  /** POST /api/attendance */
  register = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const createAttendanceDto = createAttendanceSchema.parse(request.body);
    const attendance = await this.attendanceService.registerAttendance(
      schoolId,
      createAttendanceDto,
      userContext,
    );
    response.status(201).json({ status: 'success', data: attendance });
  };

  /** POST /api/attendance/bulk */
  registerBulk = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const bulkAttendanceDto = bulkAttendanceSchema.parse(request.body);
    const result = await this.attendanceService.registerBulkAttendance(
      schoolId,
      bulkAttendanceDto,
      userContext,
    );
    response.status(201).json({ status: 'success', data: result });
  };

  /** PATCH /api/attendance/:id — Corregir asistencia */
  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const id = String(request.params.id);
    const updateAttendanceDto = updateAttendanceSchema.parse(request.body);
    const attendance = await this.attendanceService.updateAttendance(
      id,
      schoolId,
      updateAttendanceDto,
      userContext,
    );
    response.status(200).json({ status: 'success', data: attendance });
  };

  /** POST /api/attendance/scan — Escaneo rápido de código QR / código de barras en puerta o kiosco */
  scan = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const scanDto = scanAttendanceSchema.parse(request.body);
    const result = await this.attendanceService.scanAttendance(schoolId, scanDto, userContext);
    response.status(200).json({ status: 'success', data: result });
  };

  /** POST /api/attendance/scan/batch — Sincronización de escaneos sin conexión */
  scanBatch = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const dto = scanBatchSchema.parse(request.body);

    const results = [];
    for (const item of dto.items) {
      try {
        const r = await this.attendanceService.scanAttendance(
          schoolId,
          { code: item.code, scannedAt: item.scannedAt, toleranceTime: item.toleranceTime },
          userContext,
        );
        results.push({
          clientId: item.clientId,
          ok: true,
          alreadyRegistered: r.alreadyRegistered,
          status: r.status,
          studentName: r.student.fullName,
        });
      } catch (error) {
        const appError = error instanceof AppError ? error : null;
        results.push({
          clientId: item.clientId,
          ok: false,
          httpStatus: appError?.statusCode ?? 500,
          error: appError?.message ?? 'Error interno',
        });
      }
    }
    response.status(200).json({ status: 'success', data: { results } });
  };

  /** GET /api/attendance/scan-roster — Padrón minimizado para escaneo sin conexión */
  getScanRoster = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const roster = await this.attendanceService.getScanRoster(schoolId, userContext);
    response.status(200).json({ status: 'success', data: roster });
  };

  /** GET /api/attendance/sheet?classroomId=UUID&date=YYYY-MM-DD — Hoja unificada de asistencia para pase de lista */
  getSheet = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const query = attendanceSheetQuerySchema.parse(request.query);
    const sheet = await this.attendanceService.getAttendanceSheet(schoolId, query, userContext);
    response.status(200).json({ status: 'success', data: sheet });
  };

  /** PUT /api/attendance/sheet — Guardar o actualizar la hoja de asistencia de un aula (Upsert Atómico) */
  saveSheet = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const dto = saveAttendanceSheetSchema.parse(request.body);
    const result = await this.attendanceService.saveAttendanceSheet(schoolId, dto, userContext);
    response.status(200).json({ status: 'success', data: result });
  };

  /** GET /api/attendance/config — Consultar horarios de asistencia configurados */
  getScheduleConfigs = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const configs = await this.attendanceService.getScheduleConfigs(schoolId);
    response.status(200).json({ status: 'success', data: configs });
  };

  /** PUT /api/attendance/config — Configurar horarios de entrada, tardanza y auto-cierre */
  upsertScheduleConfig = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = upsertAttendanceScheduleConfigSchema.parse(request.body);
    const config = await this.attendanceService.upsertScheduleConfig(schoolId, dto);
    response.status(200).json({ status: 'success', data: config });
  };

  /** POST /api/attendance/close — Cierre de asistencia: asigna Falta Injustificada a los no registrados */
  closeAttendance = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      schoolId,
    };
    const dto = closeClassroomAttendanceSchema.parse(request.body || {});
    const result = await this.attendanceService.closeAttendance(schoolId, dto, userContext);
    recordAudit(request, {
      action: 'ATTENDANCE_CLOSED_MANUALLY',
      entity: 'Attendance',
      entityId: null,
      after: { ...request.body, closedCount: result.closedCount },
    });
    response.status(200).json({ status: 'success', data: result });
  };

  /** GET /api/attendance/holidays?year=YYYY */
  getHolidays = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const year = request.query.year ? Number(request.query.year) : new Date().getFullYear();
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        schoolId,
        date: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T00:00:00.000Z`),
        },
      },
      orderBy: { date: 'asc' },
    });
    response.status(200).json({ status: 'success', data: holidays });
  };

  /** POST /api/attendance/holidays */
  createHoliday = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const holidaySchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
      name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
    });
    const { date, name } = holidaySchema.parse(request.body);
    const holiday = await prisma.schoolHoliday.create({
      data: {
        schoolId,
        date: new Date(`${date}T00:00:00.000Z`),
        name,
      },
    });
    response.status(201).json({ status: 'success', data: holiday });
  };

  /** DELETE /api/attendance/holidays/:holidayId */
  deleteHoliday = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const holidayId = request.params.holidayId as string;
    const result = await prisma.schoolHoliday.deleteMany({
      where: { id: holidayId, schoolId },
    });
    if (result.count === 0) {
      throw new AppError('Feriado no encontrado.', 404);
    }
    response.status(200).json({ status: 'success', message: 'Feriado eliminado correctamente.' });
  };

  /** GET /api/attendance/justifications */
  listJustifications = async (request: Request, response: Response): Promise<void> => {
    const filters = justificationFilterSchema.parse(request.query);
    const result = await attendanceJustificationService.list(request.user!, filters);
    response.status(200).json({ status: 'success', data: result.data, meta: result.meta });
  };

  /** POST /api/attendance/justifications */
  createJustification = async (request: Request, response: Response): Promise<void> => {
    const dto = createJustificationSchema.parse(request.body);
    const result = await attendanceJustificationService.create(request.user!, dto);
    recordAudit(request, {
      action: 'ATTENDANCE_JUSTIFICATION_CREATED',
      entity: 'AttendanceJustification',
      entityId: result.id,
      after: {
        enrollmentId: result.enrollmentId,
        reason: result.reason,
        dateFrom: result.dateFrom,
        dateTo: result.dateTo,
        status: result.status,
      },
    });
    response.status(201).json({ status: 'success', data: result });
  };

  /** PATCH /api/attendance/justifications/:justificationId/review */
  reviewJustification = async (request: Request, response: Response): Promise<void> => {
    const justificationId = request.params.justificationId as string;
    const dto = reviewJustificationSchema.parse(request.body);
    const result = await attendanceJustificationService.review(request.user!, justificationId, dto);
    recordAudit(request, {
      action:
        dto.decision === 'APPROVED'
          ? 'ATTENDANCE_JUSTIFICATION_APPROVED'
          : 'ATTENDANCE_JUSTIFICATION_REJECTED',
      entity: 'AttendanceJustification',
      entityId: result.id,
      after: {
        decision: dto.decision,
        reviewNote: dto.reviewNote,
        status: result.status,
      },
    });
    response.status(200).json({ status: 'success', data: result });
  };
}
