import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, ExternalLink, Search, Share2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { confirmDialog } from '@/components/ui/confirm';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { resolveFileUrl } from '@/features/course-contents/utils/fileUrls';
import {
  KIND_LABEL,
  LEVEL_LABEL,
  markOpened,
  useDeleteResource,
  useResources,
} from '../../api/useTeacherResources';
import { selectCls } from './constants';
import { ShareModal } from './ShareModal';

export const ResourcesTab: React.FC = () => {
  const [filters, setFilters] = useState({ q: '', kind: '', level: '', area: '', mine: false });
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);
  const { data, isLoading } = useResources({
    ...filters,
    q: debouncedQ || undefined,
    kind: filters.kind || undefined,
    level: filters.level || undefined,
    area: filters.area || undefined,
  });
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
          <Input
            className="h-9 pl-8"
            placeholder="Buscar por tema o etiqueta"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            aria-label="Buscar recursos"
          />
        </div>
        <select
          className={selectCls}
          value={filters.kind}
          onChange={(e) => setFilters({ ...filters, kind: e.target.value })}
          aria-label="Tipo"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          aria-label="Nivel"
        >
          <option value="">Todos los niveles</option>
          {Object.entries(LEVEL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {data && data.areas.length > 0 && (
          <select
            className={selectCls}
            value={filters.area}
            onChange={(e) => setFilters({ ...filters, area: e.target.value })}
            aria-label="Área"
          >
            <option value="">Todas las áreas</option>
            {data.areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={filters.mine}
            onChange={(e) => setFilters({ ...filters, mine: e.target.checked })}
          />{' '}
          Solo los míos
        </label>
        <Button size="sm" className="ml-auto gap-1.5" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4" aria-hidden /> Compartir recurso
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !data || data.rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Aún no hay recursos con estos filtros. ¡Comparte el primero con tus colegas!
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.rows.map((r) => (
            <Card key={r.id} className="flex flex-col p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{KIND_LABEL[r.kind]}</p>
              <h3 className="mt-0.5 text-sm font-semibold text-foreground">{r.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[
                  r.areaName,
                  r.educationLevel ? LEVEL_LABEL[r.educationLevel] : null,
                  r.grade !== null ? `${r.grade}.°` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'General'}
              </p>
              {r.description && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{r.description}</p>}
              {r.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setFilters({ ...filters, q: t })}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  {r.authorName} · {formatPeruShortDate(r.createdAt)} · {r.downloads} uso(s)
                </p>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 gap-1.5 text-xs"
                    onClick={() => void open(r)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Abrir
                  </Button>
                  {r.fileUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => void open(r, true)}
                      aria-label="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                  {r.canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      aria-label="Quitar recurso"
                      onClick={async () =>
                        (await confirmDialog({
                          title: '¿Quitar este recurso del banco?',
                          confirmText: 'Quitar',
                          variant: 'danger',
                        })) &&
                        del.mutate(r.id, {
                          onSuccess: () => toast.success('Recurso quitado'),
                          onError: (e) => toast.error(getApiErrorMessage(e)),
                        })
                      }
                    >
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
