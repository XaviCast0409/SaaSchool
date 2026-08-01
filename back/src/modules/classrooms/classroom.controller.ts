import { Request, Response } from 'express';
import { createClassroomSchema, updateClassroomSchema } from './classroom.schema';
import type { ClassroomService } from './classroom.service';

export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const classrooms = await this.classroomService.getAllClassrooms(schoolId);
    response.status(200).json({ status: 'success', data: classrooms });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const classroom = await this.classroomService.getClassroomById(id, schoolId);
    response.status(200).json({ status: 'success', data: classroom });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createClassroomDto = createClassroomSchema.parse(request.body);
    const classroom = await this.classroomService.createClassroom(schoolId, createClassroomDto);
    response.status(201).json({ status: 'success', data: classroom });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateClassroomDto = updateClassroomSchema.parse(request.body);
    const classroom = await this.classroomService.updateClassroom(id, schoolId, updateClassroomDto);
    response.status(200).json({ status: 'success', data: classroom });
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    await this.classroomService.deleteClassroom(id, schoolId);
    response.status(204).send();
  };
}
