import { Request, Response } from 'express';
import type { AnnouncementService } from './announcement.service';
import { createAnnouncementSchema, updateAnnouncementSchema, announcementFilterSchema } from './announcement.schema';

export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const queryFilters = announcementFilterSchema.parse(req.query);
    const result = await this.announcementService.getAnnouncements(
      { userId: req.user!.userId, role: req.user!.role, schoolId: req.user!.schoolId, studentId: req.user!.studentId },
      queryFilters,
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      meta: result.meta,
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    const announcement = await this.announcementService.getAnnouncementById(id, schoolId);

    res.status(200).json({
      status: 'success',
      data: announcement,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const authorId = req.user!.userId;
    const body = createAnnouncementSchema.parse(req.body);

    const newAnnouncement = await this.announcementService.createAnnouncement(schoolId, authorId, body);

    res.status(201).json({
      status: 'success',
      message: 'Comunicado creado exitosamente',
      data: newAnnouncement,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;
    const body = updateAnnouncementSchema.parse(req.body);

    const updated = await this.announcementService.updateAnnouncement(id, schoolId, body);

    res.status(200).json({
      status: 'success',
      message: 'Comunicado actualizado exitosamente',
      data: updated,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const id = req.params.id as string;

    await this.announcementService.deleteAnnouncement(id, schoolId);

    res.status(200).json({
      status: 'success',
      message: 'Comunicado eliminado exitosamente',
    });
  };
}
