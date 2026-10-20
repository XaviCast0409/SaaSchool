import React from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReportActionToolbarProps {
  reportCode: string;
  reportTitle: string;
  orientation?: 'landscape' | 'portrait';
  onPrint?: () => void;
  onExportExcel?: () => void;
  isExporting?: boolean;
}

export const ReportActionToolbar: React.FC<ReportActionToolbarProps> = ({
  reportCode,
  reportTitle,
  orientation = 'portrait',
  onPrint,
  onExportExcel,
  isExporting = false,
}) => {
  const handleDefaultPrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    const originalTitle = document.title;
    document.title = `${reportCode} - ${reportTitle}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl shadow-sm mb-4 print:hidden">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 font-bold border-primary/30 text-primary bg-primary/5">
          {reportCode}
        </Badge>
        <span className="text-sm font-bold text-foreground truncate max-w-[280px] sm:max-w-md">
          {reportTitle}
        </span>
        <Badge variant="secondary" className="text-[10px] uppercase font-semibold text-muted-foreground">
          {orientation === 'landscape' ? 'Horizontal (A4)' : 'Vertical (A4)'}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {onExportExcel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            disabled={isExporting}
            className="gap-1.5 text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </Button>
        )}

        <Button
          variant="default"
          size="sm"
          onClick={handleDefaultPrint}
          className="gap-1.5 text-xs font-bold shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / PDF</span>
        </Button>
      </div>
    </div>
  );
};
