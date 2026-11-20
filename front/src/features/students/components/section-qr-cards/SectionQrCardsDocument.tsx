import React from 'react';
import { School } from 'lucide-react';
import type { Student } from '../../types';

export interface SectionQrCardsDocumentProps {
  pages: Student[][];
  qrMap: Record<string, string>;
  activeClassroom?: { grade: number; section: string; educationLevel: string };
  schoolName?: string;
  schoolLogoUrl?: string | null;
  isPrint?: boolean;
}

export const SectionQrCardsDocument: React.FC<SectionQrCardsDocumentProps> = ({
  pages,
  qrMap,
  activeClassroom,
  schoolName = 'Institución Educativa',
  schoolLogoUrl,
  isPrint,
}) => {
  return (
    <div className={isPrint ? 'w-[194mm] mx-auto' : 'mx-auto space-y-8'}>
      {pages.map((pageStudents, pageIndex) => (
        <div
          key={`page-${pageIndex}`}
          className={`a4-print-page ${isPrint ? (pageIndex < pages.length - 1 ? 'break-after-page' : '') : 'bg-white p-3 rounded-xl border border-slate-300 shadow-sm'}`}
          style={
            isPrint
              ? {
                  width: '194mm',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 94mm)',
                  gridTemplateRows: 'repeat(4, 63mm)',
                  gap: '5mm',
                  boxSizing: 'border-box',
                }
              : undefined
          }
        >
          {pageStudents.map((student, studentIndex) => {
            const globalIndex = pageIndex * 8 + studentIndex + 1;
            const qrUrl = qrMap[student.id];
            const gradeText = activeClassroom ? `${activeClassroom.grade}° "${activeClassroom.section}"` : '';
            const levelText = activeClassroom?.educationLevel || '';

            return (
              <div
                key={student.id}
                className="qr-card-item rounded-xl border-2 border-dashed border-slate-400 bg-white text-slate-900 p-2.5 flex flex-col justify-between shadow-sm avoid-break"
                style={
                  isPrint
                    ? {
                        width: '94mm',
                        height: '63mm',
                        boxSizing: 'border-box',
                        border: '1.5px dashed #334155',
                      }
                    : undefined
                }
              >
                {/* Cabecera del carnet */}
                <div className="border-b border-slate-300 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-900 tracking-wider truncate max-w-[170px]">
                    {schoolLogoUrl ? (
                      <img src={schoolLogoUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />
                    ) : (
                      <School className="w-3 h-3 text-slate-800 shrink-0" />
                    )}
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
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Estudiante #{globalIndex}</span>
                    <div className="font-black text-[11px] text-slate-900 uppercase leading-snug line-clamp-2">
                      {student.lastNamePaternal} {student.lastNameMaternal || ''}, {student.firstNames}
                    </div>
                    <div className="pt-0.5">
                      <span className="text-[8px] font-semibold text-slate-500 block">DNI / DOC. IDENTIDAD</span>
                      <span className="font-mono font-black text-xs text-slate-900 tracking-wider">
                        {student.documentId || student.studentCode || '—'}
                      </span>
                    </div>
                  </div>

                  {/* QR Image */}
                  <div className="p-1 rounded-lg border border-slate-300 bg-white shrink-0">
                    {qrUrl ? (
                      <img src={qrUrl} alt={`QR ${student.firstNames}`} className="w-16 h-16 object-contain" />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center text-[8px] text-slate-400">QR</div>
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
  );
};
