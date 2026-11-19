import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudents } from '@/features/students/api/useStudents';
import { useGuardianSearch, useStudentStatement, useFamilyStatement } from '../../api/useFinance';
import { StatementView } from '../StatementView';
import { studentName } from './constants';

export const StatementTab: React.FC = () => {
  const [mode, setMode] = useState<'student' | 'family'>('student');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { data: studentsData } = useStudents(
    { page: 1, limit: 20, search: search || undefined, scope: 'all' },
    mode === 'student' && search.trim().length >= 2,
  );
  const { data: guardians = [] } = useGuardianSearch(mode === 'family' ? search : '');
  const student = useStudentStatement(mode === 'student' ? selected : null);
  const family = useFamilyStatement(mode === 'family' ? selected : null);
  const data = mode === 'student' ? student.data : family.data;
  const loading = mode === 'student' ? student.isLoading : family.isLoading;
  const options =
    mode === 'student'
      ? (studentsData?.data ?? []).map((s) => ({
          id: s.id,
          label: `${studentName(s)}${s.documentId ? ` — ${s.documentId}` : ''}`,
        }))
      : guardians.map((g) => ({
          id: g.id,
          label: `${g.lastNamePaternal} ${g.lastNameMaternal}, ${g.firstName} — hijos: ${g.familyRelations.map((r) => `${r.student.firstNames} ${r.student.lastNamePaternal}`).join(', ')}`,
        }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
          {(['student', 'family'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setSelected(null);
                setSearch('');
              }}
              className={`rounded-md px-3 py-1.5 font-semibold ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {m === 'student' ? 'Por alumno' : 'Por familia (apoderado)'}
            </button>
          ))}
        </div>
        <div className="min-w-[260px] flex-1 space-y-1">
          <Input
            placeholder={
              mode === 'student'
                ? 'Buscar alumno por apellido o DNI'
                : 'Buscar apoderado por apellido, DNI o apellido del hijo'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {search.trim().length >= 2 && options.length > 0 && !selected && (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => setSelected(o.id)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelected(null)}>
          ← Elegir otro
        </Button>
      )}
      {selected && (loading || !data ? <Skeleton className="h-64 w-full" /> : <StatementView data={data} showVoided />)}
      {!selected && (
        <p className="text-sm text-muted-foreground">
          Busca un alumno o un apoderado para ver su estado de cuenta (cuotas, descuentos, moras, pagos y saldo).
        </p>
      )}
    </div>
  );
};
