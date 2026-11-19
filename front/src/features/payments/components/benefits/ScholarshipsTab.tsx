import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import {
  useApplyScholarship,
  useDeactivateScholarship,
  useScholarships,
  type Scholarship,
} from '../../api/useFinance';
import { personName } from '../../types';
import { CONCEPTS, valueLabel } from './constants';
import { NewScholarshipModal } from './NewScholarshipModal';

export const ScholarshipsTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const [activeOnly, setActiveOnly] = useState(true);
  const { data = [], isLoading } = useScholarships(activeOnly);
  const apply = useApplyScholarship();
  const deactivate = useDeactivateScholarship();
  const [newOpen, setNewOpen] = useState(false);
  const [toEnd, setToEnd] = useState<Scholarship | null>(null);
  const [endReason, setEndReason] = useState('');
  const [revert, setRevert] = useState(true);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Becas y descuentos recurrentes</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada beca rebaja las cuotas que cubre con un ajuste numerado (AJ-…). Al generar pensiones nuevas se aplica
            sola.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Solo
            vigentes
          </label>
          {canManage && (
            <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Nueva beca
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay becas registradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Estudiante</th>
                  <th className="p-2">Beca</th>
                  <th className="p-2">Valor</th>
                  <th className="p-2">Vigencia</th>
                  <th className="p-2">Cuotas con beca</th>
                  <th className="p-2">Registró</th>
                  <th className="p-2">Estado</th>
                  {canManage && <th className="p-2" />}
                </tr>
              </thead>
              <tbody>
                {data.map((s) => {
                  const st = s.enrollment.student;
                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-border align-top ${s.isActive ? '' : 'text-muted-foreground'}`}
                    >
                      <td className="p-2">
                        <span className="font-medium text-foreground">
                          {st.lastNamePaternal} {st.lastNameMaternal}, {st.firstNames}
                        </span>
                        <span className="block text-xs">
                          {s.enrollment.classroom.grade}° "{s.enrollment.classroom.section}" · {st.documentId}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">{s.name}</span>
                        <span className="block text-xs">{s.concepts.map((c) => CONCEPTS[c] ?? c).join(', ')}</span>
                        <span className="block text-xs text-muted-foreground">{s.reason}</span>
                      </td>
                      <td className="p-2 whitespace-nowrap">{valueLabel(s)}</td>
                      <td className="p-2 whitespace-nowrap">
                        {formatPeruShortDate(s.validFrom.slice(0, 10))} —{' '}
                        {s.validTo ? formatPeruShortDate(s.validTo.slice(0, 10)) : 'sin fin'}
                      </td>
                      <td className="p-2 text-center">{s._count.adjustments}</td>
                      <td className="p-2 whitespace-nowrap">{personName(s.createdBy)}</td>
                      <td className="p-2">
                        {s.isActive ? (
                          <Badge variant="success">Vigente</Badge>
                        ) : (
                          <span>
                            <Badge variant="outline">Desactivada</Badge>
                            <span className="block text-xs">{s.deactivationReason}</span>
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="p-2">
                          {s.isActive && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                isLoading={apply.isPending && apply.variables === s.id}
                                onClick={() =>
                                  apply.mutate(s.id, {
                                    onSuccess: (r) =>
                                      toast.success(
                                        r.applied
                                          ? `Aplicada a ${r.applied} cuota(s).`
                                          : 'No hay cuotas pendientes nuevas que cubrir.',
                                      ),
                                    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo aplicar.')),
                                  })
                                }
                              >
                                Aplicar a pendientes
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive"
                                onClick={() => {
                                  setToEnd(s);
                                  setEndReason('');
                                  setRevert(true);
                                }}
                              >
                                Desactivar
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <NewScholarshipModal open={newOpen} onClose={() => setNewOpen(false)} />
      <Modal
        open={!!toEnd}
        onClose={() => setToEnd(null)}
        size="sm"
        title={`Desactivar ${toEnd?.name ?? 'beca'}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setToEnd(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={endReason.trim().length < 5}
              isLoading={deactivate.isPending}
              onClick={() =>
                toEnd &&
                deactivate.mutate(
                  { id: toEnd.id, reason: endReason.trim(), revertPending: revert },
                  {
                    onSuccess: (r) => {
                      toast.success(
                        `Beca desactivada${r.reverted ? `; se revirtió en ${r.reverted} cuota(s) sin pagar` : ''}.`,
                      );
                      setToEnd(null);
                    },
                    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo desactivar.')),
                  },
                )
              }
            >
              Desactivar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <textarea
            rows={2}
            value={endReason}
            onChange={(e) => setEndReason(e.target.value)}
            placeholder="Motivo (obligatorio). Ej: El alumno se retiró"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={revert} onChange={(e) => setRevert(e.target.checked)} />
            Quitar también la beca de las cuotas que aún no tienen pagos (los ajustes quedan como anulados, con este
            motivo).
          </label>
        </div>
      </Modal>
    </Card>
  );
};
