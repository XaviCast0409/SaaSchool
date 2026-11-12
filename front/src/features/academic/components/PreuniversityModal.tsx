import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useConfigurePreuniversity, usePreuniversityCatalog } from '../api';
import { gradeLabel, type Catalog, type Level, type PreuniversityArea } from '../types';

interface Selection { on: boolean; weight: number }

const AreaEditor: React.FC<{ area: PreuniversityArea; level: Level; grade: number; catalog: Catalog }> = ({ area, level, grade, catalog }) => {
  const configure = useConfigurePreuniversity();
  const initial = useMemo(
    () => Object.fromEntries(area.courses.map((c) => [c.key, { on: c.active, weight: c.weight }])) as Record<string, Selection>,
    [area],
  );
  const [sel, setSel] = useState<Record<string, Selection>>(initial);
  const [grades, setGrades] = useState<number[]>([grade]);
  useEffect(() => { setSel(initial); setGrades([grade]); }, [initial, grade]);

  const chosen = area.courses.filter((c) => sel[c.key]?.on);
  const covered = new Set([...chosen.flatMap((c) => c.competences), ...area.customCourses.flatMap((c) => c.competences)]);
  const missing = area.competences.filter((n) => !covered.has(n));
  const total = chosen.length + area.customCourses.length;
  const isActive = area.courses.some((c) => c.active);
  const dirty = area.courses.some((c) => (sel[c.key]?.on ?? false) !== c.active || (sel[c.key]?.on && sel[c.key].weight !== c.weight));
  const canApply = chosen.length > 0 && missing.length === 0 && total >= 2 && (dirty || grades.length > 1);

  const apply = (courses: Array<{ key: string; weight?: number }>) =>
    configure.mutate({ level, grades, officialAreaCode: area.code, courses });

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{area.name} <span className="font-normal text-muted-foreground">· área madre</span></h3>
          <p className="text-xs text-muted-foreground">
            Competencias: {area.competences.map((n) => catalog.competences[n].shortName).join(', ')}
          </p>
        </div>
        {isActive && (
          <Button variant="ghost" size="sm" disabled={configure.isPending} onClick={() => apply([])}>
            Volver a un solo curso
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {area.courses.map((c) => {
          const s = sel[c.key] ?? { on: false, weight: 1 };
          return (
            <label key={c.key} className={cn('flex items-start gap-2 rounded-md border p-2 text-sm', s.on ? 'border-primary/50 bg-primary/5' : 'border-border')}>
              <input type="checkbox" className="mt-1" checked={s.on} onChange={(e) => setSel({ ...sel, [c.key]: { ...s, on: e.target.checked } })} />
              <span className="flex-1">
                <span className="font-medium">{c.name}</span>
                {c.sanMarcos && <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">San Marcos</span>}
                <span className="block text-xs text-muted-foreground">{c.competences.map((n) => catalog.competences[n].shortName).join(' · ')}</span>
              </span>
              {s.on && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Peso del curso en el promedio del área madre">
                  peso
                  <Input type="number" min={0.5} max={10} step={0.5} className="h-7 w-14 text-center" value={s.weight}
                    onClick={(e) => e.preventDefault()}
                    onChange={(e) => setSel({ ...sel, [c.key]: { ...s, weight: Number(e.target.value) || 1 } })} />
                </span>
              )}
            </label>
          );
        })}
      </div>

      {area.customCourses.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          También cuentan los cursos propios del colegio: {area.customCourses.map((c) => c.name).join(', ')}.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Aplicar en:</span>
        {catalog.grades[level].map((g) => {
          const on = grades.includes(g);
          return (
            <button key={g} type="button" onClick={() => setGrades(on ? grades.filter((x) => x !== g) : [...grades, g].sort((a, b) => a - b))}
              className={cn('rounded-full border px-2.5 py-0.5', on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
              {gradeLabel(level, g)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className={cn('text-xs', chosen.length === 0 ? 'text-muted-foreground' : missing.length ? 'text-red-600' : 'text-emerald-600')}>
          {chosen.length === 0
            ? 'Elige al menos dos cursos para dividir el área.'
            : missing.length
              ? `Falta cubrir: ${missing.map((n) => catalog.competences[n].shortName).join(', ')}.`
              : total < 2 ? 'Elige al menos dos cursos.' : 'Todas las competencias del área quedan cubiertas.'}
        </p>
        <Button size="sm" disabled={!canApply || configure.isPending || grades.length === 0}
          onClick={() => apply(chosen.map((c) => ({ key: c.key, weight: sel[c.key].weight })))}>
          {configure.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Guardar {area.name}
        </Button>
      </div>
    </div>
  );
};

export const PreuniversityModal: React.FC<{ open: boolean; onClose: () => void; level: Level; grade: number; catalog: Catalog }> = ({ open, onClose, level, grade, catalog }) => {
  const { data, isLoading } = usePreuniversityCatalog(level, grade, open);
  return (
    <Modal open={open} onClose={onClose} size="xl" title={`Cursos preuniversitarios · ${gradeLabel(level, grade)}`}
      description="Activa los cursos que dicta el colegio por separado. Cada curso tributa a su área madre y en el SIAGIE solo se reporta el promedio del área."
      footer={<Button variant="outline" onClick={onClose}>Cerrar</Button>}>
      {level === 'INITIAL' ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap className="h-4 w-4" />En inicial no se dividen las áreas en cursos.</p>
      ) : isLoading || !data ? <Skeleton className="h-64 w-full" /> : (
        <div className="space-y-3">
          {data.areas.map((a) => <AreaEditor key={a.code} area={a} level={level} grade={grade} catalog={catalog} />)}
        </div>
      )}
    </Modal>
  );
};
