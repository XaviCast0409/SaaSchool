import React from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { CalendarClock } from 'lucide-react';
import { formatPeruDate } from '@/lib/dateUtils';
import { UNDATED_ARCHIVE_DAYS } from '../../lib/expiry';
import type { CreateAnnouncementFormData } from '../../schemas/announcement.schema';

interface AnnouncementResponseAndExpiryFieldsProps {
  responseType: CreateAnnouncementFormData['responseType'];
  expiresAt: string;
  today: string;
  presets: Array<{ id: string; label: string; value: string }>;
  register: UseFormRegister<CreateAnnouncementFormData>;
  errors: FieldErrors<CreateAnnouncementFormData>;
  onSelectResponseType: (type: CreateAnnouncementFormData['responseType']) => void;
  onSelectExpiryPreset: (presetValue: string) => void;
}

export const AnnouncementResponseAndExpiryFields: React.FC<AnnouncementResponseAndExpiryFieldsProps> = ({
  responseType,
  expiresAt,
  today,
  presets,
  register,
  errors,
  onSelectResponseType,
  onSelectExpiryPreset,
}) => {
  return (
    <>
      <div className="rounded-xl border border-border p-3 space-y-2.5">
        <span className="block text-xs font-semibold text-muted-foreground uppercase">
          ¿Pedir respuesta a las familias?
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { id: 'NONE', label: 'No' },
            { id: 'ACKNOWLEDGE', label: 'Leído y enterado' },
            { id: 'AUTHORIZATION', label: 'Autorización' },
            { id: 'POLL', label: 'Encuesta' },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelectResponseType(o.id as CreateAnnouncementFormData['responseType'])}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                responseType === o.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-secondary'
              }`}
              aria-pressed={responseType === o.id}
            >
              {o.label}
            </button>
          ))}
        </div>
        {errors.responseType && <p className="text-xs text-destructive">{errors.responseType.message}</p>}
        {responseType === 'AUTHORIZATION' && (
          <p className="text-xs text-muted-foreground">
            Cada familia responde “Autorizo” o “No autorizo” por cada hijo. Se guarda la fecha y el dispositivo como
            constancia.
          </p>
        )}
        {responseType === 'POLL' && (
          <div>
            <label htmlFor="poll-options" className="block text-xs font-medium text-foreground mb-1">
              Opciones (una por línea, máximo 6)
            </label>
            <textarea
              id="poll-options"
              rows={3}
              placeholder="Sí asistiré"
              {...register('pollOptionsText')}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.pollOptionsText && (
              <p className="mt-1 text-xs text-destructive">{errors.pollOptionsText.message}</p>
            )}
          </div>
        )}
        {responseType !== 'NONE' && (
          <div>
            <label htmlFor="response-deadline" className="block text-xs font-medium text-foreground mb-1">
              Responder hasta (opcional)
            </label>
            <input
              id="response-deadline"
              type="date"
              {...register('responseDeadline')}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-3 space-y-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
          <CalendarClock className="w-3.5 h-3.5" aria-hidden /> Visible en el muro hasta
        </span>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectExpiryPreset(p.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                expiresAt === p.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-secondary'
              }`}
              aria-pressed={expiresAt === p.value}
            >
              {p.label}
            </button>
          ))}
          <input
            id="announcement-expires"
            type="date"
            min={today}
            aria-label="Otra fecha"
            {...register('expiresAt')}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {expiresAt
            ? `Se verá en “Vigentes” hasta el ${formatPeruDate(expiresAt)}. Después pasa a “Anteriores”, donde se puede seguir consultando.`
            : `Sin fecha: pasa a “Anteriores” a los ${UNDATED_ARCHIVE_DAYS} días de publicado. Si es sobre un evento, elige la fecha del evento.`}
        </p>
        {errors.expiresAt && <p className="text-xs text-destructive">{errors.expiresAt.message}</p>}
      </div>
    </>
  );
};
