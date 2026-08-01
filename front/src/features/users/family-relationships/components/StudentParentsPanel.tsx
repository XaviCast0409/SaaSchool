import React, { useState } from 'react';
import { UserPlus, Trash2, Shield, CreditCard, Home } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudentParents, useDeleteRelationship } from '../api/useFamilyRelationships';
import { LinkParentModal } from './LinkParentModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DirectoryUser } from '@/features/users/types';

interface StudentParentsPanelProps {
  studentId: string;
  studentName: string;
  availableParents: DirectoryUser[];
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  GRANDPARENT: 'Abuelo/a',
  UNCLE_AUNT: 'Tío/a',
  OTHER: 'Apoderado',
};

export const StudentParentsPanel: React.FC<StudentParentsPanelProps> = ({
  studentId,
  studentName,
  availableParents,
}) => {
  const { user } = useAuthStore();
  const { data: relationships = [], isLoading } = useStudentParents(studentId);
  const { mutate: deleteRelationship, isPending: isDeleting } = useDeleteRelationship(studentId);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Apoderados registrados ({relationships.length})
        </span>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setIsLinkModalOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Vincular</span>
          </Button>
        )}
      </div>

      {/* Relationships List */}
      {relationships.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
          No hay apoderados vinculados. Haz clic en "Vincular" para agregar uno.
        </div>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30 gap-3"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {rel.user?.firstName} {rel.user?.lastNamePaternal} {rel.user?.lastNameMaternal}
                  </span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {RELATIONSHIP_LABELS[rel.relationshipType] || rel.relationshipType}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  {rel.user?.email} · {rel.user?.cellphone || 'Sin celular'}
                </div>

                {/* Badges de atributos */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {rel.isLegalGuardian && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      <Shield className="w-2.5 h-2.5" />
                      Apoderado Legal
                    </span>
                  )}
                  {rel.isFinancialResponsible && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                      <CreditCard className="w-2.5 h-2.5" />
                      Resp. Pago
                    </span>
                  )}
                  {rel.livesWithStudent && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      <Home className="w-2.5 h-2.5" />
                      Convive
                    </span>
                  )}
                </div>
              </div>

              {/* Desvincular */}
              {isAdmin && (
                <button
                  onClick={() => deleteRelationship(rel.id)}
                  disabled={isDeleting}
                  className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title="Desvincular apoderado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Vincular */}
      {isLinkModalOpen && (
        <LinkParentModal
          studentId={studentId}
          studentName={studentName}
          availableParents={availableParents}
          onClose={() => setIsLinkModalOpen(false)}
        />
      )}
    </div>
  );
};
