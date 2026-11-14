import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpenText, CheckCircle2, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { submitComplaint, usePublicSchool } from '../api/useSecretariat';
import { Field, PublicShell, fieldClass } from '../components/PublicShell';

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
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setError(null);
    setSending(true);
    try {
      setResult(await submitComplaint(schoolId, form));
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <PublicShell school={school} loading={isLoading} error={isError} title="Libro de Reclamaciones virtual">
      {result ? (
        <div className="space-y-4 rounded-lg border bg-background p-6 print:border-0">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 print:hidden" aria-hidden />
            <p className="mt-3 text-lg font-semibold">Hoja de reclamación registrada</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{result.code}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos una copia a <strong>{form.consumerEmail}</strong>. El colegio le responderá a ese correo a más tardar el{' '}
              <strong>{formatPeruShortDate(result.dueDate)}</strong> (15 días hábiles).
            </p>
          </div>
          <dl className="grid gap-x-4 gap-y-2 rounded-md bg-muted/50 p-4 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-muted-foreground">Fecha</dt><dd>{formatPeruShortDate(getPeruToday())}</dd>
            <dt className="text-muted-foreground">Tipo</dt><dd>{form.kind === 'RECLAMO' ? 'Reclamo' : 'Queja'}</dd>
            <dt className="text-muted-foreground">Consumidor</dt><dd>{form.consumerName} · {form.consumerDocType} {form.consumerDocId}</dd>
            <dt className="text-muted-foreground">Bien contratado</dt><dd>{form.itemDescription}</dd>
            <dt className="text-muted-foreground">Detalle</dt><dd className="whitespace-pre-line">{form.detail}</dd>
            <dt className="text-muted-foreground">Pedido</dt><dd className="whitespace-pre-line">{form.request}</dd>
          </dl>
          <div className="flex justify-center print:hidden">
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden /> Imprimir o guardar en PDF
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border bg-background p-5">
            <BookOpenText className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold">Libro de Reclamaciones</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Conforme al Código de Protección y Defensa del Consumidor, este establecimiento cuenta con un Libro de Reclamaciones a su disposición.
                Fecha: {formatPeruShortDate(getPeruToday())}.
              </p>
            </div>
          </div>

          <section className="space-y-4 rounded-lg border bg-background p-5">
            <h2 className="font-semibold">1. Identificación del consumidor</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nombre completo" required className="sm:col-span-3"><input className={fieldClass} value={form.consumerName} onChange={set('consumerName')} required maxLength={150} /></Field>
              <Field label="Documento" required>
                <select className={fieldClass} value={form.consumerDocType} onChange={set('consumerDocType')}>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="RUC">RUC</option>
                </select>
              </Field>
              <Field label="N.° de documento" required><input className={fieldClass} value={form.consumerDocId} onChange={set('consumerDocId')} required maxLength={15} /></Field>
              <Field label="Teléfono"><input className={fieldClass} value={form.consumerPhone} onChange={set('consumerPhone')} inputMode="tel" maxLength={20} /></Field>
              <Field label="Correo electrónico" required hint="Aquí recibirá la copia y la respuesta" className="sm:col-span-2">
                <input type="email" className={fieldClass} value={form.consumerEmail} onChange={set('consumerEmail')} required maxLength={150} />
              </Field>
              <Field label="Domicilio"><input className={fieldClass} value={form.consumerAddress} onChange={set('consumerAddress')} maxLength={200} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={form.isMinor} onChange={(e) => setForm((f) => ({ ...f, isMinor: e.target.checked }))} />
              Soy menor de edad
            </label>
            {form.isMinor && (
              <Field label="Nombre del padre, madre o apoderado" required>
                <input className={fieldClass} value={form.guardianName} onChange={set('guardianName')} required maxLength={150} />
              </Field>
            )}
          </section>

          <section className="space-y-4 rounded-lg border bg-background p-5">
            <h2 className="font-semibold">2. Identificación del bien contratado</h2>
            <div className="flex gap-4 text-sm">
              {(['SERVICIO', 'PRODUCTO'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input type="radio" name="itemType" checked={form.itemType === t} onChange={() => setForm((f) => ({ ...f, itemType: t }))} />
                  {t === 'SERVICIO' ? 'Servicio' : 'Producto'}
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Descripción" required className="sm:col-span-2"><input className={fieldClass} value={form.itemDescription} onChange={set('itemDescription')} required maxLength={300} placeholder="Ej.: Servicio educativo 3.° de primaria, pensión de marzo" /></Field>
              <Field label="Monto reclamado (S/)"><input className={fieldClass} value={form.amount} onChange={set('amount')} inputMode="decimal" maxLength={30} /></Field>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border bg-background p-5">
            <h2 className="font-semibold">3. Detalle de la reclamación</h2>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {(['RECLAMO', 'QUEJA'] as const).map((k) => (
                <label key={k} className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${form.kind === k ? 'border-primary bg-primary/5' : ''}`}>
                  <input type="radio" name="kind" className="mt-1" checked={form.kind === k} onChange={() => setForm((f) => ({ ...f, kind: k }))} />
                  <span>
                    <strong>{k === 'RECLAMO' ? 'Reclamo' : 'Queja'}</strong>
                    <span className="block text-xs text-muted-foreground">
                      {k === 'RECLAMO' ? 'Disconformidad relacionada con el producto o servicio.' : 'Malestar por la atención recibida, no relacionado con el servicio en sí.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Field label="Detalle" required><Textarea value={form.detail} onChange={set('detail')} rows={5} required minLength={10} maxLength={4000} /></Field>
            <Field label="Pedido" required hint="¿Qué solicita al colegio?"><Textarea value={form.request} onChange={set('request')} rows={3} required minLength={5} maxLength={2000} /></Field>
            <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />
          </section>

          <div className="space-y-3 rounded-lg border bg-background p-5 text-xs text-muted-foreground">
            <p>* La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el Indecopi.</p>
            <p>* El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles.</p>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar hoja de reclamación
            </Button>
          </div>
        </form>
      )}
    </PublicShell>
  );
};
