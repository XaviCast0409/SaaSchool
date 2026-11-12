import React, { useState } from 'react';
import { DoorOpen, QrCode, Search, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruTime } from '@/lib/dateUtils';
import { CheckoutModal } from '@/features/attendance/components/CheckoutModal';
import { useGateToday } from '../api/useFamily';

/**
 * Portería: registrar la salida escaneando el carnet (muestra la foto de quienes pueden recoger
 * al alumno y avisa a la familia al instante) y ver quién se llevó a quién hoy.
 */
export const GatePage: React.FC = () => {
  const { data, isLoading } = useGateToday();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const rows = (data?.rows ?? []).filter((r) => !q || `${r.student} ${r.pickedUpByName ?? ''} ${r.classroom}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Portería"
        description="Escanea el carnet: verás la foto de las personas autorizadas y la familia recibe el aviso de salida al instante."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Button onClick={() => setOpen(true)} className="h-auto flex-col gap-1 py-4 text-base sm:col-span-1">
          <QrCode className="h-7 w-7" aria-hidden />
          Registrar salida
        </Button>
        <Card className="flex items-center gap-3 p-4">
          <Users className="h-6 w-6 text-primary" aria-hidden />
          <div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? '…' : data?.present ?? 0}</p>
            <p className="text-xs text-muted-foreground">Ingresaron hoy</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <DoorOpen className="h-6 w-6 text-emerald-600" aria-hidden />
          <div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? '…' : data?.checkedOut ?? 0}</p>
            <p className="text-xs text-muted-foreground">Salidas registradas</p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Salidas de hoy</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno o persona" className="h-9 pl-8" aria-label="Buscar en salidas de hoy" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay salidas registradas hoy.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{formatPeruTime(r.checkOutTime)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {r.student} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.pickedUpByName ? `Recogido(a) por ${r.pickedUpByName}${r.pickedUpByDocument ? ` · DNI ${r.pickedUpByDocument}` : ''}` : 'Salió por su cuenta'}
                    {r.earlyLeaveReason ? ` · Salida anticipada: ${r.earlyLeaveReason}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <CheckoutModal
          open={open}
          onClose={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['family', 'gate'] });
          }}
        />
      )}
    </div>
  );
};
