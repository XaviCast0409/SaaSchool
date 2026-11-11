import React from 'react';
import { LetterBadge } from '@/components/ui/letter-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportCard } from '../api';
import type { ReportCard } from '../types';

const SITUATION: Record<string, string> = { PROMOTED: 'Promovido(a)', RECOVERY: 'Requiere recuperación', RETAINED: 'Permanece en el grado', TRANSFERRED: 'Trasladado(a)', WITHDRAWN: 'Retirado(a)' };

export const ReportCardSheet: React.FC<{ card: ReportCard; printable?: boolean }> = ({ card, printable }) => {
  const periods = card.periods.filter((p) => card.visiblePeriods.includes(p.periodNumber));
  const showFinal = card.officialAreas.some((a) => a.competences.some((c) => c.finalLetter));
  return (
    <article className={printable ? 'break-after-page bg-white p-6 text-[12px] text-black' : 'rounded-xl border border-border bg-card p-5 text-sm'}>
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          {card.school?.logoUrl && <img src={card.school.logoUrl} alt="" className="h-12 w-12 object-contain" />}
          <div>
            <p className="font-semibold">{card.school?.name}</p>
            <p className="text-xs text-muted-foreground">Código modular: {card.school?.modularCode ?? '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">Informe de progreso del aprendizaje</p>
          <p className="text-xs text-muted-foreground">Año escolar {card.academicYear.year}</p>
        </div>
      </header>
      <div className="mb-4 grid gap-1 sm:grid-cols-2">
        <p><span className="text-muted-foreground">Estudiante:</span> {card.student.fullName}</p>
        <p><span className="text-muted-foreground">Código SIAGIE:</span> {card.student.studentCode ?? '—'}</p>
        <p><span className="text-muted-foreground">Grado y sección:</span> {card.classroom.label}</p>
        <p><span className="text-muted-foreground">Tutor(a):</span> {card.tutor ?? '—'}</p>
      </div>

      {periods.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay periodos publicados. La libreta se mostrará cuando el colegio cierre el primer periodo.</p>
      ) : (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-1.5 text-left font-semibold">Área</th>
                <th className="py-1.5 text-left font-semibold">Competencia</th>
                {periods.map((p) => <th key={p.periodNumber} className="px-1 py-1.5 text-center font-semibold">{p.name}</th>)}
                {showFinal && <th className="px-1 py-1.5 text-center font-semibold">Final</th>}
              </tr>
            </thead>
            <tbody>
              {card.officialAreas.map((area) => area.competences.map((c, i) => (
                <tr key={`${area.code}-${c.number}`} className="border-b border-border align-top">
                  {i === 0 && <td rowSpan={area.competences.length} className="py-1.5 pr-2 font-medium">{area.name}</td>}
                  <td className="py-1.5 pr-2">{c.name}</td>
                  {periods.map((p) => <td key={p.periodNumber} className="px-1 py-1.5 text-center"><LetterBadge letter={c.letters[p.periodNumber]} /></td>)}
                  {showFinal && <td className="px-1 py-1.5 text-center"><LetterBadge letter={c.finalLetter} /></td>}
                </tr>
              )))}
            </tbody>
          </table>

          {periods.map((p) => {
            const list = card.officialAreas.flatMap((a) => a.competences.filter((c) => c.conclusions[p.periodNumber]).map((c) => ({ area: a.name, comp: c.shortName, text: c.conclusions[p.periodNumber] })));
            if (list.length === 0) return null;
            return (
              <section key={p.periodNumber} className="mt-4">
                <p className="mb-1 font-semibold">Conclusiones descriptivas — {p.name}</p>
                <ul className="space-y-1">
                  {list.map((x) => <li key={`${x.area}-${x.comp}`}><span className="font-medium">{x.area} · {x.comp}:</span> {x.text}</li>)}
                </ul>
              </section>
            );
          })}

          {card.internalCourses.length > 0 && (
            <section className="mt-4">
              <p className="mb-1 font-semibold">Cursos y talleres del colegio <span className="font-normal text-muted-foreground">(referencial)</span></p>
              <table className="w-full border-collapse">
                <tbody>
                  {card.internalCourses.map((course) => course.competences.map((c, i) => (
                    <tr key={`${course.name}-${c.name}`} className="border-b border-border">
                      {i === 0 && <td rowSpan={course.competences.length} className="py-1 pr-2 font-medium">{course.name}</td>}
                      <td className="py-1 pr-2">{c.name}</td>
                      {periods.map((p) => <td key={p.periodNumber} className="px-1 py-1 text-center"><LetterBadge letter={c.letters[p.periodNumber]} /></td>)}
                    </tr>
                  )))}
                </tbody>
              </table>
            </section>
          )}

          <section className="mt-4">
            <p className="mb-1 font-semibold">Asistencia</p>
            <table className="w-full border-collapse text-xs">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="py-1 text-left font-semibold">Periodo</th><th className="py-1 text-center font-semibold">Faltas justificadas</th>
                <th className="py-1 text-center font-semibold">Faltas injustificadas</th><th className="py-1 text-center font-semibold">Tardanzas justificadas</th>
                <th className="py-1 text-center font-semibold">Tardanzas injustificadas</th>
              </tr></thead>
              <tbody>
                {card.attendance.map((a) => (
                  <tr key={a.periodNumber} className="border-b border-border">
                    <td className="py-1">{card.periods.find((p) => p.periodNumber === a.periodNumber)?.name}</td>
                    <td className="py-1 text-center">{a.absentJustified}</td><td className="py-1 text-center">{a.absentUnjustified}</td>
                    <td className="py-1 text-center">{a.lateJustified}</td><td className="py-1 text-center">{a.lateUnjustified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export const ReportCardView: React.FC<{ enrollmentId: string | null | undefined }> = ({ enrollmentId }) => {
  const { data, isLoading, error } = useReportCard(enrollmentId);
  if (!enrollmentId) return <p className="text-sm text-muted-foreground">No hay matrícula activa.</p>;
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if ((error as { response?: { status?: number } })?.response?.status === 402) return <p className="text-sm text-muted-foreground">La libreta en línea está disponible en el plan PRO del colegio.</p>;
  if (error || !data) return <p className="text-sm text-red-600">No se pudo cargar la libreta.</p>;
  return <ReportCardSheet card={data} />;
};

