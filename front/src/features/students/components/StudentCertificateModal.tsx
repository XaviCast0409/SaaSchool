import React, { useState } from 'react';
import {
  X,
  Printer,
  FileCheck2,
  FileBadge,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEnrollmentCertificate,
  useNoDebtCertificate,
} from '../api/useStudents';
import { PrintPortal, usePrint } from '@/lib/print';

interface StudentCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName?: string;
}

interface CertificateData {
  school: {
    name: string;
    modularCode?: string;
    documentId: string;
    address?: string;
  };
  certificateNumber: string;
  student: {
    fullName: string;
    documentType: string;
    documentId: string;
    studentCode?: string;
  };
  enrollment?: {
    academicYear: number;
    grade: number;
    educationLevel: string;
    section: string;
    shift: string;
  };
  academicYear?: number;
  issueDate: string;
}

export const StudentCertificateDocument: React.FC<{
  tab: 'ENROLLMENT' | 'NO_DEBT';
  cert: CertificateData;
  isPrint?: boolean;
}> = ({ tab, cert, isPrint }) => {
  return (
    <div
      className={
        isPrint
          ? 'bg-white text-black max-w-2xl mx-auto p-8 space-y-8 min-h-[500px] flex flex-col justify-between'
          : 'bg-white text-black max-w-2xl mx-auto p-8 sm:p-12 rounded-2xl border border-border/80 shadow-md space-y-8 min-h-[500px] flex flex-col justify-between'
      }
    >
      {/* Membrete Institucional */}
      <div className="border-b-2 border-black pb-4 text-center space-y-1">
        <div className="flex items-center justify-between text-[11px] text-gray-600 font-mono">
          <span>REPÚBLICA DEL PERÚ</span>
          <span>MINISTERIO DE EDUCACIÓN</span>
        </div>
        <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-black pt-1">
          {cert.school.name}
        </h1>
        <p className="text-xs text-gray-700">
          {cert.school.modularCode
            ? `Código Modular: ${cert.school.modularCode} • `
            : ''}
          RUC: {cert.school.documentId}
        </p>
        {cert.school.address && (
          <p className="text-[11px] text-gray-500">{cert.school.address}</p>
        )}
      </div>

      {/* Título de la Constancia */}
      <div className="text-center space-y-2">
        <h2 className="text-base sm:text-lg font-black uppercase underline tracking-wider">
          {tab === 'ENROLLMENT' ? 'CONSTANCIA DE MATRÍCULA' : 'CONSTANCIA DE NO ADEUDO'}
        </h2>
        <Badge
          variant="outline"
          className="font-mono text-[11px] text-gray-700 border-gray-400"
        >
          {cert.certificateNumber}
        </Badge>
      </div>

      {/* Cuerpo del Documento */}
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-justify text-gray-900">
        <p className="font-semibold">
          {tab === 'ENROLLMENT'
            ? 'La Dirección de la Institución Educativa que suscribe HACE CONSTAR:'
            : 'La Oficina de Administración y Tesorería de la Institución Educativa HACE CONSTAR:'}
        </p>

        {tab === 'ENROLLMENT' ? (
          <p>
            Que, el/la estudiante{' '}
            <strong className="uppercase font-black text-black">
              {cert.student.fullName}
            </strong>
            , identificado(a) con {cert.student.documentType} N°{' '}
            <strong>{cert.student.documentId}</strong>
            {cert.student.studentCode
              ? ` y Código de Estudiante N° ${cert.student.studentCode}`
              : ''}
            , se encuentra debidamente <strong>MATRICULADO(A)</strong> en el Año Lectivo{' '}
            <strong>{cert.enrollment?.academicYear}</strong>, cursando el{' '}
            <strong>{cert.enrollment?.grade}° Grado</strong> del Nivel{' '}
            <strong>{cert.enrollment?.educationLevel}</strong>, Sección "
            <strong>{cert.enrollment?.section}</strong>", Turno{' '}
            <strong>{cert.enrollment?.shift}</strong>.
          </p>
        ) : (
          <p>
            Que, el/la estudiante{' '}
            <strong className="uppercase font-black text-black">
              {cert.student.fullName}
            </strong>
            , identificado(a) con {cert.student.documentType} N°{' '}
            <strong>{cert.student.documentId}</strong>
            {cert.student.studentCode
              ? ` y Código de Estudiante N° ${cert.student.studentCode}`
              : ''}
            , se encuentra <strong>SIN DEUDA PENDIENTE</strong> y al día en el cumplimiento de
            sus obligaciones económicas, pensiones y conceptos educativos correspondientes al Año Lectivo{' '}
            <strong>{cert.academicYear}</strong>.
          </p>
        )}

        <p>
          Se expide la presente constancia a solicitud de la parte interesada para los fines
          legales y administrativos que estime conveniente.
        </p>
      </div>

      {/* Fecha y Pie de Firma */}
      <div className="space-y-12 pt-6">
        <div className="text-right text-xs text-gray-800">
          <span>{cert.school.address?.split(',')[0] || 'Lima'}, </span>
          <span className="font-medium">{cert.issueDate}</span>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center pt-8">
          <div className="border-t border-gray-400 pt-2 space-y-0.5">
            <p className="text-xs font-bold text-gray-800">Mesa de Partes / Secretaría</p>
            <p className="text-[10px] text-gray-500">Recepción Documentaria</p>
          </div>
          <div className="border-t border-gray-400 pt-2 space-y-0.5">
            <p className="text-xs font-bold text-gray-800">
              {tab === 'ENROLLMENT' ? 'Dirección General' : 'Administración / Tesorería'}
            </p>
            <p className="text-[10px] text-gray-500">Firma y Sello Oficial</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudentCertificateModal: React.FC<StudentCertificateModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
}) => {
  const [tab, setTab] = useState<'ENROLLMENT' | 'NO_DEBT'>('ENROLLMENT');

  const {
    data: enrollmentCert,
    isLoading: loadingEnrollment,
    isError: errorEnrollment,
  } = useEnrollmentCertificate(studentId || undefined, isOpen && tab === 'ENROLLMENT');

  const {
    data: noDebtCert,
    isLoading: loadingNoDebt,
    isError: errorNoDebt,
    error: noDebtErrorObj,
  } = useNoDebtCertificate(studentId || undefined, isOpen && tab === 'NO_DEBT');

  const currentCert = tab === 'ENROLLMENT' ? enrollmentCert : noDebtCert;
  const isLoading = tab === 'ENROLLMENT' ? loadingEnrollment : loadingNoDebt;
  const isError = tab === 'ENROLLMENT' ? errorEnrollment : errorNoDebt;
  const noDebtErrorMessage =
    (noDebtErrorObj as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    'No se puede emitir la Constancia de No Adeudo debido a obligaciones pendientes de pago.';

  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    margin: '10mm',
    title: `${tab === 'ENROLLMENT' ? 'Constancia_Matricula' : 'Constancia_No_Adeudo'}_${(studentName || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
  });

  if (!isOpen || !studentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header no imprimible */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Emisión de Constancias Oficiales
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-sm">
                {studentName || 'Estudiante'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={print}
              disabled={isPrinting || isLoading || isError || !currentCert}
              className="gap-1.5 text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-8 w-8 hover:bg-muted"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Selector de Pestañas no imprimible */}
        <div className="p-3 border-b border-border bg-card flex items-center gap-2">
          <button
            onClick={() => setTab('ENROLLMENT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              tab === 'ENROLLMENT'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            <FileBadge className="w-3.5 h-3.5" />
            <span>Constancia de Matrícula</span>
          </button>
          <button
            onClick={() => setTab('NO_DEBT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              tab === 'NO_DEBT'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Constancia de No Adeudo</span>
          </button>
        </div>

        {/* Contenido / Hoja de Constancia */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-muted/10">
          {isLoading ? (
            <div className="space-y-4 max-w-xl mx-auto p-8 bg-card rounded-2xl border border-border">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-12 w-1/2 mx-auto rounded-xl" />
            </div>
          ) : isError ? (
            <div className="p-8 sm:p-12 text-center bg-card border-2 border-dashed border-destructive/30 rounded-2xl space-y-3 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-foreground">
                No se pudo emitir la constancia
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tab === 'NO_DEBT'
                  ? noDebtErrorMessage
                  : 'El estudiante no cuenta con una matrícula activa registrada en el año escolar actual.'}
              </p>
            </div>
          ) : currentCert ? (
            <StudentCertificateDocument tab={tab} cert={currentCert} />
          ) : null}
        </div>

        {/* Footer no imprimible */}
        <div className="flex justify-end p-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose} className="text-xs font-bold">
            Cerrar
          </Button>
        </div>
      </div>

      {isPrinting && currentCert && (
        <PrintPortal>
          <StudentCertificateDocument tab={tab} cert={currentCert} isPrint />
        </PrintPortal>
      )}
    </div>
  );
};
