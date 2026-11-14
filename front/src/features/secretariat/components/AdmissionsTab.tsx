import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Phone, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatPeruShortDate, formatPeruDateTime } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import {
  ADMISSION_LABEL,
  useAdmissions,
  useConvertAdmission,
  useUpdateAdmission,
  type AdmissionApplication,
  type AdmissionStatus,
} from '../api/useSecretariat';

const COLUMNS: AdmissionStatus[] = ['NEW', 'INTERVIEW', 'ADMITTED', 'ENROLLED'];
const CLOSED: AdmissionStatus[] = ['REJECTED', 'WITHDRAWN'];
const TONE: Record<AdmissionStatus, string> = {
  NEW: 'border-t-sky-500',
  INTERVIEW: 'border-t-amber-500',
  ADMITTED: 'border-t-emerald-500',
  ENROLLED: 'border-t-violet-500',
  REJECTED: 'border-t-slate-400',
  WITHDRAWN: 'border-t-slate-400',
};

const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 9 ? `51${digits}` : digits}`;
};

/** "2026-11-20T15:30" (hora de Lima) para el input datetime-local. */
const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Lima' }).slice(0, 16).replace(' ', 'T') : '';

const DetailModal: React.FC<{ app: AdmissionApplication | null; onClose: () => void }> = ({ app, onClose }) => {
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
      { onSuccess: () => { toast.success(`Movido a «${ADMISSION_LABEL[status]}»`); onClose(); }, onError: (e) => toast.error(apiErrorMessage(e)) },
    );
  const save = () =>
    update.mutate(
      { id: app.id, staffNotes: notes || null, interviewAt: interview ? `${interview}:00-05:00` : null },
      { onSuccess: () => toast.success('Guardado'), onError: (e) => toast.error(apiErrorMessage(e)) },
    );
  const doConvert = () =>
    convert.mutate(app.id, {
      onSuccess: (r) => {
        toast.success(r.linkedExisting ? 'Ya existía un alumno con ese documento; quedó vinculado.' : 'Estudiante registrado. Completa su matrícula en aula y su apoderado.');
        onClose();
        navigate(`/students?q=${encodeURIComponent(app.studentDocumentId)}`);
      },
      onError: (e) => toast.error(apiErrorMessage(e)),
    });

  const next: Array<{ to: AdmissionStatus; label: string; variant?: 'outline' | 'destructive' }> =
    app.status === 'NEW'
      ? [{ to: 'INTERVIEW', label: 'Programar entrevista' }, { to: 'ADMITTED', label: 'Admitir', variant: 'outline' }]
      : app.status === 'INTERVIEW'
        ? [{ to: 'ADMITTED', label: 'Admitir' }]
        : app.status === 'REJECTED' || app.status === 'WITHDRAWN'
          ? [{ to: 'NEW', label: 'Reabrir', variant: 'outline' }]
          : [];

  return (
    <Modal open onClose={onClose} title={`${app.studentFirstNames} ${app.studentLastNamePaternal} ${app.studentLastNameMaternal ?? ''}`} description={`${app.gradeLabel} · ${app.targetYear} · ${ADMISSION_LABEL[app.status]}`} size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {!['ENROLLED', 'REJECTED', 'WITHDRAWN'].includes(app.status) && (
              <>
                <Button variant="ghost" size="sm" onClick={() => move('REJECTED')} disabled={update.isPending}>No admitir</Button>
                <Button variant="ghost" size="sm" onClick={() => move('WITHDRAWN')} disabled={update.isPending}>Desistió</Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={save} disabled={update.isPending}>Guardar notas</Button>
            {next.map((n) => (
              <Button key={n.to} variant={n.variant} onClick={() => move(n.to)} disabled={update.isPending || (n.to === 'INTERVIEW' && !interview)} title={n.to === 'INTERVIEW' && !interview ? 'Elige la fecha y hora de la entrevista' : undefined}>
                {n.label}
              </Button>
            ))}
            {app.status === 'ADMITTED' && (
              <Button onClick={doConvert} disabled={convert.isPending} className="gap-2">
                {convert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" aria-hidden />}
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
          <p>{app.studentDocumentType} {app.studentDocumentId}</p>
          <p>Nació el {formatPeruShortDate(app.studentBirthDate.slice(0, 10))} · {app.studentGender === 'FEMALE' ? 'Mujer' : 'Hombre'}</p>
          {app.previousSchool && <p>Procede de: {app.previousSchool}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Apoderado ({app.guardianRelation.toLowerCase()})</p>
          <p>{app.guardianFirstName} {app.guardianLastNames}{app.guardianDocumentId ? ` · DNI ${app.guardianDocumentId}` : ''}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={`tel:${app.guardianPhone}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"><Phone className="h-3.5 w-3.5" aria-hidden /> {app.guardianPhone}</a>
            <a href={waLink(app.guardianPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-emerald-700 hover:bg-muted dark:text-emerald-400"><MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp</a>
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
          <Input type="datetime-local" value={interview} onChange={(e) => setInterview(e.target.value)} disabled={app.status === 'ENROLLED'} />
          <span className="block text-xs text-muted-foreground">Al programarla, la familia recibe un correo con la fecha.</span>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Notas internas (no las ve la familia)</span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={3000} />
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">Recibida el {formatPeruDateTime(app.createdAt)}. La familia aceptó el tratamiento de datos (Ley 29733).</p>
      </div>
    </Modal>
  );
};

