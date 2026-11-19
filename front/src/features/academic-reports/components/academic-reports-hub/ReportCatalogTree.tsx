import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ReportCode } from '../../types';
import { ALL_REPORTS_CATALOG, ReportItemDefinition } from '../../constants/reportsCatalog';

interface ReportCatalogTreeProps {
  selectedReportCode: string;
  onSelectReportCode: (code: ReportCode) => void;
}

export const ReportCatalogTree: React.FC<ReportCatalogTreeProps> = ({
  selectedReportCode,
  onSelectReportCode,
}) => {
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    Mantenimiento: false,
    Registro: false,
    Reportes: false,
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredReports = useMemo(() => {
    return ALL_REPORTS_CATALOG.filter((item) => {
      const matchCode = filterCode.trim() === '' || item.code.includes(filterCode.trim());
      const matchName = filterName.trim() === '' || item.name.toLowerCase().includes(filterName.toLowerCase().trim());
      return matchCode && matchName;
    });
  }, [filterCode, filterName]);

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
                  <span>
                    Menú: {category} ({totalInCategory})
                  </span>
                </div>
              </button>

              {/* Subcategorías y Reportes */}
              {!isCollapsed && (
                <div className="space-y-1">
                  {Object.entries(subCategories).map(([subCategory, items]) => (
                    <div key={subCategory} className="pl-4 pr-1 py-1">
                      <div className="flex items-center gap-1.5 py-1 text-xs font-bold text-muted-foreground uppercase tracking-tight">
                        <ChevronDown className="w-3 h-3" />
                        <span>
                          Menú: {subCategory} ({items.length})
                        </span>
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
                              <div className="col-span-3 font-mono text-center text-xs">{report.code}</div>
                              <div className="col-span-9 truncate text-xs">
                                {report.name}
                                {!report.isImplemented && (
                                  <span className="ml-2 text-xs font-mono text-muted-foreground">(Próx.)</span>
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
  );
};
