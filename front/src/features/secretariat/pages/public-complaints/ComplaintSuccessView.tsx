import React from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import type { PublicSchool } from '../../api/useSecretariat';

interface ComplaintSuccessViewProps {
  result: { code: string; dueDate: string };
  school: PublicSchool | undefined;
  form: {
    consumerEmail: string;
    consumerName: string;
    consumerDocType: string;
    consumerDocId: string;
    kind: 'RECLAMO' | 'QUEJA';
    itemDescription: string;
    detail: string;
    request: string;
  };
}

export const ComplaintSuccessView: React.FC<ComplaintSuccessViewProps> = ({ result, school, form }) => {
  return (
    <div className="space-y-4 rounded-lg border bg-background p-6 print:border-0">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 print:hidden" aria-hidden />
        <p className="mt-3 text-lg font-semibold">Hoja de reclamación registrada</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{result.code}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos una copia a <strong>{form.consumerEmail}</strong>. El colegio le responderá a ese correo a más
          tardar el <strong>{formatPeruShortDate(result.dueDate)}</strong> (15 días hábiles).
        </p>
      </div>
      <dl className="grid gap-x-4 gap-y-2 rounded-md bg-muted/50 p-4 text-sm sm:grid-cols-[160px_1fr]">
        <dt className="text-muted-foreground">Colegio / Proveedor</dt>
        <dd>
          {school?.name} · RUC {school?.documentId || '—'}
        </dd>
        <dt className="text-muted-foreground">Dirección</dt>
        <dd>{school?.address ? `${school.address}${school.district ? `, ${school.district}` : ''}` : '—'}</dd>
        <dt className="text-muted-foreground">Código de hoja</dt>
        <dd className="font-mono font-semibold">{result.code}</dd>
        <dt className="text-muted-foreground">Fecha de registro</dt>
        <dd>{formatPeruShortDate(getPeruToday())}</dd>
        <dt className="text-muted-foreground">Fecha límite respuesta</dt>
        <dd className="font-semibold text-primary">{formatPeruShortDate(result.dueDate)}</dd>
        <dt className="text-muted-foreground">Tipo</dt>
        <dd>{form.kind === 'RECLAMO' ? 'Reclamo' : 'Queja'}</dd>
        <dt className="text-muted-foreground">Consumidor</dt>
        <dd>
          {form.consumerName} · {form.consumerDocType} {form.consumerDocId}
        </dd>
        <dt className="text-muted-foreground">Bien contratado</dt>
        <dd>{form.itemDescription}</dd>
        <dt className="text-muted-foreground">Detalle</dt>
        <dd className="whitespace-pre-line">{form.detail}</dd>
        <dt className="text-muted-foreground">Pedido</dt>
        <dd className="whitespace-pre-line">{form.request}</dd>
      </dl>
      <div className="flex justify-center print:hidden">
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Imprimir o guardar en PDF
        </Button>
      </div>
    </div>
  );
};
