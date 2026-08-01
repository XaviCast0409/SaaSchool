import { Request, Response } from 'express';
import {
  createAttendanceSchema,
  updateAttendanceSchema,
  bulkAttendanceSchema,
  attendanceFilterSchema,
  attendanceSummaryQuerySchema,
} from './attendance.schema';
import type { AttendanceService } from './attendance.service';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** GET /api/attendance?date=YYYY-MM-DD&classroomId=UUID */
  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const filters = attendanceFilterSchema.parse(request.query);
    const attendances = await this.attendanceService.getAttendanceByFilters(schoolId, filters);
    response.status(200).json({ status: 'success', data: attendances });
  };

  /** GET /api/attendance/summary?month=YYYY-MM&classroomId=UUID */
  getSummary = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const query = attendanceSummaryQuerySchema.parse(request.query);
    const summary = await this.attendanceService.getMonthlySummary(schoolId, query);
    response.status(200).json({ status: 'success', data: summary });
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
}
