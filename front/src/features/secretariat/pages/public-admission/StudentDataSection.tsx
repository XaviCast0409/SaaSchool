import React from 'react';
import { Field, fieldClass } from '../../components/PublicShell';

export interface AdmissionStudentFormState {
  studentFirstNames: string;
  studentLastNamePaternal: string;
  studentLastNameMaternal: string;
  studentDocumentType: string;
  studentDocumentId: string;
  studentBirthDate: string;
  studentGender: 'MALE' | 'FEMALE' | '';
  previousSchool: string;
}

interface StudentDataSectionProps {
  form: AdmissionStudentFormState;
  onChangeField: (
    k: keyof AdmissionStudentFormState,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const StudentDataSection: React.FC<StudentDataSectionProps> = ({ form, onChangeField }) => {
  return (
    <section className="space-y-4 rounded-lg border bg-background p-5">
      <h2 className="font-semibold">2. Datos del estudiante</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nombres" required className="sm:col-span-1">
          <input
            className={fieldClass}
            value={form.studentFirstNames}
            onChange={onChangeField('studentFirstNames')}
            required
            maxLength={80}
          />
        </Field>
        <Field label="Apellido paterno" required>
          <input
            className={fieldClass}
            value={form.studentLastNamePaternal}
            onChange={onChangeField('studentLastNamePaternal')}
            required
            maxLength={60}
          />
        </Field>
        <Field label="Apellido materno">
          <input
            className={fieldClass}
            value={form.studentLastNameMaternal}
            onChange={onChangeField('studentLastNameMaternal')}
            maxLength={60}
          />
        </Field>
        <Field label="Tipo de documento" required>
          <select
            className={fieldClass}
            value={form.studentDocumentType}
            onChange={onChangeField('studentDocumentType')}
          >
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
            <option value="PASSPORT">Pasaporte</option>
            <option value="PNA">Partida de nacimiento</option>
          </select>
        </Field>
        <Field label="N.° de documento" required>
          <input
            className={fieldClass}
            value={form.studentDocumentId}
            onChange={onChangeField('studentDocumentId')}
            required
            inputMode="numeric"
            maxLength={15}
          />
        </Field>
        <Field label="Fecha de nacimiento" required>
          <input
            type="date"
            className={fieldClass}
            value={form.studentBirthDate}
            onChange={onChangeField('studentBirthDate')}
            required
          />
        </Field>
        <Field label="Sexo" required>
          <select
            className={fieldClass}
            value={form.studentGender}
            onChange={onChangeField('studentGender')}
            required
          >
            <option value="">Elija…</option>
            <option value="FEMALE">Mujer</option>
            <option value="MALE">Hombre</option>
          </select>
        </Field>
        <Field label="Colegio de procedencia" className="sm:col-span-2">
          <input
            className={fieldClass}
            value={form.previousSchool}
            onChange={onChangeField('previousSchool')}
            maxLength={150}
            placeholder="Si viene de otro colegio"
          />
        </Field>
      </div>
    </section>
  );
};
