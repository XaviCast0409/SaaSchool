import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, Percent, Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { useStudents } from '@/features/students/api/useStudents';
import { useFinanceAccess } from '../api/usePayments';
import { apiError } from '../api/useCash';
import {
  useApplyLateFees,
  useApplyScholarship,
  useCreateScholarship,
  useDeactivateScholarship,
  useFinanceSettings,
  useLateFeePreview,
  useScholarships,
  useUpdateFinanceSettings,
  type Scholarship,
} from '../api/useFinance';
import { personName } from '../types';
import { soles } from '../components/CashMovements';

const CONCEPTS: Record<string, string> = {
  PENSION: 'Pensión',
  MATRICULA: 'Matrícula',
  LIBROS_MATERIALES: 'Libros y materiales',
  UNIFORME: 'Uniforme',
  CARNET_AGENDA: 'Carné / agenda',
  EXCURSION_EVENTO: 'Excursión / evento',
  OTROS: 'Otros',
};

const valueLabel = (s: Pick<Scholarship, 'kind' | 'value'>) => (s.kind === 'PERCENT' ? `${Number(s.value)} %` : `${soles(s.value)} por cuota`);

// ──────────────────────────────────────────────────────────────────
// Nueva beca
// ──────────────────────────────────────────────────────────────────
const NewScholarshipModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const create = useCreateScholarship();
  const year = getPeruToday().slice(0, 4);
  const empty = { studentId: '', name: '', kind: 'PERCENT' as 'PERCENT' | 'FIXED', value: '', concepts: ['PENSION'], validFrom: `${year}-01-01`, validTo: `${year}-12-31`, reason: '', applyNow: true };
  const [f, setF] = useState(empty);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (open) {
      setF(empty);
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const { data: studentsData } = useStudents({ page: 1, limit: 20, search: search || undefined }, open && search.trim().length >= 2);
  const students = studentsData?.data ?? [];
  const valid =
    f.studentId && f.name.trim().length >= 3 && Number(f.value) > 0 && (f.kind === 'FIXED' || Number(f.value) <= 100) && f.concepts.length > 0 && f.reason.trim().length >= 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar beca o descuento recurrente"
      description="Se aplica como ajuste numerado a cada cuota que cubre, también a las pensiones que generes después."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            isLoading={create.isPending}
            onClick={() =>
              create.mutate(
                { ...f, value: Number(f.value), validTo: f.validTo || null, name: f.name.trim(), reason: f.reason.trim() },
                {
                  onSuccess: (r) => {
                    toast.success(`Beca registrada.${f.applyNow ? ` Se aplicó a ${r.applied} cuota(s) pendiente(s)${r.skipped ? `; ${r.skipped} no se pudieron (tienen pagos)` : ''}.` : ''}`);
                    onClose();
                  },
                  onError: (e) => toast.error(apiError(e, 'No se pudo registrar la beca.')),
                },
              )
            }
          >
            Registrar beca
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-semibold">Estudiante</label>
          <Input placeholder="Buscar por apellido o DNI (mínimo 2 letras)" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search.trim().length >= 2 && (
            <select
              size={Math.min(6, Math.max(2, students.length))}
              className="w-full rounded-md border border-input bg-background p-1 text-sm"
              value={f.studentId}
              onChange={(e) => setF({ ...f, studentId: e.target.value })}
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.lastNamePaternal} {st.lastNameMaternal}, {st.firstNames} {st.documentId ? `— ${st.documentId}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">
          Nombre de la beca
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej: Beca hermanos, Beca socioeconómica" />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Tipo
          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as 'PERCENT' | 'FIXED' })}>
            <option value="PERCENT">Porcentaje del monto</option>
            <option value="FIXED">Monto fijo por cuota</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          {f.kind === 'PERCENT' ? 'Porcentaje (%)' : 'Monto por cuota (S/)'}
          <Input type="number" step="0.01" min="0" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Vigente desde (vencimiento)
          <Input type="date" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Hasta (opcional)
          <Input type="date" value={f.validTo} onChange={(e) => setF({ ...f, validTo: e.target.value })} />
        </label>
        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-xs font-semibold">Conceptos que cubre</legend>
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(CONCEPTS).map(([k, v]) => (
              <label key={k} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={f.concepts.includes(k)}
                  onChange={(e) => setF({ ...f, concepts: e.target.checked ? [...f.concepts, k] : f.concepts.filter((c) => c !== k) })}
                />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">
          Motivo / sustento (obligatorio)
          <textarea
            rows={2}
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
            placeholder="Ej: Aprobada por Dirección según informe socioeconómico N° 12"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input type="checkbox" checked={f.applyNow} onChange={(e) => setF({ ...f, applyNow: e.target.checked })} />
          Aplicar ya a las cuotas pendientes que cubre (las cuotas pagadas no se tocan)
        </label>
      </div>
    </Modal>
  );
};

// ──────────────────────────────────────────────────────────────────
// Becas
// ──────────────────────────────────────────────────────────────────
const ScholarshipsTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
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
          <p className="mt-1 text-xs text-muted-foreground">Cada beca rebaja las cuotas que cubre con un ajuste numerado (AJ-…). Al generar pensiones nuevas se aplica sola.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Solo vigentes
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
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
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
                    <tr key={s.id} className={`border-t border-border align-top ${s.isActive ? '' : 'text-muted-foreground'}`}>
                      <td className="p-2">
                        <span className="font-medium text-foreground">
                          {st.lastNamePaternal} {st.lastNameMaternal}, {st.firstNames}
                        </span>
                        <span className="block text-[11px]">
                          {s.enrollment.classroom.grade}° "{s.enrollment.classroom.section}" · {st.documentId}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">{s.name}</span>
                        <span className="block text-[11px]">{s.concepts.map((c) => CONCEPTS[c] ?? c).join(', ')}</span>
                        <span className="block text-[11px] text-muted-foreground">{s.reason}</span>
                      </td>
                      <td className="p-2 whitespace-nowrap">{valueLabel(s)}</td>
                      <td className="p-2 whitespace-nowrap">
                        {formatPeruShortDate(s.validFrom.slice(0, 10))} — {s.validTo ? formatPeruShortDate(s.validTo.slice(0, 10)) : 'sin fin'}
                      </td>
                      <td className="p-2 text-center">{s._count.adjustments}</td>
                      <td className="p-2 whitespace-nowrap">{personName(s.createdBy)}</td>
                      <td className="p-2">
                        {s.isActive ? (
                          <Badge variant="success">Vigente</Badge>
                        ) : (
                          <span>
                            <Badge variant="outline">Desactivada</Badge>
                            <span className="block text-[10px]">{s.deactivationReason}</span>
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
                                    onSuccess: (r) => toast.success(r.applied ? `Aplicada a ${r.applied} cuota(s).` : 'No hay cuotas pendientes nuevas que cubrir.'),
                                    onError: (e) => toast.error(apiError(e, 'No se pudo aplicar.')),
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
                      toast.success(`Beca desactivada${r.reverted ? `; se revirtió en ${r.reverted} cuota(s) sin pagar` : ''}.`);
                      setToEnd(null);
                    },
                    onError: (e) => toast.error(apiError(e, 'No se pudo desactivar.')),
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
            Quitar también la beca de las cuotas que aún no tienen pagos (los ajustes quedan como anulados, con este motivo).
          </label>
        </div>
      </Modal>
    </Card>
  );
};

// ──────────────────────────────────────────────────────────────────
// Moras
// ──────────────────────────────────────────────────────────────────
const LateFeesTab: React.FC<{ canManage: boolean }> = ({ canManage }) => {
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
            En el Perú los colegios privados solo pueden cobrar <strong>interés moratorio</strong> y la tasa no puede superar la{' '}
            <strong>tasa de interés interbancaria del BCRP</strong> (Ley 27665). Tampoco se puede retener notas ni impedir clases por deuda.
            Confirma la tasa vigente con tu contador antes de cargar moras.
          </p>
          <p className="text-xs text-muted-foreground">Cálculo: saldo vencido × tasa anual ÷ 360 × días de atraso (desde el vencimiento, una vez pasados los días de gracia). Solo pensiones.</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs font-semibold">
              Tasa anual (%)
              <Input type="number" step="0.001" min="0" className="w-32" value={rate} disabled={!canManage} onChange={(e) => setRate(e.target.value)} placeholder="Sin mora" />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Días de gracia
              <Input type="number" min="0" className="w-28" value={grace} disabled={!canManage} onChange={(e) => setGrace(e.target.value)} />
            </label>
            {canManage && (
              <Button
                size="sm"
                isLoading={save.isPending}
                onClick={() =>
                  save.mutate(
                    { lateFeeAnnualRate: rate.trim() === '' ? null : Number(rate), lateFeeGraceDays: Number(grace) || 0 },
                    { onSuccess: () => toast.success('Configuración guardada.'), onError: (e) => toast.error(apiError(e, 'No se pudo guardar.')) },
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
                  onSuccess: (r) => toast.success(`Mora cargada a ${r.applied} cuota(s) por ${soles(r.total)}.`),
                  onError: (e) => toast.error(apiError(e, 'No se pudo cargar la mora.')),
                })
              }
            >
              Cargar mora a {selected.size} cuota(s) — {soles(selectedTotal)}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!settings?.lateFeeAnnualRate ? (
            <p className="py-6 text-center text-sm text-muted-foreground">La mora está desactivada. Configura una tasa para calcularla.</p>
          ) : isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay moras pendientes de cargar.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas"
                        checked={selected.size === rows.length}
                        onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.obligationId)) : new Set())}
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
                        <span className="block text-[11px] text-muted-foreground">
                          {r.classroom.grade}° "{r.classroom.section}"
                        </span>
                      </td>
                      <td className="p-2">
                        {r.title}
                        <span className="block text-[11px] text-muted-foreground">Venció {formatPeruShortDate(r.dueDate)}</span>
                      </td>
                      <td className="p-2 text-right">{r.daysOverdue}</td>
                      <td className="p-2 text-right">{soles(r.balance)}</td>
                      <td className="p-2 text-right">{soles(r.interestToDate)}</td>
                      <td className="p-2 text-right">{soles(r.alreadyCharged)}</td>
                      <td className="p-2 text-right font-semibold">{soles(r.pending)}</td>
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

export const BenefitsPage: React.FC = () => {
  const { data: access, isLoading } = useFinanceAccess();
  const [tab, setTab] = useState<'becas' | 'moras'>('becas');
  if (isLoading || !access) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!access.can.view && !access.can.manage) {
    return <p className="text-sm text-muted-foreground">Solo tesorería, el contador y Dirección pueden ver becas y moras.</p>;
  }
  return (
    <div className="space-y-6 pb-8">
      <div className="border-b border-border pb-4">
        <Link to="/payments" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Pagos y cobranzas
        </Link>
        <div className="flex items-center gap-2">
          <Percent className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Becas y moras</h1>
          <Badge variant="outline">{access.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Becas recurrentes por alumno y cálculo del interés moratorio, con trazabilidad de cada ajuste.</p>
      </div>
      <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
        <button type="button" onClick={() => setTab('becas')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold ${tab === 'becas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
          <GraduationCap className="h-4 w-4" /> Becas
        </button>
        <button type="button" onClick={() => setTab('moras')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold ${tab === 'moras' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
          <Scale className="h-4 w-4" /> Moras
        </button>
      </div>
      {tab === 'becas' ? <ScholarshipsTab canManage={access.can.manage} /> : <LateFeesTab canManage={access.can.manage} />}
    </div>
  );
};
