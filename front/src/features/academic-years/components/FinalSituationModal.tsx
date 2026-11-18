import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface ClassroomResult {
  classroomId: string;
  label: string;
  students: number;
  saved: number;
  missingGrades: number;
  skipped: boolean;
  byStatus: Record<string, number>;
}
interface FinalSituationResult {
  year: number;
  dryRun: boolean;
  classrooms: ClassroomResult[];
  totals: Record<string, number>;
  saved: number;
  skippedClassrooms: number;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PROMOTED: { label: 'Promovidos', cls: 'text-emerald-700 dark:text-emerald-400' },
  RECOVERY: { label: 'Recuperación', cls: 'text-amber-700 dark:text-amber-400' },
  RETAINED: { label: 'Permanecen', cls: 'text-destructive' },
  WITHDRAWN: { label: 'Retirados', cls: 'text-muted-foreground' },
  TRANSFERRED: { label: 'Trasladados', cls: 'text-muted-foreground' },
};

const run = async (yearId: string, body: { dryRun: boolean; force: boolean }) =>
  (await api.post<{ data: FinalSituationResult }>(`/academic-years/${yearId}/final-situations`, body)).data.data;

/**
 * Calcula la situación final de cada estudiante con el consolidado final de notas y la guarda en su
 * matrícula. La re-matrícula la usa para proponer el grado (promovido → grado siguiente, permanece → repite).
 */
export const FinalSituationModal: React.FC<{ year: { id: string; year: number } | null; onClose: () => void }> = ({
  year,
  onClose,
}) => {
  const qc = useQueryClient();
  const [force, setForce] = useState(false);
  const preview = useMutation({ mutationFn: (yearId: string) => run(yearId, { dryRun: true, force: false }) });
  const save = useMutation({
    mutationFn: (yearId: string) => run(yearId, { dryRun: false, force }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['rollover-candidates'] });
      toast.success(
        `Situación final de ${r.saved} estudiantes guardada${r.skippedClassrooms ? ` (${r.skippedClassrooms} aulas omitidas por notas incompletas)` : ''}.`,
      );
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'No se pudo guardar.'),
  });

  useEffect(() => {
    if (year) {
      setForce(false);
      preview.mutate(year.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year?.id]);

  const data = preview.data;
  const incomplete = data?.classrooms.filter((c) => c.missingGrades > 0).length ?? 0;
  const toSave = data
    ? data.classrooms.filter((c) => force || c.missingGrades === 0).reduce((a, c) => a + c.students, 0)
    : 0;

  return (
    <Modal
      open={!!year}
      onClose={onClose}
      title={`Situación final ${year?.year ?? ''}`}
      description="Se calcula con el consolidado final de notas y las reglas de promoción del año. Dirección debe revisarla antes del acta oficial; se puede volver a calcular cuando cambien las notas."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!data || toSave === 0}
            isLoading={save.isPending}
            onClick={() => year && save.mutate(year.id)}
          >
            Guardar situación de {toSave} estudiantes
          </Button>
        </>
      }
    >
      {preview.isPending || !data ? (
        <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> Calculando con las notas de cada aula...
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.totals).map(([k, v]) => (
              <span key={k} className={`font-bold ${STATUS[k]?.cls ?? ''}`}>
                {v} {STATUS[k]?.label ?? k}
              </span>
            ))}
          </div>
          <div className="rounded-xl border border-border max-h-[45vh] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-muted/90 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Aula</th>
                  <th className="px-3 py-2">Resultado</th>
                  <th className="px-3 py-2">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.classrooms.map((c) => (
                  <tr key={c.classroomId} className={c.missingGrades > 0 && !force ? 'opacity-60' : ''}>
                    <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{c.label}</td>
                    <td className="px-3 py-2">
                      {Object.entries(c.byStatus)
                        .map(([k, v]) => `${v} ${STATUS[k]?.label.toLowerCase() ?? k}`)
                        .join(' · ') || '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {c.missingGrades > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                          {c.missingGrades} notas faltantes
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400">Completas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {incomplete > 0 && (
            <label className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 cursor-pointer text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded"
              />
              <span>
                {incomplete} aulas tienen notas incompletas y se omiten. Marca para guardarlas igual (situación
                provisional que tendrás que recalcular cuando completen las notas).
              </span>
            </label>
          )}
        </div>
      )}
    </Modal>
  );
};
