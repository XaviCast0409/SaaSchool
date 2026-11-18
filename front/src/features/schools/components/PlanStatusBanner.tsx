import React from 'react';
import { AlertTriangle, Lock, LogOut } from 'lucide-react';
import type { School } from '../types';
import { Button } from '@/components/ui/button';
import { formatPeruShortDate } from '@/lib/dateUtils';

/** Roles que gestionan la suscripción y reciben el aviso antes de que se limite el acceso */
const MANAGER_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'SUPER_ADMIN'];
const WARN_DAYS_BEFORE = 7;

interface PlanStatusBannerProps {
  school: School | null | undefined;
  role: string;
}

/**
 * Aviso del ciclo de vencimiento del plan (lo calcula el back en school.planStatus):
 * próximo a vencer y en gracia → solo a la dirección; solo lectura → a todos.
 */
export const PlanStatusBanner: React.FC<PlanStatusBannerProps> = ({ school, role }) => {
  const status = school?.planStatus;
  if (!status) return null;

  const isManager = MANAGER_ROLES.includes(role);
  const { access, daysUntilExpiry, readOnlyFrom, blockedFrom } = status;

  let tone: 'warn' | 'danger';
  let text: React.ReactNode;

  if (access === 'ACTIVE') {
    if (!isManager || daysUntilExpiry === null || daysUntilExpiry > WARN_DAYS_BEFORE) return null;
    tone = 'warn';
    text = (
      <>
        <strong>
          La suscripción{' '}
          {daysUntilExpiry === 0 ? 'vence hoy' : `vence en ${daysUntilExpiry} día${daysUntilExpiry === 1 ? '' : 's'}`}.
        </strong>{' '}
        Renuévala para no perder acceso.
      </>
    );
  } else if (access === 'GRACE') {
    if (!isManager) return null;
    tone = 'warn';
    text = (
      <>
        <strong>La suscripción está vencida.</strong> Todo sigue funcionando hasta el{' '}
        {readOnlyFrom ? formatPeruShortDate(readOnlyFrom) : 'fin del periodo de gracia'}; desde ese día la plataforma
        quedará en solo lectura.
      </>
    );
  } else if (access === 'READ_ONLY') {
    tone = 'danger';
    text = (
      <>
        <strong>Modo solo lectura:</strong> la suscripción del colegio está vencida. Puedes consultar la información,
        pero no registrar ni modificar datos.
        {isManager && blockedFrom && <> El acceso se suspenderá el {formatPeruShortDate(blockedFrom)}.</>}
      </>
    );
  } else {
    // BLOCKED: la pantalla completa la muestra PlanBlockedScreen; aquí solo queda para soporte
    if (role !== 'SUPER_ADMIN') return null;
    tone = 'danger';
    text = (
      <>
        <strong>Plan vencido, colegio sin acceso.</strong> Solo soporte puede ver y modificar sus datos.
      </>
    );
  }

  const styles =
    tone === 'warn'
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
      : 'bg-destructive/10 border-destructive/30 text-destructive';

  return (
    <div
      role="status"
      data-priority={tone === 'danger' ? 'high' : undefined}
      className={`border-b px-4 py-2.5 text-xs flex items-start gap-2 print:hidden ${styles}`}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
      <span>{text}</span>
    </div>
  );
};

/** Pantalla que reemplaza la app cuando el plan del colegio ya está bloqueado */
export const PlanBlockedScreen: React.FC<{ school: School; onLogout: () => void }> = ({ school, onLogout }) => (
  <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <Lock className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-bold text-foreground">Acceso suspendido</h1>
        <p className="text-sm text-muted-foreground">
          La suscripción de <strong className="text-foreground">{school.name}</strong> venció
          {school.planExpiresAt ? ` el ${formatPeruShortDate(school.planExpiresAt)}` : ''}. Para volver a usar la
          plataforma, la dirección del colegio debe renovarla con administración.
        </p>
        <p className="text-xs text-muted-foreground">Tu información está guardada y estará disponible al renovar.</p>
      </div>
      <Button variant="outline" onClick={onLogout} className="gap-2">
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </Button>
    </div>
  </div>
);
