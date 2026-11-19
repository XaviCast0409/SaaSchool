import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import {
  useApplyLateFees,
  useFinanceSettings,
  useLateFeePreview,
  useUpdateFinanceSettings,
} from '../../api/useFinance';

export const LateFeesTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const { data: settings } = useFinanceSettings();
  const save = useUpdateFinanceSettings();
  const { data: preview, isLoading } = useLateFeePreview(Boolean(settings?.lateFeeAnnualRate));
  const apply = useApplyLateFees();
  const [rate, setRate] = useState('');
  const [grace, setGrace] = useState('0');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (settings) {
      setRate(settings.lateFeeAnnualRate == null ? '' : String(settings.lateFeeAnnualRate));
      setGrace(String(settings.lateFeeGraceDays));
    }
  }, [settings]);
  const rows = useMemo(() => preview?.rows ?? [], [preview]);
  useEffect(() => setSelected(new Set(rows.map((r) => r.obligationId))), [rows]);
  const selectedTotal = rows.filter((r) => selected.has(r.obligationId)).reduce((s, r) => s + r.pending, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" /> Configuración de la mora
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            En el Perú los colegios privados solo pueden cobrar <strong>interés moratorio</strong> y la tasa no puede
            superar la <strong>tasa de interés interbancaria del BCRP</strong> (Ley 27665). Tampoco se puede retener
            notas ni impedir clases por deuda. Confirma la tasa vigente con tu contador antes de cargar moras.
          </p>
          <p className="text-xs text-muted-foreground">
            Cálculo: saldo vencido × tasa anual ÷ 360 × días de atraso (desde el vencimiento, una vez pasados los días
            de gracia). Solo pensiones.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs font-semibold">
              Tasa anual (%)
              <Input
                type="number"
                step="0.001"
                min="0"
                max="15"
                className="w-32"
                value={rate}
                disabled={!canManage}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Sin mora"
              />
              {Number(rate) > 15 && (
                <span className="block text-[10px] font-normal text-destructive">Máximo 15 % anual (Ley 27665).</span>
              )}
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Días de gracia
              <Input
                type="number"
                min="0"
                className="w-28"
                value={grace}
                disabled={!canManage}
                onChange={(e) => setGrace(e.target.value)}
              />
            </label>
            {canManage && (
              <Button
                size="sm"
                isLoading={save.isPending}
                onClick={() =>
                  save.mutate(
                    {
                      lateFeeAnnualRate: rate.trim() === '' ? null : Number(rate),
                      lateFeeGraceDays: Number(grace) || 0,
                    },
                    {
                      onSuccess: () => toast.success('Configuración guardada.'),
                      onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo guardar.')),
                    },
                  )
                }
              >
                Guardar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Moras por cargar hoy</CardTitle>
          {canManage && rows.length > 0 && (
            <Button
              size="sm"
              disabled={selected.size === 0}
              isLoading={apply.isPending}
              onClick={() =>
                apply.mutate([...selected], {
                  onSuccess: (r) => toast.success(`Mora cargada a ${r.applied} cuota(s) por ${formatMoney(r.total)}.`),
                  onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo cargar la mora.')),
                })
              }
            >
              Cargar mora a {selected.size} cuota(s) — {formatMoney(selectedTotal)}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!settings?.lateFeeAnnualRate ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              La mora está desactivada. Configura una tasa para calcularla.
            </p>
          ) : isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay moras pendientes de cargar.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas"
                        checked={selected.size === rows.length}
                        onChange={(e) =>
                          setSelected(e.target.checked ? new Set(rows.map((r) => r.obligationId)) : new Set())
                        }
                      />
                    </th>
                    <th className="p-2">Estudiante</th>
                    <th className="p-2">Cuota</th>
                    <th className="p-2 text-right">Días</th>
                    <th className="p-2 text-right">Saldo</th>
                    <th className="p-2 text-right">Interés a hoy</th>
                    <th className="p-2 text-right">Ya cargado</th>
                    <th className="p-2 text-right">Por cargar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.obligationId} className="border-t border-border">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(r.obligationId)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(r.obligationId);
                            else next.delete(r.obligationId);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="p-2">
                        {r.student.lastNamePaternal} {r.student.lastNameMaternal}, {r.student.firstNames}
                        <span className="block text-xs text-muted-foreground">
                          {r.classroom.grade}° "{r.classroom.section}"
                        </span>
                      </td>
                      <td className="p-2">
                        {r.title}
                        <span className="block text-xs text-muted-foreground">
                          Venció {formatPeruShortDate(r.dueDate)}
                        </span>
                      </td>
                      <td className="p-2 text-right">{r.daysOverdue}</td>
                      <td className="p-2 text-right">{formatMoney(r.balance)}</td>
                      <td className="p-2 text-right">{formatMoney(r.interestToDate)}</td>
                      <td className="p-2 text-right">{formatMoney(r.alreadyCharged)}</td>
                      <td className="p-2 text-right font-semibold">{formatMoney(r.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
