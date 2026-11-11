import { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import { pickupSchema, updatePickupSchema, listPickupsQuerySchema } from './pickup.schema';
import { pickupService } from './pickup.service';

export class PickupController {
  list = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const query = listPickupsQuerySchema.parse(request.query);
    const data = await pickupService.list(schoolId, query.studentId, request.user!);
    response.status(200).json({ status: 'success', data });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = pickupSchema.parse(request.body);
    const data = await pickupService.create(schoolId, dto, request.user!);
    recordAudit(request, {
      action: 'PICKUP_CREATED',
      entity: 'AuthorizedPickup',
      entityId: data.id,
      after: dto,
    });
    response.status(201).json({ status: 'success', data });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const dto = updatePickupSchema.parse(request.body);
    const data = await pickupService.update(schoolId, id, dto);
    recordAudit(request, {
      action: 'PICKUP_UPDATED',
      entity: 'AuthorizedPickup',
      entityId: id,
      after: dto,
    });
    response.status(200).json({ status: 'success', data });
  };

  deactivate = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = String(request.params.id);
    const data = await pickupService.deactivate(schoolId, id);
    recordAudit(request, {
      action: 'PICKUP_DEACTIVATED',
      entity: 'AuthorizedPickup',
      entityId: id,
    });
    response.status(200).json({ status: 'success', data });
  };
}

export const pickupController = new PickupController();
