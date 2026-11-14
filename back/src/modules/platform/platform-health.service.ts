import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { getRecentServerErrors, type RecentServerError } from '../../core/observability/recent-errors';
import { AUTOMATION_JOBS } from '../automations/automation.registry';

/** Una corrida que sigue en RUNNING después de esto probablemente quedó colgada. */
const STUCK_AFTER_MS = 60 * 60_000;
const DAY_MS = 86_400_000;

export interface PlatformHealth {
  checkedAt: string;
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
    appVersion: string | null;
    memoryMb: { rss: number; heapUsed: number };
    automationsEnabled: boolean;
    sentryConfigured: boolean;
  };
  database: { ok: boolean; latencyMs: number | null; sizeMb: number | null; error?: string };
  automations: {
    last24h: { success: number; failed: number; running: number };
    stuck: number;
    jobs: { name: string; label: string; lastRunAt: string | null }[];
    recentFailures: { jobName: string; schoolName: string; startedAt: string; error: string | null }[];
  };
  storage: {
    files: number;
    totalMb: number;
    byStorage: { storage: string; files: number; mb: number }[];
    topSchools: { schoolName: string; files: number; mb: number }[];
  };
  recentErrors: RecentServerError[];
}

const toMb = (bytes: number | bigint | null | undefined) => Math.round((Number(bytes ?? 0) / 1024 / 1024) * 10) / 10;

/** Estado de la plataforma para el panel SuperAdmin: servidor, base de datos, automatizaciones, archivos y errores. */
export class PlatformHealthService {
  async check(now: Date = new Date()): Promise<PlatformHealth> {
    const [database, automations, storage] = await Promise.all([this.database(), this.automations(now), this.storage()]);
    const memory = process.memoryUsage();

    return {
      checkedAt: now.toISOString(),
      server: {
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        environment: env.NODE_ENV,
        appVersion: process.env.npm_package_version ?? null,
        memoryMb: { rss: toMb(memory.rss), heapUsed: toMb(memory.heapUsed) },
        automationsEnabled: env.automationsEnabled,
        sentryConfigured: Boolean(env.SENTRY_DSN),
      },
      database,
      automations,
      storage,
      recentErrors: getRecentServerErrors(),
    };
  }

  private async database(): Promise<PlatformHealth['database']> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      const [row] = await prisma.$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database()) AS size`;
      return { ok: true, latencyMs, sizeMb: toMb(row?.size) };
    } catch (error) {
      return { ok: false, latencyMs: null, sizeMb: null, error: (error as Error).message.slice(0, 200) };
    }
  }

  private async automations(now: Date): Promise<PlatformHealth['automations']> {
    const since = new Date(now.getTime() - DAY_MS);
    const [byStatus, stuck, lastRuns, failures] = await Promise.all([
      prisma.jobRun.groupBy({ by: ['status'], where: { startedAt: { gte: since } }, _count: { _all: true } }),
      prisma.jobRun.count({ where: { status: 'RUNNING', startedAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } } }),
      prisma.jobRun.groupBy({ by: ['jobName'], _max: { startedAt: true } }),
      prisma.jobRun.findMany({
        where: { status: 'FAILED' },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: { jobName: true, startedAt: true, error: true, school: { select: { name: true } } },
      }),
    ]);

    const count = (status: string) => byStatus.find((r) => r.status === status)?._count._all ?? 0;
    const lastRunOf = new Map(lastRuns.map((r) => [r.jobName, r._max.startedAt]));

    return {
      last24h: { success: count('SUCCESS'), failed: count('FAILED'), running: count('RUNNING') },
      stuck,
      jobs: AUTOMATION_JOBS.map((job) => ({
        name: job.name,
        label: job.label,
        lastRunAt: lastRunOf.get(job.name)?.toISOString() ?? null,
      })),
      recentFailures: failures.map((f) => ({
        jobName: AUTOMATION_JOBS.find((j) => j.name === f.jobName)?.label ?? f.jobName,
        schoolName: f.school.name,
        startedAt: f.startedAt.toISOString(),
        error: f.error ? f.error.slice(0, 300) : null,
      })),
    };
  }

  private async storage(): Promise<PlatformHealth['storage']> {
    const live = { deletedAt: null };
    const [byStorage, bySchool] = await Promise.all([
      prisma.storedFile.groupBy({ by: ['storage'], where: live, _count: { _all: true }, _sum: { size: true } }),
      prisma.storedFile.groupBy({
        by: ['schoolId'],
        where: live,
        _count: { _all: true },
        _sum: { size: true },
        orderBy: { _sum: { size: 'desc' } },
        take: 5,
      }),
    ]);

    const schools = await prisma.school.findMany({
      where: { id: { in: bySchool.map((r) => r.schoolId) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(schools.map((s) => [s.id, s.name]));

    return {
      files: byStorage.reduce((acc, r) => acc + r._count._all, 0),
      totalMb: toMb(byStorage.reduce((acc, r) => acc + (r._sum.size ?? 0), 0)),
      byStorage: byStorage.map((r) => ({ storage: r.storage, files: r._count._all, mb: toMb(r._sum.size) })),
      topSchools: bySchool.map((r) => ({
        schoolName: nameOf.get(r.schoolId) ?? 'Colegio eliminado',
        files: r._count._all,
        mb: toMb(r._sum.size),
      })),
    };
  }
}
