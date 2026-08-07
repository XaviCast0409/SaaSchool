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

const enrollWizardSchema = z.object({
  // Paso 1: Datos Alumno
  firstNames: z.string().min(2, 'Nombres requeridos'),
  lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
  lastNameMaternal: z.string().min(2, 'Apellido materno requerido'),
  documentType: z.string().default('DNI'),
  documentId: z.string().min(8, 'Documento debe tener al menos 8 caracteres'),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().min(1, 'Fecha de nacimiento requerida'),
  studentCode: z.string().optional(),
  motherTongue: z.string().default('CASTELLANO'),
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  address: z.string().optional(),

  // Paso 2: Aula y Año Lectivo
  academicYearId: z.string().min(1, 'Selecciona el Año Lectivo'),
  classroomId: z.string().min(1, 'Selecciona el Aula/Grado'),

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
  relationshipType: z.enum(['FATHER', 'MOTHER', 'GRANDPARENT', 'UNCLE_AUNT', 'OTHER']).default('FATHER'),
  isLegalGuardian: z.boolean().default(true),
  isFinancialResponsible: z.boolean().default(true),
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
      p.documentId?.includes(parentSearch)
  );

  if (!isOpen) return null;

  const onSubmit = async (data: EnrollWizardFormData) => {
    setSubmitError(null);
    try {
      // 1. Crear Estudiante
      const newStudent = await createStudent({
        firstNames: data.firstNames,
        lastNamePaternal: data.lastNamePaternal,
        lastNameMaternal: data.lastNameMaternal,
        documentType: data.documentType,
        documentId: data.documentId,
        gender: data.gender,
        birthDate: new Date(data.birthDate).toISOString(),
        studentCode: data.studentCode || undefined,
        motherTongue: data.motherTongue,
        hasDisability: data.hasDisability,
        disabilityType: data.hasDisability ? data.disabilityType : undefined,
        address: data.address || undefined,
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
        if (!data.newParentFirstName || !data.newParentLastNamePaternal || !data.newParentEmail) {
          throw new Error('Por favor completa los nombres, apellidos y email del nuevo apoderado.');
        }

        const newParent = await createUser({
          firstName: data.newParentFirstName,
          lastNamePaternal: data.newParentLastNamePaternal,
          lastNameMaternal: data.newParentLastNameMaternal || '',
          email: data.newParentEmail,
          documentType: 'DNI',
          documentId: data.newParentDocumentId || undefined,
          cellphone: data.newParentCellphone || undefined,
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
      toast.success(`✨ Alumno ${data.firstNames} ${data.lastNamePaternal} matriculado exitosamente con su aula y apoderado.`);
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
              Completa la ficha del alumno, asigna su aula y vincula a su apoderado.
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
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
            {submitError}
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
                  {errors.firstNames && <span className="text-[10px] text-destructive">{errors.firstNames.message}</span>}
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Apellido Paterno *</label>
                  <Input {...register('lastNamePaternal')} placeholder="Ej. Pérez" className="h-9 text-xs" />
                  {errors.lastNamePaternal && <span className="text-[10px] text-destructive">{errors.lastNamePaternal.message}</span>}
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Apellido Materno *</label>
                  <Input {...register('lastNameMaternal')} placeholder="Ej. Quispe" className="h-9 text-xs" />
                  {errors.lastNameMaternal && <span className="text-[10px] text-destructive">{errors.lastNameMaternal.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Tipo Doc. *</label>
                  <select
                    {...register('documentType')}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">Carnet de Extranjería</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="PNA">PNA (Partida Nacimiento)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Número de Doc. *</label>
                  <Input {...register('documentId')} placeholder="72819203" className="h-9 text-xs" />
                  {errors.documentId && <span className="text-[10px] text-destructive">{errors.documentId.message}</span>}
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
                  {errors.birthDate && <span className="text-[10px] text-destructive">{errors.birthDate.message}</span>}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Código SIAGIE</label>
                  <Input {...register('studentCode')} placeholder="14 dígitos" className="h-9 text-xs font-mono" />
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
                <Button type="button" onClick={() => setStep(2)} className="gap-2 text-xs">
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
                  <label className="text-xs font-medium text-foreground">Año Lectivo *</label>
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
                  {errors.academicYearId && <span className="text-[10px] text-destructive">{errors.academicYearId.message}</span>}
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
                  {errors.classroomId && <span className="text-[10px] text-destructive">{errors.classroomId.message}</span>}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </Button>
                <Button type="button" onClick={() => setStep(3)} className="gap-2 text-xs">
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
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Apellido Paterno *</label>
                      <Input {...register('newParentLastNamePaternal')} placeholder="Ej. Pérez" className="h-9 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Apellido Materno</label>
                      <Input {...register('newParentLastNameMaternal')} placeholder="Ej. García" className="h-9 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">DNI del Padre *</label>
                      <Input {...register('newParentDocumentId')} placeholder="10293847" className="h-9 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Email de Contacto *</label>
                      <Input type="email" {...register('newParentEmail')} placeholder="padre@gmail.com" className="h-9 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Celular Peruano *</label>
                      <Input {...register('newParentCellphone')} placeholder="912345678" className="h-9 text-xs font-mono" />
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
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
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
