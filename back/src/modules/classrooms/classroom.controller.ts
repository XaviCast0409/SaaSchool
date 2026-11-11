import { Request, Response } from 'express';
import { bulkCreateClassroomsSchema, createClassroomSchema, updateClassroomSchema } from './classroom.schema';
import type { ClassroomService } from './classroom.service';
import { recordAudit } from '../../utils/audit.util';

export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  getAll = async (request: Request, response: Response): Promise<void> => {
    const classrooms = await this.classroomService.getAllClassrooms(request.user!.schoolId);
    response.status(200).json({ status: 'success', data: classrooms });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const classroom = await this.classroomService.getClassroomById(request.params.id as string, request.user!.schoolId);
    response.status(200).json({ status: 'success', data: classroom });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const dto = createClassroomSchema.parse(request.body);
    const classroom = await this.classroomService.createClassroom(request.user!.schoolId, dto);
    recordAudit(request, { action: 'CLASSROOM_CREATED', entity: 'Classroom', entityId: classroom.id, after: dto });
    response.status(201).json({ status: 'success', data: classroom });
  };

  bulkCreate = async (request: Request, response: Response): Promise<void> => {
    const dto = bulkCreateClassroomsSchema.parse(request.body);
    const result = await this.classroomService.bulkCreateClassrooms(request.user!.schoolId, dto);
    recordAudit(request, { action: 'CLASSROOMS_BULK_CREATED', entity: 'Classroom', after: { ...dto, created: result.created } });
    response.status(201).json({ status: 'success', data: result });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const dto = updateClassroomSchema.parse(request.body);
    const before = await this.classroomService.getClassroomById(id, request.user!.schoolId);
    const classroom = await this.classroomService.updateClassroom(id, request.user!.schoolId, dto);
    const onlyTutor = Object.keys(dto).length === 1 && dto.tutorTeacherId !== undefined;
    recordAudit(request, {
      action: onlyTutor ? 'CLASSROOM_TUTOR_CHANGED' : 'CLASSROOM_UPDATED',
      entity: 'Classroom',
      entityId: id,
      before: { tutorTeacherId: before.tutorTeacherId, section: before.section, capacity: before.capacity, shift: before.shift },
      after: dto,
    });
    response.status(200).json({ status: 'success', data: classroom });
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    const id = request.params.id as string;
    const before = await this.classroomService.getClassroomById(id, request.user!.schoolId);
    await this.classroomService.deleteClassroom(id, request.user!.schoolId);
    recordAudit(request, {
      action: 'CLASSROOM_DELETED',
      entity: 'Classroom',
      entityId: id,
      before: { educationLevel: before.educationLevel, grade: before.grade, section: before.section },
    });
    response.status(204).send();
  };
}
