import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  User,
  GraduationCap,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { useCreateStudent } from '../api/useStudents';
import { useCreateEnrollment } from '@/features/enrollments/api/useEnrollments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useAcademicYears } from '@/features/academic-years/api/useAcademicYears';
import { useUsers, useCreateUser } from '@/features/users/api/useUsers';
import { useLinkParent } from '@/features/users/family-relationships/api/useFamilyRelationships';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const enrollWizardSchema = z
  .object({
    // Paso 1: Datos Alumno
    firstNames: z.string().min(2, 'Nombres requeridos (mínimo 2 letras)'),
    lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
    lastNameMaternal: z.string().min(2, 'Apellido materno requerido'),
    documentType: z.string().default('DNI'),
    documentId: z.string().min(1, 'Número de documento requerido'),
    gender: z.enum(['MALE', 'FEMALE']),
    birthDate: z.string().min(1, 'Fecha de nacimiento requerida'),
    studentCode: z.string().optional(),
    motherTongue: z.string().default('CASTELLANO'),
    hasDisability: z.boolean().default(false),
    disabilityType: z.string().optional(),
    address: z.string().optional(),

    // Paso 2: Aula y Año Lectivo
    academicYearId: z.string().min(1, 'Selecciona el Año Lectivo Escolar'),
    classroomId: z.string().min(1, 'Selecciona el Grado y Sección'),

    // Paso 3: Apoderado
    parentMode: z.enum(['EXISTING', 'NEW']).default('EXISTING'),
    existingParentId: z.string().optional(),

    // Datos para Nuevo Apoderado (si parentMode === 'NEW')
    newParentFirstName: z.string().optional(),
    newParentLastNamePaternal: z.string().optional(),
    newParentLastNameMaternal: z.string().optional(),
    newParentDocumentId: z.string().optional(),
    newParentEmail: z.string().optional(),
    newParentCellphone: z.string().optional(),

    // Tipo de relación
    relationshipType: z
      .enum(['FATHER', 'MOTHER', 'GRANDPARENT', 'UNCLE_AUNT', 'OTHER'])
      .default('FATHER'),
    isLegalGuardian: z.boolean().default(true),
    isFinancialResponsible: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // Validar DNI de Alumno (8 dígitos numéricos exactos si es DNI)
    if (data.documentType === 'DNI') {
      const cleanDoc = data.documentId.trim();
      if (!/^\d{8}$/.test(cleanDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI peruano debe tener exactamente 8 dígitos numéricos sin letras ni espacios (ej: 72819203)',
          path: ['documentId'],
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
          message: 'Ingresa un correo electrónico válido para el apoderado (ej: padre@gmail.com)',
          path: ['newParentEmail'],
        });
      }

      if (data.newParentDocumentId && data.newParentDocumentId.trim().length > 0) {
        if (!/^\d{8}$/.test(data.newParentDocumentId.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El DNI del apoderado debe tener 8 dígitos numéricos',
            path: ['newParentDocumentId'],
          });
        }
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
      // MODO EXISTING: Debe haber seleccionado un apoderado existente
      if (!data.existingParentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debes seleccionar un apoderado del directorio o cambiar al modo "Crear Nuevo Apoderado"',
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

  const { data: classrooms = [] } = useClassrooms();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: existingParents = [] } = useUsers('PARENT');

  const { mutateAsync: createStudent } = useCreateStudent();
  const { mutateAsync: createEnrollment } = useCreateEnrollment();
  const { mutateAsync: createUser } = useCreateUser();
  const { mutateAsync: linkRelationship } = useLinkParent();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EnrollWizardFormData>({
    resolver: zodResolver(enrollWizardSchema),
    defaultValues: {
      documentType: 'DNI',
      gender: 'MALE',
      motherTongue: 'CASTELLANO',
      hasDisability: false,
      parentMode: 'EXISTING',
      relationshipType: 'FATHER',
      isLegalGuardian: true,
      isFinancialResponsible: true,
    },
  });

  const parentMode = watch('parentMode');
  const hasDisability = watch('hasDisability');
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
      'birthDate',
      'studentCode',
    ]);
    if (valid) {
      setStep(2);
    } else {
      toast.error('Corrige los datos resaltados en la ficha del alumno.');
    }
  };

  const handleNextStep2 = async () => {
    setSubmitError(null);
    const valid = await trigger(['academicYearId', 'classroomId']);
    if (valid) {
      setStep(3);
    } else {
      toast.error('Selecciona el Año Escolar y el Aula antes de continuar.');
    }
  };

  const onSubmit = async (data: EnrollWizardFormData) => {
    setSubmitError(null);
    try {
      // 1. Crear Estudiante
      const newStudent = await createStudent({
        firstNames: data.firstNames.trim(),
        lastNamePaternal: data.lastNamePaternal.trim(),
        lastNameMaternal: data.lastNameMaternal.trim(),
        documentType: data.documentType,
        documentId: data.documentId.trim(),
        gender: data.gender,
        birthDate: new Date(data.birthDate).toISOString(),
        studentCode: data.studentCode ? data.studentCode.trim() : undefined,
        motherTongue: data.motherTongue,
        hasDisability: data.hasDisability,
        disabilityType: data.hasDisability ? data.disabilityType : undefined,
        address: data.address ? data.address.trim() : undefined,
      });

      // 2. Registrar Matrícula en Aula
      await createEnrollment({
        studentId: newStudent.id,
        academicYearId: data.academicYearId,
        classroomId: data.classroomId,
      });

      // 3. Vincular Apoderado
      let parentUserId = data.existingParentId;

      if (data.parentMode === 'NEW') {
        const newParent = await createUser({
          firstName: data.newParentFirstName!.trim(),
          lastNamePaternal: data.newParentLastNamePaternal!.trim(),
          lastNameMaternal: (data.newParentLastNameMaternal || '').trim(),
          email: data.newParentEmail!.trim(),
          documentType: 'DNI',
          documentId: data.newParentDocumentId ? data.newParentDocumentId.trim() : undefined,
          cellphone: data.newParentCellphone ? data.newParentCellphone.trim() : undefined,
          role: 'PARENT',
        });
        parentUserId = newParent.id;
      }

      if (parentUserId) {
        await linkRelationship({
          studentId: newStudent.id,
          userId: parentUserId,
          relationshipType: data.relationshipType,
          isLegalGuardian: data.isLegalGuardian,
          isFinancialResponsible: data.isFinancialResponsible,
          livesWithStudent: true,
        });
      }

      reset();
      setStep(1);
      toast.success(
        `✨ Alumno ${data.firstNames} ${data.lastNamePaternal} matriculado exitosamente con su aula y apoderado.`,
      );
      onClose();
    } catch (err: any) {
      console.error('Error al matricular alumno:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error al procesar la matrícula';
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Matricular Nuevo Estudiante (SIAGIE)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ficha de admisión, asignación de grado/sección y vinculación del apoderado.
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
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
              step === 1
                ? 'bg-primary text-primary-foreground border-primary'
                : step > 1
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">1. Alumno</span>
          </div>
          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
              step === 2
                ? 'bg-primary text-primary-foreground border-primary'
                : step > 2
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">2. Aula & Año</span>
          </div>
          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
              step === 3
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">3. Apoderado</span>
          </div>
        </div>

        {submitError && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>⚠️ Error de Validación</span>
            </div>
            <div>{submitError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* PASO 1: DATOS DEL ESTUDIANTE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                1. Datos Demográficos del Alumno
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Nombres *</label>
                  <Input {...register('firstNames')} placeholder="Ej. Juan Carlos" className="h-9 text-xs" />
                  {errors.firstNames && (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.firstNames.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Apellido Paterno *</label>
                  <Input {...register('lastNamePaternal')} placeholder="Ej. Pérez" className="h-9 text-xs" />
                  {errors.lastNamePaternal && (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.lastNamePaternal.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Apellido Materno *</label>
                  <Input {...register('lastNameMaternal')} placeholder="Ej. Quispe" className="h-9 text-xs" />
                  {errors.lastNameMaternal && (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.lastNameMaternal.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Tipo Doc. *</label>
                  <select
                    {...register('documentType')}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="DNI">DNI (Perú)</option>
                    <option value="CE">Carnet de Extranjería</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="PNA">PNA (Partida Nacimiento)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Número de Doc. *</label>
                  <Input {...register('documentId')} placeholder="72819203" className="h-9 text-xs font-mono" />
                  {errors.documentId ? (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.documentId.message}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      💡 DNI: 8 dígitos numéricos sin espacios.
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Género *</label>
                  <select
                    {...register('gender')}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Fecha Nacimiento *</label>
                  <Input type="date" {...register('birthDate')} className="h-9 text-xs" />
                  {errors.birthDate && (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.birthDate.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Código SIAGIE MINEDU</label>
                  <Input {...register('studentCode')} placeholder="14 dígitos" className="h-9 text-xs font-mono" />
                  {errors.studentCode ? (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.studentCode.message}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      💡 Código oficial de 14 dígitos.
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Lengua Materna</label>
                  <Input {...register('motherTongue')} placeholder="CASTELLANO" className="h-9 text-xs" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('hasDisability')}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>¿Tiene Discapacidad / Necesidad Educativa Especial (NEE)?</span>
                </label>

                {hasDisability && (
                  <div>
                    <label className="text-xs font-medium text-foreground">Detalle / Tipo de Discapacidad</label>
                    <Input {...register('disabilityType')} placeholder="Ej. Visual, Motora, TEA..." className="h-9 text-xs" />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleNextStep1} className="gap-2 text-xs font-bold">
                  <span>Siguiente: Asignar Aula</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: AULA Y AÑO LECTIVO */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                2. Asignación Académica y Matricular en Aula
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Año Lectivo Escolar *</label>
                  <select
                    {...register('academicYearId')}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Selecciona el Año Escolar --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        Año Escolar {ay.year} {ay.isActive ? '(Activo)' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.academicYearId && (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.academicYearId.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Aula / Grado y Sección *</label>
                  <select
                    {...register('classroomId')}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Selecciona el Aula --</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.grade}° "{c.section}" - {c.educationLevel} ({c.shift})
                      </option>
                    ))}
                  </select>
                  {errors.classroomId && (
                    <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                      {errors.classroomId.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </Button>
                <Button type="button" onClick={handleNextStep2} className="gap-2 text-xs font-bold">
                  <span>Siguiente: Apoderado</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: APODERADO / PADRE DE FAMILIA */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                3. Vinculación de Apoderado / Padre de Familia
              </h3>

              {/* Selector de Modo */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('parentMode', 'EXISTING')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    parentMode === 'EXISTING'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Buscar Padre Existente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('parentMode', 'NEW')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    parentMode === 'NEW'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Apoderado</span>
                </button>
              </div>

              {/* MODO A: APODERADO EXISTENTE */}
              {parentMode === 'EXISTING' && (
                <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o DNI de apoderado..."
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  {errors.existingParentId && (
                    <span className="text-[10px] text-destructive block font-medium">
                      {errors.existingParentId.message}
                    </span>
                  )}

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {filteredParents.length ? (
                      filteredParents.map((parent) => (
                        <div
                          key={parent.id}
                          onClick={() => setValue('existingParentId', parent.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            selectedParentId === parent.id
                              ? 'bg-primary/15 border-primary text-foreground font-semibold'
                              : 'bg-card border-border hover:bg-muted/40'
                          }`}
                        >
                          <div>
                            <span className="block text-foreground">
                              {parent.firstName} {parent.lastNamePaternal} {parent.lastNameMaternal}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              DNI: {parent.documentId || 'S/N'} • {parent.email}
                            </span>
                          </div>
                          {selectedParentId === parent.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No se encontraron apoderados en el directorio.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* MODO B: CREAR NUEVO APODERADO */}
              {parentMode === 'NEW' && (
                <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Nombres del Padre *</label>
                      <Input {...register('newParentFirstName')} placeholder="Ej. Carlos" className="h-9 text-xs" />
                      {errors.newParentFirstName && (
                        <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                          {errors.newParentFirstName.message}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Apellido Paterno *</label>
                      <Input {...register('newParentLastNamePaternal')} placeholder="Ej. Pérez" className="h-9 text-xs" />
                      {errors.newParentLastNamePaternal && (
                        <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                          {errors.newParentLastNamePaternal.message}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Apellido Materno</label>
                      <Input {...register('newParentLastNameMaternal')} placeholder="Ej. García" className="h-9 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">DNI del Padre *</label>
                      <Input {...register('newParentDocumentId')} placeholder="10293847" className="h-9 text-xs font-mono" />
                      {errors.newParentDocumentId ? (
                        <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                          {errors.newParentDocumentId.message}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          💡 DNI: 8 dígitos numéricos.
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Email de Contacto *</label>
                      <Input type="email" {...register('newParentEmail')} placeholder="padre@gmail.com" className="h-9 text-xs" />
                      {errors.newParentEmail ? (
                        <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                          {errors.newParentEmail.message}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          💡 Recibirá accesos e informes.
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Celular Peruano *</label>
                      <Input {...register('newParentCellphone')} placeholder="912345678" className="h-9 text-xs font-mono" />
                      {errors.newParentCellphone ? (
                        <span className="text-[10px] text-destructive block mt-0.5 font-medium">
                          {errors.newParentCellphone.message}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          💡 9 dígitos (ej. 987654321).
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DETALLES DE VINCULACIÓN FAMILIAR */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Parentesco *</label>
                    <select
                      {...register('relationshipType')}
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="FATHER">PADRE</option>
                      <option value="MOTHER">MADRE</option>
                      <option value="GRANDPARENT">ABUELO / ABUELA</option>
                      <option value="UNCLE_AUNT">TÍO / TÍA</option>
                      <option value="OTHER">TUTOR LEGAL / OTRO</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="isLegalGuardian"
                      {...register('isLegalGuardian')}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="isLegalGuardian" className="text-xs font-medium text-foreground cursor-pointer">
                      ¿Es Apoderado Legal?
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="isFinancialResponsible"
                      {...register('isFinancialResponsible')}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="isFinancialResponsible" className="text-xs font-medium text-foreground cursor-pointer">
                      ¿Responsable de Pagos?
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2 text-xs font-medium">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Finalizar Matrícula</span>
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
