import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, Download, ExternalLink, FileUp, Link2, Loader2, Pencil, Plus, Printer, Search, Share2, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { apiErrorMessage } from '@/features/academic/api';
import { useUploadMaterial } from '@/features/course-contents/api/useCourseContents';
import { resolveFileUrl } from '@/features/course-contents/utils/fileUrls';
import {
  KIND_LABEL,
  LEVEL_LABEL,
  markOpened,
  useDeleteResource,
  useDeleteRubric,
  useDuplicateRubric,
  useResources,
  useRubrics,
  useSaveRubric,
  useShareResource,
  type Level,
  type ResourceKind,
  type Rubric,
  type RubricCriterion,
  type RubricInput,
  type RubricLevel,
} from '../api/useTeacherResources';

const select = 'h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground';
const LEVELS: RubricLevel[] = ['AD', 'A', 'B', 'C'];
const LEVEL_HEAD: Record<RubricLevel, string> = { AD: 'AD · Logro destacado', A: 'A · Logro esperado', B: 'B · En proceso', C: 'C · En inicio' };

// ------------------------------------------------------------------ Banco de recursos

const ShareModal: React.FC<{ open: boolean; onClose: () => void; areas: string[] }> = ({ open, onClose, areas }) => {
  const upload = useUploadMaterial();
  const share = useShareResource();
  const fileRef = useRef<HTMLInputElement>(null);
  const empty = { title: '', description: '', kind: 'SESION' as ResourceKind, areaName: '', educationLevel: '' as Level | '', grade: '', link: '', tags: '' };
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
      { onSuccess: () => (toast.success('Recurso compartido con tus colegas'), onClose()), onError: (err) => toast.error(apiErrorMessage(err)) },
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
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="share-form" disabled={share.isPending || upload.isPending || (!file && !form.link)} className="gap-2">
            {share.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Compartir
          </Button>
        </div>
      }
    >
      <form id="share-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs text-muted-foreground">
          Título
          <Input className="h-9" required minLength={3} maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej.: Sesión de fracciones equivalentes con material concreto" />
        </label>
        <label className="text-xs text-muted-foreground">
          Tipo
          <select className={`${select} w-full`} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ResourceKind })}>
            {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Área o curso
          <Input className="h-9" list="resource-areas" maxLength={80} value={form.areaName} onChange={(e) => setForm({ ...form, areaName: e.target.value })} placeholder="Matemática" />
          <datalist id="resource-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
        </label>
        <label className="text-xs text-muted-foreground">
          Nivel
          <select className={`${select} w-full`} value={form.educationLevel} onChange={(e) => setForm({ ...form, educationLevel: e.target.value as Level | '' })}>
            <option value="">Cualquiera</option>
            {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Grado (opcional)
          <Input className="h-9" type="number" min={0} max={6} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
        </label>
        <div className="col-span-2 grid gap-2 sm:grid-cols-2">
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f, { onSuccess: (r) => setFile({ url: r.url, name: r.fileName }), onError: (err) => toast.error(apiErrorMessage(err)) });
          }} />
          <Button type="button" variant="outline" className="h-auto justify-start gap-2 py-2.5" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" aria-hidden />}
            <span className="truncate">{file ? file.name : 'Subir archivo (PDF, Word, PPT…)'}</span>
          </Button>
          <label className="relative text-xs text-muted-foreground">
            <Link2 className="absolute left-2.5 top-3 h-4 w-4" aria-hidden />
            <Input className="h-10 pl-8" type="url" placeholder="o pega un enlace (Drive, YouTube, Canva)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} aria-label="Enlace" />
          </label>
        </div>
        <label className="col-span-2 text-xs text-muted-foreground">
          Descripción (opcional)
          <Textarea rows={2} maxLength={1500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="¿Para qué sirve? ¿Cómo lo usaste?" />
        </label>
        <label className="col-span-2 text-xs text-muted-foreground">
          Etiquetas (separadas por coma)
          <Input className="h-9" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="fracciones, juego, trabajo en equipo" />
        </label>
      </form>
    </Modal>
  );
};

