import React from 'react';
import {
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
  Phone,
  Mail,
  AlertTriangle,
  Shield,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatFullName } from '@/lib/utils';
import { relationshipLabel } from '@/features/users/family-relationships/relationshipLabels';
import type { FamilyMember } from '@/features/users/api/useFamilies';

interface FamilyMemberRowProps {
  member: FamilyMember;
  onOpenStudent: (studentName: string) => void;
  onEdit: (member: FamilyMember) => void;
  onResetPassword: (member: FamilyMember) => void;
  onToggleActive: (member: FamilyMember) => void;
}

export const FamilyMemberRow: React.FC<FamilyMemberRowProps> = ({
  member: u,
  onOpenStudent,
  onEdit,
  onResetPassword,
  onToggleActive,
}) => {
  const memberName = `${u.firstName} ${u.lastNamePaternal}`;

  return (
    <li className="relative flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
      <div className="min-w-0 pr-10 sm:w-72 sm:shrink-0 sm:pr-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-foreground">{formatFullName(u, 'LAST_FIRST')}</p>
          {!u.isActive && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
              Inactivo
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {u.documentId && (
            <span>
              {u.documentType} {u.documentId}
            </span>
          )}
          {u.cellphone && (
            <a href={`tel:${u.cellphone}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="w-3 h-3" />
              {u.cellphone}
            </a>
          )}
          {u.email && (
            <a href={`mailto:${u.email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-foreground">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{u.email}</span>
            </a>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {u.familyRelations.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Sin hijos vinculados · vincúlalo desde la ficha del alumno
          </span>
        ) : (
          u.familyRelations.map((rel) => (
            <button
              key={rel.id}
              type="button"
              onClick={() => onOpenStudent(`${rel.student.lastNamePaternal} ${rel.student.firstNames}`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-primary/5"
              title="Ver al alumno en la lista"
            >
              <span className="font-semibold text-foreground">
                {rel.student.firstNames.split(' ')[0]} {rel.student.lastNamePaternal}
              </span>
              <span className="text-muted-foreground">· {relationshipLabel(rel.relationshipType)}</span>
              {rel.isLegalGuardian && (
                <Shield
                  className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
                  aria-label="Apoderado legal"
                />
              )}
              {rel.isFinancialResponsible && (
                <CreditCard
                  className="w-3 h-3 text-blue-600 dark:text-blue-400"
                  aria-label="Responsable de pago"
                />
              )}
            </button>
          ))
        )}
      </div>

      <div className="absolute right-2 top-2 sm:static sm:ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Acciones para ${memberName}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={Pencil} onSelect={() => onEdit(u)}>
              Editar datos
            </DropdownMenuItem>
            {(u.documentId || u.email) && (
              <DropdownMenuItem
                icon={KeyRound}
                hint="Clave temporal para entrar a la app"
                onSelect={() => onResetPassword(u)}
              >
                Restablecer contraseña
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              icon={u.isActive ? UserX : UserCheck}
              destructive={u.isActive}
              onSelect={() => onToggleActive(u)}
            >
              {u.isActive ? 'Desactivar cuenta' : 'Reactivar cuenta'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
};
