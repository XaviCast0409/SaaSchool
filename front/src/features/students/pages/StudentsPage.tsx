import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { useStudents } from '../api/useStudents';
import { StudentTable } from '../components/StudentTable';
import { Button } from '@/components/ui/button';

export const StudentsPage: React.FC = () => {
  const { data: students = [], isLoading, isError, refetch } = useStudents();

  return (
    <div className="space-y-6">
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
            Gestión completa de ficha de matrícula, ubigeo y demografía MINEDU.
          </p>
        </div>

        <Button className="gap-2 self-start md:self-auto">
          <UserPlus className="w-4 h-4" />
          <span>Matricular Estudiante</span>
        </Button>
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
        <StudentTable students={students} isLoading={isLoading} />
      )}
    </div>
  );
};
