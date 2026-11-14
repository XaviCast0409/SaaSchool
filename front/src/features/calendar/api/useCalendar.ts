import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type CalendarKind = 'EVENT' | 'HOLIDAY' | 'HOMEWORK' | 'MEETING' | 'PAYMENT' | 'PERIOD';
export type EventType = 'EXAM' | 'ACTIVITY' | 'MEETING' | 'CIVIC' | 'DEADLINE' | 'OTHER';

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  EXAM: 'Evaluación',
  ACTIVITY: 'Actividad',
  MEETING: 'Reunión',
  CIVIC: 'Fecha cívica',
  DEADLINE: 'Fecha límite',
  OTHER: 'Otro',
};

export interface CalendarItem {
  id: string;
  kind: CalendarKind;
  title: string;
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  eventType?: EventType;
  scope?: string;
  studentName?: string;
  link?: string;
  editable?: boolean;
  classroomId?: string | null;
  educationLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | null;
  visibleToFamilies?: boolean;
}

export interface EventInput {
  title: string;
  description?: string | null;
  type: EventType;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  classroomId?: string | null;
  educationLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | null;
  visibleToFamilies: boolean;
  notifyFamilies?: boolean;
}

const KEY = ['calendar'];

export const useCalendar = (from: string, to: string) =>
  useQuery({
    queryKey: [...KEY, from, to],
    queryFn: async () => (await api.get<{ data: CalendarItem[] }>('/calendar', { params: { from, to } })).data.data,
  });

export const useCalendarFeedUrl = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'feed'],
    enabled,
    queryFn: async () => (await api.get<{ data: { httpsUrl: string; webcalUrl: string } }>('/calendar/feed-url')).data.data,
  });

export const useSaveEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: EventInput }) =>
      id
        ? (await api.put(`/calendar/events/${id}`, input)).data.data
        : (await api.post<{ data: { notified: number } }>('/calendar/events', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/calendar/events/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useImportOfficialDates = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { holidays: boolean; civic: boolean }) =>
      (await api.post<{ data: { holidaysCreated: number; civicCreated: number } }>('/calendar/import-official', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
