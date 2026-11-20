import { getApiErrorMessage } from '@/lib/errors';
import React, { useState } from 'react';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLinkParent } from '../api/useFamilyRelationships';
import { RELATIONSHIP_OPTIONS } from '../relationshipLabels';
import type { RelationshipType } from '../types';
import { useFamilies } from '@/features/users/api/useFamilies';
import { UserFormModal } from '@/features/users/components/UserFormModal';
import type { DirectoryUser } from '@/features/users/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { formatFullName } from '@/lib/utils';

interface LinkParentModalProps {
  studentId: string;
  studentName: string;
  /** Apoderados ya vinculados (no se ofrecen otra vez) */
  linkedUserIds?: string[];
  onClose: () => void;
}

type Picked = Pick<
  DirectoryUser,
  'id' | 'firstName' | 'lastNamePaternal' | 'lastNameMaternal' | 'documentId' | 'email'
>;

/**
 * Vincular un apoderado a un alumno: se busca la cuenta por nombre, DNI o correo
 * (en el servidor, no una lista de todos) o se registra una nueva sin salir de aquí.
 */
export const LinkParentModal: React.FC<LinkParentModalProps> = ({
  studentId,
  studentName,
  linkedUserIds = [],
  onClose,
}) => {
  const { mutate: linkParent, isPending } = useLinkParent();
  const [term, setTerm] = useState('');
  const search = useDebouncedValue(term.trim(), 300);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType | ''>('');
  const [flags, setFlags] = useState({ isLegalGuardian: false, isFinancialResponsible: false, livesWithStudent: true });
  const [creating, setCreating] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const searching = search.length >= 2;
  const { data, isFetching } = useFamilies({ search, limit: 8 }, searching && !picked);
  const results = searching ? (data?.data ?? []).filter((u) => u.isActive) : [];

  const submit = () => {
    setTriedSubmit(true);
    if (!picked || !relationshipType) return;
    linkParent(
      { studentId, userId: picked.id, relationshipType, ...flags },
      {
        onSuccess: () => {
          toast.success(`${picked.firstName} ${picked.lastNamePaternal} quedó vinculado(a) a ${studentName}.`);
          onClose();
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo vincular al apoderado.')),
      },
    );
  };

  if (creating) {
    return (
      <UserFormModal defaultRole="PARENT" onCreated={(user) => setPicked(user)} onClose={() => setCreating(false)} />
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Vincular apoderado"
      description={`Alumno: ${studentName}`}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} isLoading={isPending} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Vincular
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 1. Quién */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="link-parent-search">
            Apoderado
          </label>
          {picked ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{formatFullName(picked, 'LAST_FIRST')}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {picked.documentId || picked.email || 'Sin documento'}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="link-parent-search"
                  autoFocus
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Nombre, apellidos, DNI o correo"
                  className="pl-9 pr-9"
                  autoComplete="off"
                />
                {isFetching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {searching && (
                <ul
                  className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border"
                  role="listbox"
                >
                  {results.map((u) => {
                    const linked = linkedUserIds.includes(u.id);
                    const children = u.familyRelations?.map((r) => r.student.firstNames).join(', ');
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          disabled={linked}
                          onClick={() => setPicked(u)}
                          className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {formatFullName(u, 'LAST_FIRST')}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {u.documentId || u.email}
                              {children ? ` · Hijos: ${children}` : ''}
                            </span>
                          </span>
                          {linked && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                              <Check className="w-3.5 h-3.5" /> Ya vinculado
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {!isFetching && results.length === 0 && (
                    <li className="px-3 py-3 text-sm text-muted-foreground">
                      Ningún apoderado coincide con «{search}».
                    </li>
                  )}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="text-sm font-medium text-primary hover:underline underline-offset-2"
              >
                ¿No tiene cuenta? Registrar nuevo apoderado
              </button>
            </>
          )}
          {triedSubmit && !picked && <p className="text-xs text-destructive">Busca y elige al apoderado.</p>}
        </div>

        {/* 2. Parentesco */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="link-parent-relationship">
            Parentesco
          </label>
          <select
            id="link-parent-relationship"
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Elegir…</option>
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {triedSubmit && !relationshipType && <p className="text-xs text-destructive">Elige el parentesco.</p>}
        </div>

        {/* 3. Marcas */}
        <fieldset className="space-y-2">
          <legend className="sr-only">Marcas del apoderado</legend>
          {[
            {
              key: 'isLegalGuardian' as const,
              label: 'Apoderado legal',
              hint: 'Figura como apoderado oficial (SIAGIE)',
            },
            {
              key: 'isFinancialResponsible' as const,
              label: 'Responsable de pago',
              hint: 'Recibe los recordatorios de pensión',
            },
            { key: 'livesWithStudent' as const, label: 'Vive con el alumno', hint: undefined },
          ].map(({ key, label, hint }) => (
            <label key={key} className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">
                {label}
                {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </Modal>
  );
};
