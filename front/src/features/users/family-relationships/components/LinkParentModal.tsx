import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, X } from 'lucide-react';
import { linkParentSchema, type LinkParentFormData } from '../schemas/link-parent.schema';
import { useLinkParent } from '../api/useFamilyRelationships';
import { Button } from '@/components/ui/button';
import type { DirectoryUser } from '@/features/users/types';

interface LinkParentModalProps {
  studentId: string;
  studentName: string;
  availableParents: DirectoryUser[];
  onClose: () => void;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  GRANDPARENT: 'Abuelo/a',
  UNCLE_AUNT: 'Tío/a',
  OTHER: 'Otro apoderado',
};

export const LinkParentModal: React.FC<LinkParentModalProps> = ({
  studentId,
  studentName,
  availableParents,
  onClose,
}) => {
  const { mutate: linkParent, isPending, error } = useLinkParent();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LinkParentFormData>({
    resolver: zodResolver(linkParentSchema),
    defaultValues: {
      studentId,
      isLegalGuardian: false,
      isFinancialResponsible: false,
      livesWithStudent: true,
    },
  });

  const onSubmit = (data: LinkParentFormData) => {
    linkParent(data, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="font-semibold text-base text-foreground">Vincular Apoderado</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alumno: <strong>{studentName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Error al vincular el apoderado.'}
            </div>
          )}

          {/* Hidden studentId */}
          <input type="hidden" {...register('studentId')} />

          {/* Apoderado Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Apoderado (PARENT)
            </label>
            <select
              {...register('userId')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Seleccionar apoderado —</option>
              {availableParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.lastNamePaternal} {parent.lastNameMaternal}, {parent.firstName} —{' '}
                  {parent.documentId || parent.email}
                </option>
              ))}
            </select>
            {errors.userId && (
              <p className="text-xs text-destructive">{errors.userId.message}</p>
            )}
          </div>

          {/* Tipo de Relación */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Tipo de Relación
            </label>
            <select
              {...register('relationshipType')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Seleccionar tipo —</option>
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.relationshipType && (
              <p className="text-xs text-destructive">{errors.relationshipType.message}</p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-2.5 pt-1">
            {[
              { name: 'isLegalGuardian' as const, label: 'Es Apoderado Legal (oficial SIAGIE)' },
              { name: 'isFinancialResponsible' as const, label: 'Responsable de Pagos / Boletas' },
              { name: 'livesWithStudent' as const, label: 'Vive con el estudiante' },
            ].map(({ name, label }) => (
              <label key={name} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register(name)}
                  className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  {label}
                </span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span>Vincular Apoderado</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
