import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { ReportCode, EducationLevel, ReportClassroomItem } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface ReportItemDefinition {
  code: ReportCode | string;
  name: string;
  category: string;
  subCategory: string;
  defaultOrientation: 'Horizontal' | 'Vertical';
  description: string;
  isImplemented: boolean;
}

export const ALL_REPORTS_CATALOG: ReportItemDefinition[] = [
  // Menú: Mantenimiento (2) -> Familias (3)
  {
    code: '0001',
    name: 'Listado de Familias por Estado',
    category: 'Mantenimiento',
    subCategory: 'Familias',
    defaultOrientation: 'Vertical',
    description: 'Relación de familias registradas en el sistema clasificadas por estado de matrícula y convivencia.',
    isImplemented: true,
  },
  {
    code: '0002',
    name: 'Listado de Familias e Hijos',
    category: 'Mantenimiento',
    subCategory: 'Familias',
    defaultOrientation: 'Vertical',
    description: 'Padrón de padres de familia agrupados con el detalle de sus hijos matriculados.',
    isImplemented: true,
  },
  {
    code: '0003',
    name: 'Listado de Familias y Parientes',
    category: 'Mantenimiento',
    subCategory: 'Familias',
    defaultOrientation: 'Vertical',
    description: 'Directorio de contactos de emergencia, apoderados legales y parentesco.',
    isImplemented: true,
  },
  // Menú: Mantenimiento -> Alumnos (1)
  {
    code: '0019',
    name: 'Listado de Cumpleaños del Alumno',
    category: 'Mantenimiento',
    subCategory: 'Alumnos',
    defaultOrientation: 'Vertical',
    description: 'Cronograma mensual y anual de aniversarios de nacimiento de los estudiantes del colegio.',
    isImplemented: true,
  },
  // Menú: Registro (2) -> Notas (5)
  {
    code: '0021',
    name: 'Consolidado de Estudios',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Horizontal',
    description: 'Matriz oficial cruzada de calificaciones por asignaturas, promedios, orden de mérito, tercios y récord de asistencia para actas bimestrales.',
    isImplemented: true,
  },
  {
    code: '0041',
    name: 'Registro Auxiliar Borrador',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Horizontal',
    description: 'Plantilla cuadriculada en blanco para uso físico del docente en aula con lista de alumnos oficial y columnas de criterios de evaluación.',
    isImplemented: true,
  },
  {
    code: '0048',
    name: 'Orden de mérito y tercios por salón',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Vertical',
    description: 'Escalafón jerárquico de rendimiento académico del salón, clasificación de tercios (Superior, Medio, Inferior) y estadísticas de aprobados e invictos.',
    isImplemented: true,
  },
  {
    code: '0049',
    name: 'Orden de mérito y tercios por grado',
    category: 'Registro',
    subCategory: 'Notas',
    defaultOrientation: 'Vertical',
    description: 'Ranking unificado consolidando todas las secciones del grado con cálculo de Tercios y Quintos superiores para certificaciones oficiales.',
    isImplemented: true,
  },
  // Menú: Registro -> Conducta (1)
  {
    code: '0030',
    name: 'Listado de los comentarios a la conducta',
    category: 'Registro',
    subCategory: 'Conducta',
    defaultOrientation: 'Vertical',
    description: 'Apreciaciones cualitativas, deméritos y observaciones de comportamiento registradas por el tutor de aula.',
    isImplemented: true,
  },
  // Menú: Reportes -> Generación de Reportes (1)
  {
    code: '0011',
    name: 'Reporte de Alumnos por Salón',
    category: 'Reportes',
    subCategory: 'Generación de Reportes',
    defaultOrientation: 'Vertical',
    description: 'Padrón oficial de matrícula del salón con códigos SIAGIE, documentos de identidad, género y datos de apoderados.',
    isImplemented: true,
  },
];

interface AcademicReportsHubProps {
  selectedReportCode: string;
  onSelectReportCode: (code: ReportCode) => void;
  classrooms: ReportClassroomItem[];
  selectedLevel: EducationLevel;
  onSelectLevel: (level: EducationLevel) => void;
  selectedGrade: number;
  onSelectGrade: (grade: number) => void;
  selectedClassroomId: string;
  onSelectClassroom: (classroomId: string) => void;
  selectedPeriod: number;
  onSelectPeriod: (period: number) => void;
  selectedMonth?: number;
  onSelectMonth?: (month: number) => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
  pdfOrientation: 'Horizontal' | 'Vertical';
  onSelectPdfOrientation: (orientation: 'Horizontal' | 'Vertical') => void;
  onGeneratePdf: () => void;
  onGenerateExcel: () => void;
  isGeneratingPdf: boolean;
  isGeneratingExcel: boolean;
}

