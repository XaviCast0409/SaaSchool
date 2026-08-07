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
import { Pagination } from '@/components/ui/Pagination';
import { RegisterTransactionModal } from '../components/RegisterTransactionModal';
import { BulkObligationModal } from '../components/BulkObligationModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { ReminderModal } from '../components/ReminderModal';
import { PaymentObligation, ObligationStatus } from '../types';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isParent = user?.role === 'PARENT';
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // State de paginación y filtros
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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
  const { data: financialSummary, isLoading: isLoadingSummary } = useFinancialSummary(isAdmin);

  const {
    data: adminObligationsResponse,
    isLoading: isLoadingAdminObligations,
  } = usePayments(
    {
      page,
      limit,
      status: filterStatus !== 'ALL' ? (filterStatus as ObligationStatus) : undefined,
      classroomId: selectedClassroomId || undefined,
      search: searchTerm || undefined,
    },
    isAdmin
  );

  const {
    data: parentObligations = [],
    isLoading: isLoadingParentObligations,
  } = useParentPayments(isParent);

  const { mutate: sendBulkReminders, isPending: isSendingBulk } = useSendBulkReminders();
  const { mutate: cancelObligation, isPending: isCancelling } = useCancelObligation();

  const adminObligations = adminObligationsResponse?.data || [];
  const obligationsMeta = adminObligationsResponse?.meta;

  const obligations = isParent ? parentObligations : adminObligations;
  const isLoading = isParent ? isLoadingParentObligations : isLoadingAdminObligations;

  const handleBulkReminders = () => {
    if (window.confirm('¿Deseas enviar recordatorios masivos por WhatsApp/Email a todos los apoderados con deudas vencidas?')) {
      sendBulkReminders('BOTH');
    }
  };

  return (
    <div className="space-y-6 pb-8">
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

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={handleBulkReminders}
              disabled={isSendingBulk}
            >
              <Send className="w-3.5 h-3.5 text-amber-500" />
              <span>{isSendingBulk ? 'Enviando...' : 'Recordatorios Morosos'}</span>
            </Button>
            <Button
              size="sm"
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setIsBulkModalOpen(true)}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Generar Pensiones</span>
            </Button>
          </div>
        )}
      </div>

      {/* Financial Summary Cards (Solo Admins) */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Proyectado</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-extrabold text-foreground">
                  S/ {financialSummary?.totalExpected.toFixed(2) || '0.00'}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Obligaciones emitidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Recaudado (Caja)</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  S/ {financialSummary?.totalCollected.toFixed(2) || '0.00'}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Pagos confirmados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Pendiente de Cobro</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  S/ {financialSummary?.totalPending.toFixed(2) || '0.00'}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Por cobrar este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Alumnos en Mora</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-xl font-extrabold text-destructive">
                  {financialSummary?.overdueCount || 0}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Pensiones vencidas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls & Table Container */}
      <div className="space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar alumno, DNI o concepto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="PARTIAL">Pago Parcial</option>
              <option value="PAID">Pagado (Al día)</option>
              <option value="CANCELLED">Anulado</option>
            </select>

            {/* Filter by Classroom */}
            {isAdmin && (
              <select
                value={selectedClassroomId}
                onChange={(e) => {
                  setSelectedClassroomId(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              >
                <option value="">Todas las Aulas</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade}° "{c.section}" - {c.educationLevel}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Estudiante / Aula</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Concepto</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Monto Soles</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Vencimiento</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.length ? (
                  obligations.map((item) => {
                    const student = item.enrollment?.student;
                    const classroom = item.enrollment?.classroom;
                    const isOverdue = item.status === 'PENDING' && new Date(item.dueDate) < new Date();

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-semibold text-foreground text-sm">
                              {student ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}` : 'Alumno s/n'}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              {student?.documentId && <span className="font-mono">DNI: {student.documentId}</span>}
                              {classroom && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary text-secondary-foreground">
                                  {classroom.grade}° "{classroom.section}"
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground text-xs">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground">{item.concept}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-extrabold text-foreground text-sm">
                            S/ {item.amountDue.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            {new Date(item.dueDate).toLocaleDateString('es-PE')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.status === 'PAID' && <Badge variant="success">Pagado</Badge>}
                          {item.status === 'PENDING' && !isOverdue && <Badge variant="warning">Pendiente</Badge>}
                          {item.status === 'PENDING' && isOverdue && <Badge variant="destructive">Vencido / Mora</Badge>}
                          {item.status === 'PARTIAL' && <Badge variant="secondary">Pago Parcial</Badge>}
                          {item.status === 'CANCELLED' && <Badge variant="outline">Anulado</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Registrar Cobro Manual */}
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

                            {/* Ver Recibo / Boleta */}
                            {item.transactions && item.transactions.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setSelectedTransactionIdForReceipt(item.transactions[0].id)}
                              >
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span>Boleta</span>
                              </Button>
                            )}

                            {/* Admin: Recordatorio Individual */}
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
                      No hay obligaciones de pago registradas con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Paginación Conectada al Backend */}
            {!isParent && obligationsMeta && (
              <Pagination
                currentPage={page}
                totalPages={obligationsMeta.totalPages}
                totalItems={obligationsMeta.total}
                limit={limit}
                onPageChange={(p) => setPage(p)}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            )}
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
