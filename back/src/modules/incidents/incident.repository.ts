import { prisma } from '../../config/prisma';
import type { Prisma, StudentIncident } from '@prisma/client';
import type { CreateIncidentDto, IncidentFilterDto } from './incident.schema';

const INCIDENT_INCLUDE = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastNamePaternal: true,
      lastNameMaternal: true,
      email: true,
    },
  },
  enrollment: {
    include: {
      classroom: {
        select: {
          id: true,
          grade: true,
          section: true,
          educationLevel: true,
        },
      },
      academicYear: {
        select: {
          id: true,
          year: true,
          isActive: true,
        },
      },
      student: {
        select: {
          id: true,
          firstNames: true,
          lastNamePaternal: true,
          lastNameMaternal: true,
          documentType: true,
          documentId: true,
          studentCode: true,
          familyRelations: {
            select: {
              userId: true,
              relationshipType: true,
            },
          },
        },
      },
    },
  },
};

export class IncidentRepository {
  async create(
    schoolId: string,
    authorId: string,
    enrollmentId: string,
    data: CreateIncidentDto,
  ): Promise<StudentIncident> {
    return prisma.studentIncident.create({
      data: {
        schoolId,
        authorId,
        enrollmentId,
        type: data.type,
        severity: data.severity,
        title: data.title,
        description: data.description,
        actionTaken: data.actionTaken || null,
        citationDate: data.citationDate ? new Date(data.citationDate) : null,
        isViolenceCase: data.isViolenceCase ?? false,
      },
      include: INCIDENT_INCLUDE,
    });
  }

  async findById(schoolId: string, id: string): Promise<StudentIncident | null> {
    return prisma.studentIncident.findFirst({
      where: { id, schoolId },
      include: INCIDENT_INCLUDE,
    });
  }

  async findAll(
    schoolId: string,
    filters: IncidentFilterDto,
    options?: { parentUserId?: string; studentId?: string },
  ): Promise<{ data: StudentIncident[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const enrollmentWhere: Prisma.EnrollmentWhereInput = {
      ...(filters.studentId ? { studentId: filters.studentId } : {}),
      ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
    };

    if (options?.parentUserId) {
      enrollmentWhere.student = {
        familyRelations: {
          some: {
            userId: options.parentUserId,
          },
        },
      };
    } else if (options?.studentId) {
      enrollmentWhere.studentId = options.studentId;
    }

    const where: Prisma.StudentIncidentWhereInput = {
      schoolId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.enrollmentId ? { enrollmentId: filters.enrollmentId } : {}),
      ...(Object.keys(enrollmentWhere).length > 0 ? { enrollment: enrollmentWhere } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.studentIncident.count({ where }),
      prisma.studentIncident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: INCIDENT_INCLUDE,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async acknowledge(schoolId: string, id: string, userId: string): Promise<StudentIncident> {
    return prisma.studentIncident.update({
      where: { id, schoolId },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedByUserId: userId,
      },
      include: INCIDENT_INCLUDE,
    });
  }

  async updateSiseve(schoolId: string, id: string, siseveCode: string): Promise<StudentIncident> {
    return prisma.studentIncident.update({
      where: { id, schoolId },
      data: {
        siseveCode,
        siseveReportedAt: new Date(),
      },
      include: INCIDENT_INCLUDE,
    });
  }
}
