import React, { useState } from 'react';
import { CalendarOff, DoorOpen, QrCode, School, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruTime } from '@/lib/dateUtils';
import { CheckoutModal } from '@/features/attendance/components/CheckoutModal';
import { useGateToday } from '../api/useFamily';

type GateTab = 'out' | 'in';

/**
 * Portería: registrar la salida escaneando el carnet (muestra la foto de quienes pueden recoger
 * al alumno y avisa a la familia al instante), ver quién se llevó a quién hoy y quién sigue en el colegio.
 */
export const GatePage: React.FC = () => {
  const { data, isLoading } = useGateToday();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<GateTab>('out');
  const [q, setQ] = useState('');

  const term = q.trim().toLowerCase();
  const outRows = (data?.rows ?? []).filter(
    (r) => !term || `${r.student} ${r.pickedUpByName ?? ''} ${r.classroom}`.toLowerCase().includes(term),
  );
  const inRows = (data?.inSchool ?? []).filter(
    (r) => !term || `${r.student} ${r.classroom}`.toLowerCase().includes(term),
  );

  const stat = (value: number | undefined) => (isLoading ? '…' : (value ?? 0));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Portería"
        description="Escanea el carnet: verás la foto de las personas autorizadas y la familia recibe el aviso de salida al instante."
      />

      {data && !data.isSchoolDay && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
          <CalendarOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>
            <strong>Hoy no hay clases.</strong> {data.nonSchoolDayReason}
          </span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button onClick={() => setOpen(true)} className="col-span-2 h-auto flex-col gap-1 py-4 text-base sm:col-span-1">
          <QrCode className="h-7 w-7" aria-hidden />
          Registrar salida
        </Button>
        <Card className="flex items-center gap-3 p-4">
          <Users className="h-6 w-6 text-primary" aria-hidden />
          <div>
            <p className="text-2xl font-bold text-foreground">{stat(data?.present)}</p>
            <p className="text-xs text-muted-foreground">Ingresaron hoy</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <DoorOpen className="h-6 w-6 text-emerald-600" aria-hidden />
          <div>
            <p className="text-2xl font-bold text-foreground">{stat(data?.checkedOut)}</p>
            <p className="text-xs text-muted-foreground">Ya salieron</p>
          </div>
        </Card>
        <Card className="col-span-2 flex items-center gap-3 p-4 sm:col-span-1">
          <School className="h-6 w-6 text-amber-600" aria-hidden />
          <div>
            <p className="text-2xl font-bold text-foreground">{stat(data?.stillInSchool)}</p>
            <p className="text-xs text-muted-foreground">Aún en el colegio</p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Listas de portería"
            className="inline-flex rounded-lg border border-border p-0.5 text-xs"
          >
            {(
              [
                ['out', `Salidas de hoy (${data?.checkedOut ?? 0})`],
                ['in', `Aún en el colegio (${data?.stillInSchool ?? 0})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                  tab === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === 'out' ? 'Buscar alumno o persona' : 'Buscar alumno o aula'}
              className="h-9 pl-8"
              aria-label="Buscar en la lista"
            />
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : tab === 'out' ? (
          outRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {term
                ? 'Nadie coincide con la búsqueda.'
                : data?.isSchoolDay === false
                  ? 'Hoy no hay clases.'
                  : 'Aún no hay salidas registradas hoy.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {outRows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-2.5 text-sm">
                  <span className="w-[4.5rem] shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {formatPeruTime(r.checkOutTime)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {r.student} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.pickedUpByName
                        ? `Recogido(a) por ${r.pickedUpByName}${r.pickedUpByDocument ? ` · DNI ${r.pickedUpByDocument}` : ''}`
                        : 'Salió por su cuenta'}
                      {r.earlyLeaveReason ? ` · Salida anticipada: ${r.earlyLeaveReason}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : inRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {term
              ? 'Nadie coincide con la búsqueda.'
              : (data?.present ?? 0) === 0
                ? 'Hoy aún no ingresa ningún alumno.'
                : 'Todos los alumnos que ingresaron ya registraron su salida.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {inRows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className="w-[4.5rem] shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground"
                  title="Hora de ingreso"
                >
                  {r.checkInTime ? formatPeruTime(r.checkInTime) : '—'}
                </span>
                <p className="min-w-0 flex-1 font-medium text-foreground">
                  {r.student} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* El modal invalida los datos de portería al registrar cada salida */}
      {open && <CheckoutModal open={open} onClose={() => setOpen(false)} />}
    </div>
  );
};
