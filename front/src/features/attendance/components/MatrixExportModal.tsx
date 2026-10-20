import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileEdit,
  Download,
  Calendar,
  School,
  CheckCircle2,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AttendanceMatrixStudentRow } from '../types';
import { exportWellMarkedMatrixExcel } from '../utils/matrixExcelExport';

interface MatrixExportModalProps {
  students: AttendanceMatrixStudentRow[];
  monthStr: string;
  daysInMonth: number;
  classroomLabel?: string;
  schoolName?: string;
  onClose: () => void;
}

export const MatrixExportModal: React.FC<MatrixExportModalProps> = ({
  students,
  monthStr,
  daysInMonth,
  classroomLabel,
  schoolName = 'Institución Educativa',
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportWithAttendance = async () => {
    try {
      setIsExporting(true);
      await exportWellMarkedMatrixExcel({
        students,
        monthStr,
        daysInMonth,
        classroomLabel,
        schoolName,
        mode: 'WITH_ATTENDANCE',
      });
      toast.success('Archivo Excel (.xlsx) generado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error exportando matriz a Excel:', error);
      toast.error('Error al generar el archivo Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportEmpty = async () => {
    try {
      setIsExporting(true);
      await exportWellMarkedMatrixExcel({
        students,
        monthStr,
        daysInMonth,
        classroomLabel,
        schoolName,
        mode: 'EMPTY',
      });
      toast.success('Plantilla vacía (.xlsx) generada exitosamente');
      onClose();
    } catch (error) {
      console.error('Error exportando plantilla a Excel:', error);
      toast.error('Error al generar la plantilla');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-foreground">
                  Plantilla de Asistencia (Cuadrícula Reforzada)
                </h2>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-bold">
                  SIAGIE / MINEDU
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cuadro bien marcado para visualización clara o impresión y llenado manual.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadatos del Aula y Mes Seleccionado */}
        <div className="px-5 py-3 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground font-medium">Aula / Grado:</span>
            <span className="font-bold text-foreground">
              {classroomLabel || 'Todas las Secciones'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground font-medium">Mes:</span>
            <span className="font-bold text-foreground">{monthStr}</span>
            <span>•</span>
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span className="font-bold text-foreground">{students.length} alumnos matriculados</span>
          </div>
        </div>

        {/* Las 2 opciones de la plantilla */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opción 1: Con la asistencia de los alumnos matriculados */}
          <div className="p-5 rounded-2xl border-2 border-primary/30 bg-card hover:border-primary transition-all flex flex-col justify-between space-y-4 shadow-sm group">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">
                  Nómina del Grado
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                  Con Asistencia de Alumnos Matriculados
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Descarga la cuadrícula con los nombres de los <strong>{students.length} estudiantes</strong> matriculados en esta sección y sus asistencias registradas del mes.
                </p>
              </div>

              <ul className="text-[11px] text-muted-foreground space-y-1.5 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Cuadro bien marcado con bordes reforzados</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Indicadores [P, FI, FJ, TI, TJ] y fines de semana sombreados</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Totales de asistencia y fila de resumen diario</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={handleExportWithAttendance}
              disabled={isExporting}
              className="w-full gap-2 font-bold text-xs shadow-sm h-10 mt-2"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExporting ? 'Generando Excel...' : 'Descargar con Alumnos y Asistencias (.xlsx)'}</span>
            </Button>
          </div>

          {/* Opción 2: Totalmente Vacía para Llenado Manual */}
          <div className="p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/60 transition-all flex flex-col justify-between space-y-4 shadow-sm group">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 rounded-xl bg-muted text-foreground">
                  <FileEdit className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">
                  Para Imprimir
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                  Totalmente Vacía para Llenado Manual
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Plantilla en blanco con <strong>35 renglones numerados</strong> y casillas limpias listas para imprimir o registrar asistencias a mano con lapicero.
                </p>
              </div>

              <ul className="text-[11px] text-muted-foreground space-y-1.5 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Cuadrícula oscura y definida para escritura nítida</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Fines de semana bloqueados en gris (S y D)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Casilleros inferiores para conteo manual y firmas</span>
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              onClick={handleExportEmpty}
              disabled={isExporting}
              className="w-full gap-2 font-bold text-xs shadow-sm h-10 mt-2 hover:bg-muted"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExporting ? 'Generando Plantilla...' : 'Descargar Plantilla Vacía (.xlsx)'}</span>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Compatible con Microsoft Excel, Google Sheets e impresoras en horizontal.</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
