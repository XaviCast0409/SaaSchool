import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { getSchoolNow } from '../../utils/timezone.util';
import { limaWeekday } from '../attendance/attendance.rules';
import { AUTOMATION_JOBS, findJob, planAllows } from './automation.registry';
import { buildContext, runJobOnce } from './automation.runner';
import { emailQueueStats } from './email-queue';

export const automationRouter = Router();

automationRouter.use(authMiddleware, tenantMiddleware, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'));

const jobParam = z.object({ jobName: z.string().min(1).max(80) });
const updateBody = z.object({ enabled: z.boolean() });

/** Lista de automatizaciones con su estado en el colegio y la última ejecución. */
automationRouter.get('/', async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const [school, settings, lastRuns] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { plan: true } }),
    prisma.schoolAutomationSetting.findMany({ where: { schoolId } }),
    prisma.jobRun.findMany({
      where: { schoolId },
      orderBy: { startedAt: 'desc' },
      distinct: ['jobName'],
      select: { jobName: true, status: true, startedAt: true, finishedAt: true, summary: true, itemsProcessed: true, triggeredById: true },
    }),
  ]);
  const enabledOf = new Map(settings.map((s) => [s.jobName, s.enabled]));
  const lastOf = new Map(lastRuns.map((r) => [r.jobName, r]));

  res.status(200).json({
    status: 'success',
    data: {
      jobs: AUTOMATION_JOBS.map((job) => ({
        name: job.name,
        label: job.label,
        description: job.description,
        audience: job.audience,
        channels: job.channels,
        scheduleLabel: job.scheduleLabel,
        minPlan: job.minPlan,
        availableInPlan: planAllows(school?.plan ?? 'BASIC', job.minPlan),
        enabled: enabledOf.get(job.name) ?? job.defaultEnabled,
        lastRun: lastOf.get(job.name) ?? null,
      })),
      email: emailQueueStats(),
    },
  });
});

/** Historial reciente de ejecuciones de una automatización. */
automationRouter.get('/:jobName/runs', async (req: Request, res: Response) => {
  const { jobName } = jobParam.parse(req.params);
  if (!findJob(jobName)) throw new AppError('Automatización no encontrada.', 404);
  const runs = await prisma.jobRun.findMany({
    where: { schoolId: req.user!.schoolId, jobName },
    orderBy: { startedAt: 'desc' },
    take: 20,
    select: { id: true, runKey: true, status: true, itemsProcessed: true, summary: true, error: true, startedAt: true, finishedAt: true, triggeredById: true },
  });
  // No exponer trazas internas: solo la primera línea del error
  res.status(200).json({ status: 'success', data: runs.map((r) => ({ ...r, error: r.error ? r.error.split('\n')[0] : null })) });
});

/** Activar o desactivar una automatización para el colegio. */
automationRouter.patch('/:jobName', async (req: Request, res: Response) => {
  const { jobName } = jobParam.parse(req.params);
  const { enabled } = updateBody.parse(req.body);
  const job = findJob(jobName);
  if (!job) throw new AppError('Automatización no encontrada.', 404);
  const schoolId = req.user!.schoolId;

  const before = await prisma.schoolAutomationSetting.findUnique({ where: { schoolId_jobName: { schoolId, jobName } } });
  const setting = await prisma.schoolAutomationSetting.upsert({
    where: { schoolId_jobName: { schoolId, jobName } },
    create: { schoolId, jobName, enabled, updatedById: req.user!.userId },
    update: { enabled, updatedById: req.user!.userId },
  });
  recordAudit(req, {
    action: 'AUTOMATION_UPDATED',
    entity: 'SchoolAutomationSetting',
    entityId: setting.id,
    before: { automatizacion: job.label, activa: before?.enabled ?? job.defaultEnabled },
    after: { automatizacion: job.label, activa: enabled },
  });
  res.status(200).json({ status: 'success', data: { name: jobName, enabled } });
});

/** Ejecutar ahora (prueba manual). No cuenta como la ejecución automática del día. */
automationRouter.post('/:jobName/run', async (req: Request, res: Response) => {
  const { jobName } = jobParam.parse(req.params);
  const job = findJob(jobName);
  if (!job) throw new AppError('Automatización no encontrada.', 404);
  const schoolId = req.user!.schoolId;
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, plan: true } });
  if (!school) throw new AppError('Colegio no encontrado.', 404);
  if (!planAllows(school.plan, job.minPlan)) throw new AppError('Esta automatización requiere el plan PRO.', 403);

  // Evitar ejecuciones manuales repetidas: máximo una cada 5 minutos por automatización
  const recent = await prisma.jobRun.findFirst({
    where: { schoolId, jobName, triggeredById: { not: null }, startedAt: { gt: new Date(Date.now() - 5 * 60 * 1000) } },
  });
  if (recent) throw new AppError('Ya se ejecutó manualmente hace poco. Espera unos minutos.', 429);

  const now = getSchoolNow();
  const ctx = await buildContext(school, now, limaWeekday());
  const outcome = await runJobOnce(job, ctx, `manual:${Date.now()}`, req.user!.userId);
  recordAudit(req, { action: 'AUTOMATION_RUN_MANUAL', entity: 'JobRun', entityId: outcome?.runId, after: { automatizacion: job.label } });
  if (!outcome || outcome.error) {
    throw new AppError(`La automatización falló: ${outcome?.error ?? 'sin detalle'}`, 500);
  }
  res.status(200).json({ status: 'success', data: outcome.result });
});
