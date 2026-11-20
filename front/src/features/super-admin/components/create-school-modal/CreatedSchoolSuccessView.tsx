import React from 'react';
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { schoolLoginUrl } from '@/lib/schoolDomain';
import type { School } from '@/features/schools/types';

interface CreatedSchoolSuccessViewProps {
  createdData: {
    school: School;
    adminEmail?: string;
    adminPassword?: string;
  };
  onClose: () => void;
}

export const CreatedSchoolSuccessView: React.FC<CreatedSchoolSuccessViewProps> = ({ createdData, onClose }) => {
  const copyCredentials = () => {
    const slug = createdData.school.slug ?? '';
    const loginUrl = schoolLoginUrl(slug);
    const text = [
      `¡Bienvenido a KIPUX!`,
      `Aquí tienes los datos de acceso para tu colegio:`,
      ``,
      `Colegio: ${createdData.school.name}`,
      `Código de colegio: ${slug}`,
      `Enlace de ingreso: ${loginUrl}`,
      `Usuario (Director): ${createdData.adminEmail || '—'}`,
      `Contraseña inicial: ${createdData.adminPassword || '—'}`,
    ].join('\n');

    void navigator.clipboard.writeText(text);
    toast.success('Credenciales copiadas al portapapeles.');
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="font-bold text-sm">¡Colegio creado exitosamente!</p>
          <p className="text-xs opacity-90 mt-0.5">
            El colegio <strong>{createdData.school.name}</strong> está listo para operar.
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/40">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Código del colegio (slug):</span>
          <p className="font-mono font-bold text-sm text-foreground bg-background p-2 rounded-lg border border-border">
            {createdData.school.slug}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Enlace directo de ingreso:</span>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-primary bg-background p-2 rounded-lg border border-border flex-1 truncate">
              {schoolLoginUrl(createdData.school.slug ?? '')}
            </p>
            <a
              href={schoolLoginUrl(createdData.school.slug ?? '')}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Abrir enlace"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Correo del Director:</span>
            <p className="font-mono text-xs text-foreground bg-background p-2 rounded-lg border border-border">
              {createdData.adminEmail || '—'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Contraseña Inicial:</span>
            <p className="font-mono text-xs text-foreground bg-background p-2 rounded-lg border border-border">
              {createdData.adminPassword || '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={copyCredentials}
          className="w-full sm:w-auto gap-2 text-xs font-bold"
        >
          <Copy className="w-4 h-4" />
          Copiar credenciales
        </Button>
        <Button type="button" onClick={onClose} className="w-full sm:w-auto text-xs font-bold">
          Listo
        </Button>
      </div>
    </div>
  );
};
