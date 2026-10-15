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
} from 'lucide-react';
import { useStudent } from '../api/useStudents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

export const StudentFichaModal: React.FC<StudentFichaModalProps> = ({
  studentId,
  isOpen,
  onClose,
}) => {
  const { data: student, isLoading } = useStudent(studentId || undefined);

  if (!isOpen || !studentId) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Header no imprimible */}
        <div className="flex items-center justify-between pb-4 border-b border-border print:hidden">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
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
          <div className="space-y-6 text-xs text-foreground">
            {/* Encabezado Ficha para Impresión */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            <div className="space-y-3">
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
                    {student.birthDate ? new Date(student.birthDate).toLocaleDateString('es-PE') : '-'}
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
            <div className="space-y-3">
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
                        Fecha: {new Date(enr.enrollmentDate).toLocaleDateString('es-PE')}
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
            <div className="space-y-3">
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
                        <div>Email: <strong className="text-foreground">{rel.user?.email}</strong></div>
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

            {/* Pie de Ficha / Firma para impresión */}
            <div className="hidden print:grid grid-cols-2 gap-8 pt-12 mt-12 border-t border-border text-center">
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
        )}
      </div>
    </div>
  );
};
