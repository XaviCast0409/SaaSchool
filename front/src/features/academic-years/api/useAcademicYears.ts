import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface AcademicYear {
  id: string;
  schoolId: string;
  year: number;
  name?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface AcademicYearsResponse {
  status: string;
  data: AcademicYear[];
}

export const useAcademicYears = () => {
  return useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const response = await api.get<AcademicYearsResponse>('/academic-years');
      return response.data.data;
    },
  });
};
