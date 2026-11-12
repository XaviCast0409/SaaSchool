import type { JobSchedule } from './automation.rules';

export interface JobContext {
  schoolId: string;
  schoolName: string;
  /** Fecha de hoy en Lima 'YYYY-MM-DD'. */
  today: string;
  /** Hora actual en Lima 'HH:mm'. */
  nowTime: string;
  weekday: number;
  activeYearId: string | null;
}

export interface JobResult {
  items: number;
  summary: string;
}

export type JobAudience = 'Familias' | 'Alumnos y familias' | 'Docentes y Dirección' | 'Alumnos y tutores' | 'Familias y docentes';

export interface AutomationJob {
  name: string;
  label: string;
  description: string;
  audience: JobAudience;
  channels: string;
  schedule: JobSchedule;
  /** Texto humano del horario, p. ej. "Todos los días, 8:00 a. m.". */
  scheduleLabel: string;
  defaultEnabled: boolean;
  /** Plan mínimo del colegio para usar la automatización. */
  minPlan: 'BASIC' | 'PRO';
  run(ctx: JobContext): Promise<JobResult>;
}
