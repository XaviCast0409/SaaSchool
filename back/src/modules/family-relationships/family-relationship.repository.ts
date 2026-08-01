import { prisma } from '../../config/prisma';
import type { CreateFamilyRelationshipDto, UpdateFamilyRelationshipDto } from './family-relationship.schema';
import type { FamilyRelationship } from '@prisma/client';

/** Include completo con datos del estudiante y del apoderado (sin passwordHash) */
const FAMILY_INCLUDE = {
  student: {
    select: {
      id: true,
      firstNames: true,
      lastNamePaternal: true,
      lastNameMaternal: true,
      documentType: true,
      documentId: true,
      gender: true,
      birthDate: true,
      schoolId: true,
    },
  },
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
      role: true,
      isActive: true,
    },
  },
} as const;

export class FamilyRelationshipRepository {
  /**
   * Devuelve todas las relaciones familiares de los estudiantes de un colegio.
   * Regla Multi-Tenant: siempre filtra por schoolId del estudiante.
   */
  async findAllBySchool(schoolId: string) {
    return prisma.familyRelationship.findMany({
      where: { student: { schoolId } },
      include: FAMILY_INCLUDE,
      orderBy: { student: { lastNamePaternal: 'asc' } },
    });
  }

  /** Devuelve todas las relaciones de un estudiante específico (sus apoderados). */
  async findByStudent(studentId: string, schoolId: string) {
    return prisma.familyRelationship.findMany({
      where: { studentId, student: { schoolId } },
      include: FAMILY_INCLUDE,
    });
  }

  /** Devuelve todos los hijos vinculados a un apoderado (userId = PARENT). */
  async findByParent(userId: string, schoolId: string) {
    return prisma.familyRelationship.findMany({
      where: { userId, student: { schoolId } },
      include: FAMILY_INCLUDE,
    });
  }

  /** Busca una relación específica por id, validando que el alumno pertenezca al colegio. */
  async findById(id: string, schoolId: string): Promise<FamilyRelationship | null> {
    return prisma.familyRelationship.findFirst({
      where: { id, student: { schoolId } },
      include: FAMILY_INCLUDE,
    }) as Promise<FamilyRelationship | null>;
  }

  /** Crea el vínculo padre-alumno. */
  async create(data: CreateFamilyRelationshipDto) {
    return prisma.familyRelationship.create({
      data: {
        studentId: data.studentId,
        userId: data.userId,
        relationshipType: data.relationshipType,
        isLegalGuardian: data.isLegalGuardian,
        isFinancialResponsible: data.isFinancialResponsible,
        livesWithStudent: data.livesWithStudent,
      },
      include: FAMILY_INCLUDE,
    });
  }

  /** Actualiza los atributos de la relación (tipo de relación, apoderado legal, etc.). */
  async update(id: string, schoolId: string, data: UpdateFamilyRelationshipDto) {
    // Primero verificamos que la relación pertenezca al colegio
    await this.findById(id, schoolId);
    return prisma.familyRelationship.update({
      where: { id },
      data,
      include: FAMILY_INCLUDE,
    });
  }

  /** Elimina el vínculo padre-alumno. */
  async delete(id: string, schoolId: string) {
    await this.findById(id, schoolId);
    return prisma.familyRelationship.delete({ where: { id } });
  }
}
