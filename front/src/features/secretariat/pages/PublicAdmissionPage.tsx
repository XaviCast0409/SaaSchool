import React, { useMemo, useState } from 'react';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from '@/components/security/TurnstileWidget';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LEVEL_LABEL, gradeOptions, submitAdmission, usePublicSchool, type Level } from '../api/useSecretariat';
import { Field, PublicShell, fieldClass } from '../components/PublicShell';
import { StudentDataSection } from './public-admission/StudentDataSection';
import { GuardianDataSection } from './public-admission/GuardianDataSection';

const empty = {
  educationLevel: '' as Level | '',
  grade: '',
  studentFirstNames: '',
  studentLastNamePaternal: '',
  studentLastNameMaternal: '',
  studentDocumentType: 'DNI',
  studentDocumentId: '',
  studentBirthDate: '',
  studentGender: '' as 'MALE' | 'FEMALE' | '',
  previousSchool: '',
  guardianFirstName: '',
  guardianLastNames: '',
  guardianDocumentId: '',
  guardianRelation: 'MADRE',
  guardianPhone: '',
  guardianEmail: '',
  familyNotes: '',
  website: '',
};

/** Formulario público de admisión: /admision/:schoolId (sin cuenta). */
export const PublicAdmissionPage: React.FC = () => {
  const { schoolId } = useParams();
  const { data: school, isLoading, isError } = usePublicSchool(schoolId);
  const [form, setForm] = useState(empty);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const set =
    (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const grades = useMemo(() => (form.educationLevel ? gradeOptions(form.educationLevel) : []), [form.educationLevel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setError(null);
    setSending(true);
    try {
      await submitAdmission(schoolId, { ...form, grade: Number(form.grade), consent, turnstileToken: captcha });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
      setCaptchaReset((n) => n + 1);
    } finally {
      setSending(false);
    }
  };

  return (
    <PublicShell
      school={school}
      loading={isLoading}
      error={isError}
      title={`Admisión ${school?.admissionsYear ?? ''}`.trim()}
    >
      {school && !school.admissionsOpen ? (
        <div className="rounded-lg border bg-background p-8 text-center">
          <p className="font-medium">El proceso de admisión no está abierto en este momento.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Para más información comuníquese con el colegio{school.phone ? ` al ${school.phone}` : ''}
            {school.email ? ` o escriba a ${school.email}` : ''}.
          </p>
        </div>
      ) : done ? (
        <div className="rounded-lg border bg-background p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <p className="mt-3 text-lg font-semibold">¡Postulación enviada!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            La Secretaría revisará la información y se comunicará con usted
            {form.guardianEmail ? '. También le enviamos una confirmación por correo' : ''}.
          </p>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() => {
              setForm(empty);
              setConsent(false);
              setDone(false);
            }}
          >
            Postular a otro hijo(a)
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="rounded-lg border bg-background p-5">
            <h1 className="text-xl font-semibold">Formulario de admisión {school?.admissionsYear}</h1>
            {school?.admissionsMessage ? (
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{school.admissionsMessage}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Complete los datos y el colegio se comunicará con usted para los siguientes pasos.
              </p>
            )}
          </div>

          <section className="space-y-4 rounded-lg border bg-background p-5">
            <h2 className="font-semibold">1. ¿A qué grado postula?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nivel" required>
                <select
                  className={fieldClass}
                  value={form.educationLevel}
                  onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value as Level, grade: '' }))}
                  required
                >
                  <option value="">Elija…</option>
                  {school?.offeredLevels.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABEL[l]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grado" required>
                <select
                  className={fieldClass}
                  value={form.grade}
                  onChange={set('grade')}
                  required
                  disabled={!form.educationLevel}
                >
                  <option value="">Elija…</option>
                  {grades.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <StudentDataSection form={form} onChangeField={(k) => set(k)} />
          <GuardianDataSection form={form} onChangeField={(k) => set(k)} />

          <section className="space-y-3 rounded-lg border bg-background p-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              <span>
                Autorizo a {school?.name} a usar estos datos solo para el proceso de admisión y para comunicarse
                conmigo, conforme a la Ley N.° 29733 de Protección de Datos Personales.{' '}
                <Link to="/privacidad" className="underline" target="_blank">
                  Ver política de privacidad
                </Link>
                .
              </span>
            </label>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <TurnstileWidget onToken={setCaptcha} resetKey={captchaReset} />
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={sending || !consent || (Boolean(TURNSTILE_SITE_KEY) && !captcha)}
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar postulación
            </Button>
          </section>
        </form>
      )}
    </PublicShell>
  );
};
