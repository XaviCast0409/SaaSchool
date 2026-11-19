import React, { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/errors';
import { useCreateLead, type InterestPlan } from '../api/useCreateLead';
import { type FormState } from '../constants/leadForm';
import { isValidPhone, utmSource } from '../utils/leadForm';
import { LeadStepOne } from './lead-form/LeadStepOne';
import { LeadStepTwo } from './lead-form/LeadStepTwo';
import { LeadSuccessView } from './lead-form/LeadSuccessView';

interface LeadFormProps {
  source: string;
  defaultPlan?: InterestPlan | null;
  /** Variante compacta para el modal. */
  compact?: boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

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
    return getApiErrorMessage(error, 'No pudimos enviar tu solicitud. Inténtalo otra vez o escríbenos por WhatsApp.');
  }, [error]);

  if (isSuccess) {
    return (
      <LeadSuccessView
        contactName={form.contactName}
        schoolName={form.schoolName}
        onReset={() => {
          reset();
          setStep(1);
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {/* Campo trampa invisible para bots */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => set('website', e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map((n) => (
          <div key={n} className="flex-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--kx-line)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: step >= n ? '100%' : '0%',
                  background: 'linear-gradient(90deg,var(--kx-purple),var(--kx-coral))',
                }}
              />
            </div>
            <p className="mt-2 text-xs font-bold" style={{ color: step >= n ? 'var(--kx-ink)' : 'var(--kx-muted)' }}>
              {n === 1 ? '1 · Tus datos' : '2 · Tu colegio'}
            </p>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <LeadStepOne
          schoolName={form.schoolName}
          contactName={form.contactName}
          phone={form.phone}
          role={form.role}
          compact={compact}
          errors={errors}
          onChange={set}
          onSubmit={submit}
        />
      ) : (
        <LeadStepTwo
          studentRange={form.studentRange}
          interestPlan={form.interestPlan}
          city={form.city}
          email={form.email}
          message={form.message}
          consent={form.consent}
          compact={compact}
          isPending={isPending}
          serverError={serverError}
          errors={errors}
          onChange={set}
          onBack={() => setStep(1)}
        />
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs kx-muted">
        <Lock className="w-3.5 h-3.5" /> Tus datos solo se usan para coordinar la demostración.
      </p>
    </form>
  );
};
