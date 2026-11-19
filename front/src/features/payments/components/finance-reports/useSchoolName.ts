import { useGetActiveSchool } from '@/features/schools/api/useSchool';

export const useSchoolName = (): string => useGetActiveSchool().data?.name ?? 'Institución educativa';
