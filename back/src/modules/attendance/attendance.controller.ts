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
} from './attendance.schema';
import type { AttendanceService } from './attendance.service';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** GET /api/attendance?date=YYYY-MM-DD&classroomId=UUID&page=1&limit=50 */
  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const filters = attendanceFilterSchema.parse(request.query);
    const result = await this.attendanceService.getAttendanceByFilters(schoolId, filters);
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
    const query = attendanceMatrixQuerySchema.parse(request.query);
    const matrix = await this.attendanceService.getMonthlyMatrixData(schoolId, query);
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
    const createAttendanceDto = createAttendanceSchema.parse(request.body);
    const attendance = await this.attendanceService.registerAttendance(
      schoolId,
      createAttendanceDto,
    );
    response.status(201).json({ status: 'success', data: attendance });
  };

  /** POST /api/attendance/bulk */
  registerBulk = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const bulkAttendanceDto = bulkAttendanceSchema.parse(request.body);
    const result = await this.attendanceService.registerBulkAttendance(
      schoolId,
      bulkAttendanceDto,
    );
    response.status(201).json({ status: 'success', data: result });
  };

  /** PATCH /api/attendance/:id — Corregir asistencia */
  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const updateAttendanceDto = updateAttendanceSchema.parse(request.body);
    const attendance = await this.attendanceService.updateAttendance(
      id,
      schoolId,
      updateAttendanceDto,
    );
    response.status(200).json({ status: 'success', data: attendance });
  };

  /** POST /api/attendance/scan — Escaneo rápido de código QR / código de barras en puerta o kiosco */
  scan = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const scanDto = scanAttendanceSchema.parse(request.body);
    const result = await this.attendanceService.scanAttendance(schoolId, scanDto);
    response.status(200).json({ status: 'success', data: result });
  };
}
