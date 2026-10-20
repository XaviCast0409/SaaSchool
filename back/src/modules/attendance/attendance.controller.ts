import { Request, Response } from 'express';
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
  attendanceSheetQuerySchema,
  saveAttendanceSheetSchema,
  upsertAttendanceScheduleConfigSchema,
  closeClassroomAttendanceSchema,
} from './attendance.schema';
import type { AttendanceService } from './attendance.service';

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
    response.status(200).json({ status: 'success', data: result });
  };
}