const LEVEL_LABELS: Record<EducationLevel, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const AcademicReportsHub: React.FC<AcademicReportsHubProps> = ({
  selectedReportCode,
  onSelectReportCode,
  classrooms,
  selectedLevel,
  onSelectLevel,
  selectedGrade,
  onSelectGrade,
  selectedClassroomId,
  onSelectClassroom,
  selectedPeriod,
  onSelectPeriod,
  selectedMonth = 0,
  onSelectMonth,
  selectedState = 'REGISTERED',
  onSelectState,
  pdfOrientation,
  onSelectPdfOrientation,
  onGeneratePdf,
  onGenerateExcel,
  isGeneratingPdf,
  isGeneratingExcel,
}) => {
  // Filtros de búsqueda en la tabla izquierda
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');

  // Estados de acordeón para las carpetas
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    'Mantenimiento': false,
    'Registro': false,
    'Reportes': false,
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Reporte actualmente seleccionado
  const activeReport = useMemo(() => {
    return (
      ALL_REPORTS_CATALOG.find((r) => r.code === selectedReportCode) ||
      ALL_REPORTS_CATALOG[4] // 0021 por defecto
    );
  }, [selectedReportCode]);

  // Lista filtrada
  const filteredReports = useMemo(() => {
    return ALL_REPORTS_CATALOG.filter((item) => {
      const matchCode = filterCode.trim() === '' || item.code.includes(filterCode.trim());
      const matchName = filterName.trim() === '' || item.name.toLowerCase().includes(filterName.toLowerCase().trim());
      return matchCode && matchName;
    });
  }, [filterCode, filterName]);

  // Agrupación jerárquica
  const groupedReports = useMemo(() => {
    const groups: Record<string, Record<string, ReportItemDefinition[]>> = {};

    filteredReports.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = {};
      }
      if (!groups[item.category][item.subCategory]) {
        groups[item.category][item.subCategory] = [];
      }
      groups[item.category][item.subCategory].push(item);
    });

    return groups;
  }, [filteredReports]);

  return (
    <div className="space-y-4">
      {/* Barra Superior con Contador de Reportes */}
      <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          Catálogo Institucional de Reportes
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase">Total Reportes:</span>
          <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5">
            {ALL_REPORTS_CATALOG.length}
          </Badge>
        </div>
      </div>

      {/* Grid Principal Dividido: Izquierda (Catálogo) / Derecha (Parámetros y Descarga) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* PANEL IZQUIERDO: Árbol / Tabla de Reportes                               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Cabecera con Filtros de Columna */}
          <div className="border-b border-border bg-muted/40">
            <div className="grid grid-cols-12 text-xs font-bold text-foreground border-b border-border">
              <div className="col-span-3 p-2 border-r border-border text-center">Código</div>
              <div className="col-span-9 p-2 pl-3">Nombre de Reporte</div>
            </div>
            <div className="grid grid-cols-12 p-1.5 gap-2 bg-background/50">
              <div className="col-span-3">
                <Input
                  placeholder="Filtrar..."
                  value={filterCode}
                  onChange={(e) => setFilterCode(e.target.value)}
                  className="h-7 text-xs font-mono text-center bg-card"
                />
              </div>
              <div className="col-span-9">
                <Input
                  placeholder="Buscar reporte..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>
          </div>

          {/* Lista Jerárquica de Reportes */}
          <div className="max-h-[560px] overflow-y-auto text-xs divide-y divide-border/60">
            {Object.entries(groupedReports).map(([category, subCategories]) => {
              const totalInCategory = Object.values(subCategories).reduce((acc, list) => acc + list.length, 0);
              const isCollapsed = collapsedCategories[category];

              return (
                <div key={category} className="bg-card">
                  {/* Categoría Principal */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 font-bold text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span>Menú: {category} ({totalInCategory})</span>
                    </div>
                  </button>

                  {/* Subcategorías y Reportes */}
                  {!isCollapsed && (
                    <div className="space-y-1">
                      {Object.entries(subCategories).map(([subCategory, items]) => (
                        <div key={subCategory} className="pl-4 pr-1 py-1">
                          <div className="flex items-center gap-1.5 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                            <ChevronDown className="w-3 h-3" />
                            <span>Menú: {subCategory} ({items.length})</span>
                          </div>

                          <div className="space-y-0.5 ml-3 border-l border-border pl-1">
                            {items.map((report) => {
                              const isSelected = selectedReportCode === report.code;
                              return (
                                <button
                                  key={report.code}
                                  onClick={() => {
                                    if (report.isImplemented) {
                                      onSelectReportCode(report.code as ReportCode);
                                    }
                                  }}
                                  disabled={!report.isImplemented}
                                  className={`w-full grid grid-cols-12 items-center py-1.5 px-2 rounded-md transition-all text-left ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                                      : report.isImplemented
                                      ? 'hover:bg-muted/70 text-foreground cursor-pointer'
                                      : 'opacity-40 text-muted-foreground cursor-not-allowed'
                                  }`}
                                >
                                  <div className="col-span-3 font-mono text-center text-[11px]">
                                    {report.code}
                                  </div>
                                  <div className="col-span-9 truncate text-xs">
                                    {report.name}
                                    {!report.isImplemented && (
                                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                                        (Próx.)
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL DERECHO: Filtros, Parámetros y Botones de Descarga                 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 bg-card border border-border rounded-xl shadow-sm p-5 space-y-5">
          {/* Sección: Descripción */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>DESCRIPCIÓN:</span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
                  {activeReport.name}
                </h3>
                <Badge variant="outline" className="font-mono text-xs font-bold border-primary/30 text-primary">
                  {activeReport.code}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeReport.description}
              </p>
            </div>
          </div>

          {/* Sección: Parámetros */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>PARÁMETROS:</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Año Lectivo */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 font-bold text-muted-foreground text-right">Año:</label>
                <div className="col-span-8">
                  <select className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none">
                    <option>{new Date().getFullYear()}</option>
                  </select>
                </div>
              </div>

              {/* CASO 1: Reportes por Aula Específica (0021, 0041, 0048, 0030, 0011) */}
              {['0021', '0041', '0048', '0030', '0011'].includes(selectedReportCode) && (
                <div className="grid grid-cols-12 items-center gap-2">
                  <label className="col-span-4 font-bold text-muted-foreground text-right">Salón:</label>
                  <div className="col-span-8">
                    <select
                      value={selectedClassroomId}
                      onChange={(e) => {
                        const id = e.target.value;
                        onSelectClassroom(id);
                        const match = classrooms.find((c) => c.id === id);
                        if (match) {
                          onSelectLevel(match.educationLevel);
                          onSelectGrade(match.grade);
                        }
                      }}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
                    >
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.grade}° Grado "{c.section}" — {LEVEL_LABELS[c.educationLevel]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* CASO 2: Reporte por Grado Completo (0049: Orden de Mérito por Grado) */}
              {selectedReportCode === '0049' && (
                <>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 font-bold text-muted-foreground text-right">Nivel:</label>
                    <div className="col-span-8">
                      <select
                        value={selectedLevel}
                        onChange={(e) => onSelectLevel(e.target.value as EducationLevel)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="PRIMARY">Primaria</option>
                        <option value="SECONDARY">Secundaria</option>
                        <option value="INITIAL">Inicial</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 font-bold text-muted-foreground text-right">Grado:</label>
                    <div className="col-span-8">
                      <select
                        value={selectedGrade}
                        onChange={(e) => onSelectGrade(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map((gr) => (
                          <option key={gr} value={gr}>
                            {gr}° Grado / Año
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium leading-tight">
                    ℹ️ Ranking consolidado evaluando a <strong>todas las secciones</strong> del grado simultáneamente.
                  </div>
                </>
              )}

              {/* CASO 3: Reporte 0001 (Familias por Estado) */}
              {selectedReportCode === '0001' && onSelectState && (
                <>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 font-bold text-muted-foreground text-right">Estado:</label>
                    <div className="col-span-8">
                      <select
                        value={selectedState}
                        onChange={(e) => onSelectState(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="REGISTERED">Matriculados (Vigentes)</option>
                        <option value="TRANSFERRED">Trasladados</option>
                        <option value="WITHDRAWN">Retirados</option>
                        <option value="ALL">Todos los Estados</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground text-[11px] leading-tight">
                    Padrón institucional completo agrupado por núcleos familiares según condición de matrícula.
                  </div>
                </>
              )}

              {/* CASO 4: Reportes 0002 y 0003 (Familias e Hijos / Directorio de Parientes) */}
              {['0002', '0003'].includes(selectedReportCode) && (
                <>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 font-bold text-muted-foreground text-right">Filtrar Salón:</label>
                    <div className="col-span-8">
                      <select
                        value={selectedClassroomId || ''}
                        onChange={(e) => onSelectClassroom(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">Todas las Aulas (Padrón General)</option>
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.grade}° Grado "{c.section}" — {LEVEL_LABELS[c.educationLevel]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground text-[11px] leading-tight">
                    {selectedClassroomId
                      ? 'Mostrando información restringida al aula seleccionada.'
                      : 'Mostrando todo el colegio consolidado sin restricción de aula.'}
                  </div>
                </>
              )}

              {/* CASO 5: Reporte 0019 (Cumpleaños del Alumno) */}
              {selectedReportCode === '0019' && onSelectMonth && (
                <>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 font-bold text-muted-foreground text-right">Mes:</label>
                    <div className="col-span-8">
                      <select
                        value={selectedMonth}
                        onChange={(e) => onSelectMonth(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value={0}>Todos los Meses (Calendario Anual)</option>
                        <option value={1}>Enero</option>
                        <option value={2}>Febrero</option>
                        <option value={3}>Marzo</option>
                        <option value={4}>Abril</option>
                        <option value={5}>Mayo</option>
                        <option value={6}>Junio</option>
                        <option value={7}>Julio</option>
                        <option value={8}>Agosto</option>
                        <option value={9}>Setiembre</option>
                        <option value={10}>Octubre</option>
                        <option value={11}>Noviembre</option>
                        <option value={12}>Diciembre</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <label className="col-span-4 font-bold text-muted-foreground text-right">Filtrar Salón:</label>
                    <div className="col-span-8">
                      <select
                        value={selectedClassroomId || ''}
                        onChange={(e) => onSelectClassroom(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">Todos los Salones (Colegio Completo)</option>
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.grade}° Grado "{c.section}" — {LEVEL_LABELS[c.educationLevel]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Periodo Bimestral (Solo para reportes con notas y calificaciones) */}
              {['0021', '0048', '0049', '0030'].includes(selectedReportCode) && (
                <div className="grid grid-cols-12 items-center gap-2">
                  <label className="col-span-4 font-bold text-muted-foreground text-right">Periodo:</label>
                  <div className="col-span-8">
                    <select
                      value={selectedPeriod}
                      onChange={(e) => onSelectPeriod(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value={1}>Primer Bimestre</option>
                      <option value={2}>Segundo Bimestre</option>
                      <option value={3}>Tercer Bimestre</option>
                      <option value={4}>Cuarto Bimestre</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Orientación PDF */}
              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 font-bold text-muted-foreground text-right">Orientacion Pdf:</label>
                <div className="col-span-8">
                  <select
                    value={pdfOrientation}
                    onChange={(e) => onSelectPdfOrientation(e.target.value as 'Horizontal' | 'Vertical')}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="Horizontal">Horizontal (Landscape)</option>
                    <option value="Vertical">Vertical (Portrait)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ACCIONES: BOTONES DE GENERACIÓN Y DESCARGA                               */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-border grid grid-cols-2 gap-3">
            {/* Botón Rojo: Generar PDF */}
            <Button
              onClick={onGeneratePdf}
              disabled={isGeneratingPdf || isGeneratingExcel}
              className="w-full bg-[#D9383A] hover:bg-[#C2282A] text-white font-bold text-xs h-10 shadow-sm gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Generar Pdf</span>
                </>
              )}
            </Button>

            {/* Botón Teal/Verde: Generar Excel */}
            <Button
              onClick={onGenerateExcel}
              disabled={isGeneratingPdf || isGeneratingExcel}
              className="w-full bg-[#18A29A] hover:bg-[#138C85] text-white font-bold text-xs h-10 shadow-sm gap-2"
            >
              {isGeneratingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exportando Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Generar Excel</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
