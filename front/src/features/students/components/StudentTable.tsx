import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Search, UserCheck, ChevronDown, ChevronUp, Users, Filter, Accessibility, BookOpen, Pencil, FileText, QrCode, FileSpreadsheet } from 'lucide-react';
import { Student } from '../types';
import { useAuthStore } from '@/store/useAuthStore';
import { useUsers } from '@/features/users/api/useUsers';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { StudentParentsPanel } from '@/features/users/family-relationships/components/StudentParentsPanel';
import { EditStudentModal } from './EditStudentModal';
import { StudentFichaModal } from './StudentFichaModal';
import { StudentQrCardModal } from './StudentQrCardModal';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  page: number;
  limit: number;
  search: string;
  classroomId?: string;
  educationLevel?: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSearchChange: (search: string) => void;
  onClassroomChange: (classroomId?: string) => void;
  onEducationLevelChange: (level?: 'INITIAL' | 'PRIMARY' | 'SECONDARY') => void;
  onExportNomina?: (classroomId?: string) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  isLoading,
  meta,
  page,
  limit,
  search,
  classroomId,
  educationLevel,
  onPageChange,
  onLimitChange,
  onSearchChange,
  onClassroomChange,
  onEducationLevelChange,
  onExportNomina,
}) => {
  const { user } = useAuthStore();
  const canManageStudents =
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMINISTRATIVE';

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedStudentForFicha, setSelectedStudentForFicha] = useState<string | null>(null);
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<Student | null>(null);

  const { data: allParents = [] } = useUsers('PARENT');
  const { data: classrooms = [] } = useClassrooms();
  const { data: school } = useGetActiveSchool();

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'studentCode',
      header: 'Código SIAGIE',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.original.studentCode || 'Sin Código'}
        </span>
      ),
    },
    {
      accessorFn: (row) => `${row.lastNamePaternal} ${row.lastNameMaternal}, ${row.firstNames}`,
      id: 'fullName',
      header: 'Apellidos y Nombres',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">
            {row.original.lastNamePaternal} {row.original.lastNameMaternal}, {row.original.firstNames}
          </div>
          {row.original.hasDisability && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              <Accessibility className="w-3 h-3" />
              {row.original.disabilityType || 'NEE / Discapacidad'}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'classroomInfo',
      header: 'Aula / Grado / Sección',
      cell: ({ row }) => {
        const activeEnrollment = row.original.enrollments?.find((e) => e.classroom);
        const classroom = activeEnrollment?.classroom;
        if (!classroom) {
          return <span className="text-xs text-muted-foreground italic">Sin asignación</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-semibold">
            <BookOpen className="w-3 h-3 text-primary" />
            {classroom.grade}° "{classroom.section}" - {classroom.educationLevel}
          </span>
        );
      },
    },
    {
      accessorKey: 'documentId',
      header: 'Documento',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.documentType}: <strong className="text-foreground">{row.original.documentId}</strong>
        </span>
      ),
    },
    {
      accessorKey: 'gender',
      header: 'Género',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {row.original.gender === 'MALE' ? 'Masculino' : 'Femenino'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const student = row.original;
        const isExpanded = expandedStudentId === student.id;

        return (
          <div className="flex items-center gap-1">
            {canManageStudents && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1 text-xs text-primary hover:bg-primary/10"
                onClick={() => setSelectedStudentForEdit(student)}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-xs text-primary hover:bg-primary/10"
              onClick={() => setSelectedStudentForQr(student)}
              title="Ver e Imprimir Carnet QR"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Carnet QR</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => setSelectedStudentForFicha(student.id)}
              title="Ver Ficha Única de Matrícula SIAGIE"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha SIAGIE</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Apoderados</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta?.totalPages || 1,
  });

  return (
    <div className="space-y-4">
      {/* Search and Hierarchy Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por apellidos o nombres del estudiante..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        {/* Filtros de Grado, Sección y Nivel */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold">Filtrar por:</span>
          </div>

          {/* Filtro por Aula Específica */}
          <select
            value={classroomId || ''}
            onChange={(e) => onClassroomChange(e.target.value || undefined)}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="">Todas las Aulas / Secciones</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° "{c.section}" - {c.educationLevel}
              </option>
            ))}
          </select>

          {/* Botón Rápido de Descarga Nómina SIAGIE del Aula */}
          {canManageStudents && onExportNomina && classroomId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportNomina(classroomId)}
              className="h-8 gap-1.5 text-xs rounded-xl border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs"
              title="Descargar Nómina Oficial SIAGIE (.xlsx) de esta sección"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Nómina SIAGIE</span>
            </Button>
          )}

          {/* Filtro por Nivel Educativo */}
          <select
            value={educationLevel || ''}
            onChange={(e) =>
              onEducationLevelChange(e.target.value ? (e.target.value as any) : undefined)
            }
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="">Todos los Niveles</option>
            <option value="INITIAL">Inicial</option>
            <option value="PRIMARY">Primaria</option>
            <option value="SECONDARY">Secundaria</option>
          </select>
        </div>
      </div>

      {/* Render Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-bold uppercase tracking-wider">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {students.length ? (
                students.map((student) => {
                  const isExpanded = expandedStudentId === student.id;
                  const activeEnrollment = student.enrollments?.find((e) => e.classroom);
                  const classroom = activeEnrollment?.classroom;

                  return (
                    <React.Fragment key={student.id}>
                      <TableRow className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {student.studentCode || 'Sin Código'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {student.lastNamePaternal} {student.lastNameMaternal}, {student.firstNames}
                            </div>
                            {student.hasDisability && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                <Accessibility className="w-3 h-3" />
                                {student.disabilityType || 'NEE / Discapacidad'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {classroom ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-semibold">
                              <BookOpen className="w-3 h-3 text-primary" />
                              {classroom.grade}° "{classroom.section}" - {classroom.educationLevel}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sin asignación</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {student.documentType}: <strong className="text-foreground">{student.documentId}</strong>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {student.gender === 'MALE' ? 'Masculino' : 'Femenino'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {canManageStudents && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 gap-1 text-xs text-primary hover:bg-primary/10"
                                onClick={() => setSelectedStudentForEdit(student)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 gap-1 text-xs text-primary hover:bg-primary/10 font-bold"
                              onClick={() => setSelectedStudentForQr(student)}
                              title="Ver e Imprimir Carnet QR"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Carnet QR</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => setSelectedStudentForFicha(student.id)}
                              title="Ver Ficha Única de Matrícula SIAGIE"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ficha SIAGIE</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                              onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Apoderados</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Subpanel desplegable para ver y vincular apoderados */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="p-0 bg-muted/20 border-t border-dashed border-border"
                          >
                            <StudentParentsPanel
                              studentId={student.id}
                              studentName={`${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`}
                              availableParents={allParents}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserCheck className="w-8 h-8 text-muted-foreground/50" />
                      <span>No se encontraron estudiantes con los filtros de Aula/Grado/Sección aplicados.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Componente de Paginación Conectado al Servidor Backend */}
          {meta && (
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              limit={limit}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
            />
          )}
        </div>
      )}

      {/* Modal de Edición de Estudiante */}
      <EditStudentModal
        student={selectedStudentForEdit}
        isOpen={!!selectedStudentForEdit}
        onClose={() => setSelectedStudentForEdit(null)}
      />

      {/* Modal de Ficha Única de Matrícula SIAGIE */}
      <StudentFichaModal
        studentId={selectedStudentForFicha}
        isOpen={Boolean(selectedStudentForFicha)}
        onClose={() => setSelectedStudentForFicha(null)}
      />

      {/* Modal de Carnet Escolar QR Individual */}
      {selectedStudentForQr && (
        <StudentQrCardModal
          studentName={`${selectedStudentForQr.lastNamePaternal} ${selectedStudentForQr.lastNameMaternal || ''}, ${selectedStudentForQr.firstNames}`.trim()}
          documentId={selectedStudentForQr.documentId}
          studentCode={selectedStudentForQr.studentCode}
          grade={selectedStudentForQr.enrollments?.[0]?.classroom?.grade || ''}
          section={selectedStudentForQr.enrollments?.[0]?.classroom?.section || ''}
          educationLevel={selectedStudentForQr.enrollments?.[0]?.classroom?.educationLevel || ''}
          schoolName={school?.name}
          onClose={() => setSelectedStudentForQr(null)}
        />
      )}
    </div>
  );
};
