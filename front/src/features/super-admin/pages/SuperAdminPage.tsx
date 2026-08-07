import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  DollarSign,
  Plus,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  Power,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetAllSchools,
  useDeactivateSchool,
  useReactivateSchool,
} from '../api/useSuperAdmin';
import { SchoolWithStats } from '../types';
import { CreateSchoolModal } from '../components/CreateSchoolModal';
import { EditSchoolPlanModal } from '../components/EditSchoolPlanModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const PLAN_PRICES: Record<string, number> = {
  BASIC: 40,
  PRO: 90,
  ENTERPRISE: 150,
};

export const SuperAdminPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSchoolForPlan, setSelectedSchoolForPlan] = useState<SchoolWithStats | null>(null);

  const { data: schools = [], isLoading } = useGetAllSchools();
  const { mutate: deactivateSchool, isPending: isDeactivating } = useDeactivateSchool();
  const { mutate: reactivateSchool, isPending: isReactivating } = useReactivateSchool();

  // Filter logic
  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.documentId.includes(searchTerm) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlan = filterPlan === 'ALL' || s.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  // Calculate SaaS KPIs
  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.isActive).length;
  const totalStudentsInPlatform = schools.reduce((acc, s) => acc + (s._count?.students || 0), 0);
  const estimatedMRR = schools
    .filter((s) => s.isActive)
    .reduce((acc, s) => acc + (PLAN_PRICES[s.plan] || 40), 0);

  const handleToggleStatus = (school: SchoolWithStats) => {
    if (school.isActive) {
      if (window.confirm(`¿Deseas suspender el acceso a la plataforma para el colegio "${school.name}"?`)) {
        deactivateSchool(school.id, {
          onSuccess: () => toast.success(`🚫 Colegio "${school.name}" suspendido por cobranza.`),
          onError: () => toast.error('Error al suspender el colegio.'),
        });
      }
    } else {
      reactivateSchool(school.id, {
        onSuccess: () => toast.success(`✅ Colegio "${school.name}" reactivado correctamente.`),
        onError: () => toast.error('Error al reactivar el colegio.'),
      });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Panel de Control SuperAdmin SaaS
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Torre de control centralizada para gestionar instituciones clientes, planes contratados y facturación mensual.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 font-bold bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Dar de Alta Nuevo Colegio</span>
        </Button>
      </div>

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Colegios Clientes</CardTitle>
            <Building2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">
                {activeSchools} <span className="text-xs font-semibold text-muted-foreground">/ {totalSchools} activos</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Instituciones conectadas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">MRR Estimado ($/mes)</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ${estimatedMRR.toFixed(2)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Ingresos recurrentes mensuales</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Alumnos en Plataforma</CardTitle>
            <Users className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-extrabold text-foreground">
                {totalStudentsInPlatform}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Matrículas activas consolidadas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Planes Activos</CardTitle>
            <Sparkles className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold mt-1">
                <Badge variant="outline" className="bg-muted">BASIC: {schools.filter((s) => s.plan === 'BASIC').length}</Badge>
                <Badge variant="default" className="bg-primary text-primary-foreground">PRO: {schools.filter((s) => s.plan === 'PRO').length}</Badge>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">Distribución por paquete</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Section */}
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colegio por RUC, nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="ALL">Todos los Planes</option>
              <option value="BASIC">Plan BASIC ($40/mes)</option>
              <option value="PRO">Plan PRO ($90/mes)</option>
              <option value="ENTERPRISE">Plan ENTERPRISE ($150/mes)</option>
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
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Vigencia Plan</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Estado Acceso</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.length ? (
                  filteredSchools.map((item) => {
                    const isExpired = item.planExpiresAt && new Date(item.planExpiresAt) < new Date();

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              {item.logoUrl ? (
                                <img src={item.logoUrl} alt={item.name} className="w-5 h-5 object-contain rounded" />
                              ) : (
                                <Building2 className="w-4 h-4 text-primary" />
                              )}
                              <span>{item.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                              <span>RUC: {item.documentId}</span>
                              {item.phone && <span>• Tel: {item.phone}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.plan === 'PRO' ? 'default' : item.plan === 'ENTERPRISE' ? 'success' : 'secondary'}
                            className="font-bold text-[10px]"
                          >
                            {item.plan} (${PLAN_PRICES[item.plan] || 40}/mes)
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-foreground">
                            <strong>{item._count?.students || 0}</strong> alumnos / <strong>{item._count?.users || 0}</strong> usuarios
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.planExpiresAt ? (
                            <span className={`text-xs ${isExpired ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                              {new Date(item.planExpiresAt).toLocaleDateString('es-PE')}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Mensual Indefinido</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isActive ? (
                            <Badge variant="success" className="gap-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Activo</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[10px]">
                              <XCircle className="w-3 h-3" />
                              <span>Suspendido</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedSchoolForPlan(item)}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              <span>Cambiar Plan</span>
                            </Button>

                            <Button
                              size="sm"
                              variant={item.isActive ? 'ghost' : 'outline'}
                              className={`h-7 text-xs gap-1 ${
                                item.isActive
                                  ? 'text-destructive hover:bg-destructive/10'
                                  : 'text-emerald-600 hover:bg-emerald-500/10'
                              }`}
                              onClick={() => handleToggleStatus(item)}
                              disabled={isDeactivating || isReactivating}
                            >
                              {item.isActive ? <Power className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              <span>{item.isActive ? 'Suspender' : 'Reactivar'}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No se encontraron colegios registrados con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditSchoolPlanModal
        school={selectedSchoolForPlan}
        isOpen={!!selectedSchoolForPlan}
        onClose={() => setSelectedSchoolForPlan(null)}
      />
    </div>
  );
};
