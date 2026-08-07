import React, { useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '../api/useStudents';
import { StudentTable } from '../components/StudentTable';
import { EnrollStudentModal } from '../components/EnrollStudentModal';
import { Button } from '@/components/ui/button';

export const StudentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // Estados del modal de matrícula
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Estados de paginación y filtros jerárquicos
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [classroomId, setClassroomId] = useState<string | undefined>(undefined);
  const [educationLevel, setEducationLevel] = useState<'INITIAL' | 'PRIMARY' | 'SECONDARY' | undefined>(undefined);
  const [grade, setGrade] = useState<number | undefined>(undefined);

  const { data: response, isLoading, isError, refetch } = useStudents({
    page,
    limit,
    search,
    classroomId,
    educationLevel,
    grade,
  });

  const students = response?.data || [];
  const meta = response?.meta;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Directorio de Estudiantes (SIAGIE)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión completa por Aula, Grado, Sección y datos demográficos MINEDU.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setIsEnrollModalOpen(true)}
            className="gap-2 self-start md:self-auto shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Matricular Estudiante</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {isError ? (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-center space-y-3">
          <p className="font-semibold">Error al cargar la lista de estudiantes.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <StudentTable
          students={students}
          isLoading={isLoading}
          meta={meta}
          page={page}
          limit={limit}
          search={search}
          classroomId={classroomId}
          educationLevel={educationLevel}
          grade={grade}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          onClassroomChange={(cId) => {
            setClassroomId(cId);
            setPage(1);
          }}
          onEducationLevelChange={(eL) => {
            setEducationLevel(eL);
            setPage(1);
          }}
          onGradeChange={(g) => {
            setGrade(g);
            setPage(1);
          }}
        />
      )}

      {/* Modal de Asistente de Matrícula */}
      <EnrollStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
      />
    </div>
  );
};
