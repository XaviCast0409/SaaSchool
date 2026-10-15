import { prisma } from '../../config/prisma';
import type { Prisma, Student } from '@prisma/client';
import type { CreateStudentDto, UpdateStudentDto, StudentFilterDto, RegisterFichaMatriculaDto } from './student.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import { AppError } from '../../core/errors/app-error';

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
              { documentId: { contains: search } },
              { studentCode: { contains: search } },
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
          familyRelations: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastNamePaternal: true,
                  lastNameMaternal: true,
                  documentType: true,
                  documentId: true,
                  email: true,
                  cellphone: true,
                  educationLevel: true,
                },
              },
            },
          },
          enrollments: {
            where: { isActive: true },
            include: {
              academicYear: true,
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
        familyRelations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastNamePaternal: true,
                lastNameMaternal: true,
                documentType: true,
                documentId: true,
                email: true,
                cellphone: true,
                educationLevel: true,
              },
            },
          },
        },
        enrollments: {
          orderBy: { enrollmentDate: 'desc' },
          include: {
            academicYear: true,
            classroom: true,
          },
        },
      },
    });
  }

  async findByDocumentId(schoolId: string, documentId: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { schoolId, documentId },
    });
  }

  async findByStudentCode(schoolId: string, studentCode: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { schoolId, studentCode },
    });
  }

  async countBySchool(schoolId: string): Promise<number> {
    return prisma.student.count({
      where: { schoolId },
    });
  }

  async getSchoolPlan(schoolId: string): Promise<string> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { plan: true },
    });
    return school?.plan || 'BASIC';
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

  /**
   * Registra atómicamente la Ficha de Matrícula SIAGIE
   * (Crea/Actualiza Alumno + Matrícula en Año/Aula + Apoderado)
   */
  async registerFichaMatricula(
    schoolId: string,
    data: RegisterFichaMatriculaDto,
    passwordHash: string,
  ): Promise<{ student: Student; enrollmentId: string }> {
    return prisma.$transaction(async (tx) => {
      // 1. Verificar si ya existe estudiante con ese documento en el colegio
      let student = await tx.student.findFirst({
        where: {
          schoolId,
          documentId: data.student.documentId,
        },
      });

      if (!student) {
        student = await tx.student.create({
          data: {
            ...data.student,
            schoolId,
            birthDate: new Date(data.student.birthDate),
          },
        });
      } else {
        // Actualizar datos demográficos del estudiante con los de la ficha
        student = await tx.student.update({
          where: { id: student.id },
          data: {
            ...data.student,
            birthDate: new Date(data.student.birthDate),
          },
        });
      }

      // 2. Validar que no esté ya matriculado en este año lectivo
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId: student.id,
            academicYearId: data.enrollment.academicYearId,
          },
        },
      });

      if (existingEnrollment) {
        throw new AppError(
          'El estudiante ya cuenta con matrícula registrada para este año lectivo.',
          409,
        );
      }

      // Crear Matrícula
      const enrollment = await tx.enrollment.create({
        data: {
          schoolId,
          studentId: student.id,
          academicYearId: data.enrollment.academicYearId,
          classroomId: data.enrollment.classroomId,
          condition: data.enrollment.condition,
          previousSchoolModularCode: data.enrollment.previousSchoolModularCode || null,
          repeatingGrade: data.enrollment.repeatingGrade,
        },
      });

      // 3. Manejo de Apoderado
      let parentUserId = data.guardian.existingUserId;

      if (data.guardian.mode === 'NEW' && data.guardian.newGuardian) {
        const existingUser = await tx.user.findUnique({
          where: { email: data.guardian.newGuardian.email! },
        });

        if (existingUser) {
          parentUserId = existingUser.id;
        } else {
          const newParent = await tx.user.create({
            data: {
              schoolId,
              email: data.guardian.newGuardian.email!,
              passwordHash,
              firstName: data.guardian.newGuardian.firstName!,
              lastNamePaternal: data.guardian.newGuardian.lastNamePaternal!,
              lastNameMaternal: data.guardian.newGuardian.lastNameMaternal || '',
              role: 'PARENT',
              documentType: data.guardian.newGuardian.documentType || 'DNI',
              documentId: data.guardian.newGuardian.documentId || null,
              cellphone: data.guardian.newGuardian.cellphone || null,
              educationLevel: data.guardian.newGuardian.educationLevel || null,
            },
          });
          parentUserId = newParent.id;
        }
      }

      if (parentUserId) {
        await tx.familyRelationship.upsert({
          where: {
            studentId_userId: {
              studentId: student.id,
              userId: parentUserId,
            },
          },
          update: {
            relationshipType: data.guardian.relationshipType,
            isLegalGuardian: data.guardian.isLegalGuardian,
            isFinancialResponsible: data.guardian.isFinancialResponsible,
            livesWithStudent: data.guardian.livesWithStudent,
          },
          create: {
            studentId: student.id,
            userId: parentUserId,
            relationshipType: data.guardian.relationshipType,
            isLegalGuardian: data.guardian.isLegalGuardian,
            isFinancialResponsible: data.guardian.isFinancialResponsible,
            livesWithStudent: data.guardian.livesWithStudent,
          },
        });
      }

      return {
        student,
        enrollmentId: enrollment.id,
      };
    });
  }
}
