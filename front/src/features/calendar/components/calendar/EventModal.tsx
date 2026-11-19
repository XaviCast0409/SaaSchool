import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/errors';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import {
  EVENT_TYPE_LABEL,
  useSaveEvent,
  type EventInput,
  type EventType,
} from '../../api/useCalendar';

export const EventModal: React.FC<{
  open: boolean;
  onClose: () => void;
  initial: EventInput;
  editingId?: string;
  isTeacher: boolean;
}> = ({ open, onClose, initial, editingId, isTeacher }) => {
  const [form, setForm] = useState<EventInput>(initial);
  const [scope, setScope] = useState<string>(
    initial.classroomId ? `c:${initial.classroomId}` : initial.educationLevel ? `l:${initial.educationLevel}` : 'all',
  );
  React.useEffect(() => {
    setForm(initial);
    setScope(
      initial.classroomId
        ? `c:${initial.classroomId}`
        : initial.educationLevel
          ? `l:${initial.educationLevel}`
          : isTeacher
            ? ''
            : 'all',
    );
  }, [initial, isTeacher]);
  const { data: classrooms = [] } = useClassrooms();
  const save = useSaveEvent();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: EventInput = {
      ...form,
      classroomId: scope.startsWith('c:') ? scope.slice(2) : null,
      educationLevel: scope.startsWith('l:') ? (scope.slice(2) as EventInput['educationLevel']) : null,
      endDate: form.endDate || null,
      startTime: form.startTime || null,
      endTime: form.startTime ? form.endTime || null : null,
      location: form.location || null,
      description: form.description || null,
    };
    save.mutate(
      { id: editingId, input },
      {
        onSuccess: (r: { notified?: number }) => {
          toast.success(r?.notified ? `Evento guardado y avisado a ${r.notified} familia(s).` : 'Evento guardado.');
          onClose();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  const field = 'h-9';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingId ? 'Editar evento' : 'Nuevo evento'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="event-form" disabled={save.isPending} className="gap-2">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Guardar
          </Button>
        </div>
      }
    >
      <form id="event-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs text-muted-foreground">
          Título
          <Input
            className={field}
            required
            minLength={3}
            maxLength={150}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej.: Día del Logro"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Tipo
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
          >
            {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Para
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            required
          >
            {isTeacher ? <option value="">Elige un aula…</option> : <option value="all">Todo el colegio</option>}
            {!isTeacher && (
              <>
                <option value="l:INITIAL">Solo Inicial</option>
                <option value="l:PRIMARY">Solo Primaria</option>
                <option value="l:SECONDARY">Solo Secundaria</option>
              </>
            )}
            {classrooms.map((c) => (
              <option key={c.id} value={`c:${c.id}`}>
                {c.educationLevel === 'INITIAL' ? `${c.grade} años` : `${c.grade}.°`} "{c.section}" ·{' '}
                {c.educationLevel === 'INITIAL'
                  ? 'Inicial'
                  : c.educationLevel === 'PRIMARY'
                    ? 'Primaria'
                    : 'Secundaria'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Desde
          <Input
            type="date"
            className={field}
            required
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Hasta (opcional)
          <Input
            type="date"
            className={field}
            min={form.startDate}
            value={form.endDate ?? ''}
            onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Hora de inicio (opcional)
          <Input
            type="time"
            className={field}
            value={form.startTime ?? ''}
            onChange={(e) => setForm({ ...form, startTime: e.target.value || null })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Hora de fin
          <Input
            type="time"
            className={field}
            disabled={!form.startTime}
            value={form.endTime ?? ''}
            onChange={(e) => setForm({ ...form, endTime: e.target.value || null })}
          />
        </label>
        <label className="col-span-2 text-xs text-muted-foreground">
          Lugar (opcional)
          <Input
            className={field}
            maxLength={200}
            value={form.location ?? ''}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>
        <label className="col-span-2 text-xs text-muted-foreground">
          Detalle (opcional)
          <Textarea
            rows={3}
            maxLength={2000}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.visibleToFamilies}
            onChange={(e) => setForm({ ...form, visibleToFamilies: e.target.checked })}
          />
          Visible para las familias
        </label>
        {!editingId && form.visibleToFamilies && (
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={Boolean(form.notifyFamilies)}
              onChange={(e) => setForm({ ...form, notifyFamilies: e.target.checked })}
            />
            Avisar ahora a las familias (notificación y push)
          </label>
        )}
      </form>
    </Modal>
  );
};
