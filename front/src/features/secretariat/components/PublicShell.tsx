import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, School } from 'lucide-react';
import type { PublicSchool } from '../api/useSecretariat';

/** Marco de las páginas públicas (sin login): cabecera con el colegio y pie con enlaces legales. */
export const PublicShell: React.FC<{
  school: PublicSchool | undefined;
  loading: boolean;
  error: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ school, loading, error, title, children }) => (
  <div className="min-h-screen bg-muted/40 text-foreground">
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
        {school?.logoUrl ? (
          <img src={school.logoUrl} alt="" className="h-11 w-11 rounded-md object-contain" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-md text-white" style={{ background: school?.brandColor || '#1e3a8a' }}>
            <School className="h-6 w-6" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{school?.name ?? (loading ? 'Cargando…' : 'Colegio')}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-6">
      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" />
        </div>
      ) : error || !school ? (
        <div className="rounded-lg border bg-background p-8 text-center">
          <p className="font-medium">No encontramos este colegio.</p>
          <p className="mt-1 text-sm text-muted-foreground">Revise el enlace que le compartieron.</p>
        </div>
      ) : (
        children
      )}
    </main>
    <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs text-muted-foreground">
      {school && (
        <p>
          {school.name} · RUC {school.documentId}
          {school.address ? ` · ${school.address}` : ''}
          {school.district ? `, ${school.district}` : ''}
        </p>
      )}
      <p className="mt-1">
        <Link to="/privacidad" className="underline">Política de privacidad</Link>
        {school && (
          <>
            {' · '}
            <Link to={`/reclamaciones/${school.id}`} className="underline">Libro de Reclamaciones</Link>
          </>
        )}
      </p>
    </footer>
  </div>
);

export const fieldClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';
export const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }> = ({ label, required, hint, children, className }) => (
  <label className={`block space-y-1 ${className ?? ''}`}>
    <span className="text-sm font-medium">
      {label}
      {required && <span className="text-red-600"> *</span>}
    </span>
    {children}
    {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
  </label>
);
