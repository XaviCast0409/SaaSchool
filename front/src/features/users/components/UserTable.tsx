import { confirmDialog } from '@/components/ui/confirm';
import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { useDeactivateUser, useReactivateUser } from '../api/useUserMutations';
import { useResetUserPassword } from '../api/useUsers';
import { EditUserModal } from './EditUserModal';
import { UserAvatar } from '@/components/ui/user-avatar';
import { TemporaryCredentialsDialog, type TemporaryCredential } from '@/components/ui/TemporaryCredentialsDialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatFullName } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DirectoryUser } from '../types';
import { useAuthStore } from '@/store/useAuthStore';
import { canManage } from '../rules';
import { getApiErrorMessage } from '@/lib/errors';
import { USER_TABLE_ROLE_CONFIG } from '../constants';
import { UserRowActions } from './user-table/UserRowActions';

interface UserTableProps {
  users: DirectoryUser[];
  isLoading: boolean;
  showStudentLinks?: boolean;
  renderExtraActions?: (user: DirectoryUser) => React.ReactNode;
}

export const UserTable: React.FC<UserTableProps> = ({ users, isLoading, renderExtraActions }) => {
  const { user: currentUser } = useAuthStore();

  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<DirectoryUser | null>(null);

  const { mutate: deactivate, isPending: isDeactivating } = useDeactivateUser();
  const { mutate: reactivate, isPending: isReactivating } = useReactivateUser();
  const { mutateAsync: resetPassword, isPending: isResetting } = useResetUserPassword();
  const [tempCredentials, setTempCredentials] = useState<TemporaryCredential[] | null>(null);

  const handleResetPassword = async (user: DirectoryUser) => {
    if (
      await confirmDialog({
        title: '¿Restablecer la contraseña?',
        description: `Se generará una contraseña temporal para ${user.firstName} ${user.lastNamePaternal}.`,
        confirmText: 'Restablecer',
      })
    ) {
      try {
        const data = await resetPassword({ userId: user.id });
        setTempCredentials([
          {
            name: `${user.firstName} ${user.lastNamePaternal}`,
            login: user.email || user.documentId || '',
            password: data.temporaryPassword,
          },
        ]);
        toast.success('Contraseña temporal generada con éxito');
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Error al restablecer contraseña'));
      }
    }
  };

  const columns: ColumnDef<DirectoryUser>[] = [
    {
      accessorFn: (row) => formatFullName(row, 'LAST_FIRST'),
      id: 'fullName',
      header: 'Apellidos y Nombres',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={formatFullName(row.original, 'FIRST_LAST')} src={row.original.avatarUrl} />
          <div>
            <div className="font-semibold text-foreground text-sm">
              {[row.original.lastNamePaternal, row.original.lastNameMaternal].filter(Boolean).join(' ')}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.firstName}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Cargo / Rol Institucional',
      cell: ({ row }) => {
        const role = row.original.role;
        const config = USER_TABLE_ROLE_CONFIG[role] || {
          label: role,
          badgeClass: 'bg-muted text-muted-foreground border-border',
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${config.badgeClass}`}>
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
        <span className="text-xs text-muted-foreground font-mono">{row.original.cellphone || '—'}</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) =>
        row.original.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const user = row.original;
        const canManageUser = canManage(currentUser?.role, user.role);
        const canResetPassword = canManageUser && Boolean(user.documentId || user.email);
        const canDeactivate = canManageUser && currentUser?.id !== user.id;

        return (
          <UserRowActions
            user={user}
            canManageUser={canManageUser}
            canResetPassword={canResetPassword}
            canDeactivate={canDeactivate}
            isResetting={isResetting}
            isDeactivating={isDeactivating}
            isReactivating={isReactivating}
            onEdit={setSelectedUserForEdit}
            onResetPassword={handleResetPassword}
            onDeactivate={deactivate}
            onReactivate={reactivate}
            renderExtraActions={renderExtraActions}
          />
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
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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

      <EditUserModal
        user={selectedUserForEdit}
        isOpen={!!selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
      />

      {tempCredentials && (
        <TemporaryCredentialsDialog
          open={!!tempCredentials}
          onOpenChange={(open) => !open && setTempCredentials(null)}
          title="Credenciales temporales del personal"
          description="Comparta estas credenciales de forma segura. El usuario deberá cambiar su contraseña en el primer inicio de sesión."
          credentials={tempCredentials}
        />
      )}
    </div>
  );
};
