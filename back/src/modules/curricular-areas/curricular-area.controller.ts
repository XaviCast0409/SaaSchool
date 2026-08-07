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

    if (request.query.page || request.query.limit || request.query.level) {
      const page = parseInt(request.query.page as string) || 1;
      const limit = parseInt(request.query.limit as string) || 8;
      const level = (request.query.level as string) || 'ALL';

      const result = await this.curricularAreaService.getAllAreasPaginated(
        schoolId,
        page,
        limit,
        level,
      );

      response.status(200).json({
        status: 'success',
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
      return;
    }

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

  delete = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    await this.curricularAreaService.deleteArea(id, schoolId);
    response.status(200).json({ status: 'success', message: 'Área curricular eliminada' });
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

  seedMinedu = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const result = await this.curricularAreaService.seedMineduCurriculum(schoolId);
    response.status(200).json({
      status: 'success',
      message: `Malla curricular oficial MINEDU precargada (${result.count} nuevas áreas).`,
      data: result,
    });
  };
}
