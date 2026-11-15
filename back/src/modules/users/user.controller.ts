import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { selectedAcademicYearId } from '../../utils/academic-year-scope';
import { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import { createUserSchema, updateUserSchema, userFilterSchema } from './user.schema';
import type { UserService } from './user.service';
import type { Role } from '@prisma/client';

export class UserController {
  constructor(private readonly userService: UserService) {}

  /** GET /api/users?role=TEACHER&page=1&limit=10&search=juan */
  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const queryFilters = userFilterSchema.parse(request.query);
    // Para el personal: año elegido en la cabecera (o el vigente) para saber quién está contratado
    const isStaffQuery = queryFilters.staffOnly || queryFilters.yearScope || (queryFilters.role && queryFilters.role !== 'PARENT');
    const staffYearId = isStaffQuery
      ? ((await selectedAcademicYearId(request)) ??
        (await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } }))?.id)
      : undefined;
    const result = await this.userService.getAllUsers(schoolId, {
      ...queryFilters,
      staffYearId,
      actorRole: request.user?.role ? (request.user.role as Role) : undefined,
      actorUserId: request.user?.userId,
    });

    response.status(200).json({
      status: 'success',
      data: result.data,
      meta: result.meta,
    });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const user = await this.userService.getUserById(
      id,
      schoolId,
      request.user?.role ? (request.user.role as Role) : undefined,
    );
    response.status(200).json({ status: 'success', data: user });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createUserDto = createUserSchema.parse(request.body);
    const { academicYearIds } = z.object({ academicYearIds: z.array(z.string().uuid()).max(5).optional() }).parse(request.body);
    const user = await this.userService.createUser(schoolId, createUserDto, {
      role: request.user!.role as Role,
      userId: request.user!.userId,
    });
    // Personal: queda contratado en los años elegidos (por defecto, el vigente)
    if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMINISTRATIVE' || user.role === 'TEACHER') {
      const years = academicYearIds?.length
        ? await prisma.academicYear.findMany({ where: { schoolId, id: { in: academicYearIds } }, select: { id: true } })
        : await prisma.academicYear.findMany({ where: { schoolId, isActive: true }, select: { id: true } });
      await prisma.staffYear.createMany({ data: years.map((y) => ({ schoolId, userId: user.id, academicYearId: y.id })), skipDuplicates: true });
    }
    recordAudit(request, {
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      after: user,
    });
    response.status(201).json({ status: 'success', data: user });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateUserDto = updateUserSchema.parse(request.body);
    const user = await this.userService.updateUser(id, schoolId, updateUserDto, {
      role: request.user!.role as Role,
      userId: request.user!.userId,
    });
    recordAudit(request, {
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      after: user,
    });
    response.status(200).json({ status: 'success', data: user });
  };

  /** DELETE /api/users/:id — soft delete (desactiva, no borra) */
  deactivate = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const user = await this.userService.deactivateUser(id, schoolId, {
      role: request.user!.role as Role,
      userId: request.user!.userId,
    });
    recordAudit(request, {
      action: 'USER_DEACTIVATED',
      entity: 'User',
      entityId: id,
      after: null,
    });
    response.status(200).json({ status: 'success', data: user });
  };

  /** PATCH /api/users/:id/reactivate — reactiva un usuario desactivado */
  reactivate = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const user = await this.userService.reactivateUser(id, schoolId, {
      role: request.user!.role as Role,
      userId: request.user!.userId,
    });
    response.status(200).json({ status: 'success', data: user });
  };

  resetPassword = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const { newPassword } = request.body || {};
    const result = await this.userService.resetPassword(id, schoolId, newPassword, {
      role: request.user!.role as Role,
      userId: request.user!.userId,
    });
    recordAudit(request, {
      action: 'USER_PASSWORD_RESET',
      entity: 'User',
      entityId: id,
      after: null,
    });
    response.status(200).json({ status: 'success', data: result });
  };
}
