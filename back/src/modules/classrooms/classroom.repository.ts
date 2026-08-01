import { prisma } from '../../config/prisma';
import type { Classroom } from '@prisma/client';
import type { CreateClassroomDto, UpdateClassroomDto } from './classroom.schema';

export class ClassroomRepository {
  async findAllBySchool(schoolId: string): Promise<Classroom[]> {
    return prisma.classroom.findMany({
      where: { schoolId },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });
  }

  async findById(classroomId: string, schoolId: string): Promise<Classroom | null> {
    return prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
    });
  }

  async create(schoolId: string, data: CreateClassroomDto): Promise<Classroom> {
    return prisma.classroom.create({
      data: { ...data, schoolId },
    });
  }

  async update(
    classroomId: string,
    schoolId: string,
    data: UpdateClassroomDto,
  ): Promise<Classroom> {
    return prisma.classroom.update({
      where: { id: classroomId, schoolId },
      data,
    });
  }

  async delete(classroomId: string, schoolId: string): Promise<Classroom> {
    return prisma.classroom.delete({
      where: { id: classroomId, schoolId },
    });
  }
}
