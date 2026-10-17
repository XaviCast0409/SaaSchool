import { prisma } from '../../config/prisma';
import type { Prisma, Classroom } from '@prisma/client';
import type { CreateClassroomDto, UpdateClassroomDto } from './classroom.schema';

export const TUTOR_TEACHER_SELECT = {
  id: true,
  firstName: true,
  lastNamePaternal: true,
  lastNameMaternal: true,
  email: true,
} as const;

export type ClassroomWithTutor = Prisma.ClassroomGetPayload<{
  include: {
    tutorTeacher: {
      select: typeof TUTOR_TEACHER_SELECT;
    };
  };
}>;

export class ClassroomRepository {
  async findAllBySchool(schoolId: string): Promise<ClassroomWithTutor[]> {
    return prisma.classroom.findMany({
      where: { schoolId },
      include: {
        tutorTeacher: {
          select: TUTOR_TEACHER_SELECT,
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });
  }

  async findById(classroomId: string, schoolId: string): Promise<ClassroomWithTutor | null> {
    return prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: {
        tutorTeacher: {
          select: TUTOR_TEACHER_SELECT,
        },
      },
    });
  }

  async create(schoolId: string, data: CreateClassroomDto): Promise<ClassroomWithTutor> {
    return prisma.classroom.create({
      data: { ...data, schoolId },
      include: {
        tutorTeacher: {
          select: TUTOR_TEACHER_SELECT,
        },
      },
    });
  }

  async update(
    classroomId: string,
    schoolId: string,
    data: UpdateClassroomDto,
  ): Promise<ClassroomWithTutor> {
    return prisma.classroom.update({
      where: { id: classroomId, schoolId },
      data,
      include: {
        tutorTeacher: {
          select: TUTOR_TEACHER_SELECT,
        },
      },
    });
  }

  async delete(classroomId: string, schoolId: string): Promise<Classroom> {
    return prisma.classroom.delete({
      where: { id: classroomId, schoolId },
    });
  }
}
