import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Printer, Save } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { LetterBadge, PeriodStatusBadge } from '@/components/ui/letter-badge';
import { usePeriods, useSaveTutorReport, useTutorReport } from '../api';
import type { Letter, TutorReport } from '../types';

interface Draft { conductScore: string; conductLetter: Letter | ''; conductComment: string; tutorComment: string }

const letterFor = (score: number, t: TutorReport['thresholds']): Letter => (score >= t.AD ? 'AD' : score >= t.A ? 'A' : score >= t.B ? 'B' : 'C');

/** Registro del tutor o tutora: conducta (nota + comentario) y comentario general para la libreta interna. */
export const TutorReportPage: React.FC = () => {
  const [params] = useSearchParams();
  const classroomId = params.get('classroomId');
  const { data: periods } = usePeriods();
  const [period, setPeriod] = useState<number | null>(null);
  useEffect(() => {
    if (period !== null || !periods?.periods.length) return;
    const open = periods.periods.find((p) => p.status !== 'CLOSED') ?? periods.periods[periods.periods.length - 1];
    setPeriod(open.periodNumber);
  }, [periods, period]);

  const { data, isLoading, error } = useTutorReport(classroomId, period);
  const save = useSaveTutorReport();
  const initial = useMemo(
    () => Object.fromEntries((data?.students ?? []).map((s) => [s.enrollmentId, {
      conductScore: s.conductScore === null ? '' : String(s.conductScore),
      conductLetter: (s.conductLetter ?? '') as Letter | '',
      conductComment: s.conductComment,
      tutorComment: s.tutorComment,
    }])) as Record<string, Draft>,
    [data],
  );
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  useEffect(() => setDraft(initial), [initial]);

  if (!classroomId) return <p className="text-sm">Falta elegir el aula.</p>;
  const dirtyIds = Object.keys(draft).filter((id) => JSON.stringify(draft[id]) !== JSON.stringify(initial[id]));
  const invalid = Object.values(draft).some((d) => d.conductScore !== '' && (Number.isNaN(Number(d.conductScore)) || Number(d.conductScore) < 0 || Number(d.conductScore) > 20));
  const set = (id: string, patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const submit = () => {
    if (!data || !period) return;
    save.mutate({
      classroomId,
      periodNumber: period,
      rows: dirtyIds.map((id) => {
        const d = draft[id];
        return {
          enrollmentId: id,
          conductScore: d.conductScore === '' ? null : Number(d.conductScore),
          conductLetter: d.conductLetter || null,
          conductComment: d.conductComment,
          tutorComment: d.tutorComment,
        };
      }),
    });
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Conducta y comentarios de la libreta"
        description="Nota y comentario de conducta, y tu comentario como tutor(a) sobre el desempeño general. Sale en la libreta interna; no va al SIAGIE."
        actions={<Button variant="outline" asChild><Link to={`/academic/report-cards/print?classroomId=${classroomId}`}><Printer className="mr-1 h-4 w-4" />Ver libretas</Link></Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Periodo" value={period ?? ''} onChange={(e) => setPeriod(Number(e.target.value))}>
          {periods?.periods.map((p) => <option key={p.periodNumber} value={p.periodNumber}>{p.name}</option>)}
        </Select>
        {data && <PeriodStatusBadge status={data.periodStatus} />}
        {data && !data.canEdit && <span className="text-xs text-muted-foreground">Solo lectura: el periodo está cerrado o no eres el tutor(a) del aula.</span>}
      </div>

      {error ? <p className="text-sm text-red-600">No se pudo cargar el registro.</p> : isLoading || !data ? <Skeleton className="h-96 w-full" /> : data.students.length === 0 ? (
        <p className="text-sm text-muted-foreground">El aula no tiene estudiantes matriculados.</p>
      ) : (
        <>
          <div className="space-y-3">
            {data.students.map((s, idx) => {
              const d = draft[s.enrollmentId];
              if (!d) return null;
              const score = d.conductScore === '' ? null : Number(d.conductScore);
              const autoLetter = score !== null && !Number.isNaN(score) ? letterFor(score, data.thresholds) : null;
              return (
                <Card key={s.enrollmentId} className="p-4">
                  <p className="text-sm font-semibold">{idx + 1}. {s.fullName}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[auto_1fr]">
                    <div className="flex items-end gap-2">
                      <label className="text-xs text-muted-foreground">
                        Conducta (0-20)
                        <Input type="number" min={0} max={20} step={0.5} className="mt-1 w-20 text-center" disabled={!data.canEdit}
                          value={d.conductScore} onChange={(e) => set(s.enrollmentId, { conductScore: e.target.value })} />
                      </label>
                      {autoLetter ? (
                        <span className="pb-2"><LetterBadge letter={autoLetter} title="Literal según la escala del colegio" /></span>
                      ) : (
                        <label className="text-xs text-muted-foreground">
                          o literal
                          <Select className="mt-1" disabled={!data.canEdit} value={d.conductLetter}
                            onChange={(e) => set(s.enrollmentId, { conductLetter: e.target.value as Letter | '' })}>
                            <option value="">—</option>
                            {(['AD', 'A', 'B', 'C'] as const).map((l) => <option key={l} value={l}>{l}</option>)}
                          </Select>
                        </label>
                      )}
                    </div>
                    <label className="text-xs text-muted-foreground">
                      Comentario de conducta
                      <Textarea className="mt-1" rows={2} maxLength={data.maxCommentLength} disabled={!data.canEdit}
                        placeholder="Ej.: Respeta las normas de convivencia y colabora con sus compañeros."
                        value={d.conductComment} onChange={(e) => set(s.enrollmentId, { conductComment: e.target.value })} />
                    </label>
                  </div>
                  <label className="mt-3 block text-xs text-muted-foreground">
                    Comentario del tutor(a) sobre el desempeño general
                    <Textarea className="mt-1" rows={3} maxLength={data.maxCommentLength} disabled={!data.canEdit}
                      placeholder="Fortalezas, aspectos por mejorar y recomendaciones para la familia."
                      value={d.tutorComment} onChange={(e) => set(s.enrollmentId, { tutorComment: e.target.value })} />
                  </label>
                </Card>
              );
            })}
          </div>
          {data.canEdit && (
            <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
              {invalid && <span className="text-xs text-red-600">La nota de conducta va de 0 a 20.</span>}
              <span className="text-xs text-muted-foreground">{dirtyIds.length ? `${dirtyIds.length} con cambios sin guardar` : 'Sin cambios'}</span>
              <Button disabled={dirtyIds.length === 0 || invalid || save.isPending} onClick={submit}>
                {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}Guardar
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
