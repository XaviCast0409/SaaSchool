import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import type { InterestPlan, StudentRange } from '../../api/useCreateLead';
import { PLANS, RANGES, type FormState } from '../../constants/leadForm';

export interface LeadStepTwoProps {
  studentRange: StudentRange | null;
  interestPlan: InterestPlan | null;
  city: string;
  email: string;
  message: string;
  consent: boolean;
  compact: boolean;
  isPending: boolean;
  serverError: string | null;
  errors: Partial<Record<keyof FormState, string>>;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onBack: () => void;
}

export const LeadStepTwo: React.FC<LeadStepTwoProps> = ({
  studentRange,
  interestPlan,
  city,
  email,
  message,
  consent,
  compact,
  isPending,
  serverError,
  errors,
  onChange,
  onBack,
}) => {
  return (
    <div className="space-y-4 kx-panel-enter" key="s2">
      <div>
        <span className="text-sm font-bold">¿Cuántos alumnos tiene el colegio?</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {RANGES.map((range) => (
            <button
              type="button"
              key={range.value}
              onClick={() => onChange('studentRange', range.value)}
              className={`kx-chip py-2.5 text-sm font-semibold ${studentRange === range.value ? 'is-active' : ''}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm font-bold">
          Plan que te interesa <span className="kx-muted font-medium">(opcional)</span>
        </span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PLANS.map((plan) => (
            <button
              type="button"
              key={plan.value}
              onClick={() => onChange('interestPlan', interestPlan === plan.value ? null : plan.value)}
              className={`kx-chip py-2.5 text-sm font-semibold ${interestPlan === plan.value ? 'is-active' : ''}`}
            >
              {plan.label}
            </button>
          ))}
        </div>
      </div>
      <div className={compact ? 'space-y-4' : 'grid sm:grid-cols-2 gap-4'}>
        <div>
          <label className="text-sm font-bold" htmlFor="lead-city">Ciudad (opcional)</label>
          <input
            id="lead-city"
            className="kx-input mt-1.5"
            placeholder="Ej. Arequipa"
            value={city}
            onChange={(e) => onChange('city', e.target.value)}
            autoComplete="address-level2"
          />
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="lead-email">Correo (opcional)</label>
          <input
            id="lead-email"
            className="kx-input mt-1.5"
            type="email"
            placeholder="tu@colegio.edu.pe"
            value={email}
            onChange={(e) => onChange('email', e.target.value)}
            aria-invalid={!!errors.email}
            autoComplete="email"
          />
          {errors.email && <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--kx-red)' }}>{errors.email}</p>}
        </div>
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="lead-message">¿Qué te gustaría resolver primero? (opcional)</label>
        <textarea
          id="lead-message"
          className="kx-input mt-1.5 resize-none"
          rows={compact ? 2 : 3}
          placeholder="Ej. la cobranza de pensiones y las libretas del SIAGIE"
          value={message}
          onChange={(e) => onChange('message', e.target.value)}
          maxLength={1500}
        />
      </div>
      <label className="flex items-start gap-3 text-sm kx-muted cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-[#6c4fa3]"
          checked={consent}
          onChange={(e) => onChange('consent', e.target.checked)}
        />
        <span>
          Autorizo a KIPUX a contactarme según la{' '}
          <Link to="/privacidad" className="underline underline-offset-2" style={{ color: 'var(--kx-ink)' }} target="_blank">
            política de privacidad
          </Link>.
        </span>
      </label>
      {errors.consent && <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--kx-red)' }}>{errors.consent}</p>}
      {serverError && (
        <p className="text-sm font-semibold rounded-xl px-4 py-3" style={{ background: 'rgba(217,83,79,.08)', color: 'var(--kx-red)' }}>
          {serverError}
        </p>
      )}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="kx-btn px-4 py-3.5 kx-chip" aria-label="Volver al paso anterior">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button type="submit" disabled={isPending} className="kx-btn kx-btn-primary kx-btn-shine flex-1 py-3.5 text-base disabled:opacity-70">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Solicitar mi demostración <ArrowRight className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );
};
