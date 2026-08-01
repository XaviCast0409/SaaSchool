import { prisma } from '../../config/prisma';
import type { Student } from '@prisma/client';
import type { CreateStudentDto, UpdateStudentDto } from './student.schema';

export class StudentRepository {
  async findAllBySchool(schoolId: string): Promise<Student[]> {
    return prisma.student.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(studentId: string, schoolId: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
  }

  async create(schoolId: string, data: CreateStudentDto): Promise<Student> {
    return prisma.student.create({
      data: {
        ...data,
        schoolId,
        birthDate: new Date(data.birthDate),
      },
    });
  }

  async update(
    studentId: string,
    schoolId: string,
    data: UpdateStudentDto,
  ): Promise<Student> {
    return prisma.student.update({
      where: { id: studentId, schoolId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
  }

  async delete(studentId: string, schoolId: string): Promise<Student> {
    return prisma.student.delete({
      where: { id: studentId, schoolId },
    });
  }
}
