import React, { useState } from 'react';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from '@/components/security/TurnstileWidget';
import { useParams } from 'react-router-dom';
import { BookOpenText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { submitComplaint, usePublicSchool } from '../api/useSecretariat';
import { Field, PublicShell, fieldClass } from '../components/PublicShell';
import { ConsumerSection } from './public-complaints/ConsumerSection';
import { ComplaintSuccessView } from './public-complaints/ComplaintSuccessView';

const empty = {
  kind: 'RECLAMO' as 'RECLAMO' | 'QUEJA',
  consumerName: '',
  consumerDocType: 'DNI',
  consumerDocId: '',
  consumerAddress: '',
  consumerPhone: '',
  consumerEmail: '',
  isMinor: false,
  guardianName: '',
  itemType: 'SERVICIO' as 'PRODUCTO' | 'SERVICIO',
  itemDescription: '',
  amount: '',
  detail: '',
  request: '',
  website: '',
};

/** Libro de Reclamaciones virtual (Código de Protección y Defensa del Consumidor): /reclamaciones/:schoolId */
export const PublicComplaintsBookPage: React.FC = () => {
  const { schoolId } = useParams();
  const { data: school, isLoading, isError } = usePublicSchool(schoolId);
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; dueDate: string } | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const set =
    (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setError(null);
    setSending(true);
    try {
      setResult(await submitComplaint(schoolId, { ...form, turnstileToken: captcha }));
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
      setCaptchaReset((n) => n + 1);
    } finally {
      setSending(false);
    }
  };

  return (
    <PublicShell school={school} loading={isLoading} error={isError} title="Libro de Reclamaciones virtual">
      {result ? (
        <ComplaintSuccessView result={result} school={school} form={form} />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border bg-background p-5">
            <BookOpenText className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Libro de Reclamaciones</h1>
              {school && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{school.name}</p>
                  <p>
                    RUC: {school.documentId || '—'}
                    {school.address
                      ? ` · Dirección: ${school.address}${school.district ? `, ${school.district}` : ''}`
                      : ''}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Conforme al Código de Protección y Defensa del Consumidor (D.S. 011-2011-PCM), este establecimiento
                cuenta con un Libro de Reclamaciones a su disposición. Fecha: {formatPeruShortDate(getPeruToday())}.
              </p>
            </div>
          </div>

          <ConsumerSection
            form={form}
            onChangeField={(k) => set(k)}
            onMinorChange={(isMinor) => setForm((f) => ({ ...f, isMinor }))}
          />

          <section className="space-y-4 rounded-lg border bg-background p-5">
            <h2 className="font-semibold">2. Identificación del bien contratado</h2>
            <div className="flex gap-4 text-sm">
              {(['SERVICIO', 'PRODUCTO'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="itemType"
                    checked={form.itemType === t}
                    onChange={() => setForm((f) => ({ ...f, itemType: t }))}
                  />
                  {t === 'SERVICIO' ? 'Servicio' : 'Producto'}
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Descripción" required className="sm:col-span-2">
                <input
                  className={fieldClass}
                  value={form.itemDescription}
                  onChange={set('itemDescription')}
                  required
                  maxLength={300}
                  placeholder="Ej.: Servicio educativo 3.° de primaria, pensión de marzo"
                />
              </Field>
              <Field label="Monto reclamado (S/)">
                <input
                  className={fieldClass}
                  value={form.amount}
                  onChange={set('amount')}
                  inputMode="decimal"
                  maxLength={30}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border bg-background p-5">
            <h2 className="font-semibold">3. Detalle de la reclamación</h2>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {(['RECLAMO', 'QUEJA'] as const).map((k) => (
                <label
                  key={k}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${form.kind === k ? 'border-primary bg-primary/5' : ''}`}
                >
                  <input
                    type="radio"
                    name="kind"
                    className="mt-1"
                    checked={form.kind === k}
                    onChange={() => setForm((f) => ({ ...f, kind: k }))}
                  />
                  <span>
                    <strong>{k === 'RECLAMO' ? 'Reclamo' : 'Queja'}</strong>
                    <span className="block text-xs text-muted-foreground">
                      {k === 'RECLAMO'
                        ? 'Disconformidad relacionada con el producto o servicio.'
                        : 'Malestar por la atención recibida, no relacionado con el servicio en sí.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Field label="Detalle" required>
              <Textarea
                value={form.detail}
                onChange={set('detail')}
                rows={5}
                required
                minLength={10}
                maxLength={4000}
              />
            </Field>
            <Field label="Pedido" required hint="¿Qué solicita al colegio?">
              <Textarea
                value={form.request}
                onChange={set('request')}
                rows={3}
                required
                minLength={5}
                maxLength={2000}
              />
            </Field>
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={set('website')}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />
          </section>

          <div className="space-y-3 rounded-lg border bg-background p-5 text-xs text-muted-foreground">
            <p>
              * La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito
              previo para interponer una denuncia ante el Indecopi.
            </p>
            <p>* El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles.</p>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <TurnstileWidget onToken={setCaptcha} resetKey={captchaReset} />
            <Button
              type="submit"
              disabled={sending || (Boolean(TURNSTILE_SITE_KEY) && !captcha)}
              className="w-full sm:w-auto"
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar hoja de reclamación
            </Button>
          </div>
        </form>
      )}
    </PublicShell>
  );
};
