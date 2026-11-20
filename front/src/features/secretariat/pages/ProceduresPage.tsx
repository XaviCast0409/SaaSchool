import React, { useState } from 'react';
import { toast } from 'sonner';
import { BookOpenText, Download, FilePlus2, Lock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { openFile } from '@/features/course-contents/utils/fileUrls';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import {
  DOCUMENT_STATUS_LABEL,
  useFamilyProcedures,
  useRatify,
  useRequestDocument,
  type DocumentStatus,
  type DocumentType,
} from '../api/useSecretariat';
import { RatificationCard } from './procedures-page/RatificationCard';
import { RequestDocumentModal, type RequestDocumentFormState } from './procedures-page/RequestDocumentModal';

const STATUS_VARIANT: Record<DocumentStatus, 'secondary' | 'warning' | 'success' | 'outline' | 'destructive'> = {
  REQUESTED: 'secondary',
  IN_PROCESS: 'warning',
  READY: 'success',
  DELIVERED: 'outline',
  REJECTED: 'destructive',
};

/** Trámites de la familia: ratificar matrícula, pedir constancias/certificados y ver su estado. */
export const ProceduresPage: React.FC = () => {
  const { data, isLoading } = useFamilyProcedures();
  const { data: school } = useGetActiveSchool();
  const ratify = useRatify();
  const request = useRequestDocument();
  const [decline, setDecline] = useState<{ studentId: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [reqOpen, setReqOpen] = useState(false);
  const [form, setForm] = useState<RequestDocumentFormState>({
    studentId: '',
    type: 'CONSTANCIA_ESTUDIOS' as DocumentType,
    purpose: '',
    copies: 1,
  });

  const confirm = (studentId: string, decision: 'CONFIRMED' | 'DECLINED', comment?: string) =>
    ratify.mutate(
      { studentId, decision, comment },
      {
        onSuccess: () => {
          toast.success(
            decision === 'CONFIRMED'
              ? '¡Gracias! Matrícula ratificada.'
              : 'Respuesta registrada. Gracias por avisarnos.',
          );
          setDecline(null);
          setReason('');
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'Error al responder ratificación')),
      },
    );

  const submitRequest = () =>
    request.mutate(
      { studentId: form.studentId, type: form.type, purpose: form.purpose || undefined, copies: form.copies },
      {
        onSuccess: (r) => {
          toast.success(
            r.debtHold
              ? 'Solicitud registrada. Secretaría le indicará cómo continuar.'
              : 'Solicitud enviada. Le avisaremos cuando esté listo.',
          );
          setReqOpen(false);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'Error al solicitar documento')),
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
          <Button
            className="gap-2"
            onClick={() => {
              setForm({
                studentId: data.children[0]?.studentId ?? '',
                type: 'CONSTANCIA_ESTUDIOS',
                purpose: '',
                copies: 1,
              });
              setReqOpen(true);
            }}
            disabled={!data.children.length}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden /> Pedir un documento
          </Button>
        }
      />

      <RatificationCard
        ratification={r}
        childrenList={data.children}
        isPending={ratify.isPending}
        onConfirm={(studentId, decision) => confirm(studentId, decision)}
        onOpenDecline={(student) => setDecline(student)}
      />

      <Card className="p-4">
        <p className="mb-3 font-semibold">Mis solicitudes</p>
        {data.requests.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no ha pedido documentos. Use «Pedir un documento» para solicitar constancias o certificados.
          </p>
        ) : (
          <div className="divide-y">
            {data.requests.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {d.typeLabel}
                    {d.copies > 1 ? ` ×${d.copies}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nameOf.get(d.studentId)} · pedido el {formatPeruShortDate(d.createdAt)}
                  </p>
                  {d.staffNote && <p className="mt-1 text-xs">Secretaría: {d.staffNote}</p>}
                  {d.debtHold && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <Lock className="h-3 w-3" aria-hidden /> El certificado se entrega al regularizar las pensiones
                      vencidas (Ley 27665). Las constancias no se retienen.
                    </p>
                  )}
                </div>
                {d.fileUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => void openFile(d.fileUrl!, { download: true })}
                  >
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
        <a
          href={`/reclamaciones/${school.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <BookOpenText className="h-4 w-4" aria-hidden /> Libro de Reclamaciones virtual
        </a>
      )}

      <Modal
        open={Boolean(decline)}
        onClose={() => setDecline(null)}
        title={`${decline?.name ?? ''} no continuará`}
        description="Lamentamos que se vaya. Su respuesta nos ayuda a mejorar."
        footer={
          <Button
            variant="destructive"
            disabled={ratify.isPending || !reason.trim()}
            onClick={() => decline && confirm(decline.studentId, 'DECLINED', reason.trim())}
          >
            Confirmar
          </Button>
        }
      >
        <label className="block space-y-1 text-sm">
          <span>Motivo</span>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: Nos mudamos de distrito."
            maxLength={1000}
          />
        </label>
      </Modal>

      <RequestDocumentModal
        open={reqOpen}
        onClose={() => setReqOpen(false)}
        childrenList={data.children}
        form={form}
        setForm={setForm}
        onSubmit={submitRequest}
        isPending={request.isPending}
      />
    </div>
  );
};
