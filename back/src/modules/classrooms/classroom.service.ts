import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { ClassroomRepository, ClassroomWithTutor } from './classroom.repository';
import type { CreateClassroomDto, UpdateClassroomDto } from './classroom.schema';
import type { Classroom } from '@prisma/client';

export class ClassroomService {
  constructor(private readonly classroomRepository: ClassroomRepository) {}

  private async validateTutorTeacher(schoolId: string, tutorTeacherId?: string | null): Promise<void> {
    if (!tutorTeacherId) return;

    const teacher = await prisma.user.findFirst({
      where: {
        id: tutorTeacherId,
        schoolId,
        role: 'TEACHER',
        isActive: true,
      },
    });

    if (!teacher) {
      throw new AppError(
        'El docente asignado como tutor no existe, no está activo o no pertenece a este colegio.',
        400,
      );
    }
  }

  private async syncTransversalAssignment(
    schoolId: string,
    classroomId: string,
    _educationLevel: string,
    tutorTeacherId?: string | null,
  ): Promise<void> {
    if (!tutorTeacherId) return;

    const transversalArea = await prisma.curricularArea.findFirst({
      where: {
        schoolId,
        isTransversal: true,
        OR: [
          { officialAreaCode: 'TRANS' },
          { officialCode: { contains: 'TRANS' } },
        ],
      },
    });

    if (!transversalArea) return;

    await prisma.courseAssignment.upsert({
      where: {
        classroomId_areaId: {
          classroomId,
          areaId: transversalArea.id,
        },
      },
      create: {
        schoolId,
        classroomId,
        areaId: transversalArea.id,
        teacherId: tutorTeacherId,
      },
      update: {
        teacherId: tutorTeacherId,
      },
    });
  }

  async getAllClassrooms(schoolId: string): Promise<ClassroomWithTutor[]> {
    return this.classroomRepository.findAllBySchool(schoolId);
  }

  async getClassroomById(classroomId: string, schoolId: string): Promise<ClassroomWithTutor> {
    const classroom = await this.classroomRepository.findById(classroomId, schoolId);

    if (!classroom) {
      throw new AppError(`Aula con id ${classroomId} no encontrada`, 404);
    }

    return classroom;
  }

  async createClassroom(
    schoolId: string,
    createClassroomDto: CreateClassroomDto,
  ): Promise<ClassroomWithTutor> {
    await this.validateTutorTeacher(schoolId, createClassroomDto.tutorTeacherId);
    const result = await this.classroomRepository.create(schoolId, createClassroomDto);
    if (createClassroomDto.tutorTeacherId) {
      await this.syncTransversalAssignment(schoolId, result.id, result.educationLevel, createClassroomDto.tutorTeacherId);
    }
    return result;
  }

  async updateClassroom(
    classroomId: string,
    schoolId: string,
    updateClassroomDto: UpdateClassroomDto,
  ): Promise<ClassroomWithTutor> {
    await this.getClassroomById(classroomId, schoolId);
    if (updateClassroomDto.tutorTeacherId !== undefined) {
      await this.validateTutorTeacher(schoolId, updateClassroomDto.tutorTeacherId);
    }
    const updated = await this.classroomRepository.update(classroomId, schoolId, updateClassroomDto);
    if (updateClassroomDto.tutorTeacherId) {
      await this.syncTransversalAssignment(schoolId, classroomId, updated.educationLevel, updateClassroomDto.tutorTeacherId);
    }
    return updated;
  }

  async deleteClassroom(classroomId: string, schoolId: string): Promise<Classroom> {
    await this.getClassroomById(classroomId, schoolId);
    return this.classroomRepository.delete(classroomId, schoolId);
  }
}
