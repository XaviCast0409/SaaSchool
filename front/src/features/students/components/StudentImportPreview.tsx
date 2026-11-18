import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StudentImportPlan, StudentImportRow } from '../importTypes';

const STUDENT_LABEL: Record<
  StudentImportRow['studentAction'],
  { text: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }
> = {
  CREATE: { text: 'Nuevo', variant: 'success' },
  UPDATE: { text: 'Actualiza datos', variant: 'warning' },
  NONE: { text: 'Ya existe', variant: 'secondary' },
  ERROR: { text: 'Con error', variant: 'destructive' },
  DUPLICATE: { text: 'Repetido', variant: 'outline' },
};

const ENROLLMENT_LABEL: Record<StudentImportRow['enrollmentAction'], string> = {
  CREATE: 'Se matricula',
  NONE: 'Ya matriculado',
  SKIP: 'No se carga',
};

const GUARDIAN_LABEL: Record<StudentImportRow['guardianAction'], string> = {
  CREATE: 'Apoderado nuevo',
  LINK: 'Se vincula a uno existente',
  NONE: 'Ya vinculado',
  SKIP: '—',
};

type Filter = 'ERRORS' | 'WARNINGS' | 'ALL';
const FILTER_LABEL: Record<Filter, string> = { ERRORS: 'Con error', WARNINGS: 'Con avisos', ALL: 'Todos' };
const isRejected = (row: StudentImportRow): boolean =>
  row.studentAction === 'ERROR' || row.studentAction === 'DUPLICATE';

/** Resumen y detalle fila por fila de lo que hará la carga, antes de guardar nada. */
export const StudentImportPreview: React.FC<{ plan: StudentImportPlan }> = ({ plan }) => {
  const summary = plan.summary;
  const rejectedCount = summary.errors + summary.duplicates;
  const [filter, setFilter] = useState<Filter>(rejectedCount > 0 ? 'ERRORS' : 'ALL');

  const rows = useMemo(() => {
    if (filter === 'ERRORS') return plan.rows.filter(isRejected);
    if (filter === 'WARNINGS') return plan.rows.filter((row) => !isRejected(row) && row.warnings.length > 0);
    return plan.rows;
  }, [plan, filter]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{plan.school.name}</span> · año lectivo {plan.academicYear.year} ·{' '}
        {summary.total} filas leídas
      </p>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="Alumnos nuevos" value={summary.createStudents} tone="good" />
        <Stat label="Matrículas nuevas" value={summary.createEnrollments} tone="good" />
        <Stat label="Apoderados nuevos" value={summary.createGuardians} tone="good" />
        <Stat label="Datos a actualizar" value={summary.updateStudents} tone="warn" />
        <Stat label="Sin cambios" value={summary.unchanged} />
        <Stat
          label="Repetidos en el archivo"
          value={summary.duplicates}
          tone={summary.duplicates ? 'warn' : undefined}
        />
        <Stat label="Con error (no se cargan)" value={summary.errors} tone={summary.errors ? 'bad' : undefined} />
      </div>

      {plan.blocking.map((message) => (
        <p
          key={message}
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {message}
        </p>
      ))}
      {plan.notes.map((note) => (
        <p key={note} className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {note}
        </p>
      ))}

      <div className="flex gap-1">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((key) => (
          <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>
            {FILTER_LABEL[key]}
          </Button>
        ))}
      </div>

      <div className="max-h-[36vh] overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="px-2 py-1.5">Fila</th>
              <th className="px-2 py-1.5">Estudiante</th>
              <th className="px-2 py-1.5">Aula</th>
              <th className="px-2 py-1.5">Alumno</th>
              <th className="px-2 py-1.5">Matrícula</th>
              <th className="px-2 py-1.5">Apoderado</th>
              <th className="px-2 py-1.5">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">
                  No hay filas en este filtro.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.rowNumber} className="border-t border-border align-top">
                <td className="px-2 py-1.5 font-mono text-muted-foreground">{row.rowNumber}</td>
                <td className="px-2 py-1.5 font-medium">
                  {row.fullName}
                  <span className="block font-mono font-normal text-muted-foreground">
                    {row.documentId || 'sin documento'}
                  </span>
                </td>
                <td className="px-2 py-1.5">{row.classroomLabel}</td>
                <td className="px-2 py-1.5">
                  <Badge variant={STUDENT_LABEL[row.studentAction].variant}>
                    {STUDENT_LABEL[row.studentAction].text}
                  </Badge>
                </td>
                <td className="px-2 py-1.5">{ENROLLMENT_LABEL[row.enrollmentAction]}</td>
                <td className="px-2 py-1.5">
                  {row.guardianName}
                  <span className="block text-muted-foreground">{GUARDIAN_LABEL[row.guardianAction]}</span>
                </td>
                <td className="px-2 py-1.5">
                  {row.issues.map((issue) => (
                    <span key={issue} className="block text-destructive">
                      {issue}
                    </span>
                  ))}
                  {row.changes.map((change) => (
                    <span key={change} className="block">
                      {change}
                    </span>
                  ))}
                  {row.warnings.map((warning) => (
                    <span key={warning} className="block text-amber-600 dark:text-amber-400">
                      {warning}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; tone?: 'good' | 'warn' | 'bad' }> = ({ label, value, tone }) => (
  <div
    className={cn(
      'rounded-lg border p-2',
      tone === 'good' && value > 0 && 'border-emerald-500/30 bg-emerald-500/10',
      tone === 'warn' && value > 0 && 'border-amber-500/30 bg-amber-500/10',
      tone === 'bad' && 'border-destructive/30 bg-destructive/10',
      (!tone || (tone !== 'bad' && value === 0)) && 'border-border',
    )}
  >
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);
