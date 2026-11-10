import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { LEGAL_VERSIONS, REQUIRED_DOCUMENTS_BY_ROLE, type LegalDocumentType } from './legal.constants';

export const legalRouter = Router();
legalRouter.use(authMiddleware, tenantMiddleware);

const principalWhere = (req: Request) =>
  req.user!.role === 'STUDENT'
    ? { studentId: req.user!.studentId ?? req.user!.userId }
    : { userId: req.user!.userId };

const getPending = async (req: Request): Promise<LegalDocumentType[]> => {
  const required = REQUIRED_DOCUMENTS_BY_ROLE[req.user!.role] ?? [];
  if (required.length === 0) return [];
  const accepted = await prisma.legalAcceptance.findMany({
    where: { schoolId: req.user!.schoolId, ...principalWhere(req), documentType: { in: required } },
    select: { documentType: true, version: true },
  });
  return required.filter(
    (doc) => !accepted.some((a) => a.documentType === doc && a.version === LEGAL_VERSIONS[doc]),
  );
};

legalRouter.get('/status', async (req: Request, res: Response) => {
  const pending = await getPending(req);
  res.status(200).json({
    status: 'success',
    data: { pending: pending.map((type) => ({ type, version: LEGAL_VERSIONS[type] })) },
  });
});

const acceptSchema = z.object({
  documents: z.array(z.enum(['PRIVACY_POLICY', 'TERMS', 'MINOR_DATA_CONSENT'])).min(1),
});

legalRouter.post('/accept', async (req: Request, res: Response) => {
  const { documents } = acceptSchema.parse(req.body);
  const pending = await getPending(req);
  const missing = pending.filter((doc) => !documents.includes(doc));
  if (missing.length > 0) {
    throw new AppError('Debes aceptar todos los documentos pendientes para continuar.', 400);
  }
  await prisma.legalAcceptance.createMany({
    data: pending.map((documentType) => ({
      schoolId: req.user!.schoolId,
      ...principalWhere(req),
      documentType,
      version: LEGAL_VERSIONS[documentType],
      ip: req.ip ?? null,
      userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
    })),
  });
  res.status(200).json({ status: 'success', data: { accepted: pending } });
});
