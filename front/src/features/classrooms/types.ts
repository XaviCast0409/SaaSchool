export interface Classroom {
  id: string;
  schoolId: string;
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  grade: number;
  section: string;
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  capacity: number;
}
