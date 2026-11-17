import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useStudents } from '@/features/students/api/useStudents';
import { SchoolLetterhead } from '@/features/schools/components/SchoolLetterhead';
import { toast } from 'sonner';
import { BellRing, Copy, Download, ExternalLink, FileUp, Loader2, Lock, Printer, QrCode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatPeruShortDate, formatPeruDateTime } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import { openFile } from '@/features/course-contents/utils/fileUrls';
import {
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  useComplaints,
  useCreateDocumentAtDesk,
  useDocumentRequests,
  useRatifications,
  useRemindRatification,
  useRespondComplaint,
  useSaveSecretariatSettings,
  useUpdateDocument,
  type Complaint,
  type DocumentRequestRow,
  type DocumentStatus,
  type DocumentType as DocType,
  type SecretariatSettings,
} from '../api/useSecretariat';

const STATUS_VARIANT: Record<DocumentStatus, 'secondary' | 'warning' | 'success' | 'outline' | 'destructive'> = {
  REQUESTED: 'secondary',
  IN_PROCESS: 'warning',
  READY: 'success',
  DELIVERED: 'outline',
  REJECTED: 'destructive',
};

// ------------------------------------------------------------------ Configuración y enlaces públicos

/** Abre una hoja lista para imprimir con el QR del Libro de Reclamaciones (para colocar junto al aviso). */
const printComplaintsQr = async (url: string, schoolName: string) => {
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 480 });
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) return toast.error('Permite las ventanas emergentes para imprimir el QR.');
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Libro de Reclamaciones - ${esc(schoolName)}</title>
    <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#111}h1{font-size:28px;margin:0 0 8px}p{margin:6px 0}img{width:320px;height:320px;margin:24px auto;display:block}small{color:#555;word-break:break-all}</style>
    </head><body><h1>Libro de Reclamaciones</h1><p>${esc(schoolName)}</p><img src="${dataUrl}" alt="Código QR"><p>Escanee el código para registrar su reclamo o queja.</p><small>${esc(url)}</small>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
  return undefined;
};

