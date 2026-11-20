import React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LetterBadge } from '@/components/ui/letter-badge';
import type { GradebookData, GradebookResult, GradebookStudent, ResultLetter } from '../../types';
import { parseCell } from '../../utils/gradeInput';

const keyOf = (enrollmentId: string, competenceId: string, criterionId: string) =>
  `${enrollmentId}|${competenceId}|${criterionId}`;

export interface GradebookRowProps {
  student: GradebookStudent;
  idx: number;
  active: boolean;
  row: number;
  result?: GradebookResult;
  editable: boolean;
  criteria: GradebookData['criteria'];
  competenceId: string;
  drafts: Record<string, string>;
  dirty: Set<string>;
  invalid: Set<string>;
  reason: string | null;
  requiresReason: boolean;
  periodNumber: number;
  setFinalPending: boolean;
  onSetCell: (k: string, value: string) => void;
  onFlush: () => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, row: number, col: number) => void;
  onFocusCell: (row: number, col: number) => void;
  onNeedReason: () => void;
  onSetFinalLetter: (params: {
    periodNumber: number;
    enrollmentId: string;
    competenceId: string;
    finalLetter: ResultLetter | null;
    reason: string | null;
  }) => void;
}

export const GradebookRow: React.FC<GradebookRowProps> = ({
  student: s,
  idx,
  active,
  row,
  result: r,
  editable,
  criteria,
  competenceId,
  drafts,
  dirty,
  invalid,
  reason,
  requiresReason,
  periodNumber,
  setFinalPending,
  onSetCell,
  onFlush,
  onPaste,
  onFocusCell,
  onNeedReason,
  onSetFinalLetter,
}) => {
  return (
    <tr key={s.enrollmentId} className={cn('border-t border-border', !active && 'opacity-50')}>
      <td className="px-2 py-1 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
      <td className="sticky left-0 bg-card px-2 py-1">
        <span className="whitespace-nowrap">{s.fullName}</span>
        {s.state !== 'REGISTERED' && (
          <span
            className="ml-2 text-xs text-muted-foreground"
            title={
              active
                ? 'Completó este periodo antes de irse: sus notas se registran y se suben al SIAGIE.'
                : 'Se fue antes de terminar este periodo: no recibe notas.'
            }
          >
            {s.state === 'WITHDRAWN' ? 'Retirado' : 'Trasladado'}
            {s.withdrawalDate
              ? ` el ${new Date(`${s.withdrawalDate}T12:00:00`).toLocaleDateString('es-PE')}`
              : ''}
          </span>
        )}
      </td>
      {criteria.map((c, col) => {
        const k = keyOf(s.enrollmentId, competenceId, c.id);
        return (
          <td key={c.id} className="px-1 py-1 text-center">
            <input
              data-row={row}
              data-col={col}
              aria-label={`${c.shortName} de ${s.fullName}`}
              disabled={!active || !editable}
              value={drafts[k] ?? ''}
              onChange={(e) => onSetCell(k, e.target.value)}
              onBlur={() => {
                const v = drafts[k] ?? '';
                if (v.trim() !== '' && parseCell(v) === 'invalid') {
                  toast.warning(
                    `«${v}» no es una nota válida. Ingresa un número de 0 a 20 o AD, A, B, C, EXO.`,
                  );
                }
                onFlush();
              }}
              onPaste={(e) => onPaste(e, row, col)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  onFocusCell(row + 1, col);
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  onFocusCell(row - 1, col);
                }
              }}
              className={cn(
                'h-8 w-14 rounded border border-transparent bg-transparent text-center tabular-nums focus:border-primary focus:bg-background focus:outline-none disabled:cursor-not-allowed',
                dirty.has(k) && 'bg-amber-500/10',
                invalid.has(k) && 'border-red-500 bg-red-500/10',
              )}
            />
          </td>
        );
      })}
      {criteria.length > 0 && (
        <td className="px-2 py-1 text-center">
          <LetterBadge
            letter={r?.suggestedLetter}
            title={
              r?.computedScore !== null && r?.computedScore !== undefined
                ? `Promedio ${r.computedScore}`
                : undefined
            }
          />
        </td>
      )}
      <td className="px-2 py-1 text-center">
        <div className="flex items-center justify-center gap-1">
          <select
            aria-label={`Calificativo final de ${s.fullName}`}
            disabled={!active || !editable || setFinalPending}
            value={r?.isOverridden ? (r.finalLetter ?? '') : ''}
            onChange={(e) => {
              if (requiresReason && !reason) {
                onNeedReason();
                return;
              }
              const v = (e.target.value || null) as ResultLetter | null;
              onSetFinalLetter({
                periodNumber,
                enrollmentId: s.enrollmentId,
                competenceId,
                finalLetter: v,
                reason,
              });
            }}
            className="h-8 rounded border border-input bg-background px-1 text-sm"
          >
            <option value="">{r?.suggestedLetter ? `Usar ${r.suggestedLetter}` : '—'}</option>
            {(['AD', 'A', 'B', 'C', 'EXO'] as const).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <LetterBadge letter={r?.finalLetter} />
          {r?.isOverridden && criteria.length > 0 && (
            <span
              className="text-[10px] text-muted-foreground"
              title="El docente eligió este calificativo en lugar del sugerido por los criterios"
            >
              elegido a mano
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};
