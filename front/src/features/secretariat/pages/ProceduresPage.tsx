import React, { useState } from 'react';
import { toast } from 'sonner';
import { BookOpenText, CheckCircle2, Download, FilePlus2, Loader2, Lock, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate, formatPeruDateTime } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import { openFile } from '@/features/course-contents/utils/fileUrls';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import {
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  useFamilyProcedures,
  useRatify,
  useRequestDocument,
  type DocumentStatus,
  type DocumentType,
} from '../api/useSecretariat';

const STATUS_VARIANT: Record<DocumentStatus, 'secondary' | 'warning' | 'success' | 'outline' | 'destructive'> = {
  REQUESTED: 'secondary',
  IN_PROCESS: 'warning',
  READY: 'success',
  DELIVERED: 'outline',
  REJECTED: 'destructive',
};
const select = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';

/** Trámites de la familia: ratificar matrícula, pedir constancias/certificados y ver su estado. */
export const ProceduresPage: React.FC = () => {
  const { data, isLoading } = useFamilyProcedures();
  const { data: school } = useGetActiveSchool();
  const ratify = useRatify();
  const request = useRequestDocument();
  const [decline, setDecline] = useState<{ studentId: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [reqOpen, setReqOpen] = useState(false);
  const [form, setForm] = useState({ studentId: '', type: 'CONSTANCIA_ESTUDIOS' as DocumentType, purpose: '', copies: 1 });

  const confirm = (studentId: string, decision: 'CONFIRMED' | 'DECLINED', comment?: string) =>
    ratify.mutate(
      { studentId, decision, comment },
      {
        onSuccess: () => {
          toast.success(decision === 'CONFIRMED' ? '¡Gracias! Matrícula ratificada.' : 'Respuesta registrada. Gracias por avisarnos.');
          setDecline(null);
          setReason('');
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );

  const submitRequest = () =>
    request.mutate(
      { studentId: form.studentId, type: form.type, purpose: form.purpose || undefined, copies: form.copies },
      {
        onSuccess: (r) => {
          toast.success(r.debtHold ? 'Solicitud registrada. Secretaría le indicará cómo continuar.' : 'Solicitud enviada. Le avisaremos cuando esté listo.');
          setReqOpen(false);
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );

  if (isLoading || !data) return <Skeleton className="h-72" />;
  const nameOf = new Map(data.children.map((c) => [c.studentId, c.name]));
  const r = data.ratification;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trámites"
        description="Ratifique la matrícula y pida constancias o certificados sin ir al colegio."
        actions={
          <Button className="gap-2" onClick={() => { setForm({ studentId: data.children[0]?.studentId ?? '', type: 'CONSTANCIA_ESTUDIOS', purpose: '', copies: 1 }); setReqOpen(true); }} disabled={!data.children.length}>
            <FilePlus2 className="h-4 w-4" aria-hidden /> Pedir un documento
          </Button>
        }
      />

      {r.open && r.year && (
        <Card className="space-y-3 p-4">
          <div>
            <p className="font-semibold">Ratificación de matrícula {r.year}</p>
            <p className="text-sm text-muted-foreground">
              Confirme si su hijo(a) continuará en el colegio el próximo año{r.deadline ? `, a más tardar el ${formatPeruShortDate(r.deadline.slice(0, 10))}` : ''}.
            </p>
          </div>
          <div className="space-y-2">
            {data.children.map((c) => (
              <div key={c.studentId} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                <p className="min-w-0 flex-1 font-medium">{c.name}</p>
                {c.ratification ? (
                  <div className="flex items-center gap-3">
                    {c.ratification.decision === 'CONFIRMED' ? (
                      <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" aria-hidden /> Continúa en {r.year}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-700 dark:text-red-400"><XCircle className="h-4 w-4" aria-hidden /> No continuará</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatPeruDateTime(c.ratification.updatedAt)}</span>
                    <Button size="sm" variant="ghost" onClick={() => (c.ratification!.decision === 'CONFIRMED' ? setDecline({ studentId: c.studentId, name: c.name }) : confirm(c.studentId, 'CONFIRMED'))} disabled={ratify.isPending}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDecline({ studentId: c.studentId, name: c.name })} disabled={ratify.isPending}>No continuará</Button>
                    <Button size="sm" onClick={() => confirm(c.studentId, 'CONFIRMED')} disabled={ratify.isPending}>Sí, continúa en {r.year}</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-3 font-semibold">Mis solicitudes</p>
        {data.requests.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aún no ha pedido documentos. Use «Pedir un documento» para solicitar constancias o certificados.</p>
        ) : (
          <div className="divide-y">
            {data.requests.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{d.typeLabel}{d.copies > 1 ? ` ×${d.copies}` : ''}</p>
                  <p className="text-xs text-muted-foreground">{nameOf.get(d.studentId)} · pedido el {formatPeruShortDate(d.createdAt)}</p>
                  {d.staffNote && <p className="mt-1 text-xs">Secretaría: {d.staffNote}</p>}
                  {d.debtHold && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <Lock className="h-3 w-3" aria-hidden /> El certificado se entrega al regularizar las pensiones vencidas (Ley 27665). Las constancias no se retienen.
                    </p>
                  )}
                </div>
                {d.fileUrl && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => void openFile(d.fileUrl!, { download: true })}>
                    <Download className="h-3.5 w-3.5" aria-hidden /> Descargar
                  </Button>
                )}
                <Badge variant={STATUS_VARIANT[d.status]}>{DOCUMENT_STATUS_LABEL[d.status]}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {school?.id && (
        <a href={`/reclamaciones/${school.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <BookOpenText className="h-4 w-4" aria-hidden /> Libro de Reclamaciones virtual
        </a>
      )}

      <Modal open={Boolean(decline)} onClose={() => setDecline(null)} title={`${decline?.name ?? ''} no continuará`} description="Lamentamos que se vaya. Su respuesta nos ayuda a mejorar."
        footer={<Button variant="destructive" disabled={ratify.isPending || !reason.trim()} onClick={() => decline && confirm(decline.studentId, 'DECLINED', reason.trim())}>Confirmar</Button>}>
        <label className="block space-y-1 text-sm">
          <span>Motivo</span>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: Nos mudamos de distrito." maxLength={1000} />
        </label>
      </Modal>

      <Modal open={reqOpen} onClose={() => setReqOpen(false)} title="Pedir un documento"
        footer={<Button onClick={submitRequest} disabled={request.isPending || !form.studentId || (form.type === 'OTRO' && !form.purpose.trim())}>{request.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar solicitud</Button>}>
        <div className="space-y-3 text-sm">
          {data.children.length > 1 && (
            <label className="block space-y-1"><span>Hijo(a)</span>
              <select className={select} value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}>
                {data.children.map((c) => <option key={c.studentId} value={c.studentId}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label className="block space-y-1"><span>Documento</span>
            <select className={select} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DocumentType }))}>
              {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span>{form.type === 'OTRO' ? '¿Qué documento necesita?' : 'Motivo (opcional)'}</span>
            <Textarea rows={2} value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="Ej.: Para trámite de beca, traslado, viaje…" maxLength={300} />
          </label>
          <label className="block space-y-1"><span>Ejemplares</span>
            <select className={select} value={form.copies} onChange={(e) => setForm((f) => ({ ...f, copies: Number(e.target.value) }))}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
};
