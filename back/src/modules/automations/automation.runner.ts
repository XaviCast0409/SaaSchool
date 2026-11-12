import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { AutomationJob, JobContext, JobResult } from './automation.types';

/**
 * Ejecuta un trabajo para un colegio con garantía de "una sola vez por runKey":
 * primero inserta el JobRun (la clave única impide un segundo intento), luego ejecuta
 * y guarda el resultado. Devuelve null si ya existía una ejecución con esa clave.
 */
export async function runJobOnce(
  job: AutomationJob,
  ctx: JobContext,
  runKey: string,
  triggeredById?: string,
): Promise<{ runId: string; result?: JobResult; error?: string } | null> {
  let runId: string;
  try {
    const created = await prisma.jobRun.create({
      data: { jobName: job.name, schoolId: ctx.schoolId, runKey, triggeredById: triggeredById ?? null },
      select: { id: true },
    });
    runId = created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
    throw error;
  }

  try {
    const result = await job.run(ctx);
    await prisma.jobRun.update({
      where: { id: runId },
      data: { status: 'SUCCESS', itemsProcessed: result.items, summary: result.summary.slice(0, 500), finishedAt: new Date() },
    });
    return { runId, result };
  } catch (error) {
    const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
    console.error(`[Automatizaciones] Falló ${job.name} en colegio ${ctx.schoolId}:`, error);
    await prisma.jobRun
      .update({ where: { id: runId }, data: { status: 'FAILED', error: message.slice(0, 4000), finishedAt: new Date() } })
      .catch(() => undefined);
    return { runId, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Arma el contexto de ejecución de un colegio. */
export async function buildContext(
  school: { id: string; name: string },
  now: { dateStr: string; hour: number; minute: number },
  weekday: number,
): Promise<JobContext> {
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isActive: true },
    select: { id: true },
    orderBy: { year: 'desc' },
  });
  return {
    schoolId: school.id,
    schoolName: school.name,
    today: now.dateStr,
    nowTime: `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`,
    weekday,
    activeYearId: activeYear?.id ?? null,
  };
}
