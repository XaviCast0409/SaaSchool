import React from 'react';
import { Activity, CheckCircle2, Database, HardDrive, RefreshCw, Server, Workflow, XCircle, Bug } from 'lucide-react';
import { usePlatformHealth } from '../api/usePlatform';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime } from '@/lib/dateUtils';

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
};

const STORAGE_LABELS: Record<string, string> = { R2: 'Cloudflare R2', LOCAL: 'Servidor (desarrollo)' };

/** Salud de la plataforma: servidor, base de datos, automatizaciones, archivos y errores recientes */
export const PlatformHealthPage: React.FC = () => {
  const { data: health, isLoading, isFetching, refetch, isError } = usePlatformHealth();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Salud del sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {health ? `Revisado ${formatPeruDateTime(health.checkedAt)} · se actualiza cada minuto` : 'Estado del servidor y sus procesos'}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => refetch()} isLoading={isFetching}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>

      {isError && <p className="text-sm text-destructive">No se pudo consultar el estado del servidor.</p>}

      {isLoading || !health ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatusCard
              icon={<Server className="w-4 h-4" />}
              title="Servidor"
              ok
              value={`Activo ${formatUptime(health.server.uptimeSeconds)}`}
              lines={[
                `${health.server.environment} · Node ${health.server.nodeVersion}${health.server.appVersion ? ` · v${health.server.appVersion}` : ''}`,
                `Memoria ${health.server.memoryMb.rss} MB (heap ${health.server.memoryMb.heapUsed} MB)`,
                health.server.sentryConfigured ? 'Sentry conectado' : 'Sentry no configurado',
              ]}
            />
            <StatusCard
              icon={<Database className="w-4 h-4" />}
              title="Base de datos"
              ok={health.database.ok}
              value={health.database.ok ? `Responde en ${health.database.latencyMs} ms` : 'Sin conexión'}
              lines={[health.database.ok ? `Tamaño ${health.database.sizeMb} MB` : (health.database.error ?? '')]}
            />
            <StatusCard
              icon={<Workflow className="w-4 h-4" />}
              title="Automatizaciones (24 h)"
              ok={health.automations.last24h.failed === 0 && health.automations.stuck === 0}
              value={health.server.automationsEnabled ? `${health.automations.last24h.success} correctas` : 'Desactivadas en este servidor'}
              lines={[
                `${health.automations.last24h.failed} con error · ${health.automations.last24h.running} en curso`,
                health.automations.stuck > 0 ? `${health.automations.stuck} colgadas (más de 1 h)` : 'Ninguna colgada',
              ]}
            />
            <StatusCard
              icon={<HardDrive className="w-4 h-4" />}
              title="Archivos"
              ok
              value={`${health.storage.totalMb} MB`}
              lines={[
                `${health.storage.files} archivos`,
                health.storage.byStorage.map((s) => `${STORAGE_LABELS[s.storage] ?? s.storage}: ${s.mb} MB`).join(' · ') || 'Sin archivos',
              ]}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Última corrida por automatización</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border text-sm">
                  {health.automations.jobs.map((job) => (
                    <li key={job.name} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-foreground">{job.label}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {job.lastRunAt ? formatPeruDateTime(job.lastRunAt) : 'Nunca'}
                      </span>
                    </li>
                  ))}
                </ul>
                {health.automations.recentFailures.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-destructive">Errores recientes</h3>
                    <ul className="space-y-2">
                      {health.automations.recentFailures.map((f, i) => (
                        <li key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
                          <div className="font-semibold text-foreground">
                            {f.jobName} · {f.schoolName}
                          </div>
                          <div className="text-muted-foreground">{formatPeruDateTime(f.startedAt)}</div>
                          {f.error && <div className="mt-1 text-destructive break-words">{f.error}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bug className="w-4 h-4 text-destructive" /> Errores del servidor
                    <Badge variant={health.recentErrors.length ? 'destructive' : 'success'} className="text-[10px]">
                      {health.recentErrors.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">Últimos errores internos desde que arrancó el servidor (se borran al reiniciar).</p>
                </CardHeader>
                <CardContent>
                  {!health.recentErrors.length ? (
                    <p className="text-sm text-muted-foreground">Sin errores internos.</p>
                  ) : (
                    <ul className="space-y-2 max-h-80 overflow-y-auto">
                      {health.recentErrors.map((e, i) => (
                        <li key={i} className="rounded-lg border border-border p-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="font-mono text-foreground break-all">
                              {e.method} {e.path}
                            </code>
                            <span className="text-muted-foreground">{formatPeruDateTime(e.at)}</span>
                          </div>
                          <div className="mt-1 text-destructive break-words">{e.message}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Colegios que más archivos usan</CardTitle>
                </CardHeader>
                <CardContent>
                  {!health.storage.topSchools.length ? (
                    <p className="text-sm text-muted-foreground">Sin archivos todavía.</p>
                  ) : (
                    <ul className="divide-y divide-border text-sm">
                      {health.storage.topSchools.map((s) => (
                        <li key={s.schoolName} className="flex items-center justify-between gap-3 py-2">
                          <span className="text-foreground truncate">{s.schoolName}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {s.mb} MB · {s.files} archivos
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatusCard: React.FC<{ icon: React.ReactNode; title: string; ok: boolean; value: string; lines: string[] }> = ({
  icon,
  title,
  ok,
  value,
  lines,
}) => (
  <Card className="border-border shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
        {icon}
        {title}
      </CardTitle>
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="Sin problemas" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive" aria-label="Requiere revisión" />
      )}
    </CardHeader>
    <CardContent className="space-y-1">
      <div className={`text-lg font-extrabold ${ok ? 'text-foreground' : 'text-destructive'}`}>{value}</div>
      {lines.filter(Boolean).map((line, i) => (
        <p key={i} className="text-[11px] text-muted-foreground break-words">
          {line}
        </p>
      ))}
    </CardContent>
  </Card>
);
