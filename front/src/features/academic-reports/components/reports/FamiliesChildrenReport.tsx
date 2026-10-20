import React from 'react';
import { FamiliesChildrenReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';
import { exportFamiliesChildrenExcel } from '../../utils/reportExcelExport';

interface FamiliesChildrenReportProps {
  data: FamiliesChildrenReportData;
}

export const FamiliesChildrenReport: React.FC<FamiliesChildrenReportProps> = ({ data }) => {
  const { school, families, totalFamilies, totalChildren } = data;

  const title = 'LISTADO DE FAMILIAS E HIJOS (0002)';
  const subtitle = `Total Familias: ${totalFamilies} | Total Hijos Registrados: ${totalChildren}`;

  const handleExportExcel = () => {
    exportFamiliesChildrenExcel(data);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0002"
        reportTitle="Listado de Familias e Hijos"
        orientation="portrait"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm max-w-5xl mx-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader
          school={school}
          title={title}
          subtitle={subtitle}
        />

        <div className="flex items-center justify-between text-xs font-semibold mb-3 border-b border-border pb-2 text-foreground">
          <div>
            <span className="text-muted-foreground font-bold">Relación:</span> Núcleos Familiares e Hijos Matriculados
          </div>
          <div>
            <span className="text-muted-foreground font-bold">Total Familias:</span> {totalFamilies} |{' '}
            <span className="text-muted-foreground font-bold">Total Hijos:</span> {totalChildren}
          </div>
        </div>

        <div className="space-y-4">
          {families.map((fam) => (
            <div key={fam.familyCode} className="border border-foreground/30 rounded-lg overflow-hidden break-inside-avoid">
              {/* Header de la Familia */}
              <div className="bg-muted/70 px-3 py-2 border-b border-foreground/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                    {fam.familyCode}
                  </span>
                  <span className="font-bold uppercase text-foreground">{fam.familyName}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>
                    <strong className="text-foreground">Padre:</strong> {fam.fatherName}
                  </span>
                  <span>
                    <strong className="text-foreground">Madre:</strong> {fam.motherName}
                  </span>
                  <span>
                    <strong className="text-foreground">Teléfono:</strong> {fam.phone}
                  </span>
                  <span className="font-bold text-foreground">
                    ({fam.childrenCount} {fam.childrenCount === 1 ? 'hijo' : 'hijos'})
                  </span>
                </div>
              </div>

              {/* Sub-tabla de Hijos */}
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-muted/30 font-semibold text-muted-foreground text-[10px] uppercase">
                    <th className="p-1.5 w-10 text-center border-b border-foreground/20">N°</th>
                    <th className="p-1.5 w-24 text-center border-b border-foreground/20">Cód. Alumno</th>
                    <th className="p-1.5 w-20 text-center border-b border-foreground/20">DNI</th>
                    <th className="p-1.5 text-left border-b border-foreground/20">Apellidos y Nombres</th>
                    <th className="p-1.5 w-24 text-center border-b border-foreground/20">Nivel</th>
                    <th className="p-1.5 w-32 text-center border-b border-foreground/20">Grado y Sección</th>
                    <th className="p-1.5 w-24 text-center border-b border-foreground/20">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {fam.children.map((child) => (
                    <tr key={child.documentId} className="hover:bg-muted/20 border-b border-border/50 last:border-b-0">
                      <td className="p-1.5 text-center font-mono text-muted-foreground">{child.index}</td>
                      <td className="p-1.5 text-center font-mono text-[10px] text-muted-foreground">
                        {child.studentCode}
                      </td>
                      <td className="p-1.5 text-center font-mono font-medium">{child.documentId}</td>
                      <td className="p-1.5 font-medium uppercase text-foreground">{child.fullName}</td>
                      <td className="p-1.5 text-center text-muted-foreground">{child.level}</td>
                      <td className="p-1.5 text-center font-medium">{child.classroomLabel}</td>
                      <td className="p-1.5 text-center font-semibold text-[10px] uppercase text-emerald-600">
                        {child.enrollmentState === 'REGISTERED' ? 'Matriculado' : child.enrollmentState}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <ReportFooter reportCode="0002" />
      </div>
    </div>
  );
};
