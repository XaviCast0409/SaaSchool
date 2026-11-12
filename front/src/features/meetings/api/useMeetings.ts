import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type MeetingMode = 'IN_PERSON' | 'VIRTUAL' | 'PHONE';

export const MODE_LABEL: Record<MeetingMode, string> = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Videollamada',
  PHONE: 'Llamada',
};

interface Person {
  id: string;
  firstName: string;
  lastNamePaternal: string;
  cellphone?: string | null;
}

export interface MeetingSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  mode: MeetingMode;
  location: string | null;
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
  reason: string | null;
  bookedAt: string | null;
  staff: Person;
  parent: Person | null;
  student: { id: string; name: string } | null;
  staffName?: string;
}

export interface AvailableByStaff {
  id: string;
  name: string;
  roleLabel: string;
  subjects: string[];
  isTutor: boolean;
  slots: Array<{ id: string; startsAt: string; endsAt: string; mode: MeetingMode; location: string | null }>;
}

const KEY = ['meetings'];

export const useMySlots = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'mine'],
    enabled,
    queryFn: async () => (await api.get<{ data: MeetingSlot[] }>('/meetings/mine')).data.data,
  });

export const useAvailableSlots = (studentId: string | null) =>
  useQuery({
    queryKey: [...KEY, 'available', studentId],
    enabled: Boolean(studentId),
    queryFn: async () =>
      (await api.get<{ data: AvailableByStaff[] }>('/meetings/available', { params: { studentId } })).data.data,
  });

export const useMyBookings = (enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'bookings'],
    enabled,
    queryFn: async () => (await api.get<{ data: MeetingSlot[] }>('/meetings/my-bookings')).data.data,
  });

export const useCreateSlots = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; from: string; to: string; durationMinutes: number; mode: MeetingMode; location?: string }) =>
      (await api.post<{ data: { created: number; skipped: number } }>('/meetings/slots/bulk', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useCancelSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/meetings/slots/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useBookSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, studentId, reason }: { id: string; studentId: string; reason: string }) =>
      (await api.post(`/meetings/slots/${id}/book`, { studentId, reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useCancelBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/meetings/slots/${id}/cancel-booking`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
