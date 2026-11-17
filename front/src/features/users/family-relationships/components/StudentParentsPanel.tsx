import React, { useState } from 'react';
import { UserPlus, Trash2, Shield, CreditCard, Home, Phone, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentParents, useDeleteRelationship, useUpdateRelationship } from '../api/useFamilyRelationships';
import { LinkParentModal } from './LinkParentModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { confirmDialog } from '@/components/ui/confirm';
import { RELATIONSHIP_OPTIONS } from '../relationshipLabels';
import type { FamilyRelationship, RelationshipType } from '../types';

interface StudentParentsPanelProps {
  studentId: string;
  studentName: string;
}

type Flag = 'isLegalGuardian' | 'isFinancialResponsible' | 'livesWithStudent';

const FLAGS: Array<{ key: Flag; label: string; icon: React.ElementType; on: string; help: string }> = [
  {
    key: 'isLegalGuardian',
    label: 'Apoderado legal',
    icon: Shield,
    on: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    help: 'Figura como apoderado oficial (SIAGIE)',
  },
  {
    key: 'isFinancialResponsible',
    label: 'Responsable de pago',
    icon: CreditCard,
    on: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    help: 'Recibe los recordatorios de pensión y figura en las boletas',
  },
  {
    key: 'livesWithStudent',
    label: 'Vive con el alumno',
    icon: Home,
    on: 'border-border bg-muted text-foreground',
    help: 'Vive en el mismo domicilio que el alumno',
  },
];

/** Apoderados de un alumno: ver, vincular, marcar roles y desvincular (Dirección y Secretaría). */
export const StudentParentsPanel: React.FC<StudentParentsPanelProps> = ({ studentId, studentName }) => {
  const { data: relationships = [], isLoading, isError, refetch } = useStudentParents(studentId);
  const { mutateAsync: deleteRelationship } = useDeleteRelationship(studentId);
  const { mutate: updateRelationship, isPending: isUpdating } = useUpdateRelationship(studentId);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const fullName = (rel: FamilyRelationship) =>
    [rel.user?.firstName, rel.user?.lastNamePaternal, rel.user?.lastNameMaternal].filter(Boolean).join(' ');

  const update = (rel: FamilyRelationship, patch: Partial<Record<Flag, boolean>> & { relationshipType?: RelationshipType }) =>
    updateRelationship(
      { id: rel.id, ...patch },
      { onError: (err: any) => toast.error(err?.response?.data?.message || 'No se pudo guardar el cambio.') },
    );

  const unlink = async (rel: FamilyRelationship) => {
    const ok = await confirmDialog({
      title: '¿Desvincular a este apoderado?',
      description: `${fullName(rel)} dejará de ver notas, asistencia y avisos de ${studentName}. Su cuenta no se borra y puedes volver a vincularlo.`,
      confirmText: 'Desvincular',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteRelationship(rel.id);
      toast.success('Apoderado desvinculado.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo desvincular.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
        No se pudieron cargar los apoderados.
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const noPayer = relationships.length > 0 && !relationships.some((r) => r.isFinancialResponsible);

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Apoderados de {studentName}</span>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setIsLinkModalOpen(true)}>
          <UserPlus className="w-3.5 h-3.5" />
          Vincular
        </Button>
      </div>

      {relationships.length === 0 ? (
        <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-5 text-center text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">Este alumno no tiene apoderados vinculados.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sin apoderado, nadie de la familia recibe avisos ni puede ver notas o asistencia.
          </p>
        </div>
      ) : (
        <>
          {noPayer && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Nadie está marcado como responsable de pago: los recordatorios de pensión no tendrán a quién llegar.
            </p>
          )}
          <ul className="space-y-2">
            {relationships.map((rel) => (
              <li key={rel.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{fullName(rel)}</span>
                      <select
                        value={rel.relationshipType}
                        onChange={(e) => update(rel, { relationshipType: e.target.value as RelationshipType })}
                        disabled={isUpdating}
                        aria-label={`Parentesco de ${fullName(rel)}`}
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {RELATIONSHIP_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {rel.user?.cellphone ? (
                        <a href={`tel:${rel.user.cellphone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                          <Phone className="w-3 h-3" />
                          {rel.user.cellphone}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Sin celular
                        </span>
                      )}
                      {rel.user?.email && (
                        <a href={`mailto:${rel.user.email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-foreground">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{rel.user.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => unlink(rel)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Desvincular a ${fullName(rel)}`}
                    title="Desvincular apoderado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Marcas: se activan o desactivan con un toque */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FLAGS.map(({ key, label, icon: Icon, on, help }) => {
                    const active = rel[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        disabled={isUpdating}
                        onClick={() => update(rel, { [key]: !active })}
                        title={help}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                          active ? on : 'border-dashed border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {isLinkModalOpen && (
        <LinkParentModal
          studentId={studentId}
          studentName={studentName}
          linkedUserIds={relationships.map((r) => r.userId)}
          onClose={() => setIsLinkModalOpen(false)}
        />
      )}
    </div>
  );
};
