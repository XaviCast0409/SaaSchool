import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Field, fieldClass } from '../../components/PublicShell';

export interface AdmissionGuardianFormState {
  guardianFirstName: string;
  guardianLastNames: string;
  guardianDocumentId: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  familyNotes: string;
  website: string;
}

interface GuardianDataSectionProps {
  form: AdmissionGuardianFormState;
  onChangeField: (
    k: keyof AdmissionGuardianFormState,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const GuardianDataSection: React.FC<GuardianDataSectionProps> = ({ form, onChangeField }) => {
  return (
    <section className="space-y-4 rounded-lg border bg-background p-5">
      <h2 className="font-semibold">3. Datos del padre, madre o apoderado</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nombres" required>
          <input
            className={fieldClass}
            value={form.guardianFirstName}
            onChange={onChangeField('guardianFirstName')}
            required
            maxLength={80}
          />
        </Field>
        <Field label="Apellidos" required>
          <input
            className={fieldClass}
            value={form.guardianLastNames}
            onChange={onChangeField('guardianLastNames')}
            required
            maxLength={120}
          />
        </Field>
        <Field label="Parentesco" required>
          <select
            className={fieldClass}
            value={form.guardianRelation}
            onChange={onChangeField('guardianRelation')}
          >
            <option value="MADRE">Madre</option>
            <option value="PADRE">Padre</option>
            <option value="APODERADO">Apoderado(a)</option>
            <option value="ABUELO">Abuelo(a)</option>
            <option value="OTRO">Otro</option>
          </select>
        </Field>
        <Field label="DNI">
          <input
            className={fieldClass}
            value={form.guardianDocumentId}
            onChange={onChangeField('guardianDocumentId')}
            inputMode="numeric"
            maxLength={15}
          />
        </Field>
        <Field label="Celular (WhatsApp)" required>
          <input
            className={fieldClass}
            value={form.guardianPhone}
            onChange={onChangeField('guardianPhone')}
            required
            inputMode="tel"
            maxLength={20}
            placeholder="987654321"
          />
        </Field>
        <Field label="Correo" hint="Le enviaremos la confirmación">
          <input
            type="email"
            className={fieldClass}
            value={form.guardianEmail}
            onChange={onChangeField('guardianEmail')}
            maxLength={150}
          />
        </Field>
      </div>
      <Field
        label="¿Algo que debamos saber?"
        hint="Necesidades educativas, hermanos en el colegio, horario para llamarle, etc."
      >
        <Textarea
          value={form.familyNotes}
          onChange={onChangeField('familyNotes')}
          rows={3}
          maxLength={1500}
        />
      </Field>
      {/* Campo trampa: invisible para personas, los bots lo rellenan */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={onChangeField('website')}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
    </section>
  );
};
