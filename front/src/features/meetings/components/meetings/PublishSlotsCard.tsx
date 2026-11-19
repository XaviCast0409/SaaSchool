import React, { useState } from 'react';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getPeruToday } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { MODE_LABEL, useCreateSlots, type MeetingMode } from '../../api/useMeetings';
import { panel, fieldLabel, fieldControl, selectControl } from './constants';
import { PanelHeader } from './MeetingsUI';

export const PublishSlotsCard: React.FC = () => {
  const create = useCreateSlots();
  const [form, setForm] = useState({
    date: getPeruToday(),
    from: '14:00',
    to: '16:00',
    durationMinutes: 20,
    mode: 'IN_PERSON' as MeetingMode,
    location: '',
    repeatWeeks: 1,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { ...form, location: form.location || undefined },
      {
        onSuccess: (r) => {
          const weeks = form.repeatWeeks > 1 ? ` en ${form.repeatWeeks} semanas` : '';
          const base = r.skipped
            ? `${r.created} horario(s) publicados${weeks}; ${r.skipped} se omitieron por cruce.`
            : `${r.created} horario(s) publicados${weeks}.`;
          // Familias que habían pedido horario: ya recibieron el aviso
          toast.success(r.notified ? `${base} Avisamos a ${r.notified} familia(s) que te pidieron entrevista.` : base);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo publicar el horario.')),
      },
    );
  };
  return (
    <section className={panel}>
      <PanelHeader
        icon={<CalendarPlus className="h-4 w-4" />}
        title="Publicar horarios de atención"
        description="Se crean bloques del tamaño elegido entre las horas indicadas."
      />
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 xl:grid-cols-6">
        <label className={cn(fieldLabel, 'col-span-2 sm:col-span-1')}>
          <span>Día</span>
          <Input
            type="date"
            className={fieldControl}
            min={getPeruToday()}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </label>
        <label className={fieldLabel}>
          <span>Desde</span>
          <Input
            type="time"
            className={fieldControl}
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
            required
          />
        </label>
        <label className={fieldLabel}>
          <span>Hasta</span>
          <Input
            type="time"
            className={fieldControl}
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            required
          />
        </label>
        <label className={fieldLabel}>
          <span>Cada</span>
          <select
            className={selectControl}
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
          >
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          <span>Modalidad</span>
          <select
            className={selectControl}
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value as MeetingMode })}
          >
            {(Object.keys(MODE_LABEL) as MeetingMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          <span>Repetir</span>
          <select
            className={selectControl}
            value={form.repeatWeeks}
            onChange={(e) => setForm({ ...form, repeatWeeks: Number(e.target.value) })}
          >
            <option value={1}>Solo ese día</option>
            {[2, 4, 6, 8].map((w) => (
              <option key={w} value={w}>
                {w} semanas
              </option>
            ))}
          </select>
        </label>
        <label className={cn(fieldLabel, 'col-span-2 sm:col-span-3 xl:col-span-6')}>
          <span>Lugar o enlace</span>
          <Input
            className={fieldControl}
            placeholder="Aula 3B / enlace Meet"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            maxLength={200}
          />
        </label>
        <div className="col-span-2 flex justify-end border-t border-border pt-3 sm:col-span-3 lg:col-span-6">
          <Button
            type="submit"
            disabled={create.isPending}
            className="w-full gap-2 rounded-xl text-xs font-bold sm:w-auto"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CalendarPlus className="h-4 w-4" aria-hidden />
            )}{' '}
            Publicar horarios
          </Button>
        </div>
      </form>
    </section>
  );
};
