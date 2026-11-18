import React, { useState } from 'react';
import { Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReportActionToolbarProps {
  reportCode: string;
  reportTitle: string;
  orientation?: 'landscape' | 'portrait';
  onPrint?: () => void;
  /** Puede ser asíncrono (el generador de Excel se descarga al exportar) */
  onExportExcel?: () => void | Promise<void>;
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
  const [generating, setGenerating] = useState(false);
  const exportExcel = async () => {
    if (!onExportExcel) return;
    setGenerating(true);
    try {
      await onExportExcel();
    } catch {
      toast.error('No se pudo generar el Excel. Inténtalo de nuevo.');
    } finally {
      setGenerating(false);
    }
  };
  const busy = isExporting || generating;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl shadow-sm mb-4 print:hidden">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="font-mono text-xs px-2.5 py-0.5 font-bold border-primary/30 text-primary bg-primary/5"
        >
          {reportCode}
        </Badge>
        <span className="text-sm font-bold text-foreground truncate max-w-[280px] sm:max-w-md">{reportTitle}</span>
        <Badge variant="secondary" className="text-xs uppercase font-semibold text-muted-foreground">
          {orientation === 'landscape' ? 'Horizontal (A4)' : 'Vertical (A4)'}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {onExportExcel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportExcel()}
            disabled={busy}
            className="gap-1.5 text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{busy ? 'Generando…' : 'Exportar Excel'}</span>
          </Button>
        )}

        {onPrint && (
          <Button variant="default" size="sm" onClick={onPrint} className="gap-1.5 text-xs font-bold shadow-sm">
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </Button>
        )}
      </div>
    </div>
  );
};
