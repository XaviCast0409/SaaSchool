import React, { useState } from 'react';
import { CheckCircle2, Download, FileSearch, FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { downloadBase64, useFillTemplates, useImportTemplateGrades, useInspectTemplates } from '@/features/siagie/api';
import type { FillReport, TemplateInspection } from '@/features/siagie/types';
import type { ConsolidationResponse } from '../types';

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const InspectionCard: React.FC<{ r: TemplateInspection }> = ({ r }) => {
  const [open, setOpen] = useState(false);
  const ok = r.issues.length === 0;
  return (
    <div className={cn('rounded-lg border p-3 text-sm', ok ? 'border-border' : 'border-destructive/40 bg-destructive/5')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{r.classroom?.label ?? `${r.gradeText} "${r.section}"`} · {r.periodText}</p>
          <p className="text-xs text-muted-foreground">{r.fileName}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{r.students.matched} de {r.students.total} estudiantes encontrados</p>
          <p>El archivo ya trae {r.filledGrades} calificativos y {r.filledConclusions} conclusiones</p>
        </div>
      </div>
      {r.issues.map((i) => <p key={i} className="mt-1 text-destructive">{i}</p>)}
      {r.warnings.map((w) => <p key={w} className="mt-1 text-amber-700 dark:text-amber-300">{w}</p>)}
      {r.students.notInApp.length > 0 && <p className="mt-1 text-amber-700 dark:text-amber-300">No están en la app: {r.students.notInApp.join('; ')}</p>}
      {r.students.notInFile.length > 0 && <p className="mt-1 text-amber-700 dark:text-amber-300">Matriculados en la app pero no en la plantilla: {r.students.notInFile.join('; ')}</p>}
      <button type="button" className="mt-2 text-xs text-primary hover:underline" onClick={() => setOpen(!open)}>
        {open ? 'Ocultar' : 'Ver'} áreas y competencias de la plantilla
      </button>
      {open && (
        <table className="mt-2 w-full text-xs">
          <thead className="text-muted-foreground">
            <tr><th className="text-left">Hoja</th><th className="text-left">Área</th><th className="text-left">Competencias (columna → CNEB)</th><th>En plan</th></tr>
          </thead>
          <tbody>
            {r.areas.map((a) => (
              <tr key={a.sheetName} className="border-t border-border align-top">
                <td className="py-1 pr-2 font-mono">{a.sheetName}</td>
                <td className="py-1 pr-2">{a.areaName}</td>
                <td className="py-1 pr-2">{a.competences.map((c) => `${c.column}: ${c.name || c.label}${c.cnebNumber ? ` (C${c.cnebNumber})` : ' (?)'}`).join(' · ')}</td>
                <td className="py-1 text-center">{a.areaCode === 'TRANS' ? '—' : a.inStudyPlan ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const ReportCard: React.FC<{ r: FillReport }> = ({ r }) => (
  <div className="rounded-lg border border-border p-3 text-sm">
    <p className="font-medium">{r.classroomLabel ?? r.fileName} · {r.periodText}</p>
    {r.issues.length > 0 ? r.issues.map((i) => <p key={i} className="text-destructive">{i}</p>) : (
      <p className="text-muted-foreground">
        {r.matchedStudents}/{r.totalStudents} estudiantes · {r.writtenGrades} calificativos · {r.writtenConclusions} conclusiones
        {r.conclusionsFromBank > 0 && ` (${r.conclusionsFromBank} del banco de frases)`}
        {r.keptFromFile > 0 && ` · ${r.keptFromFile} celdas se dejaron como venían`}
      </p>
    )}
    {(r.missingGrades > 0 || r.missingConclusions > 0) && (
      <p className="text-amber-700 dark:text-amber-300">Quedan vacías: {r.missingGrades} calificativos y {r.missingConclusions} conclusiones.</p>
    )}
    {r.warnings.map((w) => <p key={w} className="text-xs text-amber-700 dark:text-amber-300">{w}</p>)}
  </div>
);

export const SiagieExportPanel: React.FC<{ data?: ConsolidationResponse }> = ({ data }) => {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const [files, setFiles] = useState<File[]>([]);
  const [inspection, setInspection] = useState<TemplateInspection[] | null>(null);
  const [reports, setReports] = useState<FillReport[] | null>(null);
  const [fillFromBank, setFillFromBank] = useState(true);
  const [overwrite, setOverwrite] = useState(true);
  const [confirmImport, setConfirmImport] = useState(false);
  const inspect = useInspectTemplates();
  const fill = useFillTemplates();
  const importGrades = useImportTemplateGrades();
  const blocking = data ? data.summary.missingStudentCodes + data.summary.missingGrades + data.summary.missingConclusions : 0;
  const hasFilled = (inspection ?? []).some((r) => r.filledGrades > 0);

  const pick = async (selected: File[]) => {
    setFiles(selected);
    setInspection(null);
    setReports(null);
    if (selected.length === 0) return;
    try {
      setInspection(await inspect.mutateAsync(selected));
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo leer la plantilla. Usa el archivo descargado del SIAGIE sin modificar.'));
    }
  };

  const generate = async () => {
    try {
      const r = await fill.mutateAsync({ files, fillFromBank, overwrite });
      setReports(r.reports);
      if (!r.fileBase64) { toast.error('No se pudo generar ningún archivo. Revisa los problemas de cada plantilla.'); return; }
      downloadBase64(r.fileName, r.contentType, r.fileBase64);
      toast.success('Archivo listo. Revísalo antes de subirlo al SIAGIE.');
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo llenar la plantilla.'));
    }
  };

  const runImport = async () => {
    try {
      const r = await importGrades.mutateAsync(files);
      const total = r.reduce((acc, x) => acc + x.importedGrades, 0);
      toast.success(`Se importaron ${total} calificativos a la app.`);
      r.flatMap((x) => x.skipped).slice(0, 5).forEach((s) => toast.warning(s));
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudieron importar las notas.'));
    } finally {
      setConfirmImport(false);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Descarga del SIAGIE el registro de notas de cada aula y periodo (RegNotas_….xlsx). También sirve el archivo «_1» que devuelve Cubicol.</li>
        <li>Súbelos aquí (puedes subir varias aulas a la vez): la app reconoce el aula, el periodo, las áreas y las competencias de cada plantilla.</li>
        <li>Genera los archivos llenos con los calificativos y conclusiones y súbelos al SIAGIE.</li>
      </ol>

      {data && (
        <div className={cn('rounded-lg border p-3 text-sm', blocking ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10')}>
          {blocking
            ? `${data.classroom.label}: ${data.summary.missingStudentCodes} estudiantes sin código SIAGIE, ${data.summary.missingGrades} calificativos y ${data.summary.missingConclusions} conclusiones obligatorias pendientes.`
            : `${data.classroom.label}: todo listo para exportar.`}
        </div>
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:bg-muted/40">
        {inspect.isPending ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <FileUp className="h-6 w-6 text-muted-foreground" />}
        <span className="text-sm font-medium">
          {files.length ? `${files.length} plantilla(s) seleccionada(s)` : 'Elige una o varias plantillas .xlsx del SIAGIE'}
        </span>
        <input type="file" accept=".xlsx" multiple className="sr-only" onChange={(e) => pick(Array.from(e.target.files ?? []))} />
      </label>

      {inspection && (
        <>
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium"><FileSearch className="h-4 w-4" />Revisión de las plantillas</p>
            {inspection.map((r) => <InspectionCard key={r.fileName} r={r} />)}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={fillFromBank} onChange={(e) => setFillFromBank(e.target.checked)} />
              <span>Completar con el banco de frases las conclusiones que el docente no escribió <span className="text-muted-foreground">(según el calificativo de cada competencia)</span></span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
              <span>Si la plantilla ya trae notas, reemplazarlas por las de la app <span className="text-muted-foreground">(si lo desmarcas, solo se llenan las celdas vacías)</span></span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={fill.isPending || inspection.every((r) => r.issues.length > 0)} onClick={generate}>
              {fill.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
              Generar {files.length > 1 ? 'archivos llenos (.zip)' : 'archivo lleno'}
            </Button>
            {isAdmin && hasFilled && (
              <Button variant="outline" disabled={importGrades.isPending} onClick={() => setConfirmImport(true)}>
                <Upload className="mr-1 h-4 w-4" />Traer a la app las notas que ya trae el archivo
              </Button>
            )}
          </div>
        </>
      )}

      {reports && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Resultado</p>
          {reports.map((r) => <ReportCard key={r.fileName} r={r} />)}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmImport}
        onClose={() => setConfirmImport(false)}
        onConfirm={runImport}
        title="Importar notas desde la plantilla"
        description="Los calificativos y conclusiones del archivo se guardan en la app como nota final de cada competencia (reemplazan lo que haya). Las áreas divididas en cursos no se importan."
        confirmText="Importar"
        isLoading={importGrades.isPending}
      />
    </div>
  );
};
