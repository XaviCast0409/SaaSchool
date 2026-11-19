import React, { useEffect, useRef, useState } from 'react';
import { Download, FileUp, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import { openFile } from '@/features/course-contents/utils/fileUrls';
import {
  DOCUMENT_STATUS_LABEL,
  useUpdateDocument,
  type DocumentRequestRow,
  type DocumentStatus,
} from '../../api/useSecretariat';
import { STATUS_VARIANT } from './constants';

export const DocumentModal: React.FC<{ doc: DocumentRequestRow | null; onClose: () => void }> = ({ doc, onClose }) => {
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
      {
        onSuccess: () => {
          toast.success(status ? `Marcado como «${DOCUMENT_STATUS_LABEL[status]}»` : 'Guardado');
          onClose();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo actualizar el documento.')),
      },
    );
  const held = doc.debtHold && !release;

  return (
    <Modal
      open
      onClose={onClose}
      title={doc.typeLabel}
      description={`${doc.studentName} · pedido por ${doc.requestedBy}${doc.requestedByPhone ? ` (${doc.requestedByPhone})` : ''}`}
      size="md"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          {doc.status !== 'DELIVERED' && doc.status !== 'REJECTED' && (
            <Button variant="ghost" onClick={() => go('REJECTED')} disabled={update.isPending || !note}>
              Observar
            </Button>
          )}
          <Button variant="outline" onClick={() => go()} disabled={update.isPending}>
            Guardar
          </Button>
          {doc.status === 'REQUESTED' && (
            <Button variant="outline" onClick={() => go('IN_PROCESS')} disabled={update.isPending}>
              En proceso
            </Button>
          )}
          {(doc.status === 'REQUESTED' || doc.status === 'IN_PROCESS') && (
            <Button onClick={() => go('READY')} disabled={update.isPending || held}>
              Listo para entregar
            </Button>
          )}
          {doc.status === 'READY' && (
            <Button onClick={() => go('DELIVERED')} disabled={update.isPending || held}>
              Entregado
            </Button>
          )}
          {doc.status === 'REJECTED' && (
            <Button variant="outline" onClick={() => go('REQUESTED')} disabled={update.isPending}>
              Reabrir
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div>
          <Badge variant={STATUS_VARIANT[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
          <span className="ml-2 text-muted-foreground">
            {doc.copies} {doc.copies === 1 ? 'ejemplar' : 'ejemplares'} · {formatPeruDateTime(doc.createdAt)}
          </span>
        </div>
        {doc.purpose && (
          <p>
            <span className="text-muted-foreground">Motivo:</span> {doc.purpose}
          </p>
        )}
        {doc.debtHold && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="flex items-center gap-1.5 font-medium">
              <Lock className="h-4 w-4" aria-hidden /> Retenido por deuda vencida
            </p>
            <p className="mt-1 text-xs">
              La Ley 27665 permite retener solo el certificado de estudios de los periodos no pagados. Si la familia ya
              regularizó, libera la retención.
            </p>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} /> Liberar
              retención (queda en la bitácora)
            </label>
          </div>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Nota para la familia</span>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej.: Puede recogerlo en Secretaría de 8:00 a 13:00."
            maxLength={1500}
          />
          <span className="block text-xs text-muted-foreground">Obligatoria si observas el trámite.</span>
        </label>
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Documento digital (opcional)</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                upload.mutate(
                  { file: f, purpose: 'STUDENT_DOCUMENT', studentId: doc.studentId },
                  {
                    onSuccess: (r) => setFileUrl(r.url),
                    onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo subir el archivo.')),
                  },
                );
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="h-3.5 w-3.5" aria-hidden />
              )}{' '}
              {fileUrl ? 'Reemplazar PDF' : 'Adjuntar PDF'}
            </Button>
            {fileUrl && (
              <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => void openFile(fileUrl)}>
                <Download className="h-3.5 w-3.5" aria-hidden /> Ver adjunto
              </Button>
            )}
          </div>
          <span className="block text-xs text-muted-foreground">
            Si lo adjuntas, la familia lo descarga desde la app al quedar listo.
          </span>
        </div>
      </div>
    </Modal>
  );
};
