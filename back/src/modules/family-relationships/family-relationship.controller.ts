import { Request, Response } from 'express';
import { assertStudentAccess } from '../../core/security/student-access';
import { recordAudit } from '../../utils/audit.util';
import {
  createFamilyRelationshipSchema,
  updateFamilyRelationshipSchema,
} from './family-relationship.schema';
import type { FamilyRelationshipService } from './family-relationship.service';

export class FamilyRelationshipController {
  constructor(
    private readonly familyRelationshipService: FamilyRelationshipService,
  ) {}

  /** GET /api/family-relationships */
  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const relationships = await this.familyRelationshipService.getAllBySchool(schoolId);
    response.status(200).json({ status: 'success', data: relationships });
  };

  /** GET /api/family-relationships/:id */
  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const relationship = await this.familyRelationshipService.getById(id, schoolId);
    response.status(200).json({ status: 'success', data: relationship });
  };

  /** GET /api/students/:studentId/parents */
  getByStudent = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const studentId = String(request.params.studentId);
    if (request.user!.role === 'TEACHER') {
      await assertStudentAccess(request.user!, studentId);
    }
    const relationships = await this.familyRelationshipService.getByStudent(studentId, schoolId);
    if (request.user!.role === 'TEACHER') {
      const sanitized = relationships.map((r: any) => ({
        ...r,
        user: r.user
          ? {
              ...r.user,
              documentId: '',
              cellphone: '',
              email: '',
            }
          : r.user,
      }));
      response.status(200).json({ status: 'success', data: sanitized });
      return;
    }
    response.status(200).json({ status: 'success', data: relationships });
  };

  /** GET /api/users/:userId/students */
  getByParent = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userId = String(request.params.userId);
    const relationships = await this.familyRelationshipService.getByParent(userId, schoolId);
    response.status(200).json({ status: 'success', data: relationships });
  };

  /** POST /api/family-relationships */
  create = async (request: Request, response: Response): Promise<void> => {
    const createDto = createFamilyRelationshipSchema.parse(request.body);
    const relationship = await this.familyRelationshipService.create(request.user!.schoolId, createDto);
    recordAudit(request, { action: 'FAMILY_LINK_CREATED', entity: 'FamilyRelationship', entityId: relationship.id, after: createDto });
    response.status(201).json({ status: 'success', data: relationship });
  };

  /** PATCH /api/family-relationships/:id */
  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const updateDto = updateFamilyRelationshipSchema.parse(request.body);
    const before = await this.familyRelationshipService.getById(id, schoolId);
    const relationship = await this.familyRelationshipService.update(id, schoolId, updateDto);
    recordAudit(request, {
      action: 'FAMILY_LINK_UPDATED',
      entity: 'FamilyRelationship',
      entityId: id,
      before: { studentId: before.studentId, userId: before.userId, relationshipType: before.relationshipType, isLegalGuardian: before.isLegalGuardian, isFinancialResponsible: before.isFinancialResponsible },
      after: { studentId: before.studentId, userId: before.userId, ...updateDto },
    });
    response.status(200).json({ status: 'success', data: relationship });
  };

  /** DELETE /api/family-relationships/:id */
  delete = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const before = await this.familyRelationshipService.getById(id, schoolId);
    await this.familyRelationshipService.delete(id, schoolId);
    recordAudit(request, {
      action: 'FAMILY_LINK_DELETED',
      entity: 'FamilyRelationship',
      entityId: id,
      before: { studentId: before.studentId, userId: before.userId, relationshipType: before.relationshipType },
    });
    response.status(204).send();
  };
}
