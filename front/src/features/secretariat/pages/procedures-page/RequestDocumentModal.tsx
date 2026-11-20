import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { DOCUMENT_TYPE_LABEL, type DocumentType } from '../../api/useSecretariat';

export interface RequestDocumentFormState {
  studentId: string;
  type: DocumentType;
  purpose: string;
  copies: number;
}

interface RequestDocumentModalProps {
  open: boolean;
  onClose: () => void;
  childrenList: Array<{ studentId: string; name: string }>;
  form: RequestDocumentFormState;
  setForm: React.Dispatch<React.SetStateAction<RequestDocumentFormState>>;
  onSubmit: () => void;
  isPending: boolean;
}

const select = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';

export const RequestDocumentModal: React.FC<RequestDocumentModalProps> = ({
  open,
  onClose,
  childrenList,
  form,
  setForm,
  onSubmit,
  isPending,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pedir un documento"
      footer={
        <Button
          onClick={onSubmit}
          disabled={isPending || !form.studentId || (form.type === 'OTRO' && !form.purpose.trim())}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar solicitud
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        {childrenList.length > 1 && (
          <label className="block space-y-1">
            <span>Hijo(a)</span>
            <select
              className={select}
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            >
              {childrenList.map((c) => (
                <option key={c.studentId} value={c.studentId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block space-y-1">
          <span>Documento</span>
          <select
            className={select}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DocumentType }))}
          >
            {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span>{form.type === 'OTRO' ? '¿Qué documento necesita?' : 'Motivo (opcional)'}</span>
          <Textarea
            rows={2}
            value={form.purpose}
            onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
            placeholder="Ej.: Para trámite de beca, traslado, viaje…"
            maxLength={300}
          />
        </label>
        <label className="block space-y-1">
          <span>Ejemplares</span>
          <select
            className={select}
            value={form.copies}
            onChange={(e) => setForm((f) => ({ ...f, copies: Number(e.target.value) }))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
};
