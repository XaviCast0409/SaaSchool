import React, { memo } from 'react';
import { Pencil, KeyRound, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DirectoryUser } from '../../types';

interface UserRowActionsProps {
  user: DirectoryUser;
  canManageUser: boolean;
  canResetPassword: boolean;
  canDeactivate: boolean;
  isResetting: boolean;
  isDeactivating: boolean;
  isReactivating: boolean;
  onEdit: (user: DirectoryUser) => void;
  onResetPassword: (user: DirectoryUser) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  renderExtraActions?: (user: DirectoryUser) => React.ReactNode;
}

export const UserRowActions: React.FC<UserRowActionsProps> = memo(({
  user,
  canManageUser,
  canResetPassword,
  canDeactivate,
  isResetting,
  isDeactivating,
  isReactivating,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  renderExtraActions,
}) => {
  return (
    <div className="flex items-center gap-1.5">
      {canManageUser && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
          onClick={() => onEdit(user)}
          title="Editar"
          aria-label={`Editar a ${user.firstName} ${user.lastNamePaternal}`}
        >
          <Pencil className="w-3.5 h-3.5 2xl:mr-1" />
          <span className="hidden 2xl:inline">Editar</span>
        </Button>
      )}

      {canResetPassword && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 font-semibold"
          onClick={() => onResetPassword(user)}
          disabled={isResetting}
          title="Restablecer clave temporal"
          aria-label={`Restablecer la clave de ${user.firstName} ${user.lastNamePaternal}`}
        >
          <KeyRound className="w-3.5 h-3.5 2xl:mr-1" />
          <span className="hidden 2xl:inline">Restablecer clave</span>
        </Button>
      )}

      {renderExtraActions?.(user)}

      {canDeactivate &&
        (user.isActive ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDeactivate(user.id)}
            disabled={isDeactivating}
            title="Desactivar"
            aria-label={`Desactivar a ${user.firstName} ${user.lastNamePaternal}`}
          >
            <UserX className="w-3.5 h-3.5 2xl:mr-1" />
            <span className="hidden 2xl:inline">Desactivar</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
            onClick={() => onReactivate(user.id)}
            disabled={isReactivating}
            title="Reactivar"
            aria-label={`Reactivar a ${user.firstName} ${user.lastNamePaternal}`}
          >
            <UserCheck className="w-3.5 h-3.5 2xl:mr-1" />
            <span className="hidden 2xl:inline">Reactivar</span>
          </Button>
        ))}
    </div>
  );
});

UserRowActions.displayName = 'UserRowActions';
