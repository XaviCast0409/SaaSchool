import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ROLES, type FormState } from '../../constants/leadForm';

export interface LeadStepOneProps {
  schoolName: string;
  contactName: string;
  phone: string;
  role: string;
  compact: boolean;
  errors: Partial<Record<keyof FormState, string>>;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const LeadStepOne: React.FC<LeadStepOneProps> = ({
  schoolName,
  contactName,
  phone,
  role,
  compact,
  errors,
  onChange,
}) => {
  const fieldError = (key: keyof FormState) =>
    errors[key] ? (
      <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--kx-red)' }}>
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="space-y-4 kx-panel-enter" key="s1">
      <div>
        <label className="text-sm font-bold" htmlFor="lead-school">
          Nombre del colegio
        </label>
        <input
          id="lead-school"
          className="kx-input mt-1.5"
          placeholder="Ej. I.E.P. San Martín"
          value={schoolName}
          onChange={(e) => onChange('schoolName', e.target.value)}
          aria-invalid={!!errors.schoolName}
          autoComplete="organization"
        />
        {fieldError('schoolName')}
      </div>
      <div className={compact ? 'space-y-4' : 'grid sm:grid-cols-2 gap-4'}>
        <div>
          <label className="text-sm font-bold" htmlFor="lead-name">
            Tu nombre
          </label>
          <input
            id="lead-name"
            className="kx-input mt-1.5"
            placeholder="Nombre y apellido"
            value={contactName}
            onChange={(e) => onChange('contactName', e.target.value)}
            aria-invalid={!!errors.contactName}
            autoComplete="name"
          />
          {fieldError('contactName')}
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="lead-phone">
            Celular (WhatsApp)
          </label>
          <input
            id="lead-phone"
            className="kx-input mt-1.5"
            placeholder="9XX XXX XXX"
            inputMode="tel"
            value={phone}
            onChange={(e) => onChange('phone', e.target.value)}
            aria-invalid={!!errors.phone}
            autoComplete="tel"
          />
          {fieldError('phone')}
        </div>
      </div>
      <div>
        <span className="text-sm font-bold">Tu cargo</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => onChange('role', r)}
              className={`kx-chip px-3.5 py-2 text-sm font-semibold ${role === r ? 'is-active' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
        {fieldError('role')}
      </div>
      <button type="submit" className="kx-btn kx-btn-primary kx-btn-shine w-full py-3.5 text-base mt-2">
        Continuar <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};
