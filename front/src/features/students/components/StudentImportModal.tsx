import React, { useState } from 'react';
import { Download, FileUp, FileWarning, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import {
  importErrorMessage,
  useDownloadImportTemplate,
  useDownloadRejectedRows,
  useStudentImportCommit,
  useStudentImportPreview,
} from '../api/useStudentImport';
import type { StudentImportPlan } from '../importTypes';
import { StudentImportPreview } from './StudentImportPreview';

/**
 * Carga masiva de alumnos: se descarga la plantilla del colegio, se sube llena, se revisa qué
 * hará y recién entonces se guarda. Las filas con error se devuelven en un Excel para corregir.
 */
export const StudentImportModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<StudentImportPlan | null>(null);
  const [generateFees, setGenerateFees] = useState(true);
  const { selected: viewedYear } = useSelectedAcademicYear();
  const template = useDownloadImportTemplate();
  const preview = useStudentImportPreview();
  const rejected = useDownloadRejectedRows();
  const commit = useStudentImportCommit();

  const reset = () => {
    setFile(null);
    setPlan(null);
    setGenerateFees(true);
  };
  const close = () => {
    reset();
    onClose();
  };

  const downloadTemplate = async () => {
    try {
      await template.mutateAsync(viewedYear?.year);
    } catch (error) {
      toast.error(await importErrorMessage(error, 'No se pudo descargar la plantilla.'));
    }
  };

  const runPreview = async (selected: File | null) => {
    setFile(selected);
    setPlan(null);
    if (!selected) return;
    try {
      setPlan(await preview.mutateAsync(selected));
    } catch (error) {
      toast.error(await importErrorMessage(error, 'No se pudo leer el archivo.'));
    }
  };

  const downloadRejected = async () => {
    if (!file || !plan) return;
    try {
      await rejected.mutateAsync({ file, year: plan.academicYear.year });
    } catch (error) {
      toast.error(await importErrorMessage(error, 'No se pudo generar el archivo de filas por corregir.'));
    }
  };

  const runCommit = async () => {
    if (!file) return;
    try {
      const result = await commit.mutateAsync({ file, generateFees });
      toast.success(
        `Carga lista: ${result.createdStudents} alumnos nuevos, ${result.createdEnrollments} matrículas y ${result.createdGuardians} apoderados nuevos` +
          (result.updatedStudents ? `, ${result.updatedStudents} alumnos actualizados` : '') +
          (generateFees ? `, ${result.createdFees} cuotas generadas` : '') +
          (result.skipped ? `. ${result.skipped} filas no se cargaron.` : '.'),
        { duration: 10_000 },
      );
      if (result.enrollmentsWithoutFeeSchedule > 0) {
        toast.warning(
          `${result.enrollmentsWithoutFeeSchedule} matrículas quedaron sin cuotas porque su nivel no tiene tarifario este año.`,
        );
      }
      close();
    } catch (error) {
      toast.error(
        await importErrorMessage(
          error,
          'No se pudo completar la carga. Vuelve a subir el archivo: lo ya cargado no se duplica.',
        ),
      );
    }
  };

  const summary = plan?.summary;
  const rejectedCount = summary ? summary.errors + summary.duplicates : 0;
  const loadable = summary ? summary.total - rejectedCount : 0;
  const pendingWork = summary
    ? summary.createStudents + summary.updateStudents + summary.createEnrollments + summary.createGuardians
    : 0;
  const newCount = summary?.createStudents ?? 0;
  const updateCount = summary?.updateStudents ?? 0;
  // El botón dice exactamente qué va a pasar: alumnos nuevos y fichas que se actualizan.
  const commitLabel =
    loadable === 0
      ? 'Cargar'
      : [
          newCount > 0 ? `${newCount} nuevo${newCount === 1 ? '' : 's'}` : '',
          updateCount > 0 ? `actualizar ${updateCount}` : '',
        ]
          .filter(Boolean)
          .join(' y ')
          .replace(/^/, 'Cargar ') || `Cargar ${loadable} alumnos`;
  const canCommit = !!plan && !commit.isPending && plan.blocking.length === 0 && loadable > 0;

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="Carga masiva de alumnos"
      description="Crea alumnos, matrículas y apoderados desde un Excel. Antes de guardar verás qué se va a cargar."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={runCommit} disabled={!canCommit}>
            {commit.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            {commitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-medium">1. Descarga la plantilla y llénala (o pásala a quien tenga los datos).</span>
            <span className="block text-xs text-muted-foreground">
              Trae las aulas abiertas{viewedYear ? ` en ${viewedYear.year}` : ''} en una lista desplegable. Crea antes
              las aulas que falten.
            </span>
          </p>
          <Button variant="outline" onClick={downloadTemplate} disabled={template.isPending} className="shrink-0 gap-2">
            {template.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar plantilla
          </Button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:bg-muted/40">
          {preview.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <FileUp className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{file ? file.name : '2. Sube la plantilla llena (.xlsx)'}</span>
          <span className="text-xs text-muted-foreground">
            Al elegirla solo se revisa: nada se guarda hasta que confirmes.
          </span>
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => {
              void runPreview(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
        </label>

        {plan && (
          <>
            <StudentImportPreview plan={plan} />

            {rejectedCount > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  {rejectedCount} {rejectedCount === 1 ? 'fila no se cargará' : 'filas no se cargarán'}. Descárgalas con
                  su motivo, corrígelas y vuelve a subir ese archivo.
                </p>
                <Button
                  variant="outline"
                  onClick={downloadRejected}
                  disabled={rejected.isPending}
                  className="shrink-0 gap-2"
                >
                  {rejected.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileWarning className="h-4 w-4" />
                  )}
                  Descargar filas por corregir
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={generateFees}
                  onChange={(event) => setGenerateFees(event.target.checked)}
                />
                <span>
                  Generar las cuotas del tarifario para las matrículas nuevas
                  <span className="block text-xs text-muted-foreground">
                    Crea automáticamente las pensiones del año según el tarifario vigente.
                  </span>
                </span>
              </label>
              {!generateFees && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  Los alumnos importados quedarán sin pensiones. Podrás generarlas luego con “Generar cuotas faltantes”
                  en el Tarifario.
                </div>
              )}
            </div>

            {loadable > 0 && pendingWork === 0 && plan.blocking.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Estos alumnos ya están cargados: confirmar solo completa los vínculos con apoderados que falten.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Las contraseñas no se crean aquí: al terminar, usa «Credenciales de acceso» para generarlas por aula.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};
