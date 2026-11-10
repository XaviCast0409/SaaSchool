import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { History, Shield, Filter, Calendar } from 'lucide-react';
import { useAuditLogs } from '../api/useAuditLogs';
import { formatPeruDate, formatPeruTime } from '@/lib/dateUtils';

const ENTITY_OPTIONS = [
  { value: 'ALL', label: 'Todas las entidades' },
  { value: 'PaymentTransaction', label: 'Transacción de Pago' },
  { value: 'PaymentObligation', label: 'Obligación / Pensión' },
  { value: 'Grades', label: 'Calificaciones y Criterios' },
  { value: 'GradingPeriodLock', label: 'Cierre de Periodo / Actas' },
  { value: 'Enrollment', label: 'Matrícula' },
  { value: 'Student', label: 'Estudiante' },
  { value: 'User', label: 'Usuario / Docente' },
  { value: 'School', label: 'Colegio' },
  { value: 'StudentIncident', label: 'Incidencia Escolar' },
];

export const AuditLogsPage: React.FC = () => {
  const [entity, setEntity] = useState<string>('ALL');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  const { data, isLoading, isError } = useAuditLogs({
    entity: entity === 'ALL' ? undefined : entity,
    from: from || undefined,
    to: to || undefined,
    page,
    limit,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 25, totalPages: 1 };

  const handleEntityChange = (newEntity: string) => {
    setEntity(newEntity);
    setPage(1);
  };

  const handleFromChange = (newFrom: string) => {
    setFrom(newFrom);
    setPage(1);
  };

  const handleToChange = (newTo: string) => {
    setTo(newTo);
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] font-bold">
              <Shield className="w-3 h-3 mr-1" />
              Seguridad y Trazabilidad
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Bitácora de auditoría
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Registro de cambios en notas, pagos, matrículas y usuarios.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4 border-border bg-card shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Entidad
            </label>
            <select
              value={entity}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Desde
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Hasta
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>
      </Card>

      {/* Tabla de Registros */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted border-b border-border font-bold text-muted-foreground">
                <th className="p-3 w-44">Fecha y hora</th>
                <th className="p-3 w-56">Usuario</th>
                <th className="p-3">Acción</th>
                <th className="p-3 w-40">Entidad</th>
                <th className="p-3 w-32 font-mono">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-destructive">
                    Ocurrió un error al cargar la bitácora de auditoría.
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No se encontraron registros de auditoría con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const userDisplay = log.actorEmail || `${log.actorId.slice(0, 8)}...`;

                  return (
                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        <span className="font-medium text-foreground block">
                          {formatPeruDate(log.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatPeruTime(log.createdAt)}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-foreground block truncate max-w-[200px]" title={userDisplay}>
                          {userDisplay}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                          {log.actorRole}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] px-2 py-0.5 border-border bg-secondary/30 text-foreground"
                        >
                          {log.action}
                        </Badge>
                      </td>

                      <td className="p-3 font-medium text-foreground">
                        {log.entity}
                      </td>

                      <td className="p-3 font-mono text-muted-foreground text-[11px]" title={log.entityId || '—'}>
                        {log.entityId ? `${log.entityId.slice(0, 8)}...` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </Card>
    </div>
  );
};
