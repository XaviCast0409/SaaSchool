import React, { useState } from 'react';
import { toast } from 'sonner';
import { Copy, ExternalLink, Loader2, QrCode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/errors';
import { useSaveSecretariatSettings } from '../../api/useSecretariat';
import type { SecretariatSettings } from '../../api/useSecretariat';
import { printComplaintsQr } from '../../utils/printComplaintsQr';

export const PublicLinksCard: React.FC<{
  schoolId: string;
  schoolSlug?: string | null;
  schoolName?: string;
  settings: SecretariatSettings;
  canEdit: boolean;
}> = ({ schoolId, schoolSlug, schoolName = 'el colegio', settings, canEdit }) => {
  const save = useSaveSecretariatSettings();
  const nextYear = new Date().getFullYear() + 1;
  const [form, setForm] = useState({
    admissionsOpen: settings.admissionsOpen,
    admissionsYear: settings.admissionsYear ?? nextYear,
    admissionsMessage: settings.admissionsMessage ?? '',
    ratificationOpen: settings.ratificationOpen,
    ratificationYear: settings.ratificationYear ?? nextYear,
    ratificationDeadline: settings.ratificationDeadline?.slice(0, 10) ?? '',
  });
  const [open, setOpen] = useState(false);
  const origin = window.location.origin;
  // Con el código corto del colegio el enlace es fácil de leer y de dictar por teléfono
  const publicKey = schoolSlug || schoolId;
  const admissionUrl = `${origin}/admision/${publicKey}`;
  const complaintsUrl = `${origin}/reclamaciones/${publicKey}`;
  const copy = (url: string) =>
    navigator.clipboard.writeText(url).then(
      () => toast.success('Enlace copiado'),
      () => toast.error('No se pudo copiar'),
    );

  const submit = () =>
    save.mutate(
      {
        admissionsOpen: form.admissionsOpen,
        admissionsYear: Number(form.admissionsYear) || null,
        admissionsMessage: form.admissionsMessage || null,
        ratificationOpen: form.ratificationOpen,
        ratificationYear: Number(form.ratificationYear) || null,
        ratificationDeadline: form.ratificationDeadline || null,
      },
      {
        onSuccess: () => {
          toast.success('Configuración guardada');
          setOpen(false);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo guardar la configuración.')),
      },
    );

  const LinkRow: React.FC<{ label: string; url: string; on?: boolean }> = ({ label, url, on }) => (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          {label}
          {on !== undefined && <Badge variant={on ? 'success' : 'secondary'}>{on ? 'Abierto' : 'Cerrado'}</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{url}</p>
      </div>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => copy(url)}>
        <Copy className="h-3.5 w-3.5" aria-hidden /> Copiar
      </Button>
      <Button size="sm" variant="ghost" className="gap-1" onClick={() => window.open(url, '_blank', 'noopener')}>
        <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ver
      </Button>
    </div>
  );

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Enlaces públicos del colegio</p>
          <p className="text-xs text-muted-foreground">
            Compártelos en tu web, Facebook o WhatsApp. No requieren cuenta.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Configurar admisión y ratificación
          </Button>
        )}
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <LinkRow
          label={`Formulario de admisión ${settings.admissionsYear ?? ''}`}
          url={admissionUrl}
          on={settings.admissionsOpen}
        />
        <LinkRow label="Libro de Reclamaciones virtual" url={complaintsUrl} />
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <QrCode className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="flex-1">
          Indecopi exige exhibir el aviso del Libro de Reclamaciones en el local. Imprime el QR y colócalo junto al
          aviso.
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => void printComplaintsQr(complaintsUrl, schoolName)}
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden /> Imprimir QR
        </Button>
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Admisión y ratificación"
        size="lg"
        footer={
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
          </Button>
        }
      >
        <div className="space-y-5 text-sm">
          <fieldset className="space-y-3">
            <legend className="font-semibold">Admisión en línea</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.admissionsOpen}
                onChange={(e) => setForm((f) => ({ ...f, admissionsOpen: e.target.checked }))}
              />{' '}
              Recibir postulaciones por el formulario público
            </label>
            <label className="block space-y-1">
              <span>Año escolar al que postulan</span>
              <Input
                type="number"
                value={form.admissionsYear}
                onChange={(e) => setForm((f) => ({ ...f, admissionsYear: Number(e.target.value) }))}
                className="w-32"
              />
            </label>
            <label className="block space-y-1">
              <span>Mensaje de bienvenida y requisitos</span>
              <Textarea
                rows={4}
                value={form.admissionsMessage}
                onChange={(e) => setForm((f) => ({ ...f, admissionsMessage: e.target.value }))}
                placeholder="Ej.: Vacantes limitadas. Requisitos: copia de DNI, libreta del año anterior…"
                maxLength={3000}
              />
            </label>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="font-semibold">Ratificación de matrícula</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.ratificationOpen}
                onChange={(e) => setForm((f) => ({ ...f, ratificationOpen: e.target.checked }))}
              />{' '}
              Las familias confirman desde la app si continúan
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="block space-y-1">
                <span>Año que se ratifica</span>
                <Input
                  type="number"
                  value={form.ratificationYear}
                  onChange={(e) => setForm((f) => ({ ...f, ratificationYear: Number(e.target.value) }))}
                  className="w-32"
                />
              </label>
              <label className="block space-y-1">
                <span>Fecha límite (opcional)</span>
                <Input
                  type="date"
                  value={form.ratificationDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, ratificationDeadline: e.target.value }))}
                />
              </label>
            </div>
          </fieldset>
        </div>
      </Modal>
    </Card>
  );
};
