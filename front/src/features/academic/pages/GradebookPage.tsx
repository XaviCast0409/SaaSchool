import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, ListChecks, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge } from '@/components/ui/letter-badge';
import { cn } from '@/lib/utils';
import { downloadFile, useGradebook, useImportHomework } from '../api';
import { GradebookGrid } from '../components/GradebookGrid';
import { CriteriaModal, ReasonModal, SummaryTable } from '../components/GradebookPanels';
import { ConclusionsWorkspace } from '../components/ConclusionsWorkspace';
import { classroomLabel, teacherName } from '../types';

type Tab = 'competence' | 'summary' | 'conclusions';

export const GradebookPage: React.FC = () => {
  const { assignmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const period = Number(params.get('period') ?? 1) || 1;
  const { data, isLoading, error } = useGradebook(assignmentId, period);
  const importHomework = useImportHomework();
  const [tab, setTab] = useState<Tab>('competence');
  const [competenceId, setCompetenceId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER';
  const [reason, setReason] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [status, setStatus] = useState<{ s: 'idle' | 'saving' | 'saved' | 'error'; msg?: string }>({ s: 'idle' });
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadFile('/academic/gradebook/export', { assignmentId: data.assignment.id, periodNumber: period }, `registro-${data.assignment.area.name}-p${period}.xlsx`);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (data && (!competenceId || !data.competences.some((c) => c.id === competenceId))) setCompetenceId(data.competences[0]?.id ?? null);
  }, [data, competenceId]);
  useEffect(() => { setReason(null); }, [period]);
  useEffect(() => { if (status.s === 'error' && status.msg) toast.error(status.msg); }, [status]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <p className="text-sm text-red-600">No se pudo abrir el curso.</p>;

  const active = data.students.filter((s) => s.state === 'REGISTERED');
  const missingGrades = active.length * data.competences.length - data.results.filter((r) => r.finalLetter && active.some((s) => s.enrollmentId === r.enrollmentId)).length;
  const missingConclusions = data.results.filter((r) => (r.finalLetter === 'B' || r.finalLetter === 'C') && active.some((s) => s.enrollmentId === r.enrollmentId)
    && !data.conclusions.some((c) => c.enrollmentId === r.enrollmentId && c.competenceId === r.competenceId && c.conclusion.trim())).length;

  return (
    <div className="pb-16">
      <Link to={isTeacher ? '/my-courses' : '/academic/progress'} className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />{isTeacher ? 'Mis cursos' : 'Avance y cierre'}</Link>
      <PageHeader
        title={`${data.assignment.area.name} · ${classroomLabel(data.assignment.classroom)}`}
        description={<>Docente: {teacherName(data.assignment.teacher)} · <PeriodStatusBadge status={data.periodStatus} /></>}
        actions={<>
          <Select aria-label="Periodo" value={period} onChange={(e) => setParams({ period: e.target.value })}>
            {Array.from({ length: data.periodCount }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Periodo {n}</option>)}
          </Select>
          {data.canEdit && <Button variant="outline" size="sm" onClick={() => setCriteriaOpen(true)}><ListChecks className="mr-1 h-4 w-4" />Criterios</Button>}
          {data.canEdit && (data.periodStatus === 'OPEN' || data.isCorrection) && (
            <Button variant="outline" size="sm" disabled={importHomework.isPending} onClick={() => importHomework.mutate({ courseAssignmentId: data.assignment.id, periodNumber: period })}>
              <Upload className="mr-1 h-4 w-4" />Importar tareas
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={downloading} onClick={handleDownload}>
            {downloading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />Generando…
              </>
            ) : (
              <>
                <Download className="mr-1 h-4 w-4" />Excel
              </>
            )}
          </Button>
        </>}
      />

      {!data.yearIsActive && !data.canEdit && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">Este curso pertenece a un año lectivo que ya no está activo: solo lectura.</div>
      )}
      {data.yearIsActive && !data.canEdit && data.periodStatus !== 'OPEN' && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">Este periodo está {data.periodStatus === 'REVIEW' ? 'en revisión' : 'cerrado'}: solo lectura.</div>
      )}
      {data.isCorrection && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <span>
            Estás editando como Dirección {!data.yearIsActive ? 'un año lectivo que ya no está activo' : `un periodo ${data.periodStatus === 'REVIEW' ? 'en revisión' : 'cerrado'}`}.
            Los cambios se guardan normalmente y quedan registrados en la bitácora.
          </span>
          <input
            className="h-8 min-w-[16rem] flex-1 rounded-md border border-input bg-background px-2 text-sm"
            placeholder="Motivo (opcional), p. ej.: corrección pedida por el docente"
            value={reason ?? ''}
            onChange={(e) => setReason(e.target.value || null)}
          />
        </div>
      )}

      <Tabs<Tab> value={tab} onChange={setTab} className="mb-4" items={[
        { value: 'competence', label: 'Por competencia' },
        { value: 'summary', label: 'Resumen' },
        { value: 'conclusions', label: 'Conclusiones', count: missingConclusions },
      ]} />

      {data.competences.length === 0 ? <p className="text-sm text-muted-foreground">Este curso no tiene competencias. Revisa el plan de estudios.</p> : (
        <>
          {tab === 'competence' && competenceId && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {data.competences.map((c) => (
                  <button key={c.id} type="button" title={c.name} onClick={() => setCompetenceId(c.id)}
                    className={cn('rounded-full border px-3 py-1 text-sm', c.id === competenceId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {c.shortName}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{data.competences.find((c) => c.id === competenceId)?.name}</p>
              {data.criteria.length === 0 && <p className="mb-3 text-sm text-muted-foreground">Este curso no usa criterios: registra directamente el calificativo final.</p>}
              <GradebookGrid data={data} competenceId={competenceId} reason={reason} onNeedReason={() => setReasonOpen(true)} onStatus={(s, msg) => setStatus({ s, msg })} />
              <p className="mt-2 text-xs text-muted-foreground">Escribe un número de 0 a 20 o AD, A, B, C, EXO. Puedes pegar columnas desde Excel. Enter baja a la siguiente fila.</p>
            </>
          )}
          {tab === 'summary' && <SummaryTable data={data} onPick={(id) => { setCompetenceId(id); setTab('competence'); }} />}
          {tab === 'conclusions' && <ConclusionsWorkspace data={data} reason={reason} onNeedReason={() => setReasonOpen(true)} />}
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
          <span className={cn(status.s === 'error' ? 'text-red-600' : 'text-muted-foreground')}>
            {status.s === 'saving' ? 'Guardando…' : status.s === 'saved' ? 'Guardado' : status.s === 'error' ? 'Error al guardar' : 'Los cambios se guardan solos'}
          </span>
          <span className="text-muted-foreground">
            {Math.max(missingGrades, 0)} calificativos pendientes · {missingConclusions} conclusiones pendientes
          </span>
        </div>
      </div>

      {criteriaOpen && <CriteriaModal open onClose={() => setCriteriaOpen(false)} data={data} />}
      <ReasonModal open={reasonOpen} onClose={() => setReasonOpen(false)} onConfirm={(r) => { setReason(r); setReasonOpen(false); }} />
    </div>
  );
};