export const PublicLinksCard: React.FC<{ schoolId: string; schoolSlug?: string | null; schoolName?: string; settings: SecretariatSettings; canEdit: boolean }> = ({ schoolId, schoolSlug, schoolName = 'el colegio', settings, canEdit }) => {
  const save = useSaveSecretariatSettings();
  const nextYear = new Date().getFullYear() + 1;
  const [form, setForm] = useState({
    admissionsOpen: settings.admissionsOpen,
    admissionsYear: settings.admissionsYear ?? nextYear,
    admissionsMessage: settings.admissionsMessage ?? '',
    ratificationOpen: settings.ratificationOpen,
    ratificationYear: settings.ratificationYear ?? nextYear,
    ratificationDeadline: settings.ratificationDeadline?.slice(0, 10) ?? '',
  });
  const [open, setOpen] = useState(false);
  const origin = window.location.origin;
  // Con el código corto del colegio el enlace es fácil de leer y de dictar por teléfono
  const publicKey = schoolSlug || schoolId;
  const admissionUrl = `${origin}/admision/${publicKey}`;
  const complaintsUrl = `${origin}/reclamaciones/${publicKey}`;
  const copy = (url: string) => navigator.clipboard.writeText(url).then(() => toast.success('Enlace copiado'), () => toast.error('No se pudo copiar'));

  const submit = () =>
    save.mutate(
      {
        admissionsOpen: form.admissionsOpen,
        admissionsYear: Number(form.admissionsYear) || null,
        admissionsMessage: form.admissionsMessage || null,
        ratificationOpen: form.ratificationOpen,
        ratificationYear: Number(form.ratificationYear) || null,
        ratificationDeadline: form.ratificationDeadline || null,
      },
      { onSuccess: () => { toast.success('Configuración guardada'); setOpen(false); }, onError: (e) => toast.error(apiErrorMessage(e)) },
    );

  const LinkRow: React.FC<{ label: string; url: string; on?: boolean }> = ({ label, url, on }) => (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          {label}
          {on !== undefined && <Badge variant={on ? 'success' : 'secondary'}>{on ? 'Abierto' : 'Cerrado'}</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{url}</p>
      </div>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => copy(url)}><Copy className="h-3.5 w-3.5" aria-hidden /> Copiar</Button>
      <Button size="sm" variant="ghost" className="gap-1" onClick={() => window.open(url, '_blank', 'noopener')}><ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ver</Button>
    </div>
  );

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Enlaces públicos del colegio</p>
          <p className="text-xs text-muted-foreground">Compártelos en tu web, Facebook o WhatsApp. No requieren cuenta.</p>
        </div>
        {canEdit && <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Configurar admisión y ratificación</Button>}
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <LinkRow label={`Formulario de admisión ${settings.admissionsYear ?? ''}`} url={admissionUrl} on={settings.admissionsOpen} />
        <LinkRow label="Libro de Reclamaciones virtual" url={complaintsUrl} />
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <QrCode className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="flex-1">Indecopi exige exhibir el aviso del Libro de Reclamaciones en el local. Imprime el QR y colócalo junto al aviso.</span>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => void printComplaintsQr(complaintsUrl, schoolName)}>
          <QrCode className="h-3.5 w-3.5" aria-hidden /> Imprimir QR
        </Button>
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title="Admisión y ratificación" size="lg"
        footer={<Button onClick={submit} disabled={save.isPending}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>}>
        <div className="space-y-5 text-sm">
          <fieldset className="space-y-3">
            <legend className="font-semibold">Admisión en línea</legend>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={form.admissionsOpen} onChange={(e) => setForm((f) => ({ ...f, admissionsOpen: e.target.checked }))} /> Recibir postulaciones por el formulario público</label>
            <label className="block space-y-1"><span>Año escolar al que postulan</span><Input type="number" value={form.admissionsYear} onChange={(e) => setForm((f) => ({ ...f, admissionsYear: Number(e.target.value) }))} className="w-32" /></label>
            <label className="block space-y-1"><span>Mensaje de bienvenida y requisitos</span><Textarea rows={4} value={form.admissionsMessage} onChange={(e) => setForm((f) => ({ ...f, admissionsMessage: e.target.value }))} placeholder="Ej.: Vacantes limitadas. Requisitos: copia de DNI, libreta del año anterior…" maxLength={3000} /></label>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="font-semibold">Ratificación de matrícula</legend>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={form.ratificationOpen} onChange={(e) => setForm((f) => ({ ...f, ratificationOpen: e.target.checked }))} /> Las familias confirman desde la app si continúan</label>
            <div className="flex flex-wrap gap-4">
              <label className="block space-y-1"><span>Año que se ratifica</span><Input type="number" value={form.ratificationYear} onChange={(e) => setForm((f) => ({ ...f, ratificationYear: Number(e.target.value) }))} className="w-32" /></label>
              <label className="block space-y-1"><span>Fecha límite (opcional)</span><Input type="date" value={form.ratificationDeadline} onChange={(e) => setForm((f) => ({ ...f, ratificationDeadline: e.target.value }))} /></label>
            </div>
          </fieldset>
        </div>
      </Modal>
    </Card>
  );
};

// ------------------------------------------------------------------ Ratificación

