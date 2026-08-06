import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  Send,
  FileText,
  School,
  Ban,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  usePayments,
  useParentPayments,
  useFinancialSummary,
  useSendBulkReminders,
  useCancelObligation,
} from '../api/usePayments';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { RegisterTransactionModal } from '../components/RegisterTransactionModal';
import { BulkObligationModal } from '../components/BulkObligationModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { ReminderModal } from '../components/ReminderModal';
import { PaymentObligation, ObligationStatus } from '../types';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isParent = user?.role === 'PARENT';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedObligationForTransaction, setSelectedObligationForTransaction] = useState<PaymentObligation | null>(null);
  const [selectedObligationForReminder, setSelectedObligationForReminder] = useState<PaymentObligation | null>(null);
  const [selectedTransactionIdForReceipt, setSelectedTransactionIdForReceipt] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Queries & Mutations
  const { data: classrooms = [] } = useClassrooms();
  const { data: financialSummary, isLoading: isLoadingSummary } = useFinancialSummary();

  const {
    data: adminObligations = [],
    isLoading: isLoadingAdminObligations,
  } = usePayments(
    {
      status: filterStatus !== 'ALL' ? (filterStatus as ObligationStatus) : undefined,
      classroomId: selectedClassroomId || undefined,
      search: searchTerm || undefined,
    },
    isAdmin
  );

  const {
    data: parentObligations = [],
    isLoading: isLoadingParentObligations,
  } = useParentPayments();

  const { mutate: sendBulkReminders, isPending: isSendingBulk } = useSendBulkReminders();
  const { mutate: cancelObligation, isPending: isCancelling } = useCancelObligation();

  const obligations = isParent ? parentObligations : adminObligations;
  const isLoading = isParent ? isLoadingParentObligations : isLoadingAdminObligations;

  const handleBulkReminders = () => {
    if (window.confirm('¿Deseas enviar recordatorios masivos por WhatsApp/Email a todos los apoderados con deudas vencidas?')) {
      sendBulkReminders('BOTH');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isParent ? 'Mis Pensiones y Pagos' : 'Control Financiero y Pensiones'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isParent
              ? 'Consulta el estado de deudas de tus hijos y emite comprobantes de pago.'
              : 'Cronograma de pagos, registro manual de cobros y recordatorios por morosidad.'}
          </p>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkReminders}
              isLoading={isSendingBulk}
              className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Recordatorios Morosos</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsBulkModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Generar Cronograma Masivo</span>
            </Button>
          </div>
        )}
      </div>

      {/* Admin KPI Financial Summary Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Recaudación Total</CardTitle>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    S/ {financialSummary?.totalCollected.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Cobrado exitosamente</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Por Cobrar (Pendiente)</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    S/ {financialSummary?.totalPending.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Saldo pendiente acumulado</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Proyectado</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    S/ {financialSummary?.totalExpected.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{financialSummary?.totalObligations} obligaciones en total</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Morosidad (Deudas Vencidas)</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-destructive">
                    {financialSummary?.overdueCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Alumnos con pago vencido</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search & Classroom Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por concepto o estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-lg border border-border">
                <School className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="h-6 border-none bg-transparent text-xs font-semibold focus-visible:ring-0 text-foreground cursor-pointer"
                >
                  <option value="">— Todas las Secciones —</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grade}° {c.section} ({c.educationLevel})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {['ALL', 'PENDING', 'PARTIAL', 'PAID', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {status === 'ALL'
                  ? 'Todos'
                  : status === 'PENDING'
                  ? 'Pendientes'
                  : status === 'PARTIAL'
                  ? 'Parciales'
                  : status === 'PAID'
                  ? 'Pagados'
                  : 'Anulados'}
              </button>
            ))}
          </div>
        </div>

        {/* Obligations Table */}
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : (
          <div className="rounded-md border border-border bg-card shadow-sm overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">Estudiante / Aula</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Concepto / Cobro</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Monto</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Vencimiento</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Acciones / Cobranza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.length ? (
                  obligations.map((item) => {
                    const student = item.enrollment?.student;
                    const classroom = item.enrollment?.classroom;
                    const studentName = student
                      ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
                      : 'Estudiante';

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="font-semibold text-foreground text-sm">{studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {classroom ? `${classroom.grade}° ${classroom.section}` : '—'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.concept}</div>
                        </TableCell>

                        <TableCell className="font-bold text-foreground">
                          S/ {item.amountDue.toFixed(2)}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.dueDate).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>

                        <TableCell>
                          {item.status === 'PAID' && <Badge variant="success">PAGADO</Badge>}
                          {item.status === 'PENDING' && <Badge variant="destructive">PENDIENTE</Badge>}
                          {item.status === 'PARTIAL' && <Badge variant="warning">PARCIAL</Badge>}
                          {item.status === 'CANCELLED' && <Badge variant="outline">ANULADO</Badge>}
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Admin: Register Payment (Cobrar) */}
                            {isAdmin && item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => setSelectedObligationForTransaction(item)}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Cobrar</span>
                              </Button>
                            )}

                            {/* View Receipt Voucher */}
                            {item.transactions && item.transactions.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  setSelectedTransactionIdForReceipt(item.transactions[0].id)
                                }
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Ver Recibo</span>
                              </Button>
                            )}

                            {/* Admin: Send Reminder WA/Email */}
                            {isAdmin && item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-primary hover:bg-primary/10 gap-1"
                                onClick={() => setSelectedObligationForReminder(item)}
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Recordatorio</span>
                              </Button>
                            )}

                            {/* Admin: Cancel Obligation */}
                            {isAdmin && item.status !== 'CANCELLED' && item.status !== 'PAID' && (
                              <button
                                onClick={() => cancelObligation(item.id)}
                                disabled={isCancelling}
                                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Anular obligación"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No hay obligaciones de pago registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedObligationForTransaction && (
        <RegisterTransactionModal
          obligation={selectedObligationForTransaction}
          onClose={() => setSelectedObligationForTransaction(null)}
        />
      )}

      {isBulkModalOpen && (
        <BulkObligationModal onClose={() => setIsBulkModalOpen(false)} />
      )}

      {selectedTransactionIdForReceipt && (
        <ReceiptModal
          transactionId={selectedTransactionIdForReceipt}
          onClose={() => setSelectedTransactionIdForReceipt(null)}
        />
      )}

      {selectedObligationForReminder && (
        <ReminderModal
          obligation={selectedObligationForReminder}
          onClose={() => setSelectedObligationForReminder(null)}
        />
      )}
    </div>
  );
};
