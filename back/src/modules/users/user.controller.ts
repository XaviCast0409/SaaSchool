import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema, userFilterSchema } from './user.schema';
import type { UserService } from './user.service';

export class UserController {
  constructor(private readonly userService: UserService) {}

  /** GET /api/users?role=TEACHER&page=1&limit=10&search=juan */
  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const queryFilters = userFilterSchema.parse(request.query);
    const result = await this.userService.getAllUsers(schoolId, queryFilters);

    response.status(200).json({
      status: 'success',
      data: result.data,
      meta: result.meta,
    });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const user = await this.userService.getUserById(id, schoolId);
    response.status(200).json({ status: 'success', data: user });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createUserDto = createUserSchema.parse(request.body);
    const user = await this.userService.createUser(schoolId, createUserDto);
    response.status(201).json({ status: 'success', data: user });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateUserDto = updateUserSchema.parse(request.body);
    const user = await this.userService.updateUser(id, schoolId, updateUserDto);
    response.status(200).json({ status: 'success', data: user });
  };

  /** DELETE /api/users/:id — soft delete (desactiva, no borra) */
  deactivate = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const user = await this.userService.deactivateUser(id, schoolId);
    response.status(200).json({ status: 'success', data: user });
  };

  /** PATCH /api/users/:id/reactivate — reactiva un usuario desactivado */
  reactivate = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const user = await this.userService.reactivateUser(id, schoolId);
    response.status(200).json({ status: 'success', data: user });
  };
}