export const RatificationTab: React.FC<{ open: boolean }> = ({ open }) => {
  const { data, isLoading } = useRatifications();
  const remind = useRemindRatification();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'DECLINED'>('ALL');
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const counts = useMemo(
    () => ({
      CONFIRMED: rows.filter((r) => r.decision === 'CONFIRMED').length,
      DECLINED: rows.filter((r) => r.decision === 'DECLINED').length,
      PENDING: rows.filter((r) => !r.decision).length,
    }),
    [rows],
  );
  const visible = rows.filter((r) => filter === 'ALL' || (filter === 'PENDING' ? !r.decision : r.decision === filter));

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data?.targetYear) return <EmptyState title="Ratificación no configurada" description="Configura el año que se ratifica en «Configurar admisión y ratificación»." />;
  const pct = rows.length ? Math.round(((counts.CONFIRMED + counts.DECLINED) / rows.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <SchoolLetterhead className="hidden print:flex" title={`Ratificación de matrícula ${data.targetYear}`} subtitle={`Impreso el ${new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}`} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Avance</p><p className="text-2xl font-semibold">{pct}%</p><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Continúan</p><p className="text-2xl font-semibold text-emerald-600">{counts.CONFIRMED}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">No continúan</p><p className="text-2xl font-semibold text-red-600">{counts.DECLINED}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Sin responder</p><p className="text-2xl font-semibold text-amber-600">{counts.PENDING}</p></Card>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'PENDING', 'CONFIRMED', 'DECLINED'] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {{ ALL: 'Todos', PENDING: 'Sin responder', CONFIRMED: 'Continúan', DECLINED: 'No continúan' }[f]}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" aria-hidden /> Imprimir</Button>
          <Button size="sm" className="gap-1" disabled={!open || counts.PENDING === 0 || remind.isPending} title={!open ? 'Activa la ratificación en línea primero' : undefined}
            onClick={() => remind.mutate(undefined, { onSuccess: (r) => toast.success(`Recordatorio enviado a ${r.families} familiares de ${r.students} alumnos`), onError: (e) => toast.error(apiErrorMessage(e)) })}>
            {remind.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" aria-hidden />} Recordar a quienes faltan
          </Button>
        </div>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="px-3 py-2">Estudiante</th><th className="px-3 py-2">Aula {new Date().getFullYear()}</th><th className="px-3 py-2">Respuesta {data.targetYear}</th><th className="px-3 py-2">Firmó</th></tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.studentId} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{r.studentName}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.classroom}</td>
                <td className="px-3 py-2">
                  {r.decision === 'CONFIRMED' ? <Badge variant="success">Continúa</Badge> : r.decision === 'DECLINED' ? <Badge variant="destructive">No continúa</Badge> : <Badge variant="secondary">Pendiente</Badge>}
                  {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.signedBy ? `${r.signedBy} · ${formatPeruDateTime(r.signedAt!)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sin registros en este filtro.</p>}
      </Card>
    </div>
  );
};

// ------------------------------------------------------------------ Trámites

const DocumentModal: React.FC<{ doc: DocumentRequestRow | null; onClose: () => void }> = ({ doc, onClose }) => {
  const update = useUpdateDocument();
  const upload = useUploadMaterial();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [release, setRelease] = useState(false);
  useEffect(() => {
    setNote(doc?.staffNote ?? '');
    setFileUrl(doc?.fileUrl ?? null);
    setRelease(false);
  }, [doc]);
  if (!doc) return null;
  const go = (status?: DocumentStatus) =>
    update.mutate(
      { id: doc.id, status, staffNote: note || null, fileUrl, releaseHold: release || undefined },
      { onSuccess: () => { toast.success(status ? `Marcado como «${DOCUMENT_STATUS_LABEL[status]}»` : 'Guardado'); onClose(); }, onError: (e) => toast.error(apiErrorMessage(e)) },
    );
  const held = doc.debtHold && !release;

  return (
    <Modal open onClose={onClose} title={doc.typeLabel} description={`${doc.studentName} · pedido por ${doc.requestedBy}${doc.requestedByPhone ? ` (${doc.requestedByPhone})` : ''}`} size="md"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          {doc.status !== 'DELIVERED' && doc.status !== 'REJECTED' && <Button variant="ghost" onClick={() => go('REJECTED')} disabled={update.isPending || !note}>Observar</Button>}
          <Button variant="outline" onClick={() => go()} disabled={update.isPending}>Guardar</Button>
          {doc.status === 'REQUESTED' && <Button variant="outline" onClick={() => go('IN_PROCESS')} disabled={update.isPending}>En proceso</Button>}
          {(doc.status === 'REQUESTED' || doc.status === 'IN_PROCESS') && <Button onClick={() => go('READY')} disabled={update.isPending || held}>Listo para entregar</Button>}
          {doc.status === 'READY' && <Button onClick={() => go('DELIVERED')} disabled={update.isPending || held}>Entregado</Button>}
          {doc.status === 'REJECTED' && <Button variant="outline" onClick={() => go('REQUESTED')} disabled={update.isPending}>Reabrir</Button>}
        </div>
      }>
      <div className="space-y-4 text-sm">
        <div>
          <Badge variant={STATUS_VARIANT[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
          <span className="ml-2 text-muted-foreground">{doc.copies} {doc.copies === 1 ? 'ejemplar' : 'ejemplares'} · {formatPeruDateTime(doc.createdAt)}</span>
        </div>
        {doc.purpose && <p><span className="text-muted-foreground">Motivo:</span> {doc.purpose}</p>}
        {doc.debtHold && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="flex items-center gap-1.5 font-medium"><Lock className="h-4 w-4" aria-hidden /> Retenido por deuda vencida</p>
            <p className="mt-1 text-xs">La Ley 27665 permite retener solo el certificado de estudios de los periodos no pagados. Si la familia ya regularizó, libera la retención.</p>
            <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} /> Liberar retención (queda en la bitácora)</label>
          </div>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Nota para la familia</span>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Puede recogerlo en Secretaría de 8:00 a 13:00." maxLength={1500} />
          <span className="block text-xs text-muted-foreground">Obligatoria si observas el trámite.</span>
        </label>
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Documento digital (opcional)</span>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate({ file: f, purpose: 'STUDENT_DOCUMENT', studentId: doc.studentId }, { onSuccess: (r) => setFileUrl(r.url), onError: (err) => toast.error(apiErrorMessage(err)) });
          }} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" aria-hidden />} {fileUrl ? 'Reemplazar PDF' : 'Adjuntar PDF'}
            </Button>
            {fileUrl && <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => void openFile(fileUrl)}><Download className="h-3.5 w-3.5" aria-hidden /> Ver adjunto</Button>}
          </div>
          <span className="block text-xs text-muted-foreground">Si lo adjuntas, la familia lo descarga desde la app al quedar listo.</span>
        </div>
      </div>
    </Modal>
  );
};

/** Registrar en ventanilla una constancia que la familia pide en persona. */
const DeskRequestModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const create = useCreateDocumentAtDesk();
  const [search, setSearch] = useState('');
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const [type, setType] = useState<DocType>('CONSTANCIA_MATRICULA' as DocType);
  const [purpose, setPurpose] = useState('');
  const [copies, setCopies] = useState(1);
  const [requesterName, setRequesterName] = useState('');
  const { data: found } = useStudents({ page: 1, limit: 8, search: search.trim(), scope: 'all' }, open && !student && search.trim().length >= 3);
  useEffect(() => {
    if (open) { setSearch(''); setStudent(null); setPurpose(''); setCopies(1); setRequesterName(''); }
  }, [open]);
  const canSave = !!student && requesterName.trim().length >= 3 && (type !== 'OTRO' || purpose.trim().length > 0);
  const submit = () =>
    student && create.mutate(
      { studentId: student.id, type, purpose: purpose.trim() || undefined, copies, requesterName: requesterName.trim() },
      { onSuccess: () => { toast.success('Trámite registrado. Lo verás en la lista para atenderlo.'); onClose(); }, onError: (e) => toast.error(apiErrorMessage(e)) },
    );
  return (
    <Modal open={open} onClose={onClose} title="Registrar trámite en ventanilla" size="md"
      footer={<Button onClick={submit} disabled={!canSave || create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar</Button>}>
      <div className="space-y-3 text-sm">
        <label className="block space-y-1">
          <span className="font-medium">Alumno</span>
          {student ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span>{student.name}</span>
              <Button size="sm" variant="ghost" onClick={() => setStudent(null)}>Cambiar</Button>
            </div>
          ) : (
            <>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Apellido, nombre o DNI (mínimo 3 letras)" />
              {(found?.data ?? []).length > 0 && (
                <ul className="divide-y rounded-md border">
                  {(found?.data ?? []).map((st) => (
                    <li key={st.id}>
                      <button type="button" className="w-full px-3 py-1.5 text-left hover:bg-muted" onClick={() => setStudent({ id: st.id, name: `${[st.lastNamePaternal, st.lastNameMaternal].filter(Boolean).join(' ')}, ${st.firstNames}` })}>
                        {[st.lastNamePaternal, st.lastNameMaternal].filter(Boolean).join(' ')}, {st.firstNames} <span className="text-xs text-muted-foreground">· {st.documentId}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Documento</span>
          <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full rounded-md border border-input bg-background px-3 py-2">
            {(Object.keys(DOCUMENT_TYPE_LABEL) as DocType[]).map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block space-y-1"><span className="font-medium">¿Quién lo pide?</span><Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Ej.: Rosa Huamán (madre)" /></label>
          <label className="block space-y-1"><span className="font-medium">Copias</span><Input type="number" min={1} max={5} value={copies} onChange={(e) => setCopies(Math.min(5, Math.max(1, Number(e.target.value) || 1)))} className="w-20" /></label>
        </div>
        <label className="block space-y-1"><span className="font-medium">Para qué lo necesita {type === 'OTRO' ? '(obligatorio)' : '(opcional)'}</span><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ej.: Trámite de traslado" maxLength={300} /></label>
      </div>
    </Modal>
  );
};

export const DocumentsTab: React.FC = () => {
  const [status, setStatus] = useState<DocumentStatus | undefined>(undefined);
  const { data, isLoading } = useDocumentRequests(status);
  const [selected, setSelected] = useState<DocumentRequestRow | null>(null);
  const [deskOpen, setDeskOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="mr-auto gap-1" onClick={() => setDeskOpen(true)}><FileUp className="h-3.5 w-3.5" aria-hidden /> Registrar en ventanilla</Button>
        <Button size="sm" variant={!status ? 'default' : 'outline'} onClick={() => setStatus(undefined)}>Todos</Button>
        {(['REQUESTED', 'IN_PROCESS', 'READY', 'DELIVERED', 'REJECTED'] as DocumentStatus[]).map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>{DOCUMENT_STATUS_LABEL[s]}</Button>
        ))}
      </div>
      {isLoading ? <Skeleton className="h-48" /> : !data?.length ? (
        <EmptyState title="Sin trámites" description="Las familias piden constancias y certificados desde «Trámites» en su app. Si alguien lo pide en persona, usa «Registrar en ventanilla»." />
      ) : (
        <Card className="divide-y">
          {data.map((d) => (
            <button key={d.id} type="button" onClick={() => setSelected(d)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{d.typeLabel} {d.copies > 1 && <span className="text-muted-foreground">×{d.copies}</span>}</p>
                <p className="text-xs text-muted-foreground">{d.studentName} · {d.requestedBy} · {formatPeruShortDate(d.createdAt)}</p>
              </div>
              {d.debtHold && <Badge variant="warning" className="gap-1"><Lock className="h-3 w-3" aria-hidden /> Deuda</Badge>}
              <Badge variant={STATUS_VARIANT[d.status]}>{DOCUMENT_STATUS_LABEL[d.status]}</Badge>
            </button>
          ))}
        </Card>
      )}
      <DocumentModal doc={selected} onClose={() => setSelected(null)} />
      <DeskRequestModal open={deskOpen} onClose={() => setDeskOpen(false)} />
    </div>
  );
};

// ------------------------------------------------------------------ Libro de Reclamaciones

const ComplaintModal: React.FC<{ c: Complaint | null; onClose: () => void; canRespond: boolean }> = ({ c, onClose, canRespond }) => {
  const respond = useRespondComplaint();
  const [text, setText] = useState('');
  useEffect(() => setText(''), [c]);
  if (!c) return null;
  return (
    <Modal open onClose={onClose} title={`${c.code} · ${c.kind === 'RECLAMO' ? 'Reclamo' : 'Queja'}`} description={`Registrado el ${formatPeruDateTime(c.createdAt)} · vence el ${formatPeruShortDate(c.dueDate.slice(0, 10))}`} size="lg"
      footer={c.status === 'OPEN' && canRespond ? (
        <Button disabled={respond.isPending || text.trim().length < 10} onClick={() => respond.mutate({ id: c.id, response: text }, { onSuccess: () => { toast.success('Respuesta enviada al correo del consumidor'); onClose(); }, onError: (e) => toast.error(apiErrorMessage(e)) })}>
          {respond.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar respuesta
        </Button>
      ) : undefined}>
      <div className="space-y-4 text-sm">
        <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[150px_1fr]">
          <dt className="text-muted-foreground">Consumidor</dt><dd>{c.consumerName} · {c.consumerDocType} {c.consumerDocId}{c.isMinor ? ` (menor; apoderado: ${c.guardianName})` : ''}</dd>
          <dt className="text-muted-foreground">Contacto</dt><dd>{c.consumerEmail}{c.consumerPhone ? ` · ${c.consumerPhone}` : ''}{c.consumerAddress ? ` · ${c.consumerAddress}` : ''}</dd>
          <dt className="text-muted-foreground">Bien ({c.itemType.toLowerCase()})</dt><dd>{c.itemDescription}{c.amount ? ` · S/ ${c.amount}` : ''}</dd>
          <dt className="text-muted-foreground">Detalle</dt><dd className="whitespace-pre-line">{c.detail}</dd>
          <dt className="text-muted-foreground">Pedido</dt><dd className="whitespace-pre-line">{c.request}</dd>
        </dl>
        {c.status === 'ANSWERED' ? (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Respondido por {c.respondedBy} el {formatPeruDateTime(c.respondedAt!)}</p>
            <p className="mt-1 whitespace-pre-line">{c.response}</p>
          </div>
        ) : canRespond ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Respuesta (se envía por correo y queda registrada)</span>
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} />
          </label>
        ) : (
          <p className="text-xs text-muted-foreground">La respuesta la envía la Dirección.</p>
        )}
      </div>
    </Modal>
  );
};

export const ComplaintsTab: React.FC<{ canRespond: boolean }> = ({ canRespond }) => {
  const { data, isLoading } = useComplaints();
  const [selected, setSelected] = useState<Complaint | null>(null);
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data?.length) return <EmptyState title="Sin reclamos registrados" description="Los reclamos y quejas del Libro de Reclamaciones virtual llegan aquí con su plazo legal de 15 días hábiles." />;
  return (
    <>
      <Card className="divide-y">
        {data.map((c) => (
          <button key={c.id} type="button" onClick={() => setSelected(c)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40">
            <span className="font-mono text-xs">{c.code}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.consumerName} · <span className="font-normal text-muted-foreground">{c.itemDescription}</span></p>
              <p className="text-xs text-muted-foreground">{c.kind === 'RECLAMO' ? 'Reclamo' : 'Queja'} · {formatPeruShortDate(c.createdAt)}</p>
            </div>
            {c.status === 'ANSWERED' ? (
              <Badge variant="success">Respondido</Badge>
            ) : (
              <Badge variant={c.daysLeft! < 0 ? 'destructive' : c.daysLeft! <= 5 ? 'warning' : 'secondary'} className={cn(c.daysLeft! < 0 && 'animate-pulse')}>
                {c.daysLeft! < 0 ? `Vencido hace ${-c.daysLeft!} d` : c.daysLeft === 0 ? 'Vence hoy' : `Quedan ${c.daysLeft} d`}
              </Badge>
            )}
          </button>
        ))}
      </Card>
      <ComplaintModal c={selected} onClose={() => setSelected(null)} canRespond={canRespond} />
    </>
  );
};
