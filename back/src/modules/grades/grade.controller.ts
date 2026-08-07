import { Request, Response } from 'express';
import { createGradeSchema, createGradeEntrySchema } from './grade.schema';
import type { GradeService } from './grade.service';

export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  getByEnrollment = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollmentId = request.params.enrollmentId as string;
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const grades = await this.gradeService.getGradesByEnrollment(enrollmentId, schoolId, userContext);
    response.status(200).json({ status: 'success', data: grades });
  };

  createEntry = async (request: Request, response: Response): Promise<void> => {
    const userContext = {
      userId: request.user!.userId,
      schoolId: request.user!.schoolId,
      role: request.user!.role,
    };
    const createGradeEntryDto = createGradeEntrySchema.parse(request.body);
    const entry = await this.gradeService.createGradeEntry(createGradeEntryDto, userContext);
    response.status(201).json({ status: 'success', data: entry });
  };

  createGrade = async (request: Request, response: Response): Promise<void> => {
    const userContext = {
      userId: request.user!.userId,
      schoolId: request.user!.schoolId,
      role: request.user!.role,
    };
    const createGradeDto = createGradeSchema.parse(request.body);
    const grade = await this.gradeService.createGrade(createGradeDto, userContext);
    response.status(201).json({ status: 'success', data: grade });
  };
}
