import React, { useState } from 'react';
import { Users, UserPlus, QrCode } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudents } from '../api/useStudents';
import { StudentTable } from '../components/StudentTable';
import { EnrollStudentModal } from '../components/EnrollStudentModal';
import { SectionQrCardsModal } from '../components/SectionQrCardsModal';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { Button } from '@/components/ui/button';

export const StudentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canManageStudents =
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMINISTRATIVE';

  // Estados del modal de matrícula y carnets QR
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isSectionQrModalOpen, setIsSectionQrModalOpen] = useState(false);
  const { data: school } = useGetActiveSchool();

  // Estados de paginación y filtros jerárquicos
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [classroomId, setClassroomId] = useState<string | undefined>(undefined);
  const [educationLevel, setEducationLevel] = useState<'INITIAL' | 'PRIMARY' | 'SECONDARY' | undefined>(undefined);

  const { data: response, isLoading, isError, refetch } = useStudents({
    page,
    limit,
    search,
    classroomId,
    educationLevel,
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

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {canManageStudents && (
            <Button
              variant="outline"
              onClick={() => setIsSectionQrModalOpen(true)}
              className="gap-2 shadow-sm border-primary/30 text-primary hover:bg-primary/10"
              title="Generar e imprimir carnets con QR por grado y sección en hoja A4"
            >
              <QrCode className="w-4 h-4" />
              <span>Carnets QR por Sección (PDF)</span>
            </Button>
          )}

          {canManageStudents && (
            <Button
              onClick={() => setIsEnrollModalOpen(true)}
              className="gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Matricular Estudiante</span>
            </Button>
          )}
        </div>
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
        />
      )}

      {/* Modal de Asistente de Matrícula */}
      <EnrollStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
      />

      {/* Modal de Carnets QR por Sección en A4 */}
      {isSectionQrModalOpen && (
        <SectionQrCardsModal
          initialClassroomId={classroomId}
          schoolName={school?.name}
          onClose={() => setIsSectionQrModalOpen(false)}
        />
      )}
    </div>
  );
};
