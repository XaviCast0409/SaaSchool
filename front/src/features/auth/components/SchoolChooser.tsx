import React from 'react';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';

/** Una de las cuentas de la misma persona (una por colegio), devuelta por el login con code SELECT_SCHOOL. */
export interface SchoolOption {
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  logoUrl: string | null;
  accountType: 'USER' | 'STUDENT';
  role: string;
  name: string;
}

const ROLE_LABEL: Record<string, string> = {
  PARENT: 'Apoderado',
  TEACHER: 'Docente',
  SCHOOL_ADMIN: 'Dirección',
  ADMINISTRATIVE: 'Administrativo',
  STUDENT: 'Estudiante',
  SUPER_ADMIN: 'Soporte KIPUX',
};

/** Extrae las opciones de un error de login con code SELECT_SCHOOL (o null si no es ese caso). */
export const schoolOptionsFromError = (error: unknown): SchoolOption[] | null => {
  const data = (error as { response?: { data?: { code?: string; details?: { options?: SchoolOption[] } } } })?.response?.data;
  return data?.code === 'SELECT_SCHOOL' && data.details?.options?.length ? data.details.options : null;
};

interface Props {
  options: SchoolOption[];
  onPick: (option: SchoolOption) => void;
  onCancel: () => void;
  pendingSchoolId?: string | null;
}

/** "Tienes cuenta en más de un colegio": el apoderado elige a cuál entrar. */
export const SchoolChooser: React.FC<Props> = ({ options, onPick, onCancel, pendingSchoolId }) => (
  <div className="space-y-3">
    <div>
      <p className="text-sm font-semibold text-foreground">Tienes cuenta en más de un colegio</p>
      <p className="text-xs text-muted-foreground">Elige a cuál quieres entrar. Luego podrás cambiar cerrando sesión.</p>
    </div>
    <ul className="space-y-2">
      {options.map((option) => {
        const pending = pendingSchoolId === `${option.schoolId}|${option.accountType}`;
        return (
          <li key={`${option.schoolId}|${option.accountType}`}>
            <button
              type="button"
              onClick={() => onPick(option)}
              disabled={Boolean(pendingSchoolId)}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60"
            >
              {option.logoUrl ? (
                <img src={option.logoUrl} alt="" className="h-9 w-9 rounded-md object-contain bg-white shrink-0" />
              ) : (
                <span className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{option.schoolName}</span>
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABEL[option.role] ?? option.role} · {option.name}
                </span>
              </span>
              {pending ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          </li>
        );
      })}
    </ul>
    <button type="button" onClick={onCancel} className="text-xs text-primary hover:underline">
      Usar otra cuenta
    </button>
  </div>
);