const ResourcesTab: React.FC = () => {
  const [filters, setFilters] = useState({ q: '', kind: '', level: '', area: '', mine: false });
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);
  const { data, isLoading } = useResources({ ...filters, q: debouncedQ || undefined, kind: filters.kind || undefined, level: filters.level || undefined, area: filters.area || undefined });
  const del = useDeleteResource();
  const [shareOpen, setShareOpen] = useState(false);

  const open = async (r: NonNullable<typeof data>['rows'][number], download = false) => {
    void markOpened(r.id);
    try {
      const url = r.fileUrl ? await resolveFileUrl(r.fileUrl, { download }) : r.link!;
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('No se pudo abrir el recurso.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input className="h-9 pl-8" placeholder="Buscar por tema o etiqueta" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} aria-label="Buscar recursos" />
        </div>
        <select className={select} value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={select} value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} aria-label="Nivel">
          <option value="">Todos los niveles</option>
          {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {data && data.areas.length > 0 && (
          <select className={select} value={filters.area} onChange={(e) => setFilters({ ...filters, area: e.target.value })} aria-label="Área">
            <option value="">Todas las áreas</option>
            {data.areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={filters.mine} onChange={(e) => setFilters({ ...filters, mine: e.target.checked })} /> Solo los míos
        </label>
        <Button size="sm" className="ml-auto gap-1.5" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4" aria-hidden /> Compartir recurso
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !data || data.rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Aún no hay recursos con estos filtros. ¡Comparte el primero con tus colegas!</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.rows.map((r) => (
            <Card key={r.id} className="flex flex-col p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{KIND_LABEL[r.kind]}</p>
              <h3 className="mt-0.5 text-sm font-semibold text-foreground">{r.title}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {[r.areaName, r.educationLevel ? LEVEL_LABEL[r.educationLevel] : null, r.grade !== null ? `${r.grade}.°` : null].filter(Boolean).join(' · ') || 'General'}
              </p>
              {r.description && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{r.description}</p>}
              {r.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.tags.map((t) => (
                    <button key={t} type="button" className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setFilters({ ...filters, q: t })}>#{t}</button>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-3">
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {r.authorName} · {formatPeruShortDate(r.createdAt)} · {r.downloads} uso(s)
                </p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5 text-xs" onClick={() => void open(r)}>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Abrir
                  </Button>
                  {r.fileUrl && (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => void open(r, true)} aria-label="Descargar">
                      <Download className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                  {r.canDelete && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs" aria-label="Quitar recurso"
                      onClick={() => window.confirm('¿Quitar este recurso del banco?') && del.mutate(r.id, { onSuccess: () => toast.success('Recurso quitado'), onError: (e) => toast.error(apiErrorMessage(e)) })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} areas={data?.areas ?? []} />
    </div>
  );
};

// ------------------------------------------------------------------ Rúbricas

const emptyCriterion = (): RubricCriterion => ({ name: '', levels: { AD: '', A: '', B: '', C: '' } });

const RubricEditor: React.FC<{ open: boolean; onClose: () => void; initial: Rubric | null }> = ({ open, onClose, initial }) => {
  const save = useSaveRubric();
  const [form, setForm] = useState<RubricInput>({ title: '', description: '', areaName: '', educationLevel: null, criteria: [emptyCriterion()], isShared: true });
  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { title: initial.title, description: initial.description, areaName: initial.areaName, educationLevel: initial.educationLevel, criteria: initial.criteria, isShared: initial.isShared }
          : { title: '', description: '', areaName: '', educationLevel: null, criteria: [emptyCriterion(), emptyCriterion()], isShared: true },
      );
    }
  }, [open, initial]);
  const setCriterion = (i: number, patch: Partial<RubricCriterion>) => setForm({ ...form, criteria: form.criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar rúbrica' : 'Nueva rúbrica'}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} /> Compartir con mis colegas
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={save.isPending}
              className="gap-2"
              onClick={() =>
                save.mutate(
                  { id: initial?.id, input: { ...form, description: form.description || null, areaName: form.areaName || null } },
                  { onSuccess: () => (toast.success('Rúbrica guardada'), onClose()), onError: (e) => toast.error(apiErrorMessage(e)) },
                )
              }
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Guardar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground sm:col-span-3">
            Título
            <Input className="h-9" maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej.: Rúbrica para exposición oral" />
          </label>
          <label className="text-xs text-muted-foreground">
            Área o curso
            <Input className="h-9" maxLength={80} value={form.areaName ?? ''} onChange={(e) => setForm({ ...form, areaName: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground">
            Nivel
            <select className={`${select} w-full`} value={form.educationLevel ?? ''} onChange={(e) => setForm({ ...form, educationLevel: (e.target.value || null) as Level | null })}>
              <option value="">Cualquiera</option>
              {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Descripción (opcional)
            <Input className="h-9" maxLength={1000} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th scope="col" className="w-44 px-1 py-1 text-left font-medium">Criterio</th>
                {LEVELS.map((l) => <th key={l} scope="col" className="px-1 py-1 text-left font-medium">{LEVEL_HEAD[l]}</th>)}
                <th scope="col" className="w-8" aria-label="Quitar" />
              </tr>
            </thead>
            <tbody>
              {form.criteria.map((c, i) => (
                <tr key={i} className="align-top">
                  <td className="px-1 py-1"><Textarea rows={3} maxLength={120} value={c.name} onChange={(e) => setCriterion(i, { name: e.target.value })} placeholder="Ej.: Claridad" aria-label={`Nombre del criterio ${i + 1}`} /></td>
                  {LEVELS.map((l) => (
                    <td key={l} className="px-1 py-1">
                      <Textarea rows={3} maxLength={600} value={c.levels[l]} onChange={(e) => setCriterion(i, { levels: { ...c.levels, [l]: e.target.value } })} aria-label={`${c.name || `Criterio ${i + 1}`} nivel ${l}`} />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setForm({ ...form, criteria: form.criteria.filter((_, idx) => idx !== i) })} aria-label={`Quitar criterio ${i + 1}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {form.criteria.length < 10 && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setForm({ ...form, criteria: [...form.criteria, emptyCriterion()] })}>
            <Plus className="h-4 w-4" aria-hidden /> Agregar criterio
          </Button>
        )}
      </div>
    </Modal>
  );
};

const RubricView: React.FC<{ rubric: Rubric | null; onClose: () => void }> = ({ rubric, onClose }) => (
  <Modal open={Boolean(rubric)} onClose={onClose} title={rubric?.title ?? ''} description={rubric ? `${rubric.authorName}${rubric.areaName ? ` · ${rubric.areaName}` : ''}` : undefined} size="xl"
    footer={<div className="flex justify-end"><Button variant="outline" className="gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Imprimir</Button></div>}>
    {rubric && (
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[700px] border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className="border border-border bg-muted px-2 py-1.5 text-left">Criterio</th>
              {LEVELS.map((l) => <th key={l} scope="col" className="border border-border bg-muted px-2 py-1.5 text-left">{LEVEL_HEAD[l]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((c) => (
              <tr key={c.name} className="align-top">
                <th scope="row" className="border border-border px-2 py-1.5 text-left font-semibold text-foreground">{c.name}</th>
                {LEVELS.map((l) => <td key={l} className="border border-border px-2 py-1.5 text-foreground">{c.levels[l]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rubric.description && <p className="mt-2 text-xs text-muted-foreground">{rubric.description}</p>}
      </div>
    )}
  </Modal>
);

const RubricsTab: React.FC = () => {
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);
  const { data = [], isLoading } = useRubrics({ q: q || undefined, mine });
  const duplicate = useDuplicateRubric();
  const del = useDeleteRubric();
  const [editing, setEditing] = useState<{ rubric: Rubric | null } | null>(null);
  const [viewing, setViewing] = useState<Rubric | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input className="h-9 pl-8" placeholder="Buscar rúbrica o área" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar rúbricas" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Solo las mías
        </label>
        <Button size="sm" className="ml-auto gap-1.5" onClick={() => setEditing({ rubric: null })}>
          <Plus className="h-4 w-4" aria-hidden /> Nueva rúbrica
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : data.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Aún no hay rúbricas. Crea una con criterios y descriptores para AD, A, B y C.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="flex flex-col p-4">
              <button type="button" className="text-left" onClick={() => setViewing(r)}>
                <h3 className="text-sm font-semibold text-foreground hover:underline">{r.title}</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {[r.areaName, r.educationLevel ? LEVEL_LABEL[r.educationLevel] : null].filter(Boolean).join(' · ') || 'General'} · {r.criteria.length} criterio(s)
                  {!r.isShared && ' · privada'}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.criteria.map((c) => c.name).join(' · ')}</p>
              </button>
              <div className="mt-auto flex items-center gap-1.5 pt-3">
                <span className="mr-auto text-[11px] text-muted-foreground">{r.authorName}</span>
                <Button size="sm" variant="ghost" className="h-8 text-xs" aria-label="Duplicar" title="Duplicar para adaptarla"
                  onClick={() => duplicate.mutate(r.id, { onSuccess: (copy) => (toast.success('Copia creada: ya puedes adaptarla'), setEditing({ rubric: copy })), onError: (e) => toast.error(apiErrorMessage(e)) })}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {r.canEdit && (
                  <>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" aria-label="Editar" onClick={() => setEditing({ rubric: r })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" aria-label="Eliminar"
                      onClick={() => window.confirm('¿Eliminar esta rúbrica?') && del.mutate(r.id, { onSuccess: () => toast.success('Rúbrica eliminada'), onError: (e) => toast.error(apiErrorMessage(e)) })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <RubricEditor open={Boolean(editing)} onClose={() => setEditing(null)} initial={editing?.rubric ?? null} />
      <RubricView rubric={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};

export const TeacherResourcesPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'rubrics' ? 'rubrics' : 'resources';
  return (
    <div className="max-w-6xl">
      <PageHeader title="Recursos docentes" description="Comparte y reutiliza sesiones, fichas, evaluaciones y rúbricas con los docentes de tu colegio." />
      <div className="mb-4 inline-flex rounded-lg border border-border p-0.5 text-xs">
        {([['resources', 'Banco de recursos'], ['rubrics', 'Rúbricas']] as const).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setParams({ tab: t }, { replace: true })} className={cn('rounded-md px-3 py-1.5 font-semibold', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'resources' ? <ResourcesTab /> : <RubricsTab />}
    </div>
  );
};
