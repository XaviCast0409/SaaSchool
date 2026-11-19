import React, { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { confirmDialog } from '@/components/ui/confirm';
import { getApiErrorMessage } from '@/lib/errors';
import {
  LEVEL_LABEL,
  useDeleteRubric,
  useDuplicateRubric,
  useRubrics,
  type Rubric,
} from '../../api/useTeacherResources';
import { RubricEditor } from './RubricEditor';
import { RubricView } from './RubricView';

export const RubricsTab: React.FC = () => {
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
          <Input
            className="h-9 pl-8"
            placeholder="Buscar rúbrica o área"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar rúbricas"
          />
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
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Aún no hay rúbricas. Crea una con criterios y descriptores para AD, A, B y C.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="flex flex-col p-4">
              <button type="button" className="text-left" onClick={() => setViewing(r)}>
                <h3 className="text-sm font-semibold text-foreground hover:underline">{r.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[r.areaName, r.educationLevel ? LEVEL_LABEL[r.educationLevel] : null].filter(Boolean).join(' · ') ||
                    'General'}{' '}
                  · {r.criteria.length} criterio(s)
                  {!r.isShared && ' · privada'}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {r.criteria.map((c) => c.name).join(' · ')}
                </p>
              </button>
              <div className="mt-auto flex items-center gap-1.5 pt-3">
                <span className="mr-auto text-xs text-muted-foreground">{r.authorName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  aria-label="Duplicar"
                  title="Duplicar para adaptarla"
                  onClick={() =>
                    duplicate.mutate(r.id, {
                      onSuccess: (copy) => (
                        toast.success('Copia creada: ya puedes adaptarla'),
                        setEditing({ rubric: copy })
                      ),
                      onError: (e) => toast.error(getApiErrorMessage(e)),
                    })
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {r.canEdit && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      aria-label="Editar"
                      onClick={() => setEditing({ rubric: r })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      aria-label="Eliminar"
                      onClick={async () =>
                        (await confirmDialog({
                          title: '¿Eliminar esta rúbrica?',
                          confirmText: 'Eliminar',
                          variant: 'danger',
                        })) &&
                        del.mutate(r.id, {
                          onSuccess: () => toast.success('Rúbrica eliminada'),
                          onError: (e) => toast.error(getApiErrorMessage(e)),
                        })
                      }
                    >
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
