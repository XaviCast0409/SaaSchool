import React, { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Users, AlertTriangle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useFamilies, type FamilyMember } from '@/features/users/api/useFamilies';
import { useResetUserPassword } from '@/features/users/api/useUsers';
import { useDeactivateUser, useReactivateUser } from '@/features/users/api/useUserMutations';
import { EditUserModal } from '@/features/users/components/EditUserModal';
import { UserFormModal } from '@/features/users/components/UserFormModal';
import { TemporaryCredentialsDialog, type TemporaryCredential } from '@/components/ui/TemporaryCredentialsDialog';
import { confirmDialog } from '@/components/ui/confirm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { getApiErrorMessage } from '@/lib/errors';
import { FamilyMemberRow } from './families-panel/FamilyMemberRow';

interface FamiliesPanelProps {
  search: string;
  page: number;
  limit: number;
  unlinked: boolean;
  onChange: (patch: { fq?: string; fpage?: number; flimit?: number; unlinked?: boolean }) => void;
  /** Abrir la lista de alumnos buscando a este hijo */
  onOpenStudent: (studentName: string) => void;
}

/** Familias del colegio: cada apoderado con sus hijos vinculados. Dirección y Secretaría. */
export const FamiliesPanel: React.FC<FamiliesPanelProps> = ({
  search,
  page,
  limit,
  unlinked,
  onChange,
  onOpenStudent,
}) => {
  const { data, isLoading, isFetching, isError, refetch } = useFamilies({ search, page, limit, unlinked });
  const families = data?.data ?? [];
  const meta = data?.meta;

  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<TemporaryCredential[] | null>(null);
  const { mutateAsync: resetPassword } = useResetUserPassword();
  const { mutateAsync: deactivate } = useDeactivateUser();
  const { mutateAsync: reactivate } = useReactivateUser();

  const [term, setTerm] = useState(search);
  const debounced = useDebouncedValue(term, 300);

  const pushed = useRef(search);
  useEffect(() => {
    const next = debounced.trim();
    if (next !== search) {
      pushed.current = next;
      onChange({ fq: next, fpage: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    if (search !== pushed.current) {
      pushed.current = search;
      setTerm(search);
    }
  }, [search]);

  const name = (u: FamilyMember) => `${u.firstName} ${u.lastNamePaternal}`;

  const onReset = async (u: FamilyMember) => {
    if (
      !(await confirmDialog({
        title: '¿Restablecer la contraseña?',
        description: `Se generará una contraseña temporal para ${name(u)}. La actual dejará de funcionar.`,
        confirmText: 'Restablecer',
      }))
    )
      return;
    try {
      const res = await resetPassword({ userId: u.id });
      setTempCredentials([{ name: name(u), login: u.documentId || u.email, password: res.temporaryPassword }]);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo restablecer la contraseña.'));
    }
  };

  const onToggleActive = async (u: FamilyMember) => {
    if (u.isActive) {
      const ok = await confirmDialog({
        title: `¿Desactivar la cuenta de ${name(u)}?`,
        description:
          'No podrá entrar a la app ni recibirá avisos. Sus vínculos con los alumnos se conservan y puedes reactivarla cuando quieras.',
        confirmText: 'Desactivar',
        variant: 'danger',
      });
      if (!ok) return;
    }
    try {
      await (u.isActive ? deactivate(u.id) : reactivate(u.id));
      toast.success(u.isActive ? 'Cuenta desactivada.' : 'Cuenta reactivada.');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar la cuenta.'));
    }
  };

  const hasFilters = Boolean(search || unlinked);

  return (
    <div className="space-y-4">
      {/* Búsqueda y filtros */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar apoderado por nombre, DNI o correo"
            className="h-9 pl-9 pr-9"
            aria-label="Buscar apoderado"
          />
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={unlinked}
            onClick={() => onChange({ unlinked: !unlinked, fpage: 1 })}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              unlinked
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                : 'border-input text-muted-foreground hover:text-foreground'
            }`}
            title="Cuentas de apoderado sin ningún hijo vinculado"
          >
            <AlertTriangle className="w-4 h-4" />
            Sin hijos vinculados
          </button>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-muted-foreground"
              onClick={() => onChange({ fq: '', unlinked: false, fpage: 1 })}
            >
              <X className="w-4 h-4" /> Limpiar
            </Button>
          )}
          <Button size="sm" className="h-9 gap-1.5 sm:ml-auto" onClick={() => setCreating(true)}>
            <UserPlus className="w-4 h-4" /> Registrar apoderado
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
          <p className="font-semibold">No se pudo cargar la lista de familias.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : families.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={
            search
              ? `Ningún apoderado coincide con «${search}»`
              : unlinked
                ? 'Todos los apoderados tienen al menos un hijo vinculado'
                : 'Aún no hay apoderados registrados'
          }
          description={
            hasFilters
              ? undefined
              : 'Se crean al matricular a un alumno, con la carga masiva desde Excel o con «Registrar apoderado».'
          }
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={() => onChange({ fq: '', unlinked: false, fpage: 1 })}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-opacity ${isFetching ? 'opacity-70' : ''}`}
        >
          <ul className="divide-y divide-border">
            {families.map((u) => (
              <FamilyMemberRow
                key={u.id}
                member={u}
                onOpenStudent={onOpenStudent}
                onEdit={setEditing}
                onResetPassword={onReset}
                onToggleActive={onToggleActive}
              />
            ))}
          </ul>
          {meta && (
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              limit={limit}
              onPageChange={(p) => onChange({ fpage: p })}
              onLimitChange={(l) => onChange({ flimit: l, fpage: 1 })}
            />
          )}
        </div>
      )}

      <EditUserModal user={editing} isOpen={!!editing} onClose={() => setEditing(null)} />
      {creating && <UserFormModal defaultRole="PARENT" onClose={() => setCreating(false)} />}
      {tempCredentials && (
        <TemporaryCredentialsDialog
          open
          onClose={() => setTempCredentials(null)}
          title="Contraseña restablecida"
          credentials={tempCredentials}
        />
      )}
    </div>
  );
};
