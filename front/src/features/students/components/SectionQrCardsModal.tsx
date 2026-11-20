import React, { useEffect, useState, useMemo } from 'react';
import { useSchoolBranding } from '@/features/schools/components/SchoolLetterhead';
import { X, Printer, QrCode, Users, Scissors, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useStudents } from '../api/useStudents';
import type { Student } from '../types';
import { generateStudentQrCode } from '@/features/attendance/utils/studentQrUtils';
import { PrintPortal, usePrint } from '@/lib/print';
import { formatEducationLevel } from '@/lib/utils';
import { SectionQrCardsDocument } from './section-qr-cards/SectionQrCardsDocument';

export { SectionQrCardsDocument };

interface SectionQrCardsModalProps {
  initialClassroomId?: string;
  schoolName?: string;
  onClose: () => void;
}

export const SectionQrCardsModal: React.FC<SectionQrCardsModalProps> = ({
  initialClassroomId,
  schoolName = 'Institución Educativa',
  onClose,
}) => {
  const branding = useSchoolBranding();
  const { data: classrooms = [] } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(
    initialClassroomId || (classrooms.length > 0 ? classrooms[0].id : ''),
  );

  useEffect(() => {
    if (!selectedClassroomId && classrooms.length > 0) {
      setSelectedClassroomId(classrooms[0].id);
    }
  }, [classrooms, selectedClassroomId]);

  const activeClassroom = useMemo(() => {
    return classrooms.find((c) => c.id === selectedClassroomId);
  }, [classrooms, selectedClassroomId]);

  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents(
    { classroomId: selectedClassroomId, limit: 100 },
    Boolean(selectedClassroomId),
  );

  const rawStudents = useMemo(() => {
    return studentsResponse?.data || [];
  }, [studentsResponse]);

  const sortedStudents = useMemo(() => {
    return [...rawStudents].sort((a, b) => {
      const nameA = `${a.lastNamePaternal} ${a.lastNameMaternal || ''} ${a.firstNames}`.toLowerCase();
      const nameB = `${b.lastNamePaternal} ${b.lastNameMaternal || ''} ${b.firstNames}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [rawStudents]);

  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const generateAllQr = async () => {
      if (!rawStudents.length) {
        setQrMap({});
        return;
      }

      setIsGeneratingQr(true);
      const newMap: Record<string, string> = {};

      for (const student of rawStudents) {
        if (isCancelled) return;
        const code = student.documentId || student.studentCode;
        if (code) {
          try {
            newMap[student.id] = await generateStudentQrCode(code);
          } catch {
            // Silencioso
          }
        }
      }

      if (!isCancelled) {
        setQrMap(newMap);
        setIsGeneratingQr(false);
      }
    };

    void generateAllQr();

    return () => {
      isCancelled = true;
    };
  }, [rawStudents]);

  const pages = useMemo(() => {
    const chunks: Student[][] = [];
    const itemsPerPage = 8;
    for (let i = 0; i < sortedStudents.length; i += itemsPerPage) {
      chunks.push(sortedStudents.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [sortedStudents]);

  const printTitle = activeClassroom
    ? `Fotochecks_QR_${activeClassroom.grade}_${activeClassroom.section}`
    : 'Fotochecks_QR_Seccion';

  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    margin: '8mm',
    title: printTitle,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-background border border-border w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Impresión Masiva de Fotochecks QR
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                  A4 • 8 por hoja
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Genera credenciales de asistencia listas para imprimir y recortar para toda el aula.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Barra de Controles y Selector de Aula */}
        <div className="p-3.5 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="classroom-select" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Aula:
            </label>
            <div className="relative">
              <select
                id="classroom-select"
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="h-9 pr-8 pl-3 rounded-xl border border-input bg-background text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade}° "{c.section}" — {formatEducationLevel(c.educationLevel)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            <span className="text-xs text-muted-foreground ml-2">
              <strong>{sortedStudents.length}</strong> alumnos ({pages.length}{' '}
              {pages.length === 1 ? 'página' : 'páginas'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={print}
              disabled={isPrinting || isLoadingStudents || sortedStudents.length === 0 || isGeneratingQr}
              className="gap-2 shadow-sm font-bold text-xs"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? 'Preparando...' : isGeneratingQr ? 'Generando QR...' : 'Imprimir / Exportar PDF'}
            </Button>
          </div>
        </div>

        {/* Contenido / Vista Previa A4 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70 dark:bg-slate-950/40">
          {isLoadingStudents ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Sparkles className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Cargando nómina de estudiantes...</p>
            </div>
          ) : sortedStudents.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center gap-2 text-muted-foreground text-center">
              <Users className="w-10 h-10 stroke-1 text-slate-400" />
              <p className="text-sm font-bold text-foreground">No hay alumnos matriculados en esta sección</p>
              <p className="text-xs max-w-sm">
                Selecciona otra aula o matricula alumnos para poder generar sus carnets QR.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground max-w-[194mm] mx-auto px-1">
                <span className="flex items-center gap-1 font-semibold">
                  <Scissors className="w-3.5 h-3.5" /> Vista previa tamaño real (Hoja A4)
                </span>
                <span>
                  {sortedStudents.length} fotochecks • {pages.length} hoja(s)
                </span>
              </div>

              {/* Documento Renderizado en pantalla */}
              <SectionQrCardsDocument
                pages={pages}
                qrMap={qrMap}
                activeClassroom={activeClassroom}
                schoolName={schoolName}
                schoolLogoUrl={branding?.logoUrl}
              />
            </div>
          )}
        </div>

        {/* Portal de Impresión Real (Oculto en pantalla) */}
        {isPrinting && (
          <PrintPortal>
            <SectionQrCardsDocument
              pages={pages}
              qrMap={qrMap}
              activeClassroom={activeClassroom}
              schoolName={schoolName}
              schoolLogoUrl={branding?.logoUrl}
              isPrint
            />
          </PrintPortal>
        )}
      </div>
    </div>
  );
};