export const AdmissionsTab: React.FC<{ defaultYear: number | null }> = ({ defaultYear }) => {
  const [year, setYear] = useState<number | undefined>(defaultYear ?? undefined);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState<AdmissionApplication | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, isLoading } = useAdmissions({ year, q: debouncedQ || undefined });
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const byStatus = useMemo(() => {
    const m = new Map<AdmissionStatus, AdmissionApplication[]>();
    for (const r of rows) m.set(r.status, [...(m.get(r.status) ?? []), r]);
    return m;
  }, [rows]);
  const closedCount = CLOSED.reduce((n, s) => n + (byStatus.get(s)?.length ?? 0), 0);
  const years = data?.years.length ? data.years : defaultYear ? [defaultYear] : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o DNI" className="pl-8" />
        </div>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={year ?? ''} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>Admisión {y}</option>)}
        </select>
        {closedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowClosed((v) => !v)}>
            {showClosed ? 'Ocultar' : 'Ver'} no admitidos y desistidos ({closedCount})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-4">{COLUMNS.map((c) => <Skeleton key={c} className="h-48" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<UserPlus className="h-8 w-8" />} title="Aún no hay postulaciones" description="Comparte el enlace del formulario de admisión en tus redes y en WhatsApp. Cada postulación llega aquí." />
      ) : (
        <div className={cn('grid gap-3', showClosed ? 'md:grid-cols-3 xl:grid-cols-6' : 'md:grid-cols-2 xl:grid-cols-4')}>
          {[...COLUMNS, ...(showClosed ? CLOSED : [])].map((status) => {
            const list = byStatus.get(status) ?? [];
            return (
              <div key={status} className={cn('rounded-lg border border-t-4 bg-muted/30 p-2', TONE[status])}>
                <p className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
                  {ADMISSION_LABEL[status]} <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">{list.length}</span>
                </p>
                <div className="space-y-2">
                  {list.map((a) => (
                    <button key={a.id} type="button" onClick={() => setSelected(a)} className="w-full rounded-md border bg-background p-2.5 text-left text-sm shadow-sm transition hover:border-primary">
                      <p className="font-medium leading-tight">{a.studentFirstNames} {a.studentLastNamePaternal}</p>
                      <p className="text-xs text-muted-foreground">{a.gradeLabel}</p>
                      {a.interviewAt && status === 'INTERVIEW' && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Entrevista: {formatPeruDateTime(a.interviewAt)}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatPeruShortDate(a.createdAt)} · {a.guardianPhone}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <DetailModal app={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

