import { prisma } from '../../config/prisma';
import type { Prisma, Student } from '@prisma/client';
import type { CreateStudentDto, UpdateStudentDto, StudentFilterDto } from './student.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

export class StudentRepository {
  async findAllBySchool(
    schoolId: string,
    filters: StudentFilterDto = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Student>> {
    const { page, limit, search, classroomId, educationLevel, grade, section } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {
      schoolId,
      ...(classroomId
        ? { enrollments: { some: { classroomId, isActive: true } } }
        : {}),
      ...(educationLevel || grade !== undefined || section
        ? {
            enrollments: {
              some: {
                isActive: true,
                classroom: {
                  ...(educationLevel ? { educationLevel } : {}),
                  ...(grade !== undefined ? { grade } : {}),
                  ...(section ? { section } : {}),
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { firstNames: { contains: search, mode: 'insensitive' } },
              { lastNamePaternal: { contains: search, mode: 'insensitive' } },
              { lastNameMaternal: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastNamePaternal: 'asc' }, { firstNames: 'asc' }],
        include: {
          enrollments: {
            where: { isActive: true },
            include: {
              classroom: {
                select: {
                  id: true,
                  educationLevel: true,
                  grade: true,
                  section: true,
                  shift: true,
                },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(studentId: string, schoolId: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        enrollments: {
          where: { isActive: true },
          include: {
            classroom: true,
          },
        },
      },
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
