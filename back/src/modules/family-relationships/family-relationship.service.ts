import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { FamilyRelationshipRepository } from './family-relationship.repository';
import type {
  CreateFamilyRelationshipDto,
  UpdateFamilyRelationshipDto,
} from './family-relationship.schema';

export class FamilyRelationshipService {
  constructor(
    private readonly familyRelationshipRepository: FamilyRelationshipRepository,
  ) {}

  async getAllBySchool(schoolId: string) {
    return this.familyRelationshipRepository.findAllBySchool(schoolId);
  }

  async getByStudent(studentId: string, schoolId: string) {
    return this.familyRelationshipRepository.findByStudent(studentId, schoolId);
  }

  async getByParent(userId: string, schoolId: string) {
    return this.familyRelationshipRepository.findByParent(userId, schoolId);
  }

  async getById(id: string, schoolId: string) {
    const relationship = await this.familyRelationshipRepository.findById(id, schoolId);

    if (!relationship) {
      throw new AppError(`Relación familiar con id ${id} no encontrada`, 404);
    }

    return relationship;
  }

  /**
   * Vincula un apoderado con un estudiante. Ambos deben ser del colegio de quien hace la operación:
   * un vínculo da acceso a notas, asistencia y datos del menor.
   */
  async create(schoolId: string, createDto: CreateFamilyRelationshipDto) {
    const [student, parent, existing] = await Promise.all([
      prisma.student.findFirst({ where: { id: createDto.studentId, schoolId }, select: { id: true } }),
      prisma.user.findFirst({ where: { id: createDto.userId, schoolId }, select: { id: true, role: true, isActive: true } }),
      prisma.familyRelationship.findFirst({ where: { studentId: createDto.studentId, userId: createDto.userId }, select: { id: true } }),
    ]);
    if (!student) throw new AppError('Estudiante no encontrado en este colegio.', 404);
    if (!parent) throw new AppError('Apoderado no encontrado en este colegio.', 404);
    if (parent.role !== 'PARENT') throw new AppError('Solo se puede vincular a una cuenta de apoderado.', 400);
    if (!parent.isActive) throw new AppError('La cuenta de ese apoderado está desactivada.', 400);
    if (existing) throw new AppError('Ese apoderado ya está vinculado a este estudiante.', 409);
    return this.familyRelationshipRepository.create(createDto);
  }

  async update(id: string, schoolId: string, updateDto: UpdateFamilyRelationshipDto) {
    await this.getById(id, schoolId);
    return this.familyRelationshipRepository.update(id, schoolId, updateDto);
  }

  async delete(id: string, schoolId: string): Promise<void> {
    await this.getById(id, schoolId);
    await this.familyRelationshipRepository.delete(id, schoolId);
  }
}
