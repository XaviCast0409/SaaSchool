import React from 'react';
import * as XLSX from 'xlsx';
import { ClassroomRosterReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';

interface ClassroomRosterReportProps {
  data: ClassroomRosterReportData;
}

export const ClassroomRosterReport: React.FC<ClassroomRosterReportProps> = ({ data }) => {
  const { school, classroom, students, totalStudents } = data;

  const title = 'REPORTE DE ALUMNOS POR SALÓN (PADRÓN OFICIAL)';
  const subtitle = `${classroom.grade}° Grado ${classroom.section} - Turno ${classroom.shift}`;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'N°',
      'Cód. Estudiante',
      'DNI / Doc',
      'Apellidos y Nombres',
      'Sexo',
      'F. Nacimiento',
      'Estado',
      'Apoderado',
      'Teléfono',
    ];

    const rows = students.map((s) => [
      s.index,
      s.studentCode,
      s.documentId,
      s.fullName,
      s.gender,
      s.birthDate,
      s.enrollmentState,
      s.guardianName,
      s.guardianPhone,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`${school.name} - ${title}`],
      [`Salón: ${subtitle} | Tutor: ${classroom.tutorTeacher} | Total: ${totalStudents} estudiantes`],
      [],
      headers,
      ...rows,
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Padron_Alumnos');
    XLSX.writeFile(wb, `0011_Padron_${classroom.grade}_${classroom.section}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0011"
        reportTitle={`Padrón de Alumnos - ${classroom.grade}° ${classroom.section}`}
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

        <div className="flex items-center justify-between text-xs font-semibold mb-3 border-b border-border pb-2 text-foreground">
          <div><span className="text-muted-foreground font-bold">Salón:</span> {classroom.grade}° Grado {classroom.section}</div>
          <div><span className="text-muted-foreground font-bold">Total Matriculados:</span> {totalStudents} alumnos</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/50 text-[11px]">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th className="border border-foreground/50 p-1.5 w-10 text-center">N°</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Cód. SIAGIE</th>
                <th className="border border-foreground/50 p-1.5 w-20 text-center">DNI</th>
                <th className="border border-foreground/50 p-1.5 min-w-[200px] text-left">Apellidos y Nombres</th>
                <th className="border border-foreground/50 p-1.5 w-12 text-center">Sexo</th>
                <th className="border border-foreground/50 p-1.5 w-20 text-center">F. Nac.</th>
                <th className="border border-foreground/50 p-1.5 w-20 text-center">Estado</th>
                <th className="border border-foreground/50 p-1.5 text-left">Apoderado</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.enrollmentId} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{student.index}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">{student.studentCode}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-medium">{student.documentId}</td>
                  <td className="border border-foreground/50 p-1.5 font-medium uppercase">{student.fullName}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-bold text-muted-foreground">{student.gender}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">{student.birthDate}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-semibold text-[10px] uppercase">
                    {student.enrollmentState === 'REGISTERED' ? 'Matriculado' : student.enrollmentState}
                  </td>
                  <td className="border border-foreground/50 p-1.5 uppercase text-muted-foreground">{student.guardianName}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-muted-foreground">{student.guardianPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportFooter reportCode="0011" />
      </div>
    </div>
  );
};
