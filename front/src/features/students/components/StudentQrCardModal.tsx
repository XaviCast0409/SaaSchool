import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  Download,
  School,
  QrCode,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateStudentQrCode, downloadQrPng } from '@/features/attendance/utils/studentQrUtils';

interface StudentQrCardModalProps {
  studentName: string;
  documentId: string;
  studentCode?: string;
  grade: string | number;
  section: string;
  educationLevel: string;
  schoolName?: string;
  onClose: () => void;
}

export const StudentQrCardModal: React.FC<StudentQrCardModalProps> = ({
  studentName,
  documentId,
  studentCode,
  grade,
  section,
  educationLevel,
  schoolName = 'Institución Educativa',
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const qrPayload = (documentId || studentCode || '').trim();

  useEffect(() => {
    let active = true;
    if (qrPayload) {
      generateStudentQrCode(qrPayload, 350).then((url) => {
        if (active) setQrDataUrl(url);
      });
    }
    return () => {
      active = false;
    };
  }, [qrPayload]);

  const handlePrintIndividual = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    downloadQrPng(qrDataUrl, `${studentName}_DNI_${documentId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header no imprimible */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                Credencial Escolar QR
              </h3>
              <p className="text-xs text-muted-foreground">
                Carnet individual para control de asistencia
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

        {/* Contenedor del Carnet */}
        <div className="p-6 flex flex-col items-center justify-center bg-muted/10">
          <div
            id="printable-single-card-wrap"
            className="w-full max-w-sm rounded-2xl border-2 border-slate-800 bg-white text-slate-900 shadow-lg overflow-hidden flex flex-col"
          >
            {/* Cabecera del Carnet */}
            <div className="bg-slate-900 text-white p-3.5 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-300">
                <School className="w-3.5 h-3.5 text-primary" />
                <span>{schoolName}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-white">
                  CARNET DE ASISTENCIA ESCOLAR
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date().getFullYear()}
                </span>
              </div>
            </div>

            {/* Cuerpo del Carnet */}
            <div className="p-4 flex flex-col items-center text-center space-y-3">
              {/* Avatar + Nombres */}
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 text-slate-700 mx-auto flex items-center justify-center shadow-inner">
                  <User className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-slate-900 leading-snug uppercase pt-1">
                  {studentName}
                </h4>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 font-bold">
                  <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-800 border-slate-300 font-bold">
                    {grade}° "{section}"
                  </Badge>
                  <span>•</span>
                  <span className="text-[11px] uppercase tracking-wide">
                    {educationLevel}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-2 rounded-xl border border-slate-300 bg-white shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Código QR de ${studentName}`}
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                    Generando QR...
                  </div>
                )}
              </div>

              {/* DNI al pie */}
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Documento de Identidad (DNI)
                </div>
                <div className="text-base font-black font-mono tracking-widest text-slate-900">
                  {documentId || studentCode || '—'}
                </div>
              </div>

              {/* Micro-leyenda de seguridad */}
              <div className="pt-1 text-[9px] text-slate-500 flex items-center justify-center gap-1 border-t border-slate-200 w-full">
                <ShieldCheck className="w-3 h-3 text-slate-600" />
                <span>Credencial oficial para kiosco y escáner escolar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con Acciones (Oculto en Impresión) */}
        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadImage}
            disabled={!qrDataUrl}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>Descargar PNG</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={handlePrintIndividual}
              className="gap-1.5 text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Carnet</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Reglas de Impresión Aisladas para Carnet Individual */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-single-card-wrap,
          #printable-single-card-wrap * {
            visibility: visible !important;
          }
          #printable-single-card-wrap {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 88mm !important;
            max-width: 88mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 2px solid #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};
