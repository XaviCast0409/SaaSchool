import { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import {
  sessionQuerySchema,
  saveSessionSchema,
  summaryQuerySchema,
} from './course-attendance.schema';
import { courseAttendanceService, CourseAttendanceService } from './course-attendance.service';

export class CourseAttendanceController {
  constructor(private readonly service: CourseAttendanceService) {}

  getSession = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const user = { id: request.user!.userId, role: request.user!.role };
    const query = sessionQuerySchema.parse(request.query);

    const result = await this.service.getSession(schoolId, query, user);
    response.status(200).json({ status: 'success', data: result });
  };

  saveSession = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userId = request.user!.userId;
    const user = { id: userId, role: request.user!.role };
    const dto = saveSessionSchema.parse(request.body);

    const session = await this.service.saveSession(schoolId, userId, dto, user);

    recordAudit(request, {
      action: 'COURSE_ATTENDANCE_SAVED',
      entity: 'CourseAttendanceSession',
      entityId: session.id,
      after: {
        courseAssignmentId: dto.courseAssignmentId,
        date: dto.date,
        periodLabel: dto.periodLabel,
        recordsCount: dto.records.length,
      },
    });

    response.status(200).json({ status: 'success', data: session });
  };

  getSummary = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const user = { id: request.user!.userId, role: request.user!.role };
    const query = summaryQuerySchema.parse(request.query);

    const result = await this.service.getSummary(schoolId, query, user);
    response.status(200).json({ status: 'success', data: result });
  };
}

export const courseAttendanceController = new CourseAttendanceController(courseAttendanceService);
