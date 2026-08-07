import { prisma } from '../../config/prisma';
import bcrypt from 'bcryptjs';
import type { School } from '@prisma/client';
import type { CreateSchoolDto, UpdateSchoolDto } from './school.schema';

/**
 * SchoolRepository: Acceso a datos del modelo School.
 */
export class SchoolRepository {
  async findAll(): Promise<School[]> {
    return prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
          },
        },
      },
    });
  }

  async findById(schoolId: string): Promise<School | null> {
    return prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
          },
        },
      },
    });
  }

  async create(data: CreateSchoolDto): Promise<School> {
    const {
      planExpiresAt,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastNamePaternal,
      adminLastNameMaternal,
      adminDocumentId,
      adminCellphone,
      ...schoolData
    } = data;

    return prisma.$transaction(async (tx) => {
      // 1. Crear el colegio cliente
      const school = await tx.school.create({
        data: {
          ...schoolData,
          ...(planExpiresAt ? { planExpiresAt: new Date(planExpiresAt) } : {}),
        },
      });

      // 2. Si se pasaron credenciales para el Administrador Inicial, crear el usuario
      if (adminEmail && adminPassword) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await tx.user.create({
          data: {
            schoolId: school.id,
            email: adminEmail.toLowerCase().trim(),
            passwordHash,
            role: 'SCHOOL_ADMIN',
            firstName: adminFirstName || 'Director(a)',
            lastNamePaternal: adminLastNamePaternal || school.name,
            lastNameMaternal: adminLastNameMaternal || '',
            documentType: 'DNI',
            documentId: adminDocumentId || school.documentId,
            cellphone: adminCellphone || school.phone || '',
          },
        });
      }

      return school;
    });
  }

  async update(schoolId: string, data: UpdateSchoolDto): Promise<School> {
    const { planExpiresAt, ...schoolData } = data;

    return prisma.school.update({
      where: { id: schoolId },
      data: {
        ...schoolData,
        ...(planExpiresAt !== undefined
          ? { planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null }
          : {}),
      },
    });
  }

  async deactivate(schoolId: string): Promise<School> {
    return prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false },
    });
  }

  async reactivate(schoolId: string): Promise<School> {
    return prisma.school.update({
      where: { id: schoolId },
      data: { isActive: true },
    });
  }
}
