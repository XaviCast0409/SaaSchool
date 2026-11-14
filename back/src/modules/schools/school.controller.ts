import { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import { createSchoolSchema, updateSchoolSchema } from './school.schema';
import type { SchoolService } from './school.service';
import { AppError } from '../../core/errors/app-error';
import {
  PLAN_CATALOG,
  PLAN_GRACE_DAYS,
  PLAN_READ_ONLY_UNTIL_DAY,
  getPlanStatus,
  planAllowsWrites,
  PLAN_READ_ONLY_MESSAGE,
} from './plan.rules';

export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    const schools = await this.schoolService.getAllSchools();
    response.status(200).json({ status: 'success', data: schools });
  };

  getPlans = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).json({
      status: 'success',
      data: {
        plans: PLAN_CATALOG,
        graceDays: PLAN_GRACE_DAYS,
        readOnlyUntilDay: PLAN_READ_ONLY_UNTIL_DAY,
      },
    });
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

    // RESTRICCIÓN DE SEGURIDAD: Solo SUPER_ADMIN puede modificar el plan, vencimiento o mensualidad
    if (user.role !== 'SUPER_ADMIN') {
      delete updateSchoolDto.plan;
      delete updateSchoolDto.planExpiresAt;
      delete updateSchoolDto.monthlyFee;

      // Esta ruta no pasa por tenantMiddleware: aplicar aquí la solo lectura por plan vencido
      const current = await this.schoolService.getSchoolById(id);
      if (!planAllowsWrites(getPlanStatus(current.planExpiresAt).access)) {
        throw new AppError(PLAN_READ_ONLY_MESSAGE, 403);
      }
    }

    const school = await this.schoolService.updateSchool(id, updateSchoolDto);
    recordAudit(request, {
      action: 'SCHOOL_UPDATED',
      entity: 'School',
      entityId: id,
      after: school,
    });
    response.status(200).json({ status: 'success', data: school });
  };

  deactivate = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const school = await this.schoolService.deactivateSchool(id);
    response.status(200).json({ status: 'success', data: school });
  };

  reactivate = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const school = await this.schoolService.reactivateSchool(id);
    response.status(200).json({ status: 'success', data: school });
  };

  resetAdminPassword = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const { password } = request.body || {};
    const result = await this.schoolService.resetAdminPassword(id, password);
    response.status(200).json({ status: 'success', data: result });
  };
}
