import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, Loader2, Printer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SchoolLetterhead } from '@/features/schools/components/SchoolLetterhead';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { useRatifications, useRemindRatification } from '../../api/useSecretariat';

export const RatificationTab: React.FC<{ open: boolean }> = ({ open }) => {
  const { data, isLoading } = useRatifications();
  const remind = useRemindRatification();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'DECLINED'>('ALL');
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const counts = useMemo(
    () => ({
      CONFIRMED: rows.filter((r) => r.decision === 'CONFIRMED').length,
      DECLINED: rows.filter((r) => r.decision === 'DECLINED').length,
      PENDING: rows.filter((r) => !r.decision).length,
    }),
    [rows],
  );
  const visible = rows.filter((r) => filter === 'ALL' || (filter === 'PENDING' ? !r.decision : r.decision === filter));

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data?.targetYear)
    return (
      <EmptyState
        title="Ratificación no configurada"
        description="Configura el año que se ratifica en «Configurar admisión y ratificación»."
      />
    );
  const pct = rows.length ? Math.round(((counts.CONFIRMED + counts.DECLINED) / rows.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <SchoolLetterhead
        className="hidden print:flex"
        title={`Ratificación de matrícula ${data.targetYear}`}
        subtitle={`Impreso el ${new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}`}
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Avance</p>
          <p className="text-2xl font-semibold">{pct}%</p>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Continúan</p>
          <p className="text-2xl font-semibold text-emerald-600">{counts.CONFIRMED}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">No continúan</p>
          <p className="text-2xl font-semibold text-red-600">{counts.DECLINED}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Sin responder</p>
          <p className="text-2xl font-semibold text-amber-600">{counts.PENDING}</p>
        </Card>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'PENDING', 'CONFIRMED', 'DECLINED'] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {{ ALL: 'Todos', PENDING: 'Sin responder', CONFIRMED: 'Continúan', DECLINED: 'No continúan' }[f]}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" aria-hidden /> Imprimir
          </Button>
          <Button
            size="sm"
            className="gap-1"
            disabled={!open || counts.PENDING === 0 || remind.isPending}
            title={!open ? 'Activa la ratificación en línea primero' : undefined}
            onClick={() =>
              remind.mutate(undefined, {
                onSuccess: (r) =>
                  toast.success(`Recordatorio enviado a ${r.families} familiares de ${r.students} alumnos`),
                onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo enviar el recordatorio.')),
              })
            }
          >
            {remind.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BellRing className="h-3.5 w-3.5" aria-hidden />
            )}{' '}
            Recordar a quienes faltan
          </Button>
        </div>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Estudiante</th>
              <th className="px-3 py-2">Aula {new Date().getFullYear()}</th>
              <th className="px-3 py-2">Respuesta {data.targetYear}</th>
              <th className="px-3 py-2">Firmó</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.studentId} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{r.studentName}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.classroom}</td>
                <td className="px-3 py-2">
                  {r.decision === 'CONFIRMED' ? (
                    <Badge variant="success">Continúa</Badge>
                  ) : r.decision === 'DECLINED' ? (
                    <Badge variant="destructive">No continúa</Badge>
                  ) : (
                    <Badge variant="secondary">Pendiente</Badge>
                  )}
                  {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.signedBy && r.signedAt ? `${r.signedBy} · ${formatPeruDateTime(r.signedAt)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Sin registros en este filtro.</p>
        )}
      </Card>
    </div>
  );
};
