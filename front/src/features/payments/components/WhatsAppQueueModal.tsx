import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, RotateCcw, SkipForward } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { usePayments } from '../api/usePayments';
import {
  DEFAULT_WA_TEMPLATE,
  TEMPLATE_VARIABLES,
  buildWhatsAppLink,
  fillTemplate,
  pickContact,
  remainingOf,
} from '../utils/whatsapp';

const TEMPLATE_KEY = 'saaschool.wa-template';
const DONE_KEY = 'saaschool.wa-done';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

/**
 * Modo cola de WhatsApp: recorre las pensiones vencidas una por una. Cada clic abre WhatsApp con el
 * mensaje listo; al volver, la siguiente familia ya está preparada. Gratis (enlaces wa.me).
 */
export const WhatsAppQueueModal: React.FC<{ open: boolean; onClose: () => void; classroomId?: string }> = ({ open, onClose, classroomId }) => {
  const { data: school } = useGetActiveSchool();
  const { data, isLoading } = usePayments({ overdue: true, limit: 100, page: 1, classroomId: classroomId || undefined }, open);
  const [template, setTemplate] = useState(() => readStorage(TEMPLATE_KEY) ?? DEFAULT_WA_TEMPLATE);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const today = new Date().toISOString().slice(0, 10);

  // Recordar los enviados hoy (solo en este navegador) para no repetir si se cierra el modal
  useEffect(() => {
    if (!open) return;
    try {
      const saved = JSON.parse(readStorage(DONE_KEY) ?? '{}') as { date?: string; ids?: string[] };
      setDone(new Set(saved.date === today ? saved.ids ?? [] : []));
    } catch {
      setDone(new Set());
    }
  }, [open, today]);

  const markDone = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev).add(id);
      writeStorage(DONE_KEY, JSON.stringify({ date: today, ids: [...next] }));
      return next;
    });
  };

  const countryCode = school?.whatsappCountryCode || '51';
  const schoolName = school?.name ?? '';
  const items = useMemo(() => (data?.data ?? []).filter((o) => remainingOf(o) > 0), [data]);
  const contactable = items.filter((o) => buildWhatsAppLink(o, template, schoolName, countryCode));
  const withoutPhone = items.length - contactable.length;
  const queue = contactable.filter((o) => !done.has(o.id) && !skipped.has(o.id));
  const current = queue[0];

  const sendCurrent = () => {
    if (!current) return;
    const link = buildWhatsAppLink(current, template, schoolName, countryCode);
    if (!link) return;
    window.open(link, '_blank', 'noopener');
    markDone(current.id);
  };

  const saveTemplate = (value: string) => {
    setTemplate(value);
    writeStorage(TEMPLATE_KEY, value);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Recordatorios por WhatsApp (modo cola)"
      description="Abre cada chat con el mensaje ya escrito. Tú solo pulsas Enviar en WhatsApp y vuelves aquí para el siguiente."
      size="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Cargando" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No hay pensiones vencidas con saldo pendiente. 🎉</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-muted px-3 py-1.5">
              Pendientes en la cola: <strong className="text-foreground">{queue.length}</strong>
            </span>
            <span className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">
              Enviados hoy: <strong>{contactable.filter((o) => done.has(o.id)).length}</strong>
            </span>
            {withoutPhone > 0 && (
              <span className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-300">
                Sin celular registrado: <strong>{withoutPhone}</strong>
              </span>
            )}
          </div>

          {current ? (
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-semibold text-foreground">
                {pickContact(current)?.firstName} {pickContact(current)?.lastNamePaternal}
                <span className="ml-1 font-normal text-muted-foreground">
                  · {current.enrollment?.student?.firstNames} {current.enrollment?.student?.lastNamePaternal}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {current.title} · venció el {formatPeruShortDate(current.dueDate)} · saldo S/ {remainingOf(current).toFixed(2)}
              </p>
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-emerald-500/5 p-3 text-sm text-foreground">
                {fillTemplate(template, current, schoolName)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={sendCurrent} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                  <MessageCircle className="h-4 w-4" aria-hidden /> Abrir WhatsApp <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Button>
                <Button variant="ghost" className="gap-2" onClick={() => setSkipped((s) => new Set(s).add(current.id))}>
                  <SkipForward className="h-4 w-4" aria-hidden /> Omitir
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
              <p className="text-sm font-medium text-foreground">¡Cola terminada!</p>
              {skipped.size > 0 && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSkipped(new Set())}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Volver a los omitidos ({skipped.size})
                </Button>
              )}
            </div>
          )}

          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Editar el mensaje</summary>
            <Textarea className="mt-2" rows={4} value={template} onChange={(e) => saveTemplate(e.target.value)} aria-label="Plantilla del mensaje" />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <code key={v} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{v}</code>
              ))}
              <Button size="sm" variant="ghost" className={cn('ml-auto h-7 text-xs', template === DEFAULT_WA_TEMPLATE && 'hidden')} onClick={() => saveTemplate(DEFAULT_WA_TEMPLATE)}>
                Restaurar mensaje
              </Button>
            </div>
          </details>
          {data && data.meta.total > 100 && (
            <p className="text-[11px] text-muted-foreground">Se muestran las primeras 100 pensiones vencidas. Filtra por aula para ver el resto.</p>
          )}
        </div>
      )}
    </Modal>
  );
};
