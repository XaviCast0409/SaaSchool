import React, { useMemo, useState } from 'react';
import { FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNominaCommit, useNominaPreview } from '../api';
import type { NominaPlan, NominaPlanRow } from '../types';

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const STUDENT_LABEL: Record<NominaPlanRow['studentAction'], { text: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  CREATE: { text: 'Nuevo', variant: 'success' },
  UPDATE: { text: 'Actualiza datos', variant: 'warning' },
  NONE: { text: 'Sin cambios', variant: 'secondary' },
  ERROR: { text: 'Con error', variant: 'destructive' },
  DUPLICATE: { text: 'Repetido', variant: 'outline' },
};

const ENROLLMENT_LABEL: Record<NominaPlanRow['enrollmentAction'], string> = {
  CREATE: 'Se matricula',
  MOVE: 'Cambia de aula',
  STATE: 'Cambia estado',
  MOVE_STATE: 'Cambia aula y estado',
  NONE: '—',
  SKIP: 'No se importa',
};

type Filter = 'ALL' | 'CHANGES' | 'ERRORS';

export const NominaImportModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [plan, setPlan] = useState<NominaPlan | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [filter, setFilter] = useState<Filter>('CHANGES');
  const preview = useNominaPreview();
  const commit = useNominaCommit();

  const reset = () => { setFiles([]); setPlan(null); setFilter('CHANGES'); };
  const close = () => { reset(); onClose(); };

  const runPreview = async (selected: File[]) => {
    setFiles(selected);
    setPlan(null);
    if (selected.length === 0) return;
    try {
      setPlan(await preview.mutateAsync(selected));
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo leer el listado.'));
    }
  };

  const runCommit = async () => {
    try {
      const r = await commit.mutateAsync({ files, updateExisting });
      toast.success(
        `Importación lista: ${r.createdStudents} alumnos nuevos, ${r.updatedStudents} actualizados, ${r.createdEnrollments} matrículas nuevas`
        + (r.createdClassrooms ? ` y ${r.createdClassrooms} aulas creadas.` : '.'),
      );
      close();
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo importar la nómina.'));
    }
  };

  const rows = useMemo(() => {
    if (!plan) return [];
    if (filter === 'ERRORS') return plan.rows.filter((r) => r.studentAction === 'ERROR' || r.issues.length > 0);
    if (filter === 'CHANGES') return plan.rows.filter((r) => r.studentAction !== 'NONE' || r.enrollmentAction !== 'NONE' || r.warnings.length > 0);
    return plan.rows;
  }, [plan, filter]);

  const s = plan?.summary;
  const nothingToDo = !!s && s.createStudents + s.updateStudents + s.createEnrollments + s.moveEnrollments + s.stateChanges + s.newClassrooms === 0;

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="Importar nómina del SIAGIE"
      description="Sube el reporte «Listado de estudiantes» (rptListadoEstudiantes.xlsx) de cada nivel. Antes de guardar verás qué cambia."
      footer={(
        <>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button
            onClick={runCommit}
            disabled={!plan || commit.isPending || plan.blocking.length > 0 || nothingToDo}
          >
            {commit.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Importar
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:bg-muted/40">
          {preview.isPending ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <FileUp className="h-6 w-6 text-muted-foreground" />}
          <span className="text-sm font-medium">
            {files.length ? `${files.length} archivo(s): ${files.map((f) => f.name).join(', ')}` : 'Elige uno o varios archivos .xlsx (inicial, primaria y secundaria a la vez)'}
          </span>
          <input
            type="file"
            accept=".xlsx"
            multiple
            className="sr-only"
            onChange={(e) => runPreview(Array.from(e.target.files ?? []))}
          />
        </label>

        {plan && s && (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label="Alumnos nuevos" value={s.createStudents} tone="good" />
              <Stat label="Datos a actualizar" value={s.updateStudents} tone="warn" />
              <Stat label="Matrículas nuevas" value={s.createEnrollments} tone="good" />
              <Stat label="Cambios de aula / estado" value={s.moveEnrollments + s.stateChanges} tone="warn" />
              <Stat label="Sin cambios" value={s.unchanged} />
              <Stat label="Aulas que se crean" value={s.newClassrooms} />
              <Stat label="Con error (no se importan)" value={s.errors} tone={s.errors ? 'bad' : undefined} />
              <Stat label="Repetidos" value={s.duplicates} />
            </div>

            <ul className="space-y-1 text-xs text-muted-foreground">
              {plan.files.map((f) => (
                <li key={f.fileName}>
                  <span className="font-medium text-foreground">{f.fileName}</span> · {f.level ?? 'nivel desconocido'} · cód. modular {f.modularCode ?? '—'} · {f.rows} estudiantes
                  {f.issues.map((i) => <span key={i} className="block text-destructive">{i}</span>)}
                </li>
              ))}
            </ul>

            {plan.newClassrooms.length > 0 && (
              <p className="text-sm">Se crearán las aulas: <span className="font-medium">{plan.newClassrooms.join(', ')}</span>.</p>
            )}
            {plan.blocking.map((b) => (
              <p key={b} className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{b}</p>
            ))}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
              Actualizar nombres, sexo, fecha de nacimiento y código de los alumnos que ya existen con lo que dice el SIAGIE
            </label>

            <div className="flex gap-1">
              {(['CHANGES', 'ERRORS', 'ALL'] as Filter[]).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
                  {f === 'CHANGES' ? 'Con cambios' : f === 'ERRORS' ? 'Con error' : 'Todos'}
                </Button>
              ))}
            </div>

            <div className="max-h-[40vh] overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1.5">Estudiante</th>
                    <th className="px-2 py-1.5">Código / Doc.</th>
                    <th className="px-2 py-1.5">Aula</th>
                    <th className="px-2 py-1.5">Alumno</th>
                    <th className="px-2 py-1.5">Matrícula</th>
                    <th className="px-2 py-1.5">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">No hay filas en este filtro.</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.key} className="border-t border-border align-top">
                      <td className="px-2 py-1.5 font-medium">{r.fullName}</td>
                      <td className="px-2 py-1.5 font-mono">{r.studentCode ?? '—'}<br />{r.documentId}</td>
                      <td className="px-2 py-1.5">{r.classroomLabel}{r.enrollmentState !== 'REGISTERED' && <span className="block text-amber-600">{r.enrollmentState === 'TRANSFERRED' ? 'Trasladado' : 'Retirado'}</span>}</td>
                      <td className="px-2 py-1.5"><Badge variant={STUDENT_LABEL[r.studentAction].variant}>{STUDENT_LABEL[r.studentAction].text}</Badge></td>
                      <td className="px-2 py-1.5">{ENROLLMENT_LABEL[r.enrollmentAction]}</td>
                      <td className="px-2 py-1.5">
                        {r.issues.map((i) => <span key={i} className="block text-destructive">{i}</span>)}
                        {r.changes.map((c) => <span key={c} className="block">{c}</span>)}
                        {r.warnings.map((w) => <span key={w} className="block text-amber-600 dark:text-amber-400">{w}</span>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

const Stat: React.FC<{ label: string; value: number; tone?: 'good' | 'warn' | 'bad' }> = ({ label, value, tone }) => (
  <div className={cn(
    'rounded-lg border p-2',
    tone === 'good' && value > 0 && 'border-emerald-500/30 bg-emerald-500/10',
    tone === 'warn' && value > 0 && 'border-amber-500/30 bg-amber-500/10',
    tone === 'bad' && 'border-destructive/30 bg-destructive/10',
    !tone && 'border-border',
  )}>
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);
