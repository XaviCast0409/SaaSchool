import React from 'react';
import { Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';
import { SchoolWithStats } from '../../types';
import { PlanCatalog } from '../../api/useSuperAdmin';
import { SchoolTableRow } from './SchoolTableRow';

interface SchoolsTableProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filterPlan: string;
  onFilterPlanChange: (value: string) => void;
  catalog: PlanCatalog | undefined;
  isLoading: boolean;
  filteredSchools: SchoolWithStats[];
  listPrice: (plan: string) => number;
  feeOf: (s: SchoolWithStats) => number;
  quotaOf: (s: SchoolWithStats) => number | null | undefined;
  quotaPercent: (s: SchoolWithStats) => number | null;
  onImpersonate: (school: SchoolWithStats) => void;
  onEditSchool: (school: SchoolWithStats) => void;
  onResetPassword: (school: SchoolWithStats) => void;
  onSelectPlan: (school: SchoolWithStats) => void;
  onSelectPayments: (school: SchoolWithStats) => void;
  onToggleStatus: (school: SchoolWithStats) => void;
  isDeactivating: boolean;
  isReactivating: boolean;
}

export const SchoolsTable: React.FC<SchoolsTableProps> = ({
  searchTerm,
  onSearchTermChange,
  filterPlan,
  onFilterPlanChange,
  catalog,
  isLoading,
  filteredSchools,
  listPrice,
  feeOf,
  quotaOf,
  quotaPercent,
  onImpersonate,
  onEditSchool,
  onResetPassword,
  onSelectPlan,
  onSelectPayments,
  onToggleStatus,
  isDeactivating,
  isReactivating,
}) => {
  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colegio por RUC, nombre o email..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterPlan}
            onChange={(e) => onFilterPlanChange(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="ALL">Todos los Planes</option>
            {(['BASIC', 'PRO', 'ENTERPRISE'] as const).map((plan) => (
              <option key={plan} value={plan}>
                Plan {plan}
                {catalog ? ` (${formatMoney(listPrice(plan))}/mes)` : ''}
              </option>
            ))}
          </select>
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
                <TableHead className="text-xs font-bold uppercase tracking-wider">Colegio / RUC</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Plan Contratado</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Usuarios / Alumnos</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Actividad</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Vigencia Plan</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Estado Acceso</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchools.length ? (
                filteredSchools.map((item) => (
                  <SchoolTableRow
                    key={item.id}
                    item={item}
                    listPrice={listPrice}
                    feeOf={feeOf}
                    quotaOf={quotaOf}
                    quotaPercent={quotaPercent}
                    onImpersonate={onImpersonate}
                    onEditSchool={onEditSchool}
                    onResetPassword={onResetPassword}
                    onSelectPlan={onSelectPlan}
                    onSelectPayments={onSelectPayments}
                    onToggleStatus={onToggleStatus}
                    isDeactivating={isDeactivating}
                    isReactivating={isReactivating}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No se encontraron colegios registrados con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
