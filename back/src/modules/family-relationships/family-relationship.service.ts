import { AppError } from '../../core/errors/app-error';
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

  async create(createDto: CreateFamilyRelationshipDto) {
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
