import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Printer,
  School,
  QrCode,
  Users,
  Scissors,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useStudents } from '../api/useStudents';
import { generateStudentQrCode } from '@/features/attendance/utils/studentQrUtils';

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
  const { data: classrooms = [] } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(
    initialClassroomId || (classrooms.length > 0 ? classrooms[0].id : '')
  );

  // Si no había selección inicial y cargan las aulas, auto-seleccionar la primera
  useEffect(() => {
    if (!selectedClassroomId && classrooms.length > 0) {
      setSelectedClassroomId(classrooms[0].id);
    }
  }, [classrooms, selectedClassroomId]);

  // Consulta los estudiantes específicos de la sección seleccionada (hasta 100 alumnos por aula)
  const {
    data: studentsResponse,
    isLoading: isLoadingStudents,
    isError,
    refetch,
  } = useStudents(
    {
      classroomId: selectedClassroomId || undefined,
      limit: 100,
      page: 1,
    },
    Boolean(selectedClassroomId)
  );

  const rawStudents = studentsResponse?.data || [];
  const activeClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  const classroomLabel = activeClassroom
    ? `${activeClassroom.grade}° "${activeClassroom.section}" - ${activeClassroom.educationLevel}`
    : 'Sección Seleccionada';

  // Mapa de QRs en Base64
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGeneratingQrs, setIsGeneratingQrs] = useState(false);

  useEffect(() => {
    let active = true;
    const generateAll = async () => {
      setIsGeneratingQrs(true);
      const newMap: Record<string, string> = {};

      for (const s of rawStudents) {
        const payload = (s.documentId || s.studentCode || s.id).trim();
        const url = await generateStudentQrCode(payload, 250);
        newMap[s.id] = url;
      }

      if (active) {
        setQrMap(newMap);
        setIsGeneratingQrs(false);
      }
    };

    if (rawStudents.length > 0) {
      generateAll();
    } else {
      setIsGeneratingQrs(false);
    }

    return () => {
      active = false;
    };
  }, [rawStudents]);

  // Agrupar a los estudiantes exactamente de 8 en 8 por página A4 (2 columnas x 4 filas)
  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < rawStudents.length; i += 8) {
      chunks.push(rawStudents.slice(i, i + 8));
    }
    return chunks;
  }, [rawStudents]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header no imprimible */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-foreground">
                  Generador de Carnets QR por Sección (A4 Imprimible / PDF)
                </h2>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-bold">
                  8 Carnets por Hoja A4
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Genera los carnets por grado/sección específico para evitar archivos masivos sobrecargados.
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

        {/* Barra de Filtro de Grado/Sección y Botón de Impresión */}
        <div className="px-5 py-3.5 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          {/* Selector de Aula / Sección */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <School className="w-4 h-4 text-primary" />
              Seleccionar Aula:
            </span>
            <div className="relative">
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:ring-2 focus:ring-primary shadow-sm cursor-pointer appearance-none"
              >
                <option value="">— Seleccionar Sección —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade}° "{c.section}" - {c.educationLevel}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Estadísticas de la selección */}
          <div className="flex items-center gap-3 text-muted-foreground font-semibold">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              <span>{rawStudents.length} estudiantes</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-primary" />
              <span>
                {pages.length} {pages.length === 1 ? 'página A4' : 'páginas A4'}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handlePrint}
            disabled={isGeneratingQrs || rawStudents.length === 0}
            className="gap-2 font-bold text-xs shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar como PDF</span>
          </Button>
        </div>

        {/* Zona de Vista Previa y Contenedor de Impresión */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-muted/10 flex-1">
          {isLoadingStudents || isGeneratingQrs ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">
                Generando códigos QR de alta resolución para {classroomLabel}...
              </p>
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-destructive border border-destructive/20 bg-destructive/10 rounded-xl space-y-2 p-4">
              <p className="font-bold text-sm">Error al cargar la nómina de estudiantes</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : !selectedClassroomId ? (
            <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-2">
              <p className="font-bold text-sm text-foreground">Selecciona una sección educativa</p>
              <p className="text-xs text-muted-foreground">
                Usa el selector arriba para elegir el grado del cual deseas generar los carnets QR.
              </p>
            </div>
          ) : rawStudents.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-xl space-y-2">
              <p className="font-bold text-sm text-foreground">No se encontraron estudiantes matriculados</p>
              <p className="text-xs text-muted-foreground">
                Esta sección ({classroomLabel}) aún no tiene alumnos matriculados. Selecciona otra aula arriba.
              </p>
            </div>
          ) : (
            <div id="section-printable-sheet-wrap" className="mx-auto space-y-8 print:space-y-0">
              {pages.map((pageStudents, pageIndex) => (
                <div
                  key={`page-${pageIndex}`}
                  className="a4-print-page bg-white p-3 rounded-xl border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 print:rounded-none"
                >
                  {pageStudents.map((student, studentIndex) => {
                    const globalIndex = pageIndex * 8 + studentIndex + 1;
                    const qrUrl = qrMap[student.id];
                    const gradeText = activeClassroom ? `${activeClassroom.grade}° "${activeClassroom.section}"` : '';
                    const levelText = activeClassroom?.educationLevel || '';

                    return (
                      <div
                        key={student.id}
                        className="qr-card-item rounded-xl border-2 border-dashed border-slate-400 bg-white text-slate-900 p-2.5 flex flex-col justify-between overflow-hidden shadow-sm print:shadow-none"
                      >
                        {/* Cabecera del carnet */}
                        <div className="border-b border-slate-300 pb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-900 tracking-wider truncate max-w-[170px]">
                            <School className="w-3 h-3 text-slate-800 shrink-0" />
                            <span className="truncate">{schoolName}</span>
                          </div>
                          <span className="bg-slate-100 text-slate-800 text-[8px] font-bold px-1.5 py-0.5 rounded font-mono border border-slate-200">
                            {gradeText} • {levelText}
                          </span>
                        </div>

                        {/* Cuerpo: Datos del alumno + QR */}
                        <div className="flex items-center justify-between gap-2 py-1">
                          {/* Datos */}
                          <div className="flex-1 space-y-0.5">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">
                              Estudiante #{globalIndex}
                            </span>
                            <div className="font-black text-[11px] text-slate-900 uppercase leading-snug line-clamp-2">
                              {student.lastNamePaternal} {student.lastNameMaternal || ''}, {student.firstNames}
                            </div>
                            <div className="pt-0.5">
                              <span className="text-[8px] font-semibold text-slate-500 block">
                                DNI / DOC. IDENTIDAD
                              </span>
                              <span className="font-mono font-black text-xs text-slate-900 tracking-wider">
                                {student.documentId || student.studentCode || '—'}
                              </span>
                            </div>
                          </div>

                          {/* QR Image */}
                          <div className="p-1 rounded-lg border border-slate-300 bg-white shrink-0">
                            {qrUrl ? (
                              <img
                                src={qrUrl}
                                alt={`QR ${student.firstNames}`}
                                className="w-16 h-16 object-contain"
                              />
                            ) : (
                              <div className="w-16 h-16 flex items-center justify-center text-[8px] text-slate-400">
                                QR
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pie con línea de corte */}
                        <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[8px] text-slate-500 font-semibold">
                          <span>✂ Válido para lector óptico / Kiosco</span>
                          <span className="font-mono">{new Date().getFullYear()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer no imprimible */}
        <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground print:hidden">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Al imprimir en horizontal o vertical, selecciona <strong>"Guardar como PDF"</strong> o tu impresora A4.
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cerrar
          </Button>
        </div>
      </div>

      {/* Reglas CSS de Impresión A4 de Alta Precisión sin Sobreposiciones */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #section-printable-sheet-wrap,
          #section-printable-sheet-wrap * {
            visibility: visible !important;
          }
          #section-printable-sheet-wrap {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 194mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-print-page {
            width: 194mm !important;
            height: 275mm !important;
            max-height: 275mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: grid !important;
            grid-template-columns: repeat(2, 94mm) !important;
            grid-template-rows: repeat(4, 63mm) !important;
            gap: 5mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .a4-print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .qr-card-item {
            width: 94mm !important;
            height: 63mm !important;
            max-height: 63mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1.5px dashed #334155 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};
