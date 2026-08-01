import { Request, Response } from 'express';
import { createAttendanceSchema, bulkAttendanceSchema } from './attendance.schema';
import type { AttendanceService } from './attendance.service';

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  getByDate = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const date = request.query.date as string;
    const attendances = await this.attendanceService.getAttendanceByDate(schoolId, date);
    response.status(200).json({ status: 'success', data: attendances });
  };

  getByEnrollment = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollmentId = request.params.enrollmentId as string;
    const attendances = await this.attendanceService.getAttendanceByEnrollment(
      enrollmentId,
      schoolId,
    );
    response.status(200).json({ status: 'success', data: attendances });
  };

  register = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createAttendanceDto = createAttendanceSchema.parse(request.body);
    const attendance = await this.attendanceService.registerAttendance(
      schoolId,
      createAttendanceDto,
    );
    response.status(201).json({ status: 'success', data: attendance });
  };

  registerBulk = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const bulkAttendanceDto = bulkAttendanceSchema.parse(request.body);
    const result = await this.attendanceService.registerBulkAttendance(
      schoolId,
      bulkAttendanceDto,
    );
    response.status(201).json({ status: 'success', data: result });
  };
}
