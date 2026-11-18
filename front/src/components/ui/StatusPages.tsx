import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, ShieldOff } from 'lucide-react';
import { Button } from './button';

const StatusPage: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}> = ({ icon, title, description }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
    <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Ir al inicio</Link>
      </Button>
    </div>
  </div>
);

/** Dirección que no existe (enlace viejo o mal escrito) */
export const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <StatusPage
      icon={<Compass className="h-6 w-6" />}
      title="No encontramos esta página"
      description={
        <>
          La dirección <span className="break-all font-semibold text-foreground">{pathname}</span> no existe o cambió de
          lugar. Revisa el enlace o busca la sección en el menú.
        </>
      }
    />
  );
};

/** La página existe, pero el rol del usuario no la incluye */
export const NoAccessPage: React.FC = () => (
  <StatusPage
    icon={<ShieldOff className="h-6 w-6" />}
    title="Tu cuenta no tiene acceso a esta sección"
    description="Si necesitas usarla, pide a la dirección del colegio que revise los permisos de tu usuario."
  />
);
