import React from 'react';
import { StudentBirthdaysReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';
import { exportStudentBirthdaysExcel } from '../../utils/reportExcelExport';

interface StudentBirthdaysReportProps {
  data: StudentBirthdaysReportData;
}

export const StudentBirthdaysReport: React.FC<StudentBirthdaysReportProps> = ({ data }) => {
  const { school, monthName, students, totalStudents } = data;

  const title = 'LISTADO DE CUMPLEAÑOS DEL ALUMNO (0019)';
  const subtitle = `Periodo: ${monthName.toUpperCase()} | Total Cumpleañeros: ${totalStudents}`;

  const handleExportExcel = () => {
    exportStudentBirthdaysExcel(data);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0019"
        reportTitle={`Cumpleaños de Alumnos - ${monthName}`}
        orientation="portrait"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader
          school={school}
          title={title}
          subtitle={subtitle}
        />

        <div className="flex items-center justify-between text-xs font-semibold mb-3 border-b border-border pb-2 text-foreground">
          <div>
            <span className="text-muted-foreground font-bold">Mes:</span>{' '}
            <span className="font-bold text-primary">{monthName}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-bold">Total Cumpleañeros:</span> {totalStudents} alumnos
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/50 text-[11px]">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th className="border border-foreground/50 p-1.5 w-10 text-center">N°</th>
                <th className="border border-foreground/50 p-1.5 w-12 text-center">Día</th>
                <th className="border border-foreground/50 p-1.5 w-20 text-center">Mes</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">F. Nacimiento</th>
                <th className="border border-foreground/50 p-1.5 w-16 text-center">Edad</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Cód. Alumno</th>
                <th className="border border-foreground/50 p-1.5 min-w-[200px] text-left">Apellidos y Nombres</th>
                <th className="border border-foreground/50 p-1.5 w-12 text-center">Sexo</th>
                <th className="border border-foreground/50 p-1.5 w-32 text-center">Aula / Nivel</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{student.index}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-black text-xs text-primary">
                    {student.day}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-medium text-[10px] text-muted-foreground">
                    {student.monthName}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">
                    {student.birthDateFormatted}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-bold text-foreground font-mono">
                    {student.ageTurning !== null ? `${student.ageTurning}a` : '—'}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">
                    {student.studentCode}
                  </td>
                  <td className="border border-foreground/50 p-1.5 font-bold uppercase text-foreground">
                    {student.fullName}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-bold text-muted-foreground">
                    {student.gender}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-medium text-[10px]">
                    {student.classroomLabel} ({student.educationLevel})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportFooter reportCode="0019" />
      </div>
    </div>
  );
};
