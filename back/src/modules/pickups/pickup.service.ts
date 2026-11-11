import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { notificationService } from '../notifications/notification.routes';
import type { PickupDto, UpdatePickupDto } from './pickup.schema';

interface Principal {
  userId: string;
  role: string;
  schoolId: string;
}

export class PickupService {
  async list(schoolId: string, studentId: string, principal: Principal) {
    if (principal.role === 'PARENT') {
      const relation = await prisma.familyRelationship.findFirst({
        where: {
          studentId,
          userId: principal.userId,
        },
      });
      if (!relation) {
        throw new AppError('No tienes permisos sobre este estudiante.', 403);
      }
    }

    return prisma.authorizedPickup.findMany({
      where: {
        schoolId,
        studentId,
        isActive: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(schoolId: string, dto: PickupDto, principal: Principal) {
    const student = await prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
      select: {
        id: true,
        firstNames: true,
        lastNamePaternal: true,
        familyRelations: { select: { userId: true } },
      },
    });
    if (!student) {
      throw new AppError('Estudiante no encontrado.', 404);
    }

    const pickup = await prisma.authorizedPickup.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        fullName: dto.fullName,
        documentType: dto.documentType,
        documentId: dto.documentId,
        relationship: dto.relationship,
        cellphone: dto.cellphone || null,
        photoFileUrl: dto.photoFileUrl ?? null,
        createdById: principal.userId,
        isActive: true,
      },
    });

    const studentName = `${student.firstNames} ${student.lastNamePaternal}`;
    const userIds = Array.from(new Set(student.familyRelations.map((r) => r.userId)));
    for (const userId of userIds) {
      await notificationService
        .createNotification(schoolId, {
          userId,
          title: 'Nueva persona autorizada',
          message: `${dto.fullName} (${dto.relationship}) fue autorizado(a) para recoger a ${studentName}. Si no lo reconoces, comunícate con el colegio.`,
          type: 'ATTENDANCE',
          link: '/attendance',
        })
        .catch((error) => console.error('[Pickup notify]', error));
    }

    return pickup;
  }

  async update(schoolId: string, id: string, dto: UpdatePickupDto) {
    const existing = await prisma.authorizedPickup.findFirst({
      where: { id, schoolId, isActive: true },
    });
    if (!existing) {
      throw new AppError('Persona autorizada no encontrada.', 404);
    }

    return prisma.authorizedPickup.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.documentType !== undefined && { documentType: dto.documentType }),
        ...(dto.documentId !== undefined && { documentId: dto.documentId }),
        ...(dto.relationship !== undefined && { relationship: dto.relationship }),
        ...(dto.cellphone !== undefined && { cellphone: dto.cellphone || null }),
        ...(dto.photoFileUrl !== undefined && { photoFileUrl: dto.photoFileUrl ?? null }),
      },
    });
  }

  async deactivate(schoolId: string, id: string) {
    const existing = await prisma.authorizedPickup.findFirst({
      where: { id, schoolId },
    });
    if (!existing) {
      throw new AppError('Persona autorizada no encontrada.', 404);
    }

    return prisma.authorizedPickup.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const pickupService = new PickupService();
