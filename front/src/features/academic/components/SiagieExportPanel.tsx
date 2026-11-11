import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { injectGradesIntoSiagieTemplate, type SiagieInjectionResult } from '@/features/grades/utils/siagieTemplateInjector';
import type { ConsolidationResponse } from '../types';

export const SiagieExportPanel: React.FC<{ data: ConsolidationResponse }> = ({ data }) => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<SiagieInjectionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const blocking = data.summary.missingStudentCodes + data.summary.missingGrades + data.summary.missingConclusions;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await injectGradesIntoSiagieTemplate(file, data.matrix, []);
      setResult(r);
      const href = URL.createObjectURL(r.blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = r.fileName;
      a.click();
      URL.revokeObjectURL(href);
      toast.success('Archivo generado. Revísalo antes de subirlo al SIAGIE.');
    } catch {
      toast.error('No se pudo leer la plantilla. Usa el archivo descargado del SIAGIE sin modificar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Descarga del SIAGIE la plantilla de registro de notas de esta aula y periodo.</li>
        <li>Súbela aquí: se completan los calificativos y conclusiones por código de estudiante.</li>
        <li>Revisa el archivo y cárgalo en el SIAGIE.</li>
      </ol>
      <div className={blocking ? 'rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm' : 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm'}>
        {blocking
          ? `Antes de exportar: ${data.summary.missingStudentCodes} estudiantes sin código SIAGIE, ${data.summary.missingGrades} calificativos y ${data.summary.missingConclusions} conclusiones pendientes.`
          : 'Todo listo para exportar.'}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept=".xls,.xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} className="text-sm" />
        <Button disabled={!file || busy} onClick={run}><FileSpreadsheet className="mr-1 h-4 w-4" />Generar archivo para SIAGIE</Button>
      </div>
      {result && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p>{result.matchedStudents} de {result.totalStudentsInFile} estudiantes encontrados · {result.injectedGradesCount} calificativos · {result.injectedConclusionsCount} conclusiones.</p>
          {result.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-amber-700 dark:text-amber-300">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        </div>
      )}
    </div>
  );
};

