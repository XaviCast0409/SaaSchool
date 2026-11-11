import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LetterBadge } from '@/components/ui/letter-badge';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { downloadFile, useConsolidation, usePeriods } from '../api';
import { SiagieExportPanel } from '../components/SiagieExportPanel';
import { classroomLabel, type Level } from '../types';

type Tab = 'consolidated' | 'report-cards' | 'siagie';
const SITUATION: Record<string, string> = { PROMOTED: 'Promovido', RECOVERY: 'Recuperación', RETAINED: 'Permanece', TRANSFERRED: 'Trasladado', WITHDRAWN: 'Retirado' };

export const AcademicReportsPage: React.FC = () => {
  const { data: classrooms = [] } = useClassrooms();
  const { data: periods } = usePeriods();
  const [tab, setTab] = useState<Tab>('consolidated');
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [period, setPeriod] = useState<number | 'FINAL'>(1);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { if (!classroomId && classrooms.length) setClassroomId(classrooms[0].id); }, [classrooms, classroomId]);
  const { data, isLoading } = useConsolidation(tab === 'report-cards' ? null : classroomId, period);
  const sorted = [...classrooms].sort((a, b) => a.educationLevel.localeCompare(b.educationLevel) || a.grade - b.grade || a.section.localeCompare(b.section));

  const handleDownload = async () => {
    if (!classroomId || !data) return;
    setDownloading(true);
    try {
      await downloadFile('/academic/consolidation/export', { classroomId, period }, `consolidado-${data.classroom.grade}${data.classroom.section}-${period}.xlsx`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Reportes académicos" description="Consolidado del aula, libretas para imprimir y archivo para el SIAGIE." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs<Tab> value={tab} onChange={setTab} items={[
          { value: 'consolidated', label: 'Consolidado' },
          { value: 'report-cards', label: 'Libretas' },
          { value: 'siagie', label: 'SIAGIE' },
        ]} />
        <Select aria-label="Aula" value={classroomId ?? ''} onChange={(e) => setClassroomId(e.target.value)}>
          {sorted.map((c) => <option key={c.id} value={c.id}>{classroomLabel({ educationLevel: c.educationLevel as Level, grade: c.grade, section: c.section })}</option>)}
        </Select>
        {tab !== 'report-cards' && (
          <Select aria-label="Periodo" value={String(period)} onChange={(e) => setPeriod(e.target.value === 'FINAL' ? 'FINAL' : Number(e.target.value))}>
            {periods?.periods.map((p) => <option key={p.periodNumber} value={p.periodNumber}>{p.name}</option>)}
            <option value="FINAL">Calificativo final</option>
          </Select>
        )}
      </div>

      {tab === 'report-cards' && classroomId && (
        <Card className="p-5">
          <p className="text-sm">Genera las libretas de todos los estudiantes del aula en una sola vista lista para imprimir o guardar como PDF.</p>
          <Button asChild className="mt-3"><Link to={`/academic/report-cards/print?classroomId=${classroomId}`}>Abrir libretas del aula</Link></Button>
        </Card>
      )}

      {tab !== 'report-cards' && (isLoading || !data ? <Skeleton className="h-64 w-full" /> : tab === 'siagie' ? (
        <Card className="p-5"><SiagieExportPanel data={data} /></Card>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data.summary.totalStudents} estudiantes · {data.summary.missingGrades} calificativos y {data.summary.missingConclusions} conclusiones pendientes
            </p>
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
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th rowSpan={2} className="sticky left-0 bg-muted/40 px-3 py-2 text-left font-semibold">Estudiante</th>
                  {data.matrix.consolidatedAreas?.map((a) => <th key={a.code} colSpan={a.competences.length} className="border-l border-border px-2 py-1.5 text-center font-semibold">{a.name}</th>)}
                  {period === 'FINAL' && <th rowSpan={2} className="border-l border-border px-2 py-2 font-semibold">Situación</th>}
                </tr>
                <tr>
                  {data.matrix.consolidatedAreas?.map((a) => a.competences.map((c, i) => (
                    <th key={c.id} title={c.name} className={`px-1 py-1.5 text-center font-medium ${i === 0 ? 'border-l border-border' : ''}`}>{c.shortName}</th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {data.matrix.students.map((s) => (
                  <tr key={s.enrollmentId} className={`border-t border-border ${s.enrollmentState !== 'REGISTERED' ? 'opacity-50' : ''}`}>
                    <td className="sticky left-0 whitespace-nowrap bg-card px-3 py-1.5">{s.fullName}</td>
                    {data.matrix.consolidatedAreas?.map((a) => a.competences.map((c, i) => (
                      <td key={c.id} className={`px-1 py-1.5 text-center ${i === 0 ? 'border-l border-border' : ''}`}>
                        <LetterBadge letter={s.consolidatedGrades?.[a.code]?.competences?.[c.id]?.letter} />
                      </td>
                    )))}
                    {period === 'FINAL' && <td className="border-l border-border px-2 py-1.5 text-xs">{s.finalSituation ? SITUATION[s.finalSituation] : '—'} <span className="text-muted-foreground">(provisional)</span></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {data.issues.length > 0 && (
            <details className="mt-4 rounded-lg border border-border p-3 text-sm">
              <summary className="cursor-pointer font-medium">{data.issues.length} observaciones</summary>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted-foreground">{data.issues.map((i, idx) => <li key={idx}>{i.message}</li>)}</ul>
            </details>
          )}
        </>
      ))}
    </div>
  );
};

