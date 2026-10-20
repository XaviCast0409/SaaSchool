import React from 'react';
import { FamiliesByStateReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';
import { exportFamiliesByStateExcel } from '../../utils/reportExcelExport';

interface FamiliesByStateReportProps {
  data: FamiliesByStateReportData;
}

export const FamiliesByStateReport: React.FC<FamiliesByStateReportProps> = ({ data }) => {
  const { school, filterState, families, totalFamilies, totalStudents } = data;

  const title = 'LISTADO DE FAMILIAS POR ESTADO (0001)';
  const subtitle = `Filtro: ${filterState === 'ALL' ? 'Todos los Estados' : filterState} | ${totalFamilies} Familias`;

  const handleExportExcel = () => {
    exportFamiliesByStateExcel(data);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0001"
        reportTitle={`Listado de Familias por Estado - ${filterState}`}
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
            <span className="text-muted-foreground font-bold">Estado:</span>{' '}
            <span className="font-semibold text-primary">{filterState === 'ALL' ? 'Todos' : filterState}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-bold">Total Familias:</span> {totalFamilies} |{' '}
            <span className="text-muted-foreground font-bold">Total Estudiantes:</span> {totalStudents}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/50 text-[11px]">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th className="border border-foreground/50 p-1.5 w-10 text-center">N°</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Cód. Familia</th>
                <th className="border border-foreground/50 p-1.5 min-w-[180px] text-left">Denominación Familia</th>
                <th className="border border-foreground/50 p-1.5 text-left">Padre</th>
                <th className="border border-foreground/50 p-1.5 text-left">Madre</th>
                <th className="border border-foreground/50 p-1.5 w-24 text-center">Teléfono</th>
                <th className="border border-foreground/50 p-1.5 w-20 text-center">Estado</th>
                <th className="border border-foreground/50 p-1.5 w-14 text-center">Hijos</th>
                <th className="border border-foreground/50 p-1.5 min-w-[200px] text-left">Estudiantes Vinculados</th>
              </tr>
            </thead>
            <tbody>
              {families.map((fam) => (
                <tr key={fam.familyCode} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{fam.index}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold text-[10px] text-primary">
                    {fam.familyCode}
                  </td>
                  <td className="border border-foreground/50 p-1.5 font-bold uppercase text-foreground">
                    {fam.familyName}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-muted-foreground uppercase">{fam.fatherName}</td>
                  <td className="border border-foreground/50 p-1.5 text-muted-foreground uppercase">{fam.motherName}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-[10px] text-muted-foreground">
                    {fam.fatherPhone !== '—' ? fam.fatherPhone : fam.motherPhone !== '—' ? fam.motherPhone : fam.guardianPhone}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-semibold text-[10px] uppercase">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        fam.state === 'REGISTERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {fam.state === 'REGISTERED' ? 'Matriculado' : fam.state}
                    </span>
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-bold text-foreground font-mono">
                    {fam.childrenCount}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-[10px] text-muted-foreground">
                    {fam.childrenSummary || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportFooter reportCode="0001" />
      </div>
    </div>
  );
};
