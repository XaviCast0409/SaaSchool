import { Request, Response } from 'express';
import { createSchoolSchema, updateSchoolSchema } from './school.schema';
import type { SchoolService } from './school.service';
import { AppError } from '../../core/errors/app-error';

export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    const schools = await this.schoolService.getAllSchools();
    response.status(200).json({ status: 'success', data: schools });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const user = request.user!;

    if (user.role !== 'SUPER_ADMIN' && user.schoolId !== id) {
      throw new AppError('No tienes acceso a los datos de este colegio', 403);
    }

    const school = await this.schoolService.getSchoolById(id);
    response.status(200).json({ status: 'success', data: school });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const createSchoolDto = createSchoolSchema.parse(request.body);
    const school = await this.schoolService.createSchool(createSchoolDto);
    response.status(201).json({ status: 'success', data: school });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const user = request.user!;

    if (user.role !== 'SUPER_ADMIN' && user.schoolId !== id) {
      throw new AppError('No tienes permiso para actualizar los datos de este colegio', 403);
    }

    const updateSchoolDto = updateSchoolSchema.parse(request.body);
    const school = await this.schoolService.updateSchool(id, updateSchoolDto);
    response.status(200).json({ status: 'success', data: school });
  };

  deactivate = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const school = await this.schoolService.deactivateSchool(id);
    response.status(200).json({ status: 'success', data: school });
  };
}
