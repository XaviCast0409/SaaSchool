import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Search, UserX, UserCheck, Pencil } from 'lucide-react';
import { useDeactivateUser, useReactivateUser } from '../api/useUserMutations';
import { EditUserModal } from './EditUserModal';
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
import type { DirectoryUser } from '../types';
import { useAuthStore } from '@/store/useAuthStore';

interface UserTableProps {
  users: DirectoryUser[];
  isLoading: boolean;
  /** Opción para subpaneles si fuera necesario */
  showStudentLinks?: boolean;
}

const ROLE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  TEACHER: {
    label: 'Profesor / Docente',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 font-bold',
  },
  ADMINISTRATIVE: {
    label: 'Secretaría / Caja',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold',
  },
  SCHOOL_ADMIN: {
    label: 'Director / Promotor',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold',
  },
  PARENT: {
    label: 'Apoderado / Padre',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold',
  },
};

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
}) => {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<DirectoryUser | null>(null);

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
      accessorKey: 'role',
      header: 'Cargo / Rol Institucional',
      cell: ({ row }) => {
        const role = row.original.role;
        const config = ROLE_CONFIG[role] || {
          label: role,
          badgeClass: 'bg-muted text-muted-foreground border-border',
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${config.badgeClass}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Correo Electrónico',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[180px] block font-mono">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'documentId',
      header: 'Documento ID',
      cell: ({ row }) => (
        <span className="text-xs font-mono">
          {row.original.documentType}: {row.original.documentId || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'cellphone',
      header: 'Celular / Teléfono',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
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

        return (
          <div className="flex items-center gap-1.5">
            {/* Botón Editar Usuario (Solo Admins) */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                onClick={() => setSelectedUserForEdit(user)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            )}

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
          placeholder="Buscar personal por nombre, DNI o correo..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9 h-9 text-xs rounded-xl"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
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
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No se encontraron miembros del personal en esta lista.
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
          {table.getFilteredRowModel().rows.length} miembros del personal
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 rounded-lg border border-border hover:bg-accent disabled:opacity-40 font-medium"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 rounded-lg border border-border hover:bg-accent disabled:opacity-40 font-medium"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal de Edición de Usuario */}
      <EditUserModal
        user={selectedUserForEdit}
        isOpen={!!selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
      />
    </div>
  );
};
