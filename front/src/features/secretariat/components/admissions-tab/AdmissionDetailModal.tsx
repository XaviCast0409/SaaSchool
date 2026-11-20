import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Phone, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { formatPeruShortDate, formatPeruDateTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import {
  ADMISSION_LABEL,
  useConvertAdmission,
  useUpdateAdmission,
  type AdmissionApplication,
  type AdmissionStatus,
} from '../../api/useSecretariat';

const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 9 ? `51${digits}` : digits}`;
};

/** "2026-11-20T15:30" (hora de Lima) para el input datetime-local. */
const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Lima' }).slice(0, 16).replace(' ', 'T') : '';

interface AdmissionDetailModalProps {
  app: AdmissionApplication | null;
  onClose: () => void;
}

export const AdmissionDetailModal: React.FC<AdmissionDetailModalProps> = ({ app, onClose }) => {
  const update = useUpdateAdmission();
  const convert = useConvertAdmission();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [interview, setInterview] = useState('');

  useEffect(() => {
    setNotes(app?.staffNotes ?? '');
    setInterview(toLocalInput(app?.interviewAt ?? null));
  }, [app]);

  if (!app) return null;

  const move = (status: AdmissionStatus) =>
    update.mutate(
      { id: app.id, status, staffNotes: notes || null, interviewAt: interview ? `${interview}:00-05:00` : null },
      {
        onSuccess: () => {
          toast.success(`Movido a «${ADMISSION_LABEL[status]}»`);
          onClose();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'Error al actualizar estado')),
      },
    );

  const save = () =>
    update.mutate(
      { id: app.id, staffNotes: notes || null, interviewAt: interview ? `${interview}:00-05:00` : null },
      {
        onSuccess: () => toast.success('Guardado'),
        onError: (e) => toast.error(getApiErrorMessage(e, 'Error al guardar notas')),
      },
    );

  const doConvert = () =>
    convert.mutate(app.id, {
      onSuccess: (r) => {
        toast.success(
          r.linkedExisting
            ? 'Ya existía un alumno con ese documento; quedó vinculado.'
            : 'Estudiante registrado. Completa su matrícula en aula y su apoderado.',
        );
        onClose();
        navigate(`/students?q=${encodeURIComponent(app.studentDocumentId)}`);
      },
      onError: (e) => toast.error(getApiErrorMessage(e, 'Error al registrar como estudiante')),
    });

  const next: Array<{ to: AdmissionStatus; label: string; variant?: 'outline' | 'destructive' }> =
    app.status === 'NEW'
      ? [
          { to: 'INTERVIEW', label: 'Programar entrevista' },
          { to: 'ADMITTED', label: 'Admitir', variant: 'outline' },
        ]
      : app.status === 'INTERVIEW'
        ? [{ to: 'ADMITTED', label: 'Admitir' }]
        : app.status === 'REJECTED' || app.status === 'WITHDRAWN'
          ? [{ to: 'NEW', label: 'Reabrir', variant: 'outline' }]
          : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={`${app.studentFirstNames} ${app.studentLastNamePaternal} ${app.studentLastNameMaternal ?? ''}`}
      description={`${app.gradeLabel} · ${app.targetYear} · ${ADMISSION_LABEL[app.status]}`}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {!['ENROLLED', 'REJECTED', 'WITHDRAWN'].includes(app.status) && (
              <>
                <Button variant="ghost" size="sm" onClick={() => move('REJECTED')} disabled={update.isPending}>
                  No admitir
                </Button>
                <Button variant="ghost" size="sm" onClick={() => move('WITHDRAWN')} disabled={update.isPending}>
                  Desistió
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={save} disabled={update.isPending}>
              Guardar notas
            </Button>
            {next.map((n) => (
              <Button
                key={n.to}
                variant={n.variant}
                onClick={() => move(n.to)}
                disabled={update.isPending || (n.to === 'INTERVIEW' && !interview)}
                title={n.to === 'INTERVIEW' && !interview ? 'Elige la fecha y hora de la entrevista' : undefined}
              >
                {n.label}
              </Button>
            ))}
            {app.status === 'ADMITTED' && (
              <Button onClick={doConvert} disabled={convert.isPending} className="gap-2">
                {convert.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" aria-hidden />
                )}
                Registrar como estudiante
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Estudiante</p>
          <p>
            {app.studentDocumentType} {app.studentDocumentId}
          </p>
          <p>
            Nació el {formatPeruShortDate(app.studentBirthDate.slice(0, 10))} ·{' '}
            {app.studentGender === 'FEMALE' ? 'Mujer' : 'Hombre'}
          </p>
          {app.previousSchool && <p>Procede de: {app.previousSchool}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Apoderado ({app.guardianRelation.toLowerCase()})
          </p>
          <p>
            {app.guardianFirstName} {app.guardianLastNames}
            {app.guardianDocumentId ? ` · DNI ${app.guardianDocumentId}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`tel:${app.guardianPhone}`}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden /> {app.guardianPhone}
            </a>
            <a
              href={waLink(app.guardianPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-emerald-700 hover:bg-muted dark:text-emerald-400"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
            </a>
          </div>
          {app.guardianEmail && <p className="pt-1">{app.guardianEmail}</p>}
        </div>
        {app.familyNotes && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Comentario de la familia</p>
            <p className="whitespace-pre-line">{app.familyNotes}</p>
          </div>
        )}
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Entrevista</span>
          <Input
            type="datetime-local"
            value={interview}
            onChange={(e) => setInterview(e.target.value)}
            disabled={app.status === 'ENROLLED'}
          />
          <span className="block text-xs text-muted-foreground">
            Al programarla, la familia recibe un correo con la fecha.
          </span>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Notas internas (no las ve la familia)
          </span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={3000} />
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Recibida el {formatPeruDateTime(app.createdAt)}. La familia aceptó el tratamiento de datos (Ley 29733).
        </p>
      </div>
    </Modal>
  );
};
