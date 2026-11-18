import { useUrlFilters } from '@/lib/useUrlFilters';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Inbox, MessageCircle, Phone } from 'lucide-react';
import { LEAD_STATUS_LABELS, useLeads, useUpdateLead, type LeadStatus, type SalesLead } from '../api/useLeads';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime } from '@/lib/dateUtils';

const STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

const STATUS_VARIANT: Record<LeadStatus, 'default' | 'secondary' | 'success' | 'warning' | 'outline'> = {
  NEW: 'default',
  CONTACTED: 'secondary',
  DEMO_SCHEDULED: 'warning',
  WON: 'success',
  LOST: 'outline',
};

const PLAN_LABELS: Record<string, string> = { BASIC: 'Básico', PRO: 'Pro', ENTERPRISE: 'Enterprise' };

const whatsappReply = (lead: SalesLead): string => {
  const firstName = lead.contactName.trim().split(/\s+/)[0] ?? '';
  const text = `Hola ${firstName}, te saluda el equipo de KIPUX. Recibimos tu solicitud para ${lead.schoolName}. ¿Cuándo te viene bien una demostración de 20 minutos?`;
  return `https://wa.me/51${lead.phone}?text=${encodeURIComponent(text)}`;
};

const LeadRow: React.FC<{ lead: SalesLead }> = ({ lead }) => {
  const { mutate, isPending } = useUpdateLead();
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [expanded, setExpanded] = useState(false);

  const changeStatus = (status: LeadStatus) =>
    mutate(
      { id: lead.id, status },
      { onSuccess: () => toast.success(`Lead marcado como «${LEAD_STATUS_LABELS[status]}»`) },
    );

  const saveNotes = () =>
    mutate({ id: lead.id, notes: notes.trim() || null }, { onSuccess: () => toast.success('Notas guardadas') });

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-foreground">{lead.schoolName}</p>
              <Badge variant={STATUS_VARIANT[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
              <span
                className="text-xs font-semibold text-muted-foreground"
                title="Prioridad según cargo, tamaño y detalle"
              >
                Prioridad {lead.score}/100
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {lead.contactName} · {lead.role}
              {lead.city ? ` · ${lead.city}` : ''}
              {lead.studentRange ? ` · ${lead.studentRange} alumnos` : ''}
              {lead.interestPlan ? ` · Plan ${PLAN_LABELS[lead.interestPlan] ?? lead.interestPlan}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPeruDateTime(lead.createdAt)}
              {lead.source ? ` · desde ${lead.source}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <a href={whatsappReply(lead)} target="_blank" rel="noreferrer">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={`tel:${lead.phone}`}>
                <Phone className="w-4 h-4" /> {lead.phone}
              </a>
            </Button>
            <Select
              value={lead.status}
              onChange={(event) => changeStatus(event.target.value as LeadStatus)}
              disabled={isPending}
              aria-label="Estado del lead"
              className="h-9 w-40 text-sm"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Ocultar' : 'Detalle'}
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Correo:</span>{' '}
                {lead.email ? (
                  <a className="text-primary inline-flex items-center gap-1" href={`mailto:${lead.email}`}>
                    {lead.email} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  '—'
                )}
              </p>
              <p className="text-muted-foreground">Mensaje:</p>
              <p className="whitespace-pre-wrap text-foreground">{lead.message || '—'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor={`notes-${lead.id}`}>
                Notas internas
              </label>
              <Textarea
                id={`notes-${lead.id}`}
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej. Demo el jueves 10:00, le interesa cobranza"
              />
              <Button size="sm" variant="outline" onClick={saveNotes} isLoading={isPending}>
                Guardar notas
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Bandeja de leads que llegan desde la web de marketing. */
export const LeadsPage: React.FC = () => {
  // Filtros en la URL: sobreviven a recargar, al botón Atrás y se pueden compartir como enlace
  const [urlFilters, setUrlFilters] = useUrlFilters({ status: '' });
  const filter = (urlFilters.status || undefined) as LeadStatus | undefined;
  const setFilter = (value: LeadStatus | undefined) => setUrlFilters({ status: value ?? '' });
  const { data, isLoading, isError } = useLeads(filter);
  const total = data ? Object.values(data.counts).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Inbox className="w-6 h-6 text-primary" /> Leads de la web
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Colegios que pidieron una demostración desde la página de inicio. Se actualiza cada minuto.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter ? 'outline' : 'default'} onClick={() => setFilter(undefined)}>
          Todos ({total})
        </Button>
        {STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {LEAD_STATUS_LABELS[status]} ({data?.counts[status] ?? 0})
          </Button>
        ))}
      </div>

      {isError && <p className="text-sm text-destructive">No se pudieron cargar los leads.</p>}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : data && data.leads.length > 0 ? (
        <div className="space-y-3">
          {data.leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-14 text-center">
            <Inbox className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">Aún no hay leads {filter ? 'en este estado' : ''}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando un colegio complete el formulario de la web aparecerá aquí y te llegará un correo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
