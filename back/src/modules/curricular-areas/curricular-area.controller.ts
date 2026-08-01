import { Request, Response } from 'express';
import {
  createCurricularAreaSchema,
  updateCurricularAreaSchema,
  createCompetenceSchema,
} from './curricular-area.schema';
import type { CurricularAreaService } from './curricular-area.service';

export class CurricularAreaController {
  constructor(private readonly curricularAreaService: CurricularAreaService) {}

  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const areas = await this.curricularAreaService.getAllAreas(schoolId);
    response.status(200).json({ status: 'success', data: areas });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const area = await this.curricularAreaService.getAreaById(id, schoolId);
    response.status(200).json({ status: 'success', data: area });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createAreaDto = createCurricularAreaSchema.parse(request.body);
    const area = await this.curricularAreaService.createArea(schoolId, createAreaDto);
    response.status(201).json({ status: 'success', data: area });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const updateAreaDto = updateCurricularAreaSchema.parse(request.body);
    const area = await this.curricularAreaService.updateArea(id, schoolId, updateAreaDto);
    response.status(200).json({ status: 'success', data: area });
  };

  createCompetence = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const createCompetenceDto = createCompetenceSchema.parse(request.body);
    const competence = await this.curricularAreaService.createCompetence(
      schoolId,
      createCompetenceDto,
    );
    response.status(201).json({ status: 'success', data: competence });
  };
}
