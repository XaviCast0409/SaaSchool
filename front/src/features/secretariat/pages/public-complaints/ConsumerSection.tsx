import React from 'react';
import { Field, fieldClass } from '../../components/PublicShell';

export interface ConsumerSectionFormState {
  consumerName: string;
  consumerDocType: string;
  consumerDocId: string;
  consumerAddress: string;
  consumerPhone: string;
  consumerEmail: string;
  isMinor: boolean;
  guardianName: string;
}

interface ConsumerSectionProps {
  form: ConsumerSectionFormState;
  onChangeField: (
    k: keyof ConsumerSectionFormState,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onMinorChange: (isMinor: boolean) => void;
}

export const ConsumerSection: React.FC<ConsumerSectionProps> = ({ form, onChangeField, onMinorChange }) => {
  return (
    <section className="space-y-4 rounded-lg border bg-background p-5">
      <h2 className="font-semibold">1. Identificación del consumidor</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nombre completo" required className="sm:col-span-3">
          <input
            className={fieldClass}
            value={form.consumerName}
            onChange={onChangeField('consumerName')}
            required
            maxLength={150}
          />
        </Field>
        <Field label="Documento" required>
          <select className={fieldClass} value={form.consumerDocType} onChange={onChangeField('consumerDocType')}>
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="RUC">RUC</option>
          </select>
        </Field>
        <Field label="N.° de documento" required>
          <input
            className={fieldClass}
            value={form.consumerDocId}
            onChange={onChangeField('consumerDocId')}
            required
            maxLength={15}
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={fieldClass}
            value={form.consumerPhone}
            onChange={onChangeField('consumerPhone')}
            inputMode="tel"
            maxLength={20}
          />
        </Field>
        <Field
          label="Correo electrónico"
          required
          hint="Aquí recibirá la copia y la respuesta"
          className="sm:col-span-2"
        >
          <input
            type="email"
            className={fieldClass}
            value={form.consumerEmail}
            onChange={onChangeField('consumerEmail')}
            required
            maxLength={150}
          />
        </Field>
        <Field label="Domicilio">
          <input
            className={fieldClass}
            value={form.consumerAddress}
            onChange={onChangeField('consumerAddress')}
            maxLength={200}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={form.isMinor}
          onChange={(e) => onMinorChange(e.target.checked)}
        />
        Soy menor de edad
      </label>
      {form.isMinor && (
        <Field label="Nombre del padre, madre o apoderado" required>
          <input
            className={fieldClass}
            value={form.guardianName}
            onChange={onChangeField('guardianName')}
            required
            maxLength={150}
          />
        </Field>
      )}
    </section>
  );
};
