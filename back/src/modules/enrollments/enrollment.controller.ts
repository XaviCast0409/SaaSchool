import { Request, Response } from 'express';
import { createEnrollmentSchema, updateEnrollmentSchema } from './enrollment.schema';
import type { EnrollmentService } from './enrollment.service';

export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollments = await this.enrollmentService.getAllEnrollments(schoolId);
    response.status(200).json({ status: 'success', data: enrollments });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const enrollment = await this.enrollmentService.getEnrollmentById(id, schoolId);
    response.status(200).json({ status: 'success', data: enrollment });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createEnrollmentDto = createEnrollmentSchema.parse(request.body);
    const enrollment = await this.enrollmentService.createEnrollment(
      schoolId,
      createEnrollmentDto,
    );
    response.status(201).json({ status: 'success', data: enrollment });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateEnrollmentDto = updateEnrollmentSchema.parse(request.body);
    const enrollment = await this.enrollmentService.updateEnrollment(id, schoolId, updateEnrollmentDto);
    response.status(200).json({ status: 'success', data: enrollment });
  };
}
