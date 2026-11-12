import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { MAX_MESSAGE_LENGTH } from './messaging.rules';
import {
  getContacts,
  getMessages,
  listConversations,
  markRead,
  openConversation,
  sendMessage,
  unreadTotal,
  type MessagingUser,
} from './messaging.service';

/** Mensajería privada familia ↔ personal del colegio. Los alumnos no participan. */
export const messagingRouter = Router();
messagingRouter.use(authMiddleware, tenantMiddleware, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'));

const me = (req: Request): MessagingUser => ({
  userId: req.user!.userId,
  role: req.user!.role,
  schoolId: req.user!.schoolId,
  studentId: req.user!.studentId,
});

const uuid = z.string().uuid();

messagingRouter.get('/contacts', async (req: Request, res: Response) => {
  const q = z.object({ studentId: uuid.optional(), search: z.string().max(60).optional() }).parse(req.query);
  res.status(200).json({ status: 'success', data: await getContacts(me(req), q) });
});

messagingRouter.get('/conversations', async (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: await listConversations(me(req)) });
});

messagingRouter.get('/unread-count', async (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', data: { count: await unreadTotal(me(req)) } });
});

messagingRouter.post('/conversations', async (req: Request, res: Response) => {
  const body = z.object({ studentId: uuid, counterpartId: uuid }).parse(req.body);
  res.status(201).json({ status: 'success', data: await openConversation(me(req), body) });
});

messagingRouter.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const { before } = z.object({ before: z.string().datetime().optional() }).parse(req.query);
  res.status(200).json({ status: 'success', data: await getMessages(me(req), id, before) });
});

messagingRouter.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const { body } = z.object({ body: z.string().min(1).max(MAX_MESSAGE_LENGTH + 200) }).parse(req.body);
  res.status(201).json({ status: 'success', data: await sendMessage(me(req), id, body) });
});

messagingRouter.post('/conversations/:id/read', async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  res.status(200).json({ status: 'success', data: await markRead(me(req), id) });
});
