import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Award,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { ReportCode } from '../types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface ReportMenuItem {
  code: ReportCode;
  title: string;
  category: 'grades' | 'conduct' | 'general';
  icon: React.ComponentType<{ className?: string }>;
}

const REPORT_MENU: ReportMenuItem[] = [
  // Menú: Notas
  { code: '0021', title: 'Consolidado de Estudios', category: 'grades', icon: FileSpreadsheet },
  { code: '0041', title: 'Registro Auxiliar Borrador', category: 'grades', icon: FileText },
  { code: '0048', title: 'Orden de mérito y tercios por salón', category: 'grades', icon: Award },
  { code: '0049', title: 'Orden de mérito y tercios por grado', category: 'grades', icon: Award },

  // Menú: Conducta (1)
  { code: '0030', title: 'Listado de los comentarios a la conducta', category: 'conduct', icon: UserCheck },

  // Menú: Reportes y Mantenimiento
  { code: '0011', title: 'Reporte de Alumnos por Salón', category: 'general', icon: Users },
  { code: '0001', title: 'Listado de Familias por Estado', category: 'general', icon: Users },
  { code: '0002', title: 'Listado de Familias e Hijos', category: 'general', icon: Users },
  { code: '0003', title: 'Listado de Familias y Parientes', category: 'general', icon: Users },
  { code: '0019', title: 'Listado de Cumpleaños del Alumno', category: 'general', icon: Users },
];

interface AcademicReportsSidebarProps {
  selectedReport: ReportCode;
  onSelectReport: (code: ReportCode) => void;
}

export const AcademicReportsSidebar: React.FC<AcademicReportsSidebarProps> = ({
  selectedReport,
  onSelectReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    grades: true,
    conduct: true,
    general: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return REPORT_MENU;
    const q = searchTerm.toLowerCase();
    return REPORT_MENU.filter(
      (item) => item.code.includes(q) || item.title.toLowerCase().includes(q),
    );
  }, [searchTerm]);

  const gradesReports = filteredItems.filter((i) => i.category === 'grades');
  const conductReports = filteredItems.filter((i) => i.category === 'conduct');
  const generalReports = filteredItems.filter((i) => i.category === 'general');

  return (
    <div className="w-full lg:w-80 flex-shrink-0 bg-card border border-border rounded-2xl shadow-sm flex flex-col h-[calc(100vh-140px)] sticky top-20 print:hidden overflow-hidden">
      {/* Header del Sidebar */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Centro de Reportes
            </h3>
            <p className="text-[11px] text-muted-foreground">Emisión y Actas Oficiales</p>
          </div>
        </div>

        {/* Buscador de Reportes */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Árbol de Reportes en Estructura Acordeón */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Sección: Notas */}
        {gradesReports.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('grades')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {openSections.grades ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span>Menú: Notas ({gradesReports.length})</span>
              </div>
            </button>

            {openSections.grades && (
              <div className="ml-3 pl-2 border-l border-border/80 space-y-0.5 mt-0.5">
                {gradesReports.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => onSelectReport(item.code)}
                    className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                      selectedReport === item.code
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                        selectedReport === item.code
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground font-semibold'
                      }`}
                    >
                      {item.code}
                    </span>
                    <span className="truncate flex-1">{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sección: Conducta */}
        {conductReports.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => toggleSection('conduct')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {openSections.conduct ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span>Menú: Conducta ({conductReports.length})</span>
              </div>
            </button>

            {openSections.conduct && (
              <div className="ml-3 pl-2 border-l border-border/80 space-y-0.5 mt-0.5">
                {conductReports.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => onSelectReport(item.code)}
                    className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                      selectedReport === item.code
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                        selectedReport === item.code
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground font-semibold'
                      }`}
                    >
                      {item.code}
                    </span>
                    <span className="truncate flex-1">{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sección: Reportes Generales */}
        {generalReports.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => toggleSection('general')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {openSections.general ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span>Menú: Generación de Reportes ({generalReports.length})</span>
              </div>
            </button>

            {openSections.general && (
              <div className="ml-3 pl-2 border-l border-border/80 space-y-0.5 mt-0.5">
                {generalReports.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => onSelectReport(item.code)}
                    className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                      selectedReport === item.code
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                        selectedReport === item.code
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground font-semibold'
                      }`}
                    >
                      {item.code}
                    </span>
                    <span className="truncate flex-1">{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer del Sidebar */}
      <div className="p-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Plan PRO Activo</span>
        <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
          PRO
        </Badge>
      </div>
    </div>
  );
};
