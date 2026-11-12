import React, { useState } from 'react';
import {
  X,
  Printer,
  GraduationCap,
  Users,
  MapPin,
  ShieldCheck,
  CreditCard,
  Home,
  BookOpen,
  Download,
  Loader2,
  UserCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStudent } from '../api/useStudents';
import { usePickups, useCreatePickup, useDeactivatePickup } from '@/features/attendance/api/usePickups';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import { useResolvedFileUrl } from '@/features/course-contents/api/useResolvedFileUrl';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { AuthorizedPickup } from '@/features/attendance/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { PrintPortal, usePrint } from '@/lib/print';

interface StudentFichaModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const CONDITION_LABELS: Record<string, string> = {
  INGRESANTE: 'Ingresante (Primera Matrícula)',
  CONTINUO: 'Continuo / Promovido',
  TRASLADO: 'Traslado de otra I.E.',
  REENTRANTE: 'Reentrante al sistema',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  TUTOR_LEGAL: 'Tutor / Apoderado Legal',
  GRANDPARENT: 'Abuelo/a',
  UNCLE_AUNT: 'Tío/a',
  OTHER: 'Apoderado',
};

const PickupCard: React.FC<{
  pickup: AuthorizedPickup;
  canManage: boolean;
  onRemove: (pickup: AuthorizedPickup) => void;
}> = ({ pickup, canManage, onRemove }) => {
  const { data: resolvedPhoto } = useResolvedFileUrl(pickup.photoFileUrl);

  return (
    <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {resolvedPhoto ? (
          <img
            src={resolvedPhoto}
            alt={pickup.fullName}
            className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center shrink-0 border border-border">
            {pickup.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 text-[11px] space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground truncate">{pickup.fullName}</span>
            <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
              {pickup.relationship}
            </Badge>
          </div>
          <div className="text-muted-foreground">
            {pickup.documentType}: <strong className="text-foreground">{pickup.documentId}</strong>
            {pickup.cellphone && (
              <span className="ml-2">
                · Cel: <strong className="text-foreground">{pickup.cellphone}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(pickup)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
          title="Retirar persona autorizada"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

export const StudentFichaDocument: React.FC<{
  student: NonNullable<ReturnType<typeof useStudent>['data']>;
  pickups: AuthorizedPickup[];
  canManagePickups?: boolean;
  onAddPickup?: () => void;
  onRemovePickup?: (pickup: AuthorizedPickup) => void;
  isPrint?: boolean;
}> = ({
  student,
  pickups,
  canManagePickups = false,
  onAddPickup,
  onRemovePickup,
  isPrint = false,
}) => {
  return (
    <div className={isPrint ? 'space-y-6 text-xs text-black bg-white p-6 max-w-4xl mx-auto' : 'space-y-6 text-xs text-foreground'}>
      {/* Encabezado Ficha para Impresión */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 avoid-break">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Estudiante Registrado
          </span>
          <h3 className="text-lg font-bold text-foreground">
            {student.lastNamePaternal} {student.lastNameMaternal || ''}, {student.firstNames}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-muted-foreground">
            <span>
              {student.documentType}: <strong className="text-foreground">{student.documentId}</strong>
            </span>
            <span>·</span>
            <span>
              Código SIAGIE: <strong className="text-foreground font-mono">{student.studentCode || 'No asignado'}</strong>
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0 font-semibold px-3 py-1">
          {student.gender === 'MALE' ? 'Género: Masculino' : 'Género: Femenino'}
        </Badge>
      </div>

      {/* SECCIÓN 1: DATOS DE IDENTIFICACIÓN Y DEMOGRAFÍA */}
      <div className="space-y-3 avoid-break">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-1">
          <MapPin className="w-4 h-4 text-primary" />
          1. Datos de Identificación, Nacimiento y Residencia
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-card">
          <div>
            <span className="text-muted-foreground block text-[11px]">Primer Apellido (Paterno)</span>
            <span className="font-semibold">{student.lastNamePaternal}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Segundo Apellido (Materno)</span>
            <span className="font-semibold">{student.lastNameMaternal || '(No registrado)'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Nombres Completos</span>
            <span className="font-semibold">{student.firstNames}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Fecha de Nacimiento</span>
            <span className="font-semibold">
              {student.birthDate ? formatPeruShortDate(student.birthDate) : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">País de Nacimiento</span>
            <span className="font-semibold">{student.birthCountry || 'PERÚ'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Ubigeo Nacimiento (INEI)</span>
            <span className="font-mono font-semibold">
              {student.birthUbigeo || (student.birthDepartment ? `${student.birthDepartment} / ${student.birthProvince || ''}` : 'No especificado')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Ubigeo Residencia (INEI)</span>
            <span className="font-mono font-semibold">{student.residenceUbigeo || 'No especificado'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Lengua Materna</span>
            <span className="font-semibold">{student.motherTongue || 'CASTELLANO'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Condición NEE / Salud</span>
            <span className="font-semibold">
              {student.hasDisability ? `Sí (${student.disabilityType || 'NEE'})` : 'Sin discapacidad'}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <span className="text-muted-foreground block text-[11px]">Dirección de Residencia</span>
            <span className="font-semibold">{student.address || 'No registrada'}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: HISTORIAL DE MATRÍCULAS */}
      <div className="space-y-3 avoid-break">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-1">
          <BookOpen className="w-4 h-4 text-primary" />
          2. Historial de Matrícula Escolar
        </h4>
        {student.enrollments && student.enrollments.length > 0 ? (
          <div className="space-y-2">
            {student.enrollments.map((enr) => (
              <div
                key={enr.id}
                className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-primary">
                      {enr.academicYear?.name || `Año ${enr.academicYear?.year || ''}`}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {CONDITION_LABELS[enr.condition || 'CONTINUO'] || enr.condition}
                    </Badge>
                    {enr.repeatingGrade && (
                      <Badge variant="destructive" className="text-[10px]">
                        Repitente
                      </Badge>
                    )}
                    {(enr as any).customPensionAmount && (
                      <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        Pensión Especial: S/ {Number((enr as any).customPensionAmount).toFixed(2)} ({(enr as any).discountReason || 'Beca'})
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11px]">
                    Aula:{' '}
                    <strong className="text-foreground">
                      {enr.classroom?.grade}° "{enr.classroom?.section}" - {enr.classroom?.educationLevel} ({enr.classroom?.shift === 'MORNING' ? 'Mañana' : 'Tarde'})
                    </strong>
                    {enr.previousSchoolModularCode && (
                      <span className="ml-2">
                        · Cód. Modular Origen: <strong className="text-foreground font-mono">{enr.previousSchoolModularCode}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  Fecha: {formatPeruShortDate(enr.enrollmentDate)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground">
            No hay matrículas registradas para este estudiante.
          </div>
        )}
      </div>

      {/* SECCIÓN 3: APODERADOS Y FAMILIA */}
      <div className="space-y-3 avoid-break">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-1">
          <Users className="w-4 h-4 text-primary" />
          3. Apoderados y Familiares Vinculados
        </h4>
        {student.familyRelations && student.familyRelations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {student.familyRelations.map((rel) => (
              <div
                key={rel.id}
                className="p-3 rounded-lg border border-border bg-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">
                    {rel.user?.firstName} {rel.user?.lastNamePaternal} {rel.user?.lastNameMaternal || ''}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {RELATIONSHIP_LABELS[rel.relationshipType] || rel.relationshipType}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-[11px] space-y-0.5">
                  <div>Doc: <strong className="text-foreground">{rel.user?.documentType || 'DNI'}: {rel.user?.documentId || 'S/N'}</strong></div>
                  <div>Email: <strong className="text-foreground">{rel.user?.email || '(Sin correo registrado)'}</strong></div>
                  <div>Celular: <strong className="text-foreground">{rel.user?.cellphone || 'No registrado'}</strong></div>
                  <div>Grado de Instrucción: <strong className="text-foreground">{rel.user?.educationLevel || 'No especificado'}</strong></div>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {rel.isLegalGuardian && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Apoderado Legal
                    </span>
                  )}
                  {rel.isFinancialResponsible && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                      <CreditCard className="w-2.5 h-2.5" />
                      Resp. Pago
                    </span>
                  )}
                  {rel.livesWithStudent && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      <Home className="w-2.5 h-2.5" />
                      Convive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground">
            No hay apoderados registrados vinculados a este estudiante.
          </div>
        )}
      </div>

      {/* SECCIÓN 4: PERSONAS AUTORIZADAS A RECOGER */}
      <div className="space-y-3 avoid-break">
        <div className="flex items-center justify-between border-b border-border pb-1">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            4. Personas Autorizadas a Recoger
          </h4>
          {canManagePickups && !isPrint && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddPickup}
              className="h-7 text-xs font-bold gap-1 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </Button>
          )}
        </div>

        {pickups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pickups.map((p) => (
              <PickupCard
                key={p.id}
                pickup={p}
                canManage={canManagePickups && !isPrint}
                onRemove={(pickup) => onRemovePickup?.(pickup)}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs">
            No hay personas autorizadas adicionales registradas para recoger al estudiante.
          </div>
        )}
      </div>

      {/* Pie de Ficha / Firma para impresión */}
      <div className={isPrint ? 'grid grid-cols-2 gap-8 pt-12 mt-12 border-t border-border text-center avoid-break' : 'hidden'}>
        <div>
          <div className="border-t border-foreground w-48 mx-auto mb-1"></div>
          <span className="text-[11px] font-semibold">Firma del Apoderado Legal</span>
        </div>
        <div>
          <div className="border-t border-foreground w-48 mx-auto mb-1"></div>
          <span className="text-[11px] font-semibold">Firma y Sello de Dirección / Secretaría</span>
        </div>
      </div>
    </div>
  );
};

export const StudentFichaModal: React.FC<StudentFichaModalProps> = ({
  studentId,
  isOpen,
  onClose,
}) => {
  const user = useAuthStore((state) => state.user);
  const canExportArco = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';
  const canManagePickups =
    user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'ADMINISTRATIVE';
  const { data: student, isLoading } = useStudent(studentId || undefined);
  const [isExporting, setIsExporting] = useState(false);

  // Pickups
  const { data: pickups = [] } = usePickups(studentId);
  const { mutateAsync: createPickup, isPending: isCreatingPickup } = useCreatePickup();
  const { mutateAsync: deactivatePickup } = useDeactivatePickup();
  const { mutateAsync: uploadFile } = useUploadMaterial();

  const [isAddPickupOpen, setIsAddPickupOpen] = useState(false);
  const [deletingPickup, setDeletingPickup] = useState<AuthorizedPickup | null>(null);

  const [pickupName, setPickupName] = useState('');
  const [pickupDocType, setPickupDocType] = useState('DNI');
  const [pickupDocId, setPickupDocId] = useState('');
  const [pickupRelationship, setPickupRelationship] = useState('');
  const [pickupCellphone, setPickupCellphone] = useState('');
  const [pickupPhotoFile, setPickupPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    margin: '10mm',
    title: `Ficha_Matricula_${student?.studentCode || student?.documentId || 'Alumno'}`,
  });

  if (!isOpen || !studentId) return null;

  const handleExportArco = async () => {
    if (!studentId) return;
    setIsExporting(true);
    try {
      const response = await api.get(`/students/${studentId}/data-export`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datos-alumno-${studentId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Datos del estudiante exportados correctamente (ARCO).');
    } catch {
      toast.error('Error al exportar los datos del estudiante.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSavePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !pickupName.trim() || !pickupDocId.trim() || !pickupRelationship.trim()) {
      toast.error('Completa los campos obligatorios.');
      return;
    }

    try {
      let photoUrl: string | null = null;
      if (pickupPhotoFile) {
        setIsUploadingPhoto(true);
        const res = await uploadFile(pickupPhotoFile);
        photoUrl = res.url;
        setIsUploadingPhoto(false);
      }

      await createPickup({
        studentId,
        fullName: pickupName.trim(),
        documentType: pickupDocType,
        documentId: pickupDocId.trim(),
        relationship: pickupRelationship.trim(),
        cellphone: pickupCellphone.trim() || null,
        photoFileUrl: photoUrl,
      });

      setIsAddPickupOpen(false);
      setPickupName('');
      setPickupDocId('');
      setPickupRelationship('');
      setPickupCellphone('');
      setPickupPhotoFile(null);
    } catch {
      setIsUploadingPhoto(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deletingPickup || !studentId) return;
    await deactivatePickup({ id: deletingPickup.id, studentId });
    setDeletingPickup(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6">
        {/* Header no imprimible */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Ficha Única de Matrícula SIAGIE (FUM)
              </h2>
              <p className="text-xs text-muted-foreground">
                Estándar MINEDU Perú · Datos de Identificación, Historial y Familia
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canExportArco && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportArco}
                disabled={isExporting}
                className="gap-1.5 text-xs shadow-sm"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-primary" />
                )}
                <span>Exportar datos (ARCO)</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={print}
              disabled={isPrinting || isLoading || !student}
              className="gap-1.5 text-xs shadow-sm"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>Imprimir Ficha</span>
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !student ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No se pudo cargar la información del estudiante.
          </div>
        ) : (
          <StudentFichaDocument
            student={student}
            pickups={pickups}
            canManagePickups={canManagePickups}
            onAddPickup={() => setIsAddPickupOpen(true)}
            onRemovePickup={(pickup) => setDeletingPickup(pickup)}
          />
        )}
      </div>

      {isPrinting && student && (
        <PrintPortal>
          <StudentFichaDocument student={student} pickups={pickups} isPrint />
        </PrintPortal>
      )}

      {/* Modal: Agregar Persona Autorizada */}
      {isAddPickupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">
                Nueva Persona Autorizada a Recoger
              </h3>
              <button
                onClick={() => setIsAddPickupOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePickup} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Nombre completo <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                  placeholder="Ej. María Elena Paredes López"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Tipo de Doc. <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={pickupDocType}
                    onChange={(e) => setPickupDocType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    N° Documento <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pickupDocId}
                    onChange={(e) => setPickupDocId(e.target.value)}
                    placeholder="Ej. 45892134"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Parentesco / Vínculo <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pickupRelationship}
                    onChange={(e) => setPickupRelationship(e.target.value)}
                    placeholder="Ej. Tía, Abuelo, Movilidad"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Celular (opcional)
                  </label>
                  <input
                    type="text"
                    value={pickupCellphone}
                    onChange={(e) => setPickupCellphone(e.target.value)}
                    placeholder="Ej. 987654321"
                    maxLength={9}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Foto de la persona (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPickupPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddPickupOpen(false)}
                  disabled={isCreatingPickup || isUploadingPhoto}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingPickup || isUploadingPhoto}
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  {(isCreatingPickup || isUploadingPhoto) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>{isUploadingPhoto ? 'Subiendo foto...' : 'Guardar persona'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación para Quitar Persona Autorizada */}
      <ConfirmDialog
        isOpen={Boolean(deletingPickup)}
        onClose={() => setDeletingPickup(null)}
        onConfirm={handleConfirmDeactivate}
        title="Retirar persona autorizada"
        description={`¿Estás seguro de retirar a "${deletingPickup?.fullName}" de la lista de personas autorizadas a recoger al alumno?`}
        confirmText="Retirar persona"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};
