import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ReportCode, EducationLevel } from '../types';
import {
  useReportCatalogClassrooms,
  useConsolidatedGradesReport,
  useDraftRegisterReport,
  useMeritClassroomReport,
  useMeritGradeReport,
  useConductCommentsReport,
  useClassroomRosterReport,
  useFamiliesByStateReport,
  useFamiliesChildrenReport,
  useFamiliesRelativesReport,
  useStudentBirthdaysReport,
} from '../api/useAcademicReports';
import { AcademicReportsHub, ALL_REPORTS_CATALOG } from '../components/AcademicReportsHub';
import { ConsolidatedGradesReport } from '../components/reports/ConsolidatedGradesReport';
import { DraftRegisterReport } from '../components/reports/DraftRegisterReport';
import { MeritSalondReport } from '../components/reports/MeritSalondReport';
import { MeritGradeReport } from '../components/reports/MeritGradeReport';
import { ConductCommentsReport } from '../components/reports/ConductCommentsReport';
import { ClassroomRosterReport } from '../components/reports/ClassroomRosterReport';
import { FamiliesByStateReport } from '../components/reports/FamiliesByStateReport';
import { FamiliesChildrenReport } from '../components/reports/FamiliesChildrenReport';
import { FamiliesRelativesReport } from '../components/reports/FamiliesRelativesReport';
import { StudentBirthdaysReport } from '../components/reports/StudentBirthdaysReport';
import {
  exportConsolidatedGradesExcel,
  exportMeritClassroomExcel,
  exportMeritGradeExcel,
  exportDraftRegisterExcel,
  exportConductCommentsExcel,
  exportClassroomRosterExcel,
  exportFamiliesByStateExcel,
  exportFamiliesChildrenExcel,
  exportFamiliesRelativesExcel,
  exportStudentBirthdaysExcel,
} from '../utils/reportExcelExport';

