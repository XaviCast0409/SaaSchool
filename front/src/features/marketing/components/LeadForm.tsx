import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock, MessageCircle } from 'lucide-react';
import { useCreateLead, type InterestPlan, type StudentRange } from '../api/useCreateLead';
import { whatsappUrl } from '../lib/marketing';

const ROLES = ['Director(a)', 'Promotor(a)', 'Administrador(a)', 'Subdirector(a)', 'Otro'];
const RANGES: Array<{ value: StudentRange; label: string }> = [
  { value: '<150', label: 'Menos de 150' },
  { value: '150-500', label: '150 a 500' },
  { value: '>500', label: 'Más de 500' },
];
const PLANS: Array<{ value: InterestPlan; label: string }> = [
  { value: 'BASIC', label: 'Básico' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

interface LeadFormProps {
  source: string;
  defaultPlan?: InterestPlan | null;
  /** Variante compacta para el modal. */
  compact?: boolean;
}

interface FormState {
  schoolName: string;
  contactName: string;
  role: string;
  phone: string;
  studentRange: StudentRange | null;
  interestPlan: InterestPlan | null;
  city: string;
  email: string;
  message: string;
  consent: boolean;
  website: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const isValidPhone = (phone: string) => /^9\d{8}$/.test(phone.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, ''));

const utmSource = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('utm_source');
  } catch {
    return null;
  }
};

