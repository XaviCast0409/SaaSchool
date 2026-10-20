import React from 'react';
import * as XLSX from 'xlsx';
import { ConductCommentsReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';

interface ConductCommentsReportProps {
  data: ConductCommentsReportData;
}

export const ConductCommentsReport: React.FC<ConductCommentsReportProps> = ({ data }) => {
  const { school, classroom, periodNumber, students } = data;

  const title = 'LISTADO DE COMENTARIOS A LA CONDUCTA';
  const subtitle = `${classroom.grade}° Grado ${classroom.section} - ${periodNumber}° Bimestre`;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['N°', 'DNI / Doc', 'Apellidos y Nombres', 'Nota Conducta', 'Observaciones / Apreciaciones'];
    const rows = students.map((s) => [s.index, s.documentId, s.fullName, s.conductScore, s.comments]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`${school.name} - ${title}`],
      [`Salón: ${subtitle} | Tutor: ${classroom.tutorTeacher}`],
      [],
      headers,
      ...rows,
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Conducta');
    XLSX.writeFile(wb, `0030_Conducta_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0030"
        reportTitle={`Comentarios a la Conducta - ${classroom.grade}° ${classroom.section}`}
        orientation="portrait"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader
          school={school}
          title={title}
          subtitle={subtitle}
          tutorTeacher={classroom.tutorTeacher}
        />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/50 text-[11px]">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th className="border border-foreground/50 p-1.5 w-10 text-center">N°</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">DNI / Doc</th>
                <th className="border border-foreground/50 p-1.5 min-w-[200px] text-left">Apellidos y Nombres</th>
                <th className="border border-foreground/50 p-1.5 w-16 text-center">Conducta</th>
                <th className="border border-foreground/50 p-1.5 text-left">Comentarios y Apreciaciones del Tutor</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.enrollmentId} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{student.index}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-muted-foreground">{student.documentId}</td>
                  <td className="border border-foreground/50 p-1.5 font-medium uppercase">{student.fullName}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold text-foreground">{student.conductScore}</td>
                  <td className="border border-foreground/50 p-1.5 text-muted-foreground leading-snug">{student.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportFooter reportCode="0030" />
      </div>
    </div>
  );
};
