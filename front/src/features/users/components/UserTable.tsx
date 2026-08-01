import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Search, UserX, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useDeactivateUser, useReactivateUser } from '../api/useUserMutations';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StudentParentsPanel } from '../family-relationships/components/StudentParentsPanel';
import type { DirectoryUser } from '../types';

import { useAuthStore } from '@/store/useAuthStore';

interface UserTableProps {
  users: DirectoryUser[];
  isLoading: boolean;
  /** Solo para PARENT: lista de padres disponibles para vincular a alumnos */
  allParents?: DirectoryUser[];
  /** Solo para columnas de Apoderado: mostrar subpanel de alumnos vinculados */
  showStudentLinks?: boolean;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  allParents = [],
  showStudentLinks = false,
}) => {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [globalFilter, setGlobalFilter] = useState('');
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  const { mutate: deactivate, isPending: isDeactivating } = useDeactivateUser();
  const { mutate: reactivate, isPending: isReactivating } = useReactivateUser();

  const columns: ColumnDef<DirectoryUser>[] = [
    {
      accessorFn: (row) =>
        `${row.lastNamePaternal} ${row.lastNameMaternal}, ${row.firstName}`,
      id: 'fullName',
      header: 'Apellidos y Nombres',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground text-sm">
            {row.original.lastNamePaternal} {row.original.lastNameMaternal}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.firstName}</div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Correo',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'documentId',
      header: 'Documento',
      cell: ({ row }) => (
        <span className="text-xs font-mono">
          {row.original.documentType}: {row.original.documentId || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'cellphone',
      header: 'Celular',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.cellphone || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="destructive">Inactivo</Badge>
        ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const user = row.original;
        const isParent = user.role === 'PARENT';

        return (
          <div className="flex items-center gap-1.5">
            {/* Toggle Activo/Inactivo (Solo Admins) */}
            {isAdmin &&
              (user.isActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deactivate(user.id)}
                  disabled={isDeactivating}
                >
                  <UserX className="w-3.5 h-3.5 mr-1" />
                  Desactivar
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                  onClick={() => reactivate(user.id)}
                  disabled={isReactivating}
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Reactivar
                </Button>
              ))}

            {/* Expand Apoderado → ver alumnos vinculados */}
            {showStudentLinks && isParent && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  setExpandedParentId(
                    expandedParentId === user.id ? null : user.id
                  )
                }
              >
                {expandedParentId === user.id ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter },
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
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, DNI o correo..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-bold uppercase tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow className="hover:bg-muted/30">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Subpanel de alumnos vinculados al apoderado */}
                  {showStudentLinks &&
                    row.original.role === 'PARENT' &&
                    expandedParentId === row.original.id && (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="p-0 bg-muted/20 border-t border-dashed border-border"
                        >
                          <div className="px-4 py-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Alumnos vinculados a este apoderado:
                            </p>
                            <StudentParentsPanel
                              studentId={row.original.id}
                              studentName={`${row.original.firstName} ${row.original.lastNamePaternal}`}
                              availableParents={allParents}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} —{' '}
          {table.getFilteredRowModel().rows.length} registros
        </span>
        <div className="flex gap-2">
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
