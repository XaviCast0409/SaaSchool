import React from 'react';
import { FamiliesRelativesReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';
import { exportFamiliesRelativesExcel } from '../../utils/reportExcelExport';

interface FamiliesRelativesReportProps {
  data: FamiliesRelativesReportData;
}

export const FamiliesRelativesReport: React.FC<FamiliesRelativesReportProps> = ({ data }) => {
  const { school, records, totalRecords } = data;

  const title = 'LISTADO DE FAMILIAS Y PARIENTES (0003)';
  const subtitle = `Directorio Institucional de Apoderados y Contactos de Emergencia (${totalRecords} Estudiantes)`;

  const handleExportExcel = () => {
    exportFamiliesRelativesExcel(data);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0003"
        reportTitle="Directorio de Familias y Parientes"
        orientation="landscape"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm max-w-6xl mx-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader
          school={school}
          title={title}
          subtitle={subtitle}
        />

        <div className="flex items-center justify-between text-xs font-semibold mb-3 border-b border-border pb-2 text-foreground">
          <div>
            <span className="text-muted-foreground font-bold">Directorio:</span> Contactos Institucionales y Familiares
          </div>
          <div>
            <span className="text-muted-foreground font-bold">Total Estudiantes:</span> {totalRecords}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/50 text-[11px]">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th className="border border-foreground/50 p-1.5 w-10 text-center">N°</th>
                <th className="border border-foreground/50 p-1.5 w-20 text-center">Cód. Alumno</th>
                <th className="border border-foreground/50 p-1.5 w-20 text-center">DNI</th>
                <th className="border border-foreground/50 p-1.5 min-w-[180px] text-left">Estudiante</th>
                <th className="border border-foreground/50 p-1.5 w-28 text-center">Aula</th>
                <th className="border border-foreground/50 p-1.5 text-left">Padre</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Tel. Padre</th>
                <th className="border border-foreground/50 p-1.5 text-left">Madre</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Tel. Madre</th>
                <th className="border border-foreground/50 p-1.5 text-left">Apoderado</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Tel. Apod.</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.student.id} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{rec.index}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">
                    {rec.student.studentCode}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-medium">
                    {rec.student.documentId}
                  </td>
                  <td className="border border-foreground/50 p-1.5 font-bold uppercase text-foreground">
                    {rec.student.fullName}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-medium text-[10px]">
                    {rec.student.classroomLabel}
                  </td>
                  <td className="border border-foreground/50 p-1.5 uppercase text-muted-foreground text-[10px]">
                    {rec.father.fullName}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">
                    {rec.father.phone}
                  </td>
                  <td className="border border-foreground/50 p-1.5 uppercase text-muted-foreground text-[10px]">
                    {rec.mother.fullName}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">
                    {rec.mother.phone}
                  </td>
                  <td className="border border-foreground/50 p-1.5 uppercase font-medium text-foreground text-[10px]">
                    {rec.guardian.fullName}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] font-bold text-primary">
                    {rec.guardian.phone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportFooter reportCode="0003" />
      </div>
    </div>
  );
};