/** Formulario de solicitud de demostración en dos pasos: primero lo esencial, luego el detalle. */
export const LeadForm: React.FC<LeadFormProps> = ({ source, defaultPlan = null, compact = false }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<FormState>({
    schoolName: '',
    contactName: '',
    role: '',
    phone: '',
    studentRange: null,
    interestPlan: defaultPlan,
    city: '',
    email: '',
    message: '',
    consent: false,
    website: '',
  });
  const { mutate, isPending, isSuccess, error, reset } = useCreateLead();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateStepOne = (): boolean => {
    const next: FieldErrors = {};
    if (form.schoolName.trim().length < 2) next.schoolName = 'Escribe el nombre del colegio.';
    if (form.contactName.trim().length < 2) next.contactName = 'Escribe tu nombre.';
    if (!form.role) next.role = 'Elige tu cargo.';
    if (!isValidPhone(form.phone)) next.phone = 'Celular de 9 dígitos, empieza con 9.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step === 1) {
      if (validateStepOne()) setStep(2);
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setErrors({ email: 'Correo inválido.' });
      return;
    }
    if (!form.consent) {
      setErrors({ consent: 'Necesitamos tu autorización para contactarte.' });
      return;
    }
    const utm = utmSource();
    mutate({
      schoolName: form.schoolName.trim(),
      contactName: form.contactName.trim(),
      role: form.role,
      phone: form.phone,
      studentRange: form.studentRange,
      interestPlan: form.interestPlan,
      city: form.city.trim() || undefined,
      email: form.email.trim() || undefined,
      message: form.message.trim() || undefined,
      source: utm ? `${source} · ${utm}` : source,
      consent: true,
      website: form.website,
    });
  };

  const serverError = useMemo(() => {
    if (!error) return null;
    if (isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      if (message) return message;
    }
    return 'No pudimos enviar tu solicitud. Inténtalo otra vez o escríbenos por WhatsApp.';
  }, [error]);

  if (isSuccess) {
    const firstName = form.contactName.trim().split(/\s+/)[0];
    return (
      <div className="text-center py-6 kx-panel-enter">
        <div className="mx-auto w-16 h-16 rounded-full grid place-items-center" style={{ background: 'rgba(35,162,109,.12)', color: 'var(--kx-green)' }}>
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold">¡Listo, {firstName}!</h3>
        <p className="mt-2 kx-muted max-w-sm mx-auto">
          Recibimos tu solicitud para <b style={{ color: 'var(--kx-ink)' }}>{form.schoolName}</b>. Te escribiremos por WhatsApp para coordinar tu demostración.
        </p>
        <a
          href={whatsappUrl(`Hola, soy ${form.contactName} de ${form.schoolName}. Acabo de pedir una demostración de KIPUX.`)}
          target="_blank"
          rel="noreferrer"
          className="kx-btn kx-wa mt-6 px-6 py-3 relative"
        >
          <MessageCircle className="w-5 h-5" /> ¿Prefieres hablar ahora? Escríbenos
        </a>
        <button type="button" onClick={() => { reset(); setStep(1); }} className="block mx-auto mt-4 text-sm kx-muted underline underline-offset-4">
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  const fieldError = (key: keyof FormState) =>
    errors[key] ? <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--kx-red)' }}>{errors[key]}</p> : null;

  return (
    <form onSubmit={submit} noValidate>
      {/* Campo trampa invisible para bots */}
      <input type="text" name="website" value={form.website} onChange={(e) => set('website', e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map((n) => (
          <div key={n} className="flex-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--kx-line)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: step >= n ? '100%' : '0%', background: 'linear-gradient(90deg,var(--kx-purple),var(--kx-coral))' }} />
            </div>
            <p className="mt-2 text-xs font-bold" style={{ color: step >= n ? 'var(--kx-ink)' : 'var(--kx-muted)' }}>
              {n === 1 ? '1 · Tus datos' : '2 · Tu colegio'}
            </p>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4 kx-panel-enter" key="s1">
          <div>
            <label className="text-sm font-bold" htmlFor="lead-school">Nombre del colegio</label>
            <input id="lead-school" className="kx-input mt-1.5" placeholder="Ej. I.E.P. San Martín" value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} aria-invalid={!!errors.schoolName} autoComplete="organization" />
            {fieldError('schoolName')}
          </div>
          <div className={compact ? 'space-y-4' : 'grid sm:grid-cols-2 gap-4'}>
            <div>
              <label className="text-sm font-bold" htmlFor="lead-name">Tu nombre</label>
              <input id="lead-name" className="kx-input mt-1.5" placeholder="Nombre y apellido" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} aria-invalid={!!errors.contactName} autoComplete="name" />
              {fieldError('contactName')}
            </div>
            <div>
              <label className="text-sm font-bold" htmlFor="lead-phone">Celular (WhatsApp)</label>
              <input id="lead-phone" className="kx-input mt-1.5" placeholder="9XX XXX XXX" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!errors.phone} autoComplete="tel" />
              {fieldError('phone')}
            </div>
          </div>
          <div>
            <span className="text-sm font-bold">Tu cargo</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button type="button" key={role} onClick={() => set('role', role)} className={`kx-chip px-3.5 py-2 text-sm font-semibold ${form.role === role ? 'is-active' : ''}`}>
                  {role}
                </button>
              ))}
            </div>
            {fieldError('role')}
          </div>
          <button type="submit" className="kx-btn kx-btn-primary kx-btn-shine w-full py-3.5 text-base mt-2">
            Continuar <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4 kx-panel-enter" key="s2">
          <div>
            <span className="text-sm font-bold">¿Cuántos alumnos tiene el colegio?</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {RANGES.map((range) => (
                <button type="button" key={range.value} onClick={() => set('studentRange', range.value)} className={`kx-chip py-2.5 text-sm font-semibold ${form.studentRange === range.value ? 'is-active' : ''}`}>
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-bold">Plan que te interesa <span className="kx-muted font-medium">(opcional)</span></span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PLANS.map((plan) => (
                <button type="button" key={plan.value} onClick={() => set('interestPlan', form.interestPlan === plan.value ? null : plan.value)} className={`kx-chip py-2.5 text-sm font-semibold ${form.interestPlan === plan.value ? 'is-active' : ''}`}>
                  {plan.label}
                </button>
              ))}
            </div>
          </div>
          <div className={compact ? 'space-y-4' : 'grid sm:grid-cols-2 gap-4'}>
            <div>
              <label className="text-sm font-bold" htmlFor="lead-city">Ciudad <span className="kx-muted font-medium">(opcional)</span></label>
              <input id="lead-city" className="kx-input mt-1.5" placeholder="Ej. Arequipa" value={form.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" />
            </div>
            <div>
              <label className="text-sm font-bold" htmlFor="lead-email">Correo <span className="kx-muted font-medium">(opcional)</span></label>
              <input id="lead-email" className="kx-input mt-1.5" type="email" placeholder="tu@colegio.edu.pe" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} autoComplete="email" />
              {fieldError('email')}
            </div>
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="lead-message">¿Qué te gustaría resolver primero? <span className="kx-muted font-medium">(opcional)</span></label>
            <textarea id="lead-message" className="kx-input mt-1.5 resize-none" rows={compact ? 2 : 3} placeholder="Ej. la cobranza de pensiones y las libretas del SIAGIE" value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={1500} />
          </div>
          <label className="flex items-start gap-3 text-sm kx-muted cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#6c4fa3]" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />
            <span>
              Autorizo a KIPUX a contactarme sobre su servicio según la{' '}
              <Link to="/privacidad" className="underline underline-offset-2" style={{ color: 'var(--kx-ink)' }} target="_blank">política de privacidad</Link>.
            </span>
          </label>
          {fieldError('consent')}
          {serverError && <p className="text-sm font-semibold rounded-xl px-4 py-3" style={{ background: 'rgba(217,83,79,.08)', color: 'var(--kx-red)' }}>{serverError}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(1)} className="kx-btn px-4 py-3.5 kx-chip" aria-label="Volver al paso anterior">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button type="submit" disabled={isPending} className="kx-btn kx-btn-primary kx-btn-shine flex-1 py-3.5 text-base disabled:opacity-70">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Solicitar mi demostración <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        </div>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs kx-muted">
        <Lock className="w-3.5 h-3.5" /> Tus datos solo se usan para coordinar la demostración.
      </p>
    </form>
  );
};
