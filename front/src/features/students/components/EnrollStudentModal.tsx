import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Search,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react';
import { useRegisterFichaMatricula, useSiagieCatalogs } from '../api/useStudents';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useAcademicYears } from '@/features/academic-years/api/useAcademicYears';
import { useUsers } from '@/features/users/api/useUsers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const enrollWizardSchema = z
  .object({
    // Paso 1: Datos Alumno (Campos estrictamente separados)
    firstNames: z.string().trim().min(2, 'Nombres requeridos (mínimo 2 letras)'),
    lastNamePaternal: z.string().trim().min(2, 'Apellido paterno requerido'),
    lastNameMaternal: z.string().trim().optional(),
    documentType: z.enum(['DNI', 'CE', 'CARNET_EXTRANJERIA', 'PASSPORT', 'PNA', 'CODIGO_TEMPORAL', 'OTHER']).default('DNI'),
    documentId: z.string().trim().min(1, 'Número de documento requerido'),
    gender: z.enum(['MALE', 'FEMALE']),
    birthDate: z.string().min(1, 'Fecha de nacimiento requerida'),
    birthCountry: z.string().trim().default('PERÚ'),
    birthUbigeo: z.string().trim().optional(),
    residenceUbigeo: z.string().trim().optional(),
    address: z.string().trim().optional(),
    motherTongue: z.string().default('CASTELLANO'),
    hasDisability: z.boolean().default(false),
    disabilityType: z.string().optional(),
    studentCode: z.string().trim().optional(),

    // Paso 2: Matrícula y Asignación Escolar
    academicYearId: z.string().min(1, 'Selecciona el Año Lectivo Escolar'),
    classroomId: z.string().min(1, 'Selecciona el Grado y Sección'),
    condition: z.enum(['INGRESANTE', 'CONTINUO', 'TRASLADO', 'REENTRANTE']).default('CONTINUO'),
    previousSchoolModularCode: z.string().trim().optional(),
    repeatingGrade: z.boolean().default(false),

    // Paso 3: Apoderado y Familia
    parentMode: z.enum(['EXISTING', 'NEW']).default('EXISTING'),
    existingParentId: z.string().optional(),

    // Datos para Nuevo Apoderado (Campos estrictamente separados)
    newParentFirstName: z.string().trim().optional(),
    newParentLastNamePaternal: z.string().trim().optional(),
    newParentLastNameMaternal: z.string().trim().optional(),
    newParentDocumentType: z.string().default('DNI'),
    newParentDocumentId: z.string().trim().optional(),
    newParentEmail: z.string().trim().optional(),
    newParentCellphone: z.string().trim().optional(),
    newParentEducationLevel: z.string().default('SECUNDARIA_COMPLETA'),

    // Atributos de Relación Familiar
    relationshipType: z
      .enum(['MOTHER', 'FATHER', 'TUTOR_LEGAL', 'GRANDPARENT', 'UNCLE_AUNT', 'OTHER'])
      .default('FATHER'),
    isLegalGuardian: z.boolean().default(true),
    isFinancialResponsible: z.boolean().default(true),
    livesWithStudent: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // Validar DNI de Alumno (8 dígitos numéricos exactos si es DNI)
    if (data.documentType === 'DNI') {
      const cleanDoc = data.documentId.trim();
      if (!/^\d{8}$/.test(cleanDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI peruano debe tener exactamente 8 dígitos numéricos (ej: 72819203)',
          path: ['documentId'],
        });
      }
    }

    // Validar Ubigeos (6 dígitos si se ingresan)
    if (data.birthUbigeo && data.birthUbigeo.trim().length > 0) {
      if (!/^\d{6}$/.test(data.birthUbigeo.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El Ubigeo de nacimiento consta de 6 dígitos INEI (ej: 150101)',
          path: ['birthUbigeo'],
        });
      }
    }

    if (data.residenceUbigeo && data.residenceUbigeo.trim().length > 0) {
      if (!/^\d{6}$/.test(data.residenceUbigeo.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El Ubigeo de residencia consta de 6 dígitos INEI (ej: 150101)',
          path: ['residenceUbigeo'],
        });
      }
    }

    // Validar Código SIAGIE (14 dígitos numéricos si se ingresa)
    if (data.studentCode && data.studentCode.trim().length > 0) {
      const cleanCode = data.studentCode.trim();
      if (!/^\d{14}$/.test(cleanCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El código SIAGIE consta de 14 dígitos numéricos (ej: 20261234567890)',
          path: ['studentCode'],
        });
      }
    }

    // Validar Código modular si es traslado
    if (data.condition === 'TRASLADO') {
      if (!data.previousSchoolModularCode || !/^\d{7}$/.test(data.previousSchoolModularCode.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El Código Modular de la I.E. de origen debe constar de 7 dígitos numéricos',
          path: ['previousSchoolModularCode'],
        });
      }
    }

    // Validaciones si parentMode === 'NEW'
    if (data.parentMode === 'NEW') {
      if (!data.newParentFirstName || data.newParentFirstName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nombres del apoderado requeridos',
          path: ['newParentFirstName'],
        });
      }
      if (!data.newParentLastNamePaternal || data.newParentLastNamePaternal.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Apellido paterno del apoderado requerido',
          path: ['newParentLastNamePaternal'],
        });
      }
      if (!data.newParentEmail || !z.string().email().safeParse(data.newParentEmail).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresa un correo electrónico válido para el apoderado',
          path: ['newParentEmail'],
        });
      }

      if (!data.newParentDocumentId || !/^\d{8}$/.test(data.newParentDocumentId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI del apoderado es requerido (8 dígitos numéricos) para su usuario y contraseña',
          path: ['newParentDocumentId'],
        });
      }

      if (data.newParentCellphone && data.newParentCellphone.trim().length > 0) {
        if (!/^9\d{8}$/.test(data.newParentCellphone.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El celular debe constar de 9 dígitos y empezar con 9 (ej: 912345678)',
            path: ['newParentCellphone'],
          });
        }
      }
    } else {
      if (!data.existingParentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debes seleccionar un apoderado del directorio o cambiar a "Crear Nuevo Apoderado"',
          path: ['existingParentId'],
        });
      }
    }
  });

