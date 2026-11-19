import { EVENT_TYPE_LABEL, type CalendarItem, type EventInput } from './api/useCalendar';

export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const KIND_STYLE: Record<string, string> = {
  HOLIDAY: 'bg-rose-500/10 text-rose-800 dark:text-rose-200',
  HOMEWORK: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  MEETING: 'bg-violet-500/10 text-violet-800 dark:text-violet-200',
  PAYMENT: 'bg-teal-500/10 text-teal-800 dark:text-teal-200',
  EXAM: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  EVENT: 'bg-primary/10 text-primary',
  PERIOD: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-200',
};

export const styleOf = (i: CalendarItem) =>
  i.kind === 'EVENT' && i.eventType === 'EXAM' ? KIND_STYLE.EXAM : KIND_STYLE[i.kind];

export const kindLabel = (i: CalendarItem) =>
  i.kind === 'PERIOD'
    ? 'Periodo académico'
    : i.kind === 'HOLIDAY'
      ? 'Feriado'
      : i.kind === 'HOMEWORK'
        ? 'Tarea'
        : i.kind === 'MEETING'
          ? 'Entrevista'
          : i.kind === 'PAYMENT'
            ? 'Pago'
            : EVENT_TYPE_LABEL[i.eventType ?? 'OTHER'];

export const emptyEvent = (date: string): EventInput => ({
  title: '',
  description: '',
  type: 'ACTIVITY',
  startDate: date,
  endDate: null,
  startTime: null,
  endTime: null,
  location: '',
  classroomId: null,
  educationLevel: null,
  visibleToFamilies: true,
  notifyFamilies: false,
});
