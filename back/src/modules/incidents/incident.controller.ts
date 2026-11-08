import { Request, Response } from 'express';
import { createIncidentSchema, incidentFilterSchema } from './incident.schema';
import type { IncidentService } from './incident.service';

export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const authorId = request.user!.userId;
    const dto = createIncidentSchema.parse(request.body);
    const incident = await this.incidentService.createIncident(schoolId, authorId, dto);
    response.status(201).json({ status: 'success', data: incident });
  };

  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const filters = incidentFilterSchema.parse(request.query);
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      studentId: request.user!.studentId,
    };
    const result = await this.incidentService.getIncidents(schoolId, filters, userContext);
    response.status(200).json({ status: 'success', data: result.data, meta: result.meta });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      studentId: request.user!.studentId,
    };
    const incident = await this.incidentService.getIncidentById(schoolId, id, userContext);
    response.status(200).json({ status: 'success', data: incident });
  };

  acknowledge = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const userId = request.user!.userId;
    const role = request.user!.role;
    const incident = await this.incidentService.acknowledgeIncident(schoolId, id, userId, role);
    response.status(200).json({ status: 'success', data: incident });
  };
}