type EnrollWizardFormData = z.infer<typeof enrollWizardSchema>;

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnrollStudentModal: React.FC<EnrollStudentModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parentSearch, setParentSearch] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdGuardianCredentials, setCreatedGuardianCredentials] = useState<{
    dni: string;
    fullName: string;
    studentName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: catalogs } = useSiagieCatalogs();
  const { data: classrooms = [] } = useClassrooms();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: existingParents = [] } = useUsers('PARENT');

  const { mutateAsync: registerFichaMatricula, isPending: isSubmitting } = useRegisterFichaMatricula();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
    reset,
  } = useForm<EnrollWizardFormData>({
    resolver: zodResolver(enrollWizardSchema),
    defaultValues: {
      documentType: 'DNI',
      gender: 'MALE',
      birthCountry: 'PERÚ',
      motherTongue: 'CASTELLANO',
      hasDisability: false,
      condition: 'CONTINUO',
      repeatingGrade: false,
      parentMode: 'EXISTING',
      relationshipType: 'FATHER',
      newParentDocumentType: 'DNI',
      newParentEducationLevel: 'SECUNDARIA_COMPLETA',
      isLegalGuardian: true,
      isFinancialResponsible: true,
      livesWithStudent: true,
    },
  });

  const parentMode = watch('parentMode');
  const hasDisability = watch('hasDisability');
  const condition = watch('condition');
  const selectedParentId = watch('existingParentId');

  const filteredParents = existingParents.filter(
    (p) =>
      p.firstName.toLowerCase().includes(parentSearch.toLowerCase()) ||
      p.lastNamePaternal.toLowerCase().includes(parentSearch.toLowerCase()) ||
      (p.documentId && p.documentId.includes(parentSearch)),
  );

  if (!isOpen) return null;

  const handleNextStep1 = async () => {
    setSubmitError(null);
    const valid = await trigger([
      'firstNames',
      'lastNamePaternal',
      'lastNameMaternal',
      'documentType',
      'documentId',
      'gender',
      'birthDate',
      'birthCountry',
      'birthUbigeo',
      'residenceUbigeo',
      'studentCode',
    ]);
    if (valid) {
      setStep(2);
    } else {
      toast.error('Corrige los datos obligatorios de la ficha del alumno.');
    }
  };

  const handleNextStep2 = async () => {
    setSubmitError(null);
    const valid = await trigger(['academicYearId', 'classroomId', 'condition', 'previousSchoolModularCode']);
    if (valid) {
      setStep(3);
    } else {
      toast.error('Completa los datos de matrícula y aula antes de continuar.');
    }
  };

  const onSubmit = async (data: EnrollWizardFormData) => {
    setSubmitError(null);
    try {
      await registerFichaMatricula({
        student: {
          firstNames: data.firstNames.trim(),
          lastNamePaternal: data.lastNamePaternal.trim(),
          lastNameMaternal: data.lastNameMaternal?.trim() || null,
          documentType: data.documentType,
          documentId: data.documentId.trim(),
          gender: data.gender,
          birthDate: new Date(data.birthDate).toISOString(),
          birthCountry: data.birthCountry,
          birthUbigeo: data.birthUbigeo?.trim() || null,
          residenceUbigeo: data.residenceUbigeo?.trim() || null,
          motherTongue: data.motherTongue,
          hasDisability: data.hasDisability,
          disabilityType: data.hasDisability ? data.disabilityType?.trim() || null : null,
          address: data.address?.trim() || null,
          studentCode: data.studentCode?.trim() || null,
        },
        enrollment: {
          academicYearId: data.academicYearId,
          classroomId: data.classroomId,
          condition: data.condition,
          previousSchoolModularCode: data.condition === 'TRASLADO' ? data.previousSchoolModularCode?.trim() : null,
          repeatingGrade: data.repeatingGrade,
        },
        guardian: {
          mode: data.parentMode,
          existingUserId: data.parentMode === 'EXISTING' ? data.existingParentId : null,
          relationshipType: data.relationshipType,
          isLegalGuardian: data.isLegalGuardian,
          isFinancialResponsible: data.isFinancialResponsible,
          livesWithStudent: data.livesWithStudent,
          newGuardian:
            data.parentMode === 'NEW'
              ? {
                  firstName: data.newParentFirstName!.trim(),
                  lastNamePaternal: data.newParentLastNamePaternal!.trim(),
                  lastNameMaternal: data.newParentLastNameMaternal?.trim() || null,
                  email: data.newParentEmail!.trim(),
                  documentType: data.newParentDocumentType,
                  documentId: data.newParentDocumentId?.trim() || null,
                  cellphone: data.newParentCellphone?.trim() || null,
                  educationLevel: data.newParentEducationLevel,
                }
              : undefined,
        },
      });

      if (data.parentMode === 'NEW' && data.newParentDocumentId) {
        setCreatedGuardianCredentials({
          dni: data.newParentDocumentId.trim(),
          fullName: `${data.newParentFirstName} ${data.newParentLastNamePaternal}`,
          studentName: `${data.firstNames} ${data.lastNamePaternal}`,
        });
        toast.success(
          `✨ Ficha de matrícula de ${data.firstNames} ${data.lastNamePaternal} registrada con éxito.`,
        );
      } else {
        reset();
        setStep(1);
        toast.success(
          `✨ Ficha SIAGIE de ${data.firstNames} ${data.lastNamePaternal} registrada y matriculada con éxito.`,
        );
        onClose();
      }
    } catch (err: any) {
      console.error('Error al registrar ficha de matrícula:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error al procesar la matrícula';
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  // Pantalla de confirmación y entrega de credenciales si se creó nuevo apoderado
  if (createdGuardianCredentials) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              ¡Matrícula y Cuenta de Apoderado Creadas!
            </h2>
            <p className="text-xs text-muted-foreground">
              Se ha creado el acceso para la familia de <strong>{createdGuardianCredentials.studentName}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Credenciales de Acceso para el Apoderado:</span>
              <span className="text-[11px] font-normal text-muted-foreground">Rol: Apoderado</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">Usuario (DNI):</span>
                <span className="font-mono font-bold text-primary">{createdGuardianCredentials.dni}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">Contraseña Inicial:</span>
                <span className="font-mono font-bold text-primary">{createdGuardianCredentials.dni}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
              ⚠️ <strong>Seguridad:</strong> El apoderado usará su número de DNI como usuario y clave. Al ingresar por primera vez, el sistema le solicitará cambiar su contraseña de manera obligatoria.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                const text = `SaaSchool - Acceso Familiar\nEstudiante: ${createdGuardianCredentials.studentName}\nApoderado: ${createdGuardianCredentials.fullName}\nUsuario (DNI): ${createdGuardianCredentials.dni}\nContraseña Inicial: ${createdGuardianCredentials.dni}\n(Al ingresar por primera vez deberás cambiar tu contraseña por una nueva personal).`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                toast.success('Credenciales copiadas al portapapeles');
                setTimeout(() => setCopied(false), 2500);
              }}
              className="flex-1 gap-2 text-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Credenciales'}</span>
            </Button>
            <Button
              onClick={() => {
                setCreatedGuardianCredentials(null);
                reset();
                setStep(1);
                onClose();
              }}
              className="flex-1 text-xs"
            >
              Finalizar y Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Ficha Única de Matrícula SIAGIE (MINEDU)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro estandarizado de admisión, datos demográficos, asignación escolar y familia.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Indicator */}
        <div className="flex items-center justify-between gap-2 px-2 py-3 rounded-xl bg-secondary/50 border border-border/50 text-xs">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
              1
            </span>
            <span>1. Datos del Alumno</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
              2
            </span>
            <span>2. Matrícula Escolar</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
              3
            </span>
            <span>3. Apoderado y Familia</span>
          </div>
        </div>

        {submitError && (
          <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ======================================================== */}
          {/* PASO 1: DATOS DEL ESTUDIANTE (CAMPOS SEPARADOS)           */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Primer Apellido */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Primer Apellido (Paterno) *
                  </label>
                  <Input
                    {...register('lastNamePaternal')}
                    placeholder="Ej: Castillo"
                    className="text-xs rounded-xl"
                  />
                  {errors.lastNamePaternal && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.lastNamePaternal.message}</p>
                  )}
                </div>

                {/* Segundo Apellido */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Segundo Apellido (Materno) <span className="text-[10px] font-normal text-muted-foreground">(Opcional)</span>
                  </label>
                  <Input
                    {...register('lastNameMaternal')}
                    placeholder="Ej: Mendoza"
                    className="text-xs rounded-xl"
                  />
                  {errors.lastNameMaternal && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.lastNameMaternal.message}</p>
                  )}
                </div>
              </div>

              {/* Nombres Completos */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Nombres Completos *
                </label>
                <Input
                  {...register('firstNames')}
                  placeholder="Ej: Javier Alejandro"
                  className="text-xs rounded-xl"
                />
                {errors.firstNames && (
                  <p className="text-[10px] text-destructive mt-1 font-medium">{errors.firstNames.message}</p>
                )}
              </div>

              {/* Tipo y Número de Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    {...register('documentType')}
                    className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="DNI">DNI (8 dígitos)</option>
                    <option value="CARNET_EXTRANJERIA">Carné Extranjería (CE)</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="PNA">Partida de Nacimiento</option>
                    <option value="CODIGO_TEMPORAL">Cód. Temporal SIAGIE</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Número de Documento *
                  </label>
                  <Input
                    {...register('documentId')}
                    placeholder="8 dígitos para DNI"
                    maxLength={15}
                    className="text-xs rounded-xl font-mono"
                  />
                  {errors.documentId && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.documentId.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Género *
                  </label>
                  <select
                    {...register('gender')}
                    className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="MALE">Masculino (M)</option>
                    <option value="FEMALE">Femenino (F)</option>
                  </select>
                </div>
              </div>

              {/* Fecha y País de Nacimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Fecha de Nacimiento *
                  </label>
                  <Input
                    type="date"
                    {...register('birthDate')}
                    className="text-xs rounded-xl"
                  />
                  {errors.birthDate && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.birthDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    País de Nacimiento
                  </label>
                  <Input
                    {...register('birthCountry')}
                    placeholder="PERÚ"
                    defaultValue="PERÚ"
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Ubigeos INEI (Nacimiento y Residencia) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Ubigeo Nacimiento (6 dígitos INEI)
                  </label>
                  <Input
                    {...register('birthUbigeo')}
                    list="ubigeos-list"
                    placeholder="Ej: 150101 (Lima/Lima/Lima)"
                    maxLength={6}
                    className="text-xs rounded-xl font-mono"
                  />
                  {errors.birthUbigeo && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.birthUbigeo.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Ubigeo Residencia (6 dígitos INEI)
                  </label>
                  <Input
                    {...register('residenceUbigeo')}
                    list="ubigeos-list"
                    placeholder="Ej: 150101 (Distrito actual)"
                    maxLength={6}
                    className="text-xs rounded-xl font-mono"
                  />
                  {errors.residenceUbigeo && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.residenceUbigeo.message}</p>
                  )}
                </div>
              </div>

              {/* Datalist de Ubigeos Comunes SIAGIE */}
              <datalist id="ubigeos-list">
                {catalogs?.commonUbigeos?.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.department} - {u.province} - {u.district}
                  </option>
                ))}
              </datalist>

              {/* Dirección detallada */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Dirección Domiciliaria (Vía, Nro, Mz/Lt, Urb)
                </label>
                <Input
                  {...register('address')}
                  placeholder="Ej: Av. Las Palmeras 450, Mz B Lote 12, Urb. San Felipe"
                  className="text-xs rounded-xl"
                />
              </div>

              {/* Lengua Materna y Código SIAGIE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Lengua Materna
                  </label>
                  <select
                    {...register('motherTongue')}
                    className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="CASTELLANO">Castellano / Español</option>
                    <option value="QUECHUA">Quechua</option>
                    <option value="AYMARA">Aymara</option>
                    <option value="ASHANINKA">Asháninka</option>
                    <option value="AWAJUN">Awajún</option>
                    <option value="OTRA">Otra Lengua</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Código de Estudiante SIAGIE (14 dígitos)
                  </label>
                  <Input
                    {...register('studentCode')}
                    placeholder="Ej: 20261234567890 (opcional)"
                    maxLength={14}
                    className="text-xs rounded-xl font-mono"
                  />
                  {errors.studentCode && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.studentCode.message}</p>
                  )}
                </div>
              </div>

              {/* Inclusión / Salud */}
              <div className="p-3 rounded-xl border border-border bg-secondary/20 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    {...register('hasDisability')}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>El estudiante cuenta con Necesidad Educativa Especial (NEE / Discapacidad)</span>
                </label>

                {hasDisability && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Tipo de Discapacidad / Diagnóstico
                    </label>
                    <select
                      {...register('disabilityType')}
                      className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="VISUAL">Discapacidad Visual</option>
                      <option value="AUDITIVA">Discapacidad Auditiva</option>
                      <option value="MOTORA">Discapacidad Motora / Física</option>
                      <option value="INTELECTUAL">Discapacidad Intelectual</option>
                      <option value="TEA">Trastorno del Espectro Autista (TEA)</option>
                      <option value="PSICOSOCIAL">Discapacidad Psicosocial</option>
                      <option value="OTRA">Otra condición NEE</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleNextStep1} className="gap-2 text-xs">
                  <span>Siguiente: Matrícula Escolar</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 2: MATRÍCULA Y ASIGNACIÓN ESCOLAR                   */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Asignación de aula, año escolar y condición académica según normativa MINEDU.</span>
              </div>

              {/* Año Lectivo */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Año Lectivo Escolar *
                </label>
                <select
                  {...register('academicYearId')}
                  className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Selecciona el Año Lectivo --</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name || `Año Escolar ${ay.year}`} {ay.isActive ? '(Vigente Activo)' : ''}
                    </option>
                  ))}
                </select>
                {errors.academicYearId && (
                  <p className="text-[10px] text-destructive mt-1 font-medium">{errors.academicYearId.message}</p>
                )}
              </div>

              {/* Aula / Grado / Sección */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Aula / Grado / Sección *
                </label>
                <select
                  {...register('classroomId')}
                  className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Selecciona Aula y Sección --</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.educationLevel} - {c.grade}° "{c.section}" ({c.shift === 'MORNING' ? 'Turno Mañana' : 'Turno Tarde'}) · Capacidad: {c.capacity}
                    </option>
                  ))}
                </select>
                {errors.classroomId && (
                  <p className="text-[10px] text-destructive mt-1 font-medium">{errors.classroomId.message}</p>
                )}
              </div>

              {/* Condición de Matrícula */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Condición de Matrícula SIAGIE *
                </label>
                <select
                  {...register('condition')}
                  className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CONTINUO">Continuo / Promovido (Permanece en la misma I.E.)</option>
                  <option value="INGRESANTE">Ingresante (Primera matrícula en el sistema educativo)</option>
                  <option value="TRASLADO">Traslado (Proviene de otra institución educativa)</option>
                  <option value="REENTRANTE">Reentrante (Retoma estudios tras retiro temporal)</option>
                </select>
              </div>

              {/* Si es Traslado: Código Modular de Origen */}
              {condition === 'TRASLADO' && (
                <div className="p-3 rounded-xl border border-border bg-muted/30 animate-in fade-in duration-150">
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Código Modular del Colegio de Origen (7 dígitos) *
                  </label>
                  <Input
                    {...register('previousSchoolModularCode')}
                    placeholder="Ej: 0382910"
                    maxLength={7}
                    className="text-xs rounded-xl font-mono"
                  />
                  {errors.previousSchoolModularCode && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">
                      {errors.previousSchoolModularCode.message}
                    </p>
                  )}
                </div>
              )}

              {/* Repitente */}
              <div className="p-3 rounded-xl border border-border bg-secondary/20">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    {...register('repeatingGrade')}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>¿El estudiante se encuentra repitiendo este grado?</span>
                </label>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </Button>
                <Button type="button" onClick={handleNextStep2} className="gap-2 text-xs">
                  <span>Siguiente: Apoderado y Familia</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 3: APODERADO Y VINCULACIÓN FAMILIAR                */}
          {/* ======================================================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Selector de Modo */}
              <div className="flex rounded-xl p-1 bg-secondary border border-border">
                <button
                  type="button"
                  onClick={() => setValue('parentMode', 'EXISTING')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    parentMode === 'EXISTING'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Seleccionar del Directorio
                </button>
                <button
                  type="button"
                  onClick={() => setValue('parentMode', 'NEW')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    parentMode === 'NEW'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Registrar Nuevo Apoderado
                </button>
              </div>

              {/* Modo Existente */}
              {parentMode === 'EXISTING' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por DNI, nombres o apellidos..."
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      className="pl-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 border border-border rounded-xl">
                    {filteredParents.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No se encontraron apoderados con ese criterio.
                      </p>
                    ) : (
                      filteredParents.map((parent) => (
                        <div
                          key={parent.id}
                          onClick={() => setValue('existingParentId', parent.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            selectedParentId === parent.id
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'border-border/60 hover:bg-secondary/60 text-foreground'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">
                              {parent.firstName} {parent.lastNamePaternal} {parent.lastNameMaternal}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {parent.email} · DNI: {parent.documentId || 'S/N'}
                            </div>
                          </div>
                          {selectedParentId === parent.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                      ))
                    )}
                  </div>
                  {errors.existingParentId && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">{errors.existingParentId.message}</p>
                  )}
                </div>
              )}

              {/* Modo Nuevo Apoderado */}
              {parentMode === 'NEW' && (
                <div className="space-y-3 p-3 rounded-xl border border-border bg-secondary/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Primer Apellido (Paterno) *
                      </label>
                      <Input
                        {...register('newParentLastNamePaternal')}
                        placeholder="Ej: Castillo"
                        className="text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Segundo Apellido (Materno)
                      </label>
                      <Input
                        {...register('newParentLastNameMaternal')}
                        placeholder="Ej: Mendoza"
                        className="text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Nombres Completos *
                    </label>
                    <Input
                      {...register('newParentFirstName')}
                      placeholder="Ej: Carlos Alberto"
                      className="text-xs rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        DNI del Apoderado (8 dígitos) *
                      </label>
                      <Input
                        {...register('newParentDocumentId')}
                        placeholder="8 dígitos numéricos"
                        maxLength={8}
                        className="text-xs rounded-xl font-mono"
                      />
                      {errors.newParentDocumentId && (
                        <p className="text-[10px] text-destructive mt-1 font-medium">{errors.newParentDocumentId.message}</p>
                      )}
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Este DNI será su usuario y contraseña inicial de acceso.
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Celular (9 dígitos)
                      </label>
                      <Input
                        {...register('newParentCellphone')}
                        placeholder="Ej: 987654321"
                        maxLength={9}
                        className="text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Correo Electrónico *
                      </label>
                      <Input
                        type="email"
                        {...register('newParentEmail')}
                        placeholder="padre@ejemplo.com"
                        className="text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Grado de Instrucción (SIAGIE)
                      </label>
                      <select
                        {...register('newParentEducationLevel')}
                        className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="SECUNDARIA_COMPLETA">Secundaria Completa</option>
                        <option value="SECUNDARIA_INCOMPLETA">Secundaria Incompleta</option>
                        <option value="PRIMARIA_COMPLETA">Primaria Completa</option>
                        <option value="SUPERIOR_NO_UNIVERSITARIA_COMPLETA">Superior Técnica Completa</option>
                        <option value="SUPERIOR_UNIVERSITARIA_COMPLETA">Superior Universitaria Completa</option>
                        <option value="POSTGRADO">Postgrado (Maestría/Doctorado)</option>
                        <option value="SIN_INSTRUCCION">Sin Instrucción</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Atributos del Parentesco */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Parentesco con el Alumno *
                  </label>
                  <select
                    {...register('relationshipType')}
                    className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="FATHER">Padre</option>
                    <option value="MOTHER">Madre</option>
                    <option value="TUTOR_LEGAL">Tutor / Apoderado Legal</option>
                    <option value="GRANDPARENT">Abuelo / Abuela</option>
                    <option value="UNCLE_AUNT">Tío / Tía</option>
                    <option value="OTHER">Otro Apoderado</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes de Atributos */}
              <div className="space-y-2 p-3 rounded-xl border border-border bg-card text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    {...register('isLegalGuardian')}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Apoderado oficial / legal ante el colegio y MINEDU</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    {...register('isFinancialResponsible')}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Responsable económico de pago (emisión de comprobantes y pensiones)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    {...register('livesWithStudent')}
                    className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Convive en el mismo domicilio que el estudiante</span>
                </label>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 text-xs shadow-md">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando Ficha SIAGIE...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Registrar Ficha de Matrícula SIAGIE</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
