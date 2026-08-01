import { AppError } from '../../core/errors/app-error';
import type { ClassroomRepository } from './classroom.repository';
import type { CreateClassroomDto, UpdateClassroomDto } from './classroom.schema';
import type { Classroom } from '@prisma/client';

export class ClassroomService {
  constructor(private readonly classroomRepository: ClassroomRepository) {}

  async getAllClassrooms(schoolId: string): Promise<Classroom[]> {
    return this.classroomRepository.findAllBySchool(schoolId);
  }

  async getClassroomById(classroomId: string, schoolId: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findById(classroomId, schoolId);

    if (!classroom) {
      throw new AppError(`Aula con id ${classroomId} no encontrada`, 404);
    }

    return classroom;
  }

  async createClassroom(
    schoolId: string,
    createClassroomDto: CreateClassroomDto,
  ): Promise<Classroom> {
    return this.classroomRepository.create(schoolId, createClassroomDto);
  }

  async updateClassroom(
    classroomId: string,
    schoolId: string,
    updateClassroomDto: UpdateClassroomDto,
  ): Promise<Classroom> {
    await this.getClassroomById(classroomId, schoolId);
    return this.classroomRepository.update(classroomId, schoolId, updateClassroomDto);
  }

  async deleteClassroom(classroomId: string, schoolId: string): Promise<Classroom> {
    await this.getClassroomById(classroomId, schoolId);
    return this.classroomRepository.delete(classroomId, schoolId);
  }
}
