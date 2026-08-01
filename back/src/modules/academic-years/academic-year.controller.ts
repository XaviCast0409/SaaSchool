import { Request, Response } from 'express';
import { createAcademicYearSchema, updateAcademicYearSchema } from './academic-year.schema';
import type { AcademicYearService } from './academic-year.service';

export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const academicYears = await this.academicYearService.getAllAcademicYears(schoolId);
    response.status(200).json({ status: 'success', data: academicYears });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const academicYear = await this.academicYearService.getAcademicYearById(id, schoolId);
    response.status(200).json({ status: 'success', data: academicYear });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createDto = createAcademicYearSchema.parse(request.body);
    const academicYear = await this.academicYearService.createAcademicYear(schoolId, createDto);
    response.status(201).json({ status: 'success', data: academicYear });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateDto = updateAcademicYearSchema.parse(request.body);
    const academicYear = await this.academicYearService.updateAcademicYear(id, schoolId, updateDto);
    response.status(200).json({ status: 'success', data: academicYear });
  };
}
