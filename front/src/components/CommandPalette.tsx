import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, GraduationCap, Loader2, Lock, Search } from 'lucide-react';
import { useStudents } from '@/features/students/api/useStudents';
import type { ResolvedNavSection } from '@/layouts/navigation';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  sections: ResolvedNavSection[];
  /** Solo dirección y oficina pueden buscar alumnos */
  canSearchStudents: boolean;
}

interface Result {
  key: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  locked?: boolean;
}

/** Sin tildes ni mayúsculas: "matricula" encuentra "Matrícula" */
const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Buscador global (Ctrl+K): salta a cualquier pantalla del menú o a un alumno. */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, sections, canSearchStudents }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const term = query.trim();
  const debouncedTerm = useDebouncedValue(term, 250);
  const studentSearchOn = open && canSearchStudents && debouncedTerm.length >= 2;
  const { data: studentsResponse, isFetching: studentsLoading } = useStudents(
    { search: debouncedTerm, scope: 'all', page: 1, limit: 6 },
    studentSearchOn,
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    // Esperar al render para poder enfocar el campo
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const pageResults = useMemo<Result[]>(() => {
    const needle = normalize(term);
    const results: Result[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        const entries =
          item.tabs && item.tabs.length > 1
            ? item.tabs.map((tab) => ({ label: `${item.label} · ${tab.label}`, to: tab.path }))
            : [{ label: item.label, to: item.path }];
        for (const entry of entries) {
          const haystack = normalize(`${entry.label} ${section.title} ${item.keywords ?? ''}`);
          if (needle && !needle.split(/\s+/).every((word) => haystack.includes(word))) continue;
          results.push({
            key: `page:${entry.to}`,
            label: entry.label,
            hint: section.title,
            icon: item.icon,
            to: entry.to,
            locked: item.locked,
          });
        }
      }
    }
    return needle ? results.slice(0, 8) : results.slice(0, 7);
  }, [sections, term]);

  const studentResults = useMemo<Result[]>(() => {
    if (!studentSearchOn || debouncedTerm !== term) return [];
    return (studentsResponse?.data ?? []).map((student) => {
      const fullName = [student.lastNamePaternal, student.lastNameMaternal, student.firstNames]
        .filter(Boolean)
        .join(' ');
      return {
        key: `student:${student.id}`,
        label: fullName,
        hint: `${student.documentType} ${student.documentId}`,
        icon: GraduationCap,
        // La lista de alumnos se abre ya filtrada por este alumno
        to: `/students?scope=all&q=${encodeURIComponent(student.documentId)}`,
      };
    });
  }, [studentSearchOn, debouncedTerm, term, studentsResponse]);

  const results = useMemo(() => [...pageResults, ...studentResults], [pageResults, studentResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, [term, results.length]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const go = (result: Result | undefined) => {
    if (!result) return;
    onClose();
    navigate(result.to);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  const waitingStudents = canSearchStudents && term.length >= 2 && (studentsLoading || debouncedTerm !== term);

  const renderGroup = (title: string, group: Result[], offset: number) =>
    group.length > 0 && (
      <div className="py-1">
        <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        {group.map((result, i) => {
          const index = offset + i;
          const active = index === activeIndex;
          const Icon = result.icon;
          return (
            <button
              key={result.key}
              type="button"
              role="option"
              aria-selected={active}
              data-active={active}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => go(result)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                active ? 'bg-primary/10 text-foreground' : 'text-foreground'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="min-w-0 flex-1 truncate font-medium">{result.label}</span>
              {result.locked && (
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Requiere un plan superior" />
              )}
              <span className="shrink-0 text-xs text-muted-foreground">{result.hint}</span>
              {active && <CornerDownLeft className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />}
            </button>
          );
        })}
      </div>
    );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-background/80 p-4 pt-[10vh] backdrop-blur-sm print:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscador"
        onKeyDown={onKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={canSearchStudents ? 'Buscar una pantalla o un alumno (nombre o DNI)…' : 'Buscar una pantalla…'}
            aria-label="Buscar"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {waitingStudents && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>

        <div ref={listRef} role="listbox" className="max-h-[55vh] overflow-y-auto">
          {renderGroup(term ? 'Pantallas' : 'Ir a', pageResults, 0)}
          {renderGroup('Alumnos', studentResults, pageResults.length)}
          {results.length === 0 && !waitingStudents && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No hay resultados para «{term}».</p>
          )}
        </div>
      </div>
    </div>
  );
};
