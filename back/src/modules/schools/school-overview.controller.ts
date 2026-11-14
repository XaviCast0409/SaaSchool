import { Request, Response } from 'express';
import { z } from 'zod';
import type { SchoolOverviewService } from './school-overview.service';

const createNoteSchema = z.object({ body: z.string().trim().min(1, 'La nota está vacía').max(4000) });
const updateNoteSchema = z
  .object({ body: z.string().trim().min(1, 'La nota está vacía').max(4000).optional(), pinned: z.boolean().optional() })
  .refine((v) => v.body !== undefined || v.pinned !== undefined, { message: 'Nada que actualizar' });

export class SchoolOverviewController {
  constructor(private readonly service: SchoolOverviewService) {}

  onboarding = async (request: Request, response: Response): Promise<void> => {
    const data = await this.service.onboarding(request.params.id as string);
    response.status(200).json({ status: 'success', data });
  };

  listNotes = async (request: Request, response: Response): Promise<void> => {
    const data = await this.service.listNotes(request.params.id as string);
    response.status(200).json({ status: 'success', data });
  };

  createNote = async (request: Request, response: Response): Promise<void> => {
    const { body } = createNoteSchema.parse(request.body);
    const data = await this.service.createNote(request.params.id as string, body, {
      userId: request.user!.userId,
      email: request.user!.email,
    });
    response.status(201).json({ status: 'success', data });
  };

  updateNote = async (request: Request, response: Response): Promise<void> => {
    const dto = updateNoteSchema.parse(request.body);
    const data = await this.service.updateNote(request.params.id as string, request.params.noteId as string, dto);
    response.status(200).json({ status: 'success', data });
  };

  deleteNote = async (request: Request, response: Response): Promise<void> => {
    await this.service.deleteNote(request.params.id as string, request.params.noteId as string);
    response.status(204).send();
  };
}
