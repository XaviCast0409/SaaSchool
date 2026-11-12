import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge, ProgressBar } from '@/components/ui/letter-badge';
import { cn } from '@/lib/utils';
import { apiErrorMessage, usePeriods, useProgress, useRemindPending, useSetPeriodStatus } from '../api';
import { LEVEL_LABEL, classroomLabel, type Level, type PeriodState, type ProgressRow } from '../types';
import { toast } from 'sonner';
import { formatPeruDate } from '@/lib/dateUtils';

type LevelFilter = 'ALL' | Level;
const fmt = (d: string) => formatPeruDate(d, { day: '2-digit', month: 'short' });

export const PeriodProgressPage: React.FC = () => {
  const { data: periods, isLoading } = usePeriods();
  const [selected, setSelected] = useState<number | null>(null);
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const { data: progress } = useProgress(selected, level === 'ALL' ? undefined : level);
  const setStatus = useSetPeriodStatus();
  const remind = useRemindPending();
  const [forceOpen, setForceOpen] = useState<{ message: string } | null>(null);
  const [forceReason, setForceReason] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (periods && selected === null) setSelected(periods.periods.find((p) => p.status !== 'CLOSED')?.periodNumber ?? 1);
  }, [periods, selected]);
  const current = periods?.periods.find((p) => p.periodNumber === selected);
  useEffect(() => { setDeadline(current?.gradingDeadline ? current.gradingDeadline.slice(0, 10) : ''); }, [current]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProgressRow[]>();
    (progress?.rows ?? []).forEach((r) => map.set(r.classroom.id, [...(map.get(r.classroom.id) ?? []), r]));
    return [...map.values()];
  }, [progress]);

  if (isLoading || !periods) return <Skeleton className="h-64 w-full" />;

  const change = (status: PeriodState, extra: { force?: boolean; reason?: string } = {}) => {
    if (!selected) return;
    setStatus.mutate({ periodNumber: selected, status, ...extra }, {
      onSuccess: () => { setForceOpen(null); setForceReason(''); },
      onError: (e) => {
        const status409 = (e as { response?: { status?: number } })?.response?.status === 409;
        if (status === 'CLOSED' && status409 && !extra.force) setForceOpen({ message: apiErrorMessage(e) });
        else toast.error(apiErrorMessage(e));
      },
    });
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title="Avance y cierre de periodos" description="Revisa qué falta registrar y cierra cada periodo cuando esté completo."
        actions={selected && progress && progress.totals.missingGrades + progress.totals.missingConclusions > 0 && (
          <Button variant="outline" disabled={remind.isPending} onClick={() => remind.mutate(selected)}><Bell className="mr-1 h-4 w-4" />Recordar a docentes con pendientes</Button>
        )} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {periods.periods.map((p) => (
          <button key={p.periodNumber} type="button" onClick={() => setSelected(p.periodNumber)}
            className={cn('rounded-xl border p-4 text-left transition-colors', p.periodNumber === selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}>
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{p.name}</span><PeriodStatusBadge status={p.status} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{fmt(p.startDate)} – {fmt(p.endDate)}</p>
          </button>
        ))}
      </div>

      {current && (
        <Card className="mb-6 flex flex-wrap items-end gap-4 p-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">{current.name}</p>
            <p className="text-sm text-muted-foreground">
              {progress ? `${progress.totals.percent}% registrado · ${progress.totals.missingGrades} calificativos y ${progress.totals.missingConclusions} conclusiones pendientes` : 'Calculando…'}
            </p>
            {current.reason && <p className="mt-1 text-xs text-muted-foreground">Último motivo: {current.reason}</p>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fecha límite de registro</label>
            <div className="flex gap-2">
              <Input type="date" className="h-9 w-40" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ periodNumber: current.periodNumber, status: current.status, gradingDeadline: deadline || null })}>Guardar</Button>
            </div>
          </div>
          <div className="flex gap-2">
            {current.status === 'OPEN' && <Button variant="outline" onClick={() => change('REVIEW')}>Pasar a revisión</Button>}
            {current.status !== 'OPEN' && <Button variant="outline" onClick={() => change('OPEN')}>Reabrir</Button>}
            {current.status !== 'CLOSED' && <Button onClick={() => change('CLOSED')}>Cerrar periodo</Button>}
          </div>
        </Card>
      )}

      <Tabs<LevelFilter> value={level} onChange={setLevel} className="mb-3"
        items={[{ value: 'ALL', label: 'Todos' }, ...(['INITIAL', 'PRIMARY', 'SECONDARY'] as Level[]).map((l) => ({ value: l as LevelFilter, label: LEVEL_LABEL[l] }))]} />

      <div className="space-y-3">
        {grouped.map((rows) => (
          <Card key={rows[0].classroom.id} className="overflow-x-auto">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">{classroomLabel(rows[0].classroom)}</div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Curso</th><th className="px-2 py-2 text-left font-semibold">Docente</th>
                <th className="px-2 py-2 text-left font-semibold">Avance</th><th className="px-2 py-2 text-right font-semibold">Calificativos</th>
                <th className="px-2 py-2 text-right font-semibold">Conclusiones</th><th />
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.assignmentId} className="border-t border-border">
                    <td className="px-4 py-2">{r.course}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.teacher.name}</td>
                    <td className="px-2 py-2">{r.noStudents ? <span className="text-xs text-muted-foreground">Sin estudiantes</span> : <ProgressBar percent={r.percent} />}</td>
                    <td className={cn('px-2 py-2 text-right tabular-nums', r.missingGrades > 0 && 'text-amber-700 dark:text-amber-300')}>{r.missingGrades || '—'}</td>
                    <td className={cn('px-2 py-2 text-right tabular-nums', r.missingConclusions > 0 && 'text-amber-700 dark:text-amber-300')}>{r.missingConclusions || '—'}</td>
                    <td className="px-2 py-2 text-right"><Link className="text-sm text-primary hover:underline" to={`/gradebook/${r.assignmentId}?period=${selected}`}>Abrir registro</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
        {grouped.length === 0 && <p className="text-sm text-muted-foreground">No hay cursos asignados para este filtro.</p>}
      </div>

      <Modal open={!!forceOpen} onClose={() => setForceOpen(null)} title="Cerrar con pendientes" description={forceOpen?.message}
        footer={<>
          <Button variant="ghost" onClick={() => setForceOpen(null)}>Cancelar</Button>
          <Button variant="destructive" disabled={forceReason.trim().length < 5 || setStatus.isPending} onClick={() => change('CLOSED', { force: true, reason: forceReason.trim() })}>Cerrar de todas formas</Button>
        </>}>
        <Textarea rows={3} value={forceReason} onChange={(e) => setForceReason(e.target.value)} placeholder="Motivo (queda en la bitácora)" />
      </Modal>
    </div>
  );
};