export const AcademicReportsPage: React.FC = () => {
  const [selectedReportCode, setSelectedReportCode] = useState<ReportCode>('0021');
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>('SECONDARY');
  const [selectedGrade, setSelectedGrade] = useState<number>(4);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedFamilyState, setSelectedFamilyState] = useState<string>('REGISTERED');
  const [pdfOrientation, setPdfOrientation] = useState<'Horizontal' | 'Vertical'>('Horizontal');

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  // Catálogo de aulas transversales
  const { data: classrooms = [] } = useReportCatalogClassrooms();

  // Inicializar nivel, grado y aula por defecto al cargar las aulas
  useEffect(() => {
    if (classrooms.length > 0 && !selectedClassroomId) {
      const defaultClassroom =
        classrooms.find((c) => c.grade === 4 && c.educationLevel === 'SECONDARY') ||
        classrooms[0];

      setSelectedLevel(defaultClassroom.educationLevel);
      setSelectedGrade(defaultClassroom.grade);
      setSelectedClassroomId(defaultClassroom.id);
    }
  }, [classrooms, selectedClassroomId]);

  // Actualizar orientación según el reporte seleccionado
  useEffect(() => {
    const reportDef = ALL_REPORTS_CATALOG.find((r) => r.code === selectedReportCode);
    if (reportDef) {
      setPdfOrientation(reportDef.defaultOrientation);
    }
  }, [selectedReportCode]);

  // Consultas de datos
  const consolidatedQuery = useConsolidatedGradesReport(
    selectedClassroomId,
    selectedPeriod,
    { enabled: Boolean(selectedClassroomId) },
  );

  const draftRegisterQuery = useDraftRegisterReport(
    selectedClassroomId,
    undefined,
    { enabled: selectedReportCode === '0041' && Boolean(selectedClassroomId) },
  );

  const meritClassroomQuery = useMeritClassroomReport(
    selectedClassroomId,
    selectedPeriod,
    { enabled: selectedReportCode === '0048' && Boolean(selectedClassroomId) },
  );

  const meritGradeQuery = useMeritGradeReport(
    selectedLevel,
    selectedGrade,
    selectedPeriod,
    { enabled: selectedReportCode === '0049' },
  );

  const conductCommentsQuery = useConductCommentsReport(
    selectedClassroomId,
    selectedPeriod,
    { enabled: selectedReportCode === '0030' && Boolean(selectedClassroomId) },
  );

  const classroomRosterQuery = useClassroomRosterReport(
    selectedClassroomId,
    { enabled: selectedReportCode === '0011' && Boolean(selectedClassroomId) },
  );

  const familiesByStateQuery = useFamiliesByStateReport(
    selectedFamilyState,
    undefined,
    { enabled: selectedReportCode === '0001' },
  );

  const familiesChildrenQuery = useFamiliesChildrenReport(
    selectedClassroomId || undefined,
    undefined,
    { enabled: selectedReportCode === '0002' },
  );

  const familiesRelativesQuery = useFamiliesRelativesReport(
    selectedClassroomId || undefined,
    undefined,
    { enabled: selectedReportCode === '0003' },
  );

  const studentBirthdaysQuery = useStudentBirthdaysReport(
    selectedMonth === 0 ? undefined : selectedMonth,
    selectedClassroomId || undefined,
    selectedLevel,
    undefined,
    { enabled: selectedReportCode === '0019' },
  );

  // =========================================================================
  // ACCIÓN: GENERAR EXCEL
  // =========================================================================
  const handleGenerateExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      switch (selectedReportCode) {
        case '0021': {
          const res = await consolidatedQuery.refetch();
          if (res.data) {
            await exportConsolidatedGradesExcel(res.data);
            toast.success('Consolidado de Estudios exportado a Excel.');
          }
          break;
        }
        case '0048': {
          const res = await meritClassroomQuery.refetch();
          if (res.data) {
            await exportMeritClassroomExcel(res.data);
            toast.success('Orden de Mérito por Salón exportado a Excel.');
          }
          break;
        }
        case '0049': {
          const res = await meritGradeQuery.refetch();
          if (res.data) {
            await exportMeritGradeExcel(res.data);
            toast.success('Orden de Mérito por Grado exportado a Excel.');
          }
          break;
        }
        case '0041': {
          const res = await draftRegisterQuery.refetch();
          if (res.data) {
            await exportDraftRegisterExcel(res.data);
            toast.success('Registro Auxiliar Borrador exportado a Excel.');
          }
          break;
        }
        case '0030': {
          const res = await conductCommentsQuery.refetch();
          if (res.data) {
            await exportConductCommentsExcel(res.data);
            toast.success('Comentarios a la Conducta exportados a Excel.');
          }
          break;
        }
        case '0011': {
          const res = await classroomRosterQuery.refetch();
          if (res.data) {
            await exportClassroomRosterExcel(res.data);
            toast.success('Padrón de Alumnos exportado a Excel.');
          }
          break;
        }
        case '0001': {
          const res = await familiesByStateQuery.refetch();
          if (res.data) {
            await exportFamiliesByStateExcel(res.data);
            toast.success('Listado de Familias por Estado exportado a Excel.');
          }
          break;
        }
        case '0002': {
          const res = await familiesChildrenQuery.refetch();
          if (res.data) {
            await exportFamiliesChildrenExcel(res.data);
            toast.success('Listado de Familias e Hijos exportado a Excel.');
          }
          break;
        }
        case '0003': {
          const res = await familiesRelativesQuery.refetch();
          if (res.data) {
            await exportFamiliesRelativesExcel(res.data);
            toast.success('Directorio de Familias y Parientes exportado a Excel.');
          }
          break;
        }
        case '0019': {
          const res = await studentBirthdaysQuery.refetch();
          if (res.data) {
            await exportStudentBirthdaysExcel(res.data);
            toast.success('Cumpleaños de Alumnos exportado a Excel.');
          }
          break;
        }
        default:
          toast.error('Este reporte aún se encuentra en fase de desarrollo.');
      }
    } catch {
      toast.error('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  // =========================================================================
  // ACCIÓN: GENERAR PDF / IMPRESIÓN OFICIAL
  // =========================================================================
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Preparando documento oficial PDF...');

    try {
      // Inyectar regla de orientación en tiempo de ejecución
      const existingStyle = document.getElementById('report-dynamic-print-style');
      if (existingStyle) existingStyle.remove();

      const style = document.createElement('style');
      style.id = 'report-dynamic-print-style';
      const sizeParam = pdfOrientation === 'Horizontal' ? 'A4 landscape' : 'A4 portrait';
      style.innerHTML = `@page { size: ${sizeParam}; margin: 8mm; }`;
      document.head.appendChild(style);

      // Asegurar que la consulta tenga datos actualizados
      if (selectedReportCode === '0021') await consolidatedQuery.refetch();
      else if (selectedReportCode === '0048') await meritClassroomQuery.refetch();
      else if (selectedReportCode === '0049') await meritGradeQuery.refetch();
      else if (selectedReportCode === '0041') await draftRegisterQuery.refetch();
      else if (selectedReportCode === '0030') await conductCommentsQuery.refetch();
      else if (selectedReportCode === '0011') await classroomRosterQuery.refetch();
      else if (selectedReportCode === '0001') await familiesByStateQuery.refetch();
      else if (selectedReportCode === '0002') await familiesChildrenQuery.refetch();
      else if (selectedReportCode === '0003') await familiesRelativesQuery.refetch();
      else if (selectedReportCode === '0019') await studentBirthdaysQuery.refetch();

      // Ajustar temporalmente el título del documento para el nombre del archivo PDF guardado
      const originalTitle = document.title;
      const reportName = ALL_REPORTS_CATALOG.find((r) => r.code === selectedReportCode)?.name || 'Reporte';
      document.title = `${selectedReportCode} - ${reportName} - ${selectedGrade}Grado`;

      toast.dismiss(toastId);
      window.print();

      setTimeout(() => {
        document.title = originalTitle;
      }, 1500);
    } catch {
      toast.dismiss(toastId);
      toast.error('Error al generar el documento para impresión.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div>
      {/* VISTA EN PANTALLA: Centro de Generación y Parámetros */}
      <div className="print:hidden space-y-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Centro de Emisión de Reportes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecciona el reporte del catálogo, configura los parámetros y descárgalo directamente en formato PDF o Excel.
          </p>
        </div>

        <AcademicReportsHub
          selectedReportCode={selectedReportCode}
          onSelectReportCode={(code) => setSelectedReportCode(code)}
          classrooms={classrooms}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          selectedGrade={selectedGrade}
          onSelectGrade={setSelectedGrade}
          selectedClassroomId={selectedClassroomId}
          onSelectClassroom={setSelectedClassroomId}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          selectedState={selectedFamilyState}
          onSelectState={setSelectedFamilyState}
          pdfOrientation={pdfOrientation}
          onSelectPdfOrientation={setPdfOrientation}
          onGeneratePdf={handleGeneratePdf}
          onGenerateExcel={handleGenerateExcel}
          isGeneratingPdf={isGeneratingPdf}
          isGeneratingExcel={isGeneratingExcel}
        />
      </div>

      {/* CONTENEDOR OCULTO EN PANTALLA / ACTIVO SOLO EN IMPRESIÓN OFICIAL (PDF) */}
      <div className="hidden print:block">
        {selectedReportCode === '0021' && consolidatedQuery.data && (
          <ConsolidatedGradesReport data={consolidatedQuery.data} />
        )}
        {selectedReportCode === '0041' && draftRegisterQuery.data && (
          <DraftRegisterReport data={draftRegisterQuery.data} />
        )}
        {selectedReportCode === '0048' && meritClassroomQuery.data && (
          <MeritSalondReport data={meritClassroomQuery.data} />
        )}
        {selectedReportCode === '0049' && meritGradeQuery.data && (
          <MeritGradeReport data={meritGradeQuery.data} />
        )}
        {selectedReportCode === '0030' && conductCommentsQuery.data && (
          <ConductCommentsReport data={conductCommentsQuery.data} />
        )}
        {selectedReportCode === '0011' && classroomRosterQuery.data && (
          <ClassroomRosterReport data={classroomRosterQuery.data} />
        )}
        {selectedReportCode === '0001' && familiesByStateQuery.data && (
          <FamiliesByStateReport data={familiesByStateQuery.data} />
        )}
        {selectedReportCode === '0002' && familiesChildrenQuery.data && (
          <FamiliesChildrenReport data={familiesChildrenQuery.data} />
        )}
        {selectedReportCode === '0003' && familiesRelativesQuery.data && (
          <FamiliesRelativesReport data={familiesRelativesQuery.data} />
        )}
        {selectedReportCode === '0019' && studentBirthdaysQuery.data && (
          <StudentBirthdaysReport data={studentBirthdaysQuery.data} />
        )}
      </div>
    </div>
  );
};

