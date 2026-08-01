import { Request, Response } from 'express';
import { createGradeSchema, createGradeEntrySchema } from './grade.schema';
import type { GradeService } from './grade.service';

export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  getByEnrollment = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollmentId = request.params.enrollmentId as string;
    const grades = await this.gradeService.getGradesByEnrollment(enrollmentId, schoolId);
    response.status(200).json({ status: 'success', data: grades });
  };

  createEntry = async (request: Request, response: Response): Promise<void> => {
    const createGradeEntryDto = createGradeEntrySchema.parse(request.body);
    const entry = await this.gradeService.createGradeEntry(createGradeEntryDto);
    response.status(201).json({ status: 'success', data: entry });
  };

  createGrade = async (request: Request, response: Response): Promise<void> => {
    const createGradeDto = createGradeSchema.parse(request.body);
    const grade = await this.gradeService.createGrade(createGradeDto);
    response.status(201).json({ status: 'success', data: grade });
  };
}
