import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Search, UserCheck, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Student } from '../types';
import { useUsers } from '@/features/users/api/useUsers';
import { StudentParentsPanel } from '@/features/users/family-relationships/components/StudentParentsPanel';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentTableProps {
  students: Student[];
  isLoading: boolean;
}

export const StudentTable: React.FC<StudentTableProps> = ({ students, isLoading }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const { data: allParents = [] } = useUsers('PARENT');

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
        <div className="font-medium text-foreground">
          {row.original.lastNamePaternal} {row.original.lastNameMaternal}, {row.original.firstNames}
        </div>
      ),
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
      accessorKey: 'motherTongue',
      header: 'Lengua Materna',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px]">
          {row.original.motherTongue}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Apoderados',
      cell: ({ row }) => {
        const isExpanded = expandedStudentId === row.original.id;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10"
            onClick={() => setExpandedStudentId(isExpanded ? null : row.original.id)}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Apoderados</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: students,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, DNI o código..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Render Table */}
      <div className="rounded-md border border-border bg-card shadow-sm">
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const isExpanded = expandedStudentId === row.original.id;
                return (
                  <React.Fragment key={row.id}>
                    <TableRow className="hover:bg-muted/30">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Subpanel desplegable para ver y vincular apoderados */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="p-0 bg-muted/20 border-t border-dashed border-border"
                        >
                          <StudentParentsPanel
                            studentId={row.original.id}
                            studentName={`${row.original.lastNamePaternal} ${row.original.lastNameMaternal}, ${row.original.firstNames}`}
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
                    <span>No se encontraron estudiantes matriculados.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} — Total:{' '}
          {table.getFilteredRowModel().rows.length} estudiantes
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 rounded border border-border hover:bg-accent disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 rounded border border-border hover:bg-accent disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};
