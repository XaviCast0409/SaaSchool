import React, { useEffect, useState } from 'react';
import { LetterBadge } from '@/components/ui/letter-badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useReportCard } from '../api';
import type { GradeCell, ReportCard } from '../types';

const SITUATION: Record<string, string> = { PROMOTED: 'Promovido(a)', RECOVERY: 'Requiere recuperación', RETAINED: 'Permanece en el grado', TRANSFERRED: 'Trasladado(a)', WITHDRAWN: 'Retirado(a)' };

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Periodo que se muestra por defecto: el último publicado. */
export const defaultReportPeriod = (card: Pick<ReportCard, 'visiblePeriods'>) => card.visiblePeriods[card.visiblePeriods.length - 1] ?? null;

/** Nota numérica y literal juntas: "12 B". */
const Grade: React.FC<{ cell?: GradeCell; strong?: boolean }> = ({ cell, strong }) => {
  if (!cell || (cell.score === null && !cell.letter)) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center justify-center gap-1">
      {cell.score !== null && <span className={cn('tabular-nums', strong && 'font-semibold')}>{fmt(cell.score)}</span>}
      <LetterBadge letter={cell.letter} className="min-w-[1.75rem] px-1 py-0 text-[10px]" />
    </span>
  );
};

export const ReportCardSheet: React.FC<{ card: ReportCard; periodNumber?: number | null; printable?: boolean; className?: string }> = ({
  card, periodNumber, printable, className = '',
}) => {
  const p = periodNumber && card.visiblePeriods.includes(periodNumber) ? periodNumber : defaultReportPeriod(card);
  const periodLabel = card.periods.find((x) => x.periodNumber === p)?.name ?? '';
  const cols = card.criteriaColumns ?? [];
  const areas = card.areas ?? [];
  const conduct = (card.conduct ?? []).find((c) => c.periodNumber === p);
  const cellCls = 'px-1 py-1 text-center whitespace-nowrap';

  return (
    <article className={printable ? `bg-white p-6 text-[11px] text-black ${className}` : `rounded-xl border border-border bg-card p-5 text-sm ${className}`}>
      <header className="mb-3 flex items-start justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          {card.school?.logoUrl && <img src={card.school.logoUrl} alt="" className="h-12 w-12 object-contain" />}
          <div>
            <p className="font-semibold">{card.school?.name}</p>
            <p className="text-xs text-muted-foreground">Código modular: {card.school?.modularCode ?? '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">Libreta de notas</p>
          <p className="text-xs text-muted-foreground">Año escolar {card.academicYear.year}{periodLabel ? ` · ${periodLabel}` : ''}</p>
        </div>
      </header>
      <div className="mb-3 grid gap-1 sm:grid-cols-2">
        <p><span className="text-muted-foreground">Estudiante:</span> {card.student.fullName}</p>
        <p><span className="text-muted-foreground">Código SIAGIE:</span> {card.student.studentCode ?? '—'}</p>
        <p><span className="text-muted-foreground">Grado y sección:</span> {card.classroom.label}</p>
        <p><span className="text-muted-foreground">Tutor(a):</span> {card.tutor ?? '—'}</p>
      </div>

      {p === null ? (
        <p className="mt-4 text-muted-foreground">Aún no hay periodos publicados. La libreta se mostrará cuando el colegio cierre el primer periodo.</p>
      ) : (
        <>
          {areas.length === 0 ? <p className="text-muted-foreground">Aún no hay cursos con notas.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-border text-muted-foreground">
                    <th className="py-1.5 text-left font-semibold">Área / curso</th>
                    {cols.map((k) => <th key={k.id} title={k.name} className={cn(cellCls, 'font-semibold')}>{k.shortName}</th>)}
                    <th className={cn(cellCls, 'font-semibold text-foreground')}>Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area) => {
                    if (area.single) {
                      const course = area.courses[0];
                      return (
                        <tr key={area.code} className="border-b border-border bg-muted/40">
                          <td className="py-1.5 pr-2 font-semibold">
                            {area.name}
                            {area.isWorkshop && <span className="ml-1 text-[10px] font-normal text-muted-foreground">(taller, no va al SIAGIE)</span>}
                          </td>
                          {cols.map((k) => <td key={k.id} className={cellCls}><Grade cell={course.criteria.find((x) => x.id === k.id)?.periods[p]} /></td>)}
                          <td className={cellCls}><Grade cell={course.average[p]} strong /></td>
                        </tr>
                      );
                    }
                    return (
                      <React.Fragment key={area.code}>
                        <tr className="border-b border-border bg-muted/40">
                          <td className="py-1.5 pr-2 font-semibold">{area.name}</td>
                          {cols.map((k) => <td key={k.id} />)}
                          <td className={cellCls}><Grade cell={area.average[p]} strong /></td>
                        </tr>
                        {area.courses.map((course) => (
                          <tr key={course.id} className="border-b border-border/60">
                            <td className="py-1 pl-4 pr-2">{course.name}</td>
                            {cols.map((k) => <td key={k.id} className={cellCls}><Grade cell={course.criteria.find((x) => x.id === k.id)?.periods[p]} /></td>)}
                            <td className={cellCls}><Grade cell={course.average[p]} strong /></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {cols.length > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">{cols.map((k) => `${k.shortName}: ${k.name}`).join(' · ')}</p>
              )}
            </div>
          )}

          <section className="mt-4 grid gap-4 break-inside-avoid sm:grid-cols-[auto_1fr]">
            <div>
              <h2 className="mb-1 text-sm font-semibold">Conducta</h2>
              <div className="flex items-center gap-2 text-base">
                <Grade cell={conduct ? { score: conduct.score, letter: conduct.letter } : undefined} strong />
              </div>
            </div>
            <div>
              <h2 className="mb-1 text-sm font-semibold">Comentario de conducta</h2>
              <p className="whitespace-pre-line text-xs">{conduct?.comment || <span className="text-muted-foreground">—</span>}</p>
            </div>
          </section>

          <section className="mt-4 break-inside-avoid">
            <h2 className="mb-1 text-sm font-semibold">Comentario del tutor(a)</h2>
            <p className="whitespace-pre-line text-xs">{conduct?.tutorComment || <span className="text-muted-foreground">—</span>}</p>
          </section>
        </>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{card.scaleLegend.map((l) => `${l.letter}: ${l.label}`).join(' · ')}</span>
        {card.finalSituation && <span className="font-semibold text-foreground">Situación final: {SITUATION[card.finalSituation] ?? card.finalSituation}</span>}
      </footer>
      {printable && (
        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-xs">
          {['Tutor(a)', 'Dirección', 'Madre, padre o apoderado(a)'].map((s) => <div key={s} className="border-t border-black pt-1">{s}</div>)}
        </div>
      )}
    </article>
  );
};

/** Selector del periodo de la libreta. */
export const ReportPeriodSelect: React.FC<{ card: Pick<ReportCard, 'periods' | 'visiblePeriods'>; value: number | null; onChange: (n: number) => void }> = ({ card, value, onChange }) => (
  <Select aria-label="Periodo de la libreta" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
    {card.periods.filter((x) => card.visiblePeriods.includes(x.periodNumber)).map((x) => <option key={x.periodNumber} value={x.periodNumber}>{x.name}</option>)}
  </Select>
);

export const ReportCardView: React.FC<{ enrollmentId: string | null | undefined }> = ({ enrollmentId }) => {
  const { data, isLoading, error } = useReportCard(enrollmentId);
  const [period, setPeriod] = useState<number | null>(null);
  useEffect(() => { if (data && period === null) setPeriod(defaultReportPeriod(data)); }, [data, period]);
  if (!enrollmentId) return <p className="text-sm text-muted-foreground">No hay matrícula activa.</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if ((error as { response?: { status?: number } })?.response?.status === 402) return <p className="text-sm text-muted-foreground">La libreta en línea está disponible en el plan PRO del colegio.</p>;
  if (error || !data) return <p className="text-sm text-red-600">No se pudo cargar la libreta.</p>;
  return (
    <div>
      {data.visiblePeriods.length > 1 && <div className="mb-3"><ReportPeriodSelect card={data} value={period} onChange={setPeriod} /></div>}
      <ReportCardSheet card={data} periodNumber={period} />
    </div>
  );
};
