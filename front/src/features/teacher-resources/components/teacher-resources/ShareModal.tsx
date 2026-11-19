import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileUp, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/errors';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import {
  KIND_LABEL,
  LEVEL_LABEL,
  useShareResource,
  type Level,
  type ResourceKind,
} from '../../api/useTeacherResources';
import { selectCls } from './constants';

export const ShareModal: React.FC<{ open: boolean; onClose: () => void; areas: string[] }> = ({
  open,
  onClose,
  areas,
}) => {
  const upload = useUploadMaterial();
  const share = useShareResource();
  const fileRef = useRef<HTMLInputElement>(null);
  const empty = {
    title: '',
    description: '',
    kind: 'SESION' as ResourceKind,
    areaName: '',
    educationLevel: '' as Level | '',
    grade: '',
    link: '',
    tags: '',
  };
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => {
    if (open) {
      setForm(empty);
      setFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    share.mutate(
      {
        title: form.title,
        description: form.description || null,
        kind: form.kind,
        areaName: form.areaName || null,
        educationLevel: (form.educationLevel || null) as Level | null,
        grade: form.grade ? Number(form.grade) : null,
        fileUrl: file?.url ?? null,
        fileName: file?.name ?? null,
        link: form.link || null,
        tags: form.tags.split(/[,\s]+/).filter(Boolean),
      },
      {
        onSuccess: () => (toast.success('Recurso compartido con tus colegas'), onClose()),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartir un recurso"
      description="Lo verán los docentes y la Dirección de tu colegio."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="share-form"
            disabled={share.isPending || upload.isPending || (!file && !form.link)}
            className="gap-2"
          >
            {share.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Compartir
          </Button>
        </div>
      }
    >
      <form id="share-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs text-muted-foreground">
          Título
          <Input
            className="h-9"
            required
            minLength={3}
            maxLength={150}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej.: Sesión de fracciones equivalentes con material concreto"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Tipo
          <select
            className={`${selectCls} w-full`}
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as ResourceKind })}
          >
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Área o curso
          <Input
            className="h-9"
            list="resource-areas"
            maxLength={80}
            value={form.areaName}
            onChange={(e) => setForm({ ...form, areaName: e.target.value })}
            placeholder="Matemática"
          />
          <datalist id="resource-areas">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>
        <label className="text-xs text-muted-foreground">
          Nivel
          <select
            className={`${selectCls} w-full`}
            value={form.educationLevel}
            onChange={(e) => setForm({ ...form, educationLevel: e.target.value as Level | '' })}
          >
            <option value="">Cualquiera</option>
            {Object.entries(LEVEL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Grado (opcional)
          <Input
            className="h-9"
            type="number"
            min={0}
            max={6}
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
          />
        </label>
        <div className="col-span-2 grid gap-2 sm:grid-cols-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                upload.mutate(
                  { file: f, purpose: 'STAFF_RESOURCE' },
                  {
                    onSuccess: (r) => setFile({ url: r.url, name: r.fileName }),
                    onError: (err) => toast.error(getApiErrorMessage(err)),
                  },
                );
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-auto justify-start gap-2 py-2.5"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" aria-hidden />
            )}
            <span className="truncate">{file ? file.name : 'Subir archivo (PDF, Word, PPT…)'}</span>
          </Button>
          <label className="relative text-xs text-muted-foreground">
            <Link2 className="absolute left-2.5 top-3 h-4 w-4" aria-hidden />
            <Input
              className="h-10 pl-8"
              type="url"
              placeholder="o pega un enlace (Drive, YouTube, Canva)"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              aria-label="Enlace"
            />
          </label>
        </div>
        <label className="col-span-2 text-xs text-muted-foreground">
          Descripción (opcional)
          <Textarea
            rows={2}
            maxLength={1500}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="¿Para qué sirve? ¿Cómo lo usaste?"
          />
        </label>
        <label className="col-span-2 text-xs text-muted-foreground">
          Etiquetas (separadas por coma)
          <Input
            className="h-9"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="fracciones, juego, trabajo en equipo"
          />
        </label>
      </form>
    </Modal>
  );
};
