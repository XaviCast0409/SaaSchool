import { Request, Response } from 'express';
import { z } from 'zod';
import { createAcademicYearSchema, updateAcademicYearSchema } from './academic-year.schema';
import type { AcademicYearService } from './academic-year.service';
import { recordAudit } from '../../utils/audit.util';

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
    recordAudit(request, { action: 'ACADEMIC_YEAR_CREATE', entity: 'AcademicYear', entityId: academicYear.id, after: createDto });
    response.status(201).json({ status: 'success', data: academicYear });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateDto = updateAcademicYearSchema.parse(request.body);
    const before = await this.academicYearService.getAcademicYearById(id, schoolId);
    const academicYear = await this.academicYearService.updateAcademicYear(id, schoolId, updateDto);
    recordAudit(request, {
      action: updateDto.isActive === true && !before.isActive ? 'ACADEMIC_YEAR_ACTIVATE' : 'ACADEMIC_YEAR_UPDATE',
      entity: 'AcademicYear',
      entityId: id,
      before: { isActive: before.isActive, year: before.year },
      after: updateDto,
    });
    response.status(200).json({ status: 'success', data: academicYear });
  };

  activationImpact = async (request: Request, response: Response): Promise<void> => {
    const impact = await this.academicYearService.getActivationImpact(request.user!.schoolId, request.params.id as string);
    response.status(200).json({ status: 'success', data: impact });
  };

  setEnrollmentOpen = async (request: Request, response: Response): Promise<void> => {
    const { open } = z.object({ open: z.boolean() }).parse(request.body);
    const id = request.params.id as string;
    const academicYear = await this.academicYearService.setEnrollmentOpen(request.user!.schoolId, id, open);
    recordAudit(request, { action: 'ACADEMIC_YEAR_UPDATE', entity: 'AcademicYear', entityId: id, after: { matriculaAbierta: open } });
    response.status(200).json({ status: 'success', data: academicYear });
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    await this.academicYearService.deleteAcademicYear(id, schoolId);
    recordAudit(request, { action: 'ACADEMIC_YEAR_DELETE', entity: 'AcademicYear', entityId: id });
    response.status(200).json({ status: 'success', message: 'Año Lectivo eliminado correctamente.' });
  };
}
