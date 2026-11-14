import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { soles } from './CashMovements';
import { useSchedulePreview } from '../api/useFeeSchedules';

const CONCEPT_BADGE: Record<string, string> = {
  MATRICULA: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  CUOTA_INGRESO: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  PENSION: 'bg-secondary text-secondary-foreground',
};

/** Vista previa del cronograma de cuotas que se generará al matricular. */
export const SchedulePreviewCard: React.FC<{ academicYearId?: string; classroomId?: string; condition?: string }> = (props) => {
  const { data, isLoading, isError } = useSchedulePreview(props);
  const [expanded, setExpanded] = useState(false);

  if (!props.academicYearId || !props.classroomId) {
    return (
      <div className="p-3 rounded-xl border border-dashed border-border text-[11px] text-muted-foreground flex items-center gap-2">
        <CalendarClock className="w-4 h-4 shrink-0" />
        <span>Elige el año y el aula para ver el cronograma de cuotas que se generará.</span>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="p-3 rounded-xl border border-border text-[11px] text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Calculando cronograma...</span>
      </div>
    );
  }
  if (isError || !data) return null;

  if (!data.feeScheduleFound) {
    return (
      <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Sin tarifario para este nivel y año</p>
          <p>
            La matrícula se registrará sin cuotas. Puedes configurarlo en{' '}
            <Link to="/payments/fee-schedules" target="_blank" className="underline font-semibold">
              Tarifario
            </Link>{' '}
            y luego generar las cuotas desde Cobranzas.
          </p>
        </div>
      </div>
    );
  }

  const pensions = data.items.filter((i) => i.concept === 'PENSION');
  const visible = expanded ? data.items : data.items.slice(0, 4);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-primary/10">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <CalendarClock className="w-4 h-4 text-primary" />
          <span>Cronograma de cuotas</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {data.items.length} cuotas
          {pensions.length > 0 && ` · ${pensions.length} pensiones`} · Total{' '}
          <strong className="font-mono text-foreground">{soles(data.total)}</strong>
        </div>
      </div>
      {data.items.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-muted-foreground">El tarifario no genera cuotas para esta matrícula.</p>
      ) : (
        <table className="w-full text-[11px]">
          <tbody className="divide-y divide-border/60">
            {visible.map((i) => (
              <tr key={`${i.concept}-${i.period}`}>
                <td className="px-3 py-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold mr-1.5 ${CONCEPT_BADGE[i.concept] ?? ''}`}>
                    {i.concept === 'CUOTA_INGRESO' ? 'INGRESO' : i.concept}
                  </span>
                  <span className="font-semibold text-foreground">{i.title}</span>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">vence {formatPeruShortDate(i.dueDate)}</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-foreground whitespace-nowrap">{soles(i.amountDue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data.items.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 border-t border-primary/10"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Ver menos' : `Ver las ${data.items.length} cuotas`}
        </button>
      )}
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-primary/10">
        Si el alumno tiene becas vigentes, se descuentan automáticamente de estas cuotas.
      </p>
    </div>
  );
};
