import React, { useState } from 'react';
import { CreditCard, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { usePayments } from '../api/usePayments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export const PaymentsPage: React.FC = () => {
  const { data: obligations = [], isLoading } = usePayments();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredObligations = obligations.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.concept.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate Summary metrics
  const totalRevenue = obligations
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + o.amountDue, 0);

  const pendingRevenue = obligations
    .filter((o) => o.status === 'PENDING' || o.status === 'PARTIAL')
    .reduce((sum, o) => sum + o.amountDue, 0);

  const paidCount = obligations.filter((o) => o.status === 'PAID').length;
  const pendingCount = obligations.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Módulo de Cobranzas y Pensión
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Control de pensiones, matrículas y estados de pago en tiempo real.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Recaudación Total</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              S/ {totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{paidCount} pensiones cobradas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Por Cobrar (Pendiente)</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              S/ {pendingRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingCount} obligaciones pendientes</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Pagos Al Día</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{paidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Boletas emitidas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Morosidad</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {obligations.length ? Math.round((pendingCount / obligations.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ratio de morosidad escolar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Buscar obligación o concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {['ALL', 'PAID', 'PENDING', 'PARTIAL'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {status === 'ALL' ? 'Todos' : status === 'PAID' ? 'Pagados' : status === 'PENDING' ? 'Pendientes' : 'Parciales'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : (
          <div className="rounded-md border border-border bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">Concepto / Obligación</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Monto</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Vencimiento</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Transacciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObligations.length ? (
                  filteredObligations.map((item) => (
                    <TableRow key={item.id}>
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
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.transactions.length > 0 ? (
                          <span className="text-emerald-600 font-semibold dark:text-emerald-400">
                            {item.transactions.length} pago(s) registrado(s)
                          </span>
                        ) : (
                          'Sin pagos'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No hay obligaciones de pago registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
