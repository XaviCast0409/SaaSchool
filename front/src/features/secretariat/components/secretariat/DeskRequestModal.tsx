import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useStudents } from '@/features/students/api/useStudents';
import { getApiErrorMessage } from '@/lib/errors';
import {
  DOCUMENT_TYPE_LABEL,
  useCreateDocumentAtDesk,
  type DocumentType as DocType,
} from '../../api/useSecretariat';

/** Registrar en ventanilla una constancia que la familia pide en persona. */
export const DeskRequestModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const create = useCreateDocumentAtDesk();
  const [search, setSearch] = useState('');
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const [type, setType] = useState<DocType>('CONSTANCIA_MATRICULA' as DocType);
  const [purpose, setPurpose] = useState('');
  const [copies, setCopies] = useState(1);
  const [requesterName, setRequesterName] = useState('');
  const { data: found } = useStudents(
    { page: 1, limit: 8, search: search.trim(), scope: 'all' },
    open && !student && search.trim().length >= 3,
  );
  useEffect(() => {
    if (open) {
      setSearch('');
      setStudent(null);
      setPurpose('');
      setCopies(1);
      setRequesterName('');
    }
  }, [open]);
  const canSave = !!student && requesterName.trim().length >= 3 && (type !== 'OTRO' || purpose.trim().length > 0);
  const submit = () =>
    student &&
    create.mutate(
      {
        studentId: student.id,
        type,
        purpose: purpose.trim() || undefined,
        copies,
        requesterName: requesterName.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Trámite registrado. Lo verás en la lista para atenderlo.');
          onClose();
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo registrar el trámite.')),
      },
    );
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar trámite en ventanilla"
      size="md"
      footer={
        <Button onClick={submit} disabled={!canSave || create.isPending}>
          {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block space-y-1">
          <span className="font-medium">Alumno</span>
          {student ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span>{student.name}</span>
              <Button size="sm" variant="ghost" onClick={() => setStudent(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Apellido, nombre o DNI (mínimo 3 letras)"
              />
              {(found?.data ?? []).length > 0 && (
                <ul className="divide-y rounded-md border">
                  {(found?.data ?? []).map((st) => (
                    <li key={st.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-1.5 text-left hover:bg-muted"
                        onClick={() =>
                          setStudent({
                            id: st.id,
                            name: `${[st.lastNamePaternal, st.lastNameMaternal].filter(Boolean).join(' ')}, ${st.firstNames}`,
                          })
                        }
                      >
                        {[st.lastNamePaternal, st.lastNameMaternal].filter(Boolean).join(' ')}, {st.firstNames}{' '}
                        <span className="text-xs text-muted-foreground">· {st.documentId}</span>
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
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DocType)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            {(Object.keys(DOCUMENT_TYPE_LABEL) as DocType[]).map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block space-y-1">
            <span className="font-medium">¿Quién lo pide?</span>
            <Input
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Ej.: Rosa Huamán (madre)"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Copias</span>
            <Input
              type="number"
              min={1}
              max={5}
              value={copies}
              onChange={(e) => setCopies(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              className="w-20"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="font-medium">Para qué lo necesita {type === 'OTRO' ? '(obligatorio)' : '(opcional)'}</span>
          <Input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Ej.: Trámite de traslado"
            maxLength={300}
          />
        </label>
      </div>
    </Modal>
  );
};
