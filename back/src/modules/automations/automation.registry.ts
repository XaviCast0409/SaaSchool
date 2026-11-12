import type { AutomationJob } from './automation.types';
import { paymentDueSoonJob, paymentOverdueJob } from './jobs/payment-reminders.job';
import { homeworkDueTomorrowJob } from './jobs/homework-due.job';
import { weeklyDigestJob } from './jobs/weekly-digest.job';
import { gradesMissingJob } from './jobs/grades-missing.job';
import { birthdaysJob } from './jobs/birthdays.job';
import { meetingRemindersJob } from './jobs/meeting-reminders.job';

/** Catálogo de automatizaciones. Para agregar una nueva, crear su archivo en jobs/ y registrarla aquí. */
export const AUTOMATION_JOBS: AutomationJob[] = [
  paymentDueSoonJob,
  paymentOverdueJob,
  weeklyDigestJob,
  homeworkDueTomorrowJob,
  gradesMissingJob,
  birthdaysJob,
  meetingRemindersJob,
];

export function findJob(name: string): AutomationJob | undefined {
  return AUTOMATION_JOBS.find((j) => j.name === name);
}

export function planAllows(plan: string, minPlan: 'BASIC' | 'PRO'): boolean {
  return minPlan === 'BASIC' || plan === 'PRO' || plan === 'ENTERPRISE';
}
