import { confirmDialog } from '@/components/ui/confirm';
import React, { useState } from 'react';
import { Megaphone, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AUDIENCE_LABELS,
  useDeletePlatformAnnouncement,
  usePlatformAnnouncements,
  useSavePlatformAnnouncement,
  type AnnouncementAudience,
  type AnnouncementLevel,
  type PlatformAnnouncement,
} from '../api/usePlatform';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime } from '@/lib/dateUtils';

const LEVEL_LABELS: Record<AnnouncementLevel, string> = {
  INFO: 'Informativo',
  WARNING: 'Importante',
  CRITICAL: 'Crítico (no se puede cerrar)',
};

const ALL_AUDIENCES = Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[];

interface FormState {
  id?: string;
  title: string;
  message: string;
  level: AnnouncementLevel;
  audience: AnnouncementAudience[];
  startsAt: string; // datetime-local (hora del navegador)
  endsAt: string;
}

const emptyForm = (): FormState => ({
  title: '',
  message: '',
  level: 'INFO',
  audience: ['SCHOOL_ADMIN', 'ADMINISTRATIVE'],
  startsAt: '',
  endsAt: '',
});

/** ISO → valor para <input type="datetime-local"> en la hora local del navegador */
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Avisos de la plataforma para todos los colegios: mantenimiento, novedades, incidentes */
export const PlatformAnnouncementsPage: React.FC = () => {
  const { data: announcements, isLoading } = usePlatformAnnouncements();
  const { mutate: save, isPending } = useSavePlatformAnnouncement();
  const { mutate: remove } = useDeletePlatformAnnouncement();
  const [form, setForm] = useState<FormState>(emptyForm);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleAudience = (a: AnnouncementAudience) =>
    set('audience', form.audience.includes(a) ? form.audience.filter((x) => x !== a) : [...form.audience, a]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save(
      {
        id: form.id,
        payload: {
          title: form.title.trim(),
          message: form.message.trim(),
          level: form.level,
          audience: form.audience,
          ...(form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(form.id ? 'Aviso actualizado.' : 'Aviso publicado.');
          setForm(emptyForm());
        },
        onError: (err) => toast.error(errorMessage(err, 'No se pudo guardar el aviso.')),
      },
    );
  };

  const edit = (a: PlatformAnnouncement) =>
    setForm({
      id: a.id,
      title: a.title,
      message: a.message,
      level: a.level,
      audience: a.audience,
      startsAt: toLocalInput(a.startsAt),
      endsAt: toLocalInput(a.endsAt),
    });

  const toggleActive = (a: PlatformAnnouncement) =>
    save(
      { id: a.id, payload: { isActive: !a.isActive } },
      { onError: (err) => toast.error(errorMessage(err, 'No se pudo actualizar el aviso.')) },
    );

  const del = async (a: PlatformAnnouncement) => {
    if (await confirmDialog({ title: `¿Eliminar el aviso "${a.title}"?`, description: 'No se puede deshacer.', confirmText: 'Eliminar', variant: 'danger' })) {
      remove(a.id, { onError: (err) => toast.error(errorMessage(err, 'No se pudo eliminar el aviso.')) });
    }
  };

  const canSubmit = form.title.trim().length >= 3 && form.message.trim() && form.audience.length > 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> Avisos a colegios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Se muestran como franja arriba de la plataforma a los roles que elijas, en todos los colegios.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
        <Card className="border-border shadow-sm xl:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold">{form.id ? 'Editar aviso' : 'Nuevo aviso'}</CardTitle>
            {form.id && (
              <button type="button" onClick={() => setForm(emptyForm())} aria-label="Cancelar edición" className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Título">
                <Input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} placeholder="Mantenimiento programado" className="h-9 text-sm" />
              </Field>
              <Field label="Mensaje">
                <Textarea
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="El sábado de 10:00 a 12:00 la plataforma no estará disponible."
                  className="text-sm"
                />
              </Field>
              <Field label="Tipo">
                <select
                  value={form.level}
                  onChange={(e) => set('level', e.target.value as AnnouncementLevel)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <fieldset className="space-y-1.5">
                <legend className="text-xs font-bold uppercase tracking-wide text-foreground">¿Quién lo ve?</legend>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_AUDIENCES.map((a) => {
                    const on = form.audience.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleAudience(a)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {AUDIENCE_LABELS[a]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Desde (vacío = ahora)">
                  <Input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="h-9 text-xs" />
                </Field>
                <Field label="Hasta (opcional)">
                  <Input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="h-9 text-xs" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={!canSubmit} isLoading={isPending} className="font-bold">
                  {form.id ? 'Guardar cambios' : 'Publicar aviso'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Avisos publicados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !announcements?.length ? (
              <p className="text-sm text-muted-foreground">Todavía no hay avisos.</p>
            ) : (
              <ul className="space-y-2">
                {announcements.map((a) => (
                  <li key={a.id} className={`rounded-xl border border-border p-3 ${a.isLive ? '' : 'opacity-70'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="text-sm text-foreground">{a.title}</strong>
                          <Badge variant={a.level === 'CRITICAL' ? 'destructive' : a.level === 'WARNING' ? 'warning' : 'secondary'} className="text-xs">
                            {a.level === 'CRITICAL' ? 'Crítico' : a.level === 'WARNING' ? 'Importante' : 'Informativo'}
                          </Badge>
                          <Badge variant={a.isLive ? 'success' : 'outline'} className="text-xs">
                            {a.isLive ? 'Visible ahora' : a.isActive ? 'Programado / terminado' : 'Oculto'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{a.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Para {a.audience.map((x) => AUDIENCE_LABELS[x]).join(', ')} · {formatPeruDateTime(a.startsAt)}
                          {a.endsAt ? ` → ${formatPeruDateTime(a.endsAt)}` : ' · sin fecha de fin'}
                        </p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <IconButton label={a.isActive ? 'Ocultar' : 'Mostrar'} onClick={() => toggleActive(a)}>
                          {a.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </IconButton>
                        <IconButton label="Editar" onClick={() => edit(a)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconButton>
                        <IconButton label="Eliminar" onClick={() => del(a)} danger>
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</span>
    {children}
  </label>
);

const IconButton: React.FC<{ label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }> = ({
  label,
  onClick,
  danger,
  children,
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`rounded-md p-1.5 text-muted-foreground transition-colors ${danger ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-muted hover:text-foreground'}`}
  >
    {children}
  </button>
);
