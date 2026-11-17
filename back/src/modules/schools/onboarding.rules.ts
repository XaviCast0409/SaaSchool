/**
 * Checklist de puesta en marcha de un colegio: qué tan avanzado está para operar en la plataforma.
 * Se calcula a partir de conteos (sin guardar estado), en el orden en que normalmente se configura.
 */
export interface OnboardingCounts {
  profileComplete: boolean; // Código modular, teléfono, correo, dirección y logo
  /** Qué datos faltan del perfil, para decirle a la Dirección exactamente qué completar. */
  profileMissing?: string[];
  feeSchedules?: number;
  adminHasLoggedIn: boolean; // La dirección ya entró y cambió su clave inicial
  activeYears: number;
  classrooms: number;
  teachers: number;
  students: number;
  courseAssignments: number;
  familyLinks: number;
  paymentObligations: number;
  attendanceRecords: number;
}

export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
  detail?: string;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
  /** Primer paso pendiente: lo que conviene ayudar a hacer ahora. */
  nextStep: OnboardingStep | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildOnboarding(c: OnboardingCounts): OnboardingStatus {
  const steps: OnboardingStep[] = [
    { key: 'admin-login', label: 'La dirección ingresó y cambió su clave', done: c.adminHasLoggedIn },
    {
      key: 'profile',
      label: 'Datos institucionales y logo completos',
      done: c.profileComplete,
      detail: !c.profileComplete && c.profileMissing?.length ? `falta: ${c.profileMissing.join(', ')}` : undefined,
    },
    { key: 'academic-year', label: 'Año escolar activo', done: c.activeYears > 0 },
    { key: 'classrooms', label: 'Aulas creadas', done: c.classrooms > 0, detail: plural(c.classrooms, 'aula', 'aulas') },
    {
      // Antes de matricular: sin tarifario las matrículas no generan cuotas.
      key: 'fee-schedule',
      label: 'Tarifario de pensiones configurado',
      done: (c.feeSchedules ?? 0) > 0 || c.paymentObligations > 0,
    },
    { key: 'teachers', label: 'Docentes registrados', done: c.teachers > 0, detail: plural(c.teachers, 'docente', 'docentes') },
    { key: 'students', label: 'Alumnos cargados', done: c.students > 0, detail: plural(c.students, 'alumno', 'alumnos') },
    {
      key: 'courses',
      label: 'Cursos asignados a docentes',
      done: c.courseAssignments > 0,
      detail: plural(c.courseAssignments, 'curso', 'cursos'),
    },
    {
      key: 'families',
      label: 'Familias vinculadas a sus hijos',
      done: c.familyLinks > 0,
      detail: plural(c.familyLinks, 'vínculo', 'vínculos'),
    },
    { key: 'payments', label: 'Pensiones generadas', done: c.paymentObligations > 0 },
    { key: 'attendance', label: 'Primera asistencia tomada', done: c.attendanceRecords > 0 },
  ];
  const completed = steps.filter((s) => s.done).length;
  return {
    steps,
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    nextStep: steps.find((s) => !s.done) ?? null,
  };
}

/** Datos mínimos para considerar completo el perfil institucional. */
export const isProfileComplete = (s: {
  modularCode?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}): boolean => profileMissingFields(s).length === 0;

/** Datos del perfil que faltan, en el lenguaje de la pantalla de Ajustes. */
export const profileMissingFields = (s: {
  modularCode?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}): string[] => [
  !s.modularCode && 'código modular',
  !s.phone && 'teléfono',
  !s.email && 'correo',
  !s.address && 'dirección',
  !s.logoUrl && 'logo',
].filter((x): x is string => Boolean(x));
