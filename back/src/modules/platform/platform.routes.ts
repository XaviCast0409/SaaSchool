import { Router, Request, Response } from 'express';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import {
  PlatformAnnouncementService,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from './platform-announcement.service';
import { PlatformHealthService } from './platform-health.service';

const announcements = new PlatformAnnouncementService();
const health = new PlatformHealthService();
const SUPER_ADMIN = authorizeRoles('SUPER_ADMIN');

export const platformRouter: Router = Router();

platformRouter.use(authMiddleware);

// Avisos vigentes para el usuario actual (cualquier rol; los muestra el layout)
platformRouter.get('/announcements/active', async (request: Request, response: Response) => {
  const data = await announcements.activeFor(request.user!.role);
  response.status(200).json({ status: 'success', data });
});

// Gestión de avisos (solo plataforma)
platformRouter.get('/announcements', SUPER_ADMIN, async (_request: Request, response: Response) => {
  response.status(200).json({ status: 'success', data: await announcements.list() });
});

platformRouter.post('/announcements', SUPER_ADMIN, async (request: Request, response: Response) => {
  const dto = createAnnouncementSchema.parse(request.body);
  const data = await announcements.create(dto, request.user!.email ?? null);
  response.status(201).json({ status: 'success', data });
});

platformRouter.patch('/announcements/:id', SUPER_ADMIN, async (request: Request, response: Response) => {
  const dto = updateAnnouncementSchema.parse(request.body);
  const data = await announcements.update(request.params.id as string, dto);
  response.status(200).json({ status: 'success', data });
});

platformRouter.delete('/announcements/:id', SUPER_ADMIN, async (request: Request, response: Response) => {
  await announcements.remove(request.params.id as string);
  response.status(204).send();
});

// Salud del sistema (solo plataforma)
platformRouter.get('/health', SUPER_ADMIN, async (_request: Request, response: Response) => {
  response.status(200).json({ status: 'success', data: await health.check() });
});
