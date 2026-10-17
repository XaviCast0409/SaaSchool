import React, { useState } from 'react';
import { FileSpreadsheet, Download, X, Loader2, AlertCircle } from 'lucide-react';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useNominaMatricula } from '../api/useStudents';
import { exportNominaToExcel } from '../utils/exportNominaExcel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NominaSiagieModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClassroomId?: string;
}

export const NominaSiagieModal: React.FC<NominaSiagieModalProps> = ({
  isOpen,
  onClose,
  initialClassroomId,
}) => {
  const { data: classrooms = [] } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(
    initialClassroomId || (classrooms[0]?.id ?? '')
  );
  const [isExporting, setIsExporting] = useState(false);

  // Mantener sincronizado si cambia initialClassroomId o al abrir
  React.useEffect(() => {
    if (initialClassroomId) {
      setSelectedClassroomId(initialClassroomId);
    } else if (!selectedClassroomId && classrooms.length > 0) {
      setSelectedClassroomId(classrooms[0].id);
    }
  }, [initialClassroomId, classrooms]);

  const { data: nominaData, isLoading, isError } = useNominaMatricula(
    selectedClassroomId,
    isOpen && Boolean(selectedClassroomId)
  );

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!nominaData) return;
    try {
      setIsExporting(true);
      exportNominaToExcel(nominaData);
    } finally {
      setIsExporting(false);
    }
  };

  const countMales = nominaData?.students.filter((s) => s.gender === 'MALE').length || 0;
  const countFemales = nominaData?.students.filter((s) => s.gender === 'FEMALE').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Nómina Oficial de Matrícula SIAGIE
              </h2>
              <p className="text-xs text-muted-foreground">
                Genera la hoja oficial de matrícula (.xlsx) con los estándares requeridos por el MINEDU.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Selector de Aula */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Seleccionar Aula / Grado y Sección:
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}° "{c.section}" - {c.educationLevel} (Capacidad: {c.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Resumen del Aula y Estado de Carga */}
          {isLoading ? (
            <div className="p-8 rounded-xl border border-border bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Cargando datos oficiales del aula...</p>
            </div>
          ) : isError ? (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-2">
              <AlertCircle className="w-5 h-5 mx-auto" />
              <p className="text-xs font-semibold">Error al cargar la información de la nómina.</p>
            </div>
          ) : nominaData ? (
            <div className="space-y-4">
              {/* Tarjetas de Métricas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-border bg-background/50">
                  <span className="text-[11px] text-muted-foreground block font-medium">Total Matriculados</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {nominaData.totalStudents} alumnos
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-background/50">
                  <span className="text-[11px] text-muted-foreground block font-medium">Varones (M)</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                    {countMales}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-background/50">
                  <span className="text-[11px] text-muted-foreground block font-medium">Mujeres (F)</span>
                  <span className="text-xl font-bold text-pink-600 dark:text-pink-400 mt-0.5 block">
                    {countFemales}
                  </span>
                </div>
              </div>

              {/* Ficha Informativa del Aula */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Institución Educativa:</span>
                  <span className="font-semibold text-foreground">{nominaData.school.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Código Modular:</span>
                  <span className="font-mono font-medium text-foreground">{nominaData.school.modularCode || 'Sin registrar'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tutor Asignado:</span>
                  <span className="font-medium text-foreground">
                    {nominaData.classroom.tutorTeacher
                      ? `${nominaData.classroom.tutorTeacher.lastNamePaternal} ${nominaData.classroom.tutorTeacher.lastNameMaternal}, ${nominaData.classroom.tutorTeacher.firstName}`
                      : 'No asignado'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Año Académico:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {nominaData.academicYear?.year || new Date().getFullYear()}
                  </Badge>
                </div>
              </div>

              {/* Vista previa compacta de estudiantes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Alumnos en el orden oficial de la nómina:</span>
                  <span>{nominaData.totalStudents} registros listos</span>
                </div>
                <div className="border border-border rounded-xl max-h-48 overflow-y-auto divide-y divide-border/60 text-xs bg-background">
                  {nominaData.students.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground italic">
                      No hay estudiantes matriculados en esta sección actualmente.
                    </div>
                  ) : (
                    nominaData.students.map((st, idx) => (
                      <div key={st.id} className="p-2.5 flex items-center justify-between hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-muted-foreground font-mono text-[11px]">{idx + 1}.</span>
                          <div>
                            <span className="font-medium text-foreground">
                              {st.lastNamePaternal} {st.lastNameMaternal}, {st.firstNames}
                            </span>
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              DNI: {st.documentId} {st.studentCode ? `| Cód: ${st.studentCode}` : ''}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {st.gender === 'MALE' ? 'M' : 'F'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!nominaData || nominaData.students.length === 0 || isExporting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar Nómina Oficial (.xlsx)</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
